import { WebSocket } from "ws";
import {
  INIT_GAME, MOVE, CHAT_MESSAGE, RESIGN, OFFER_DRAW,
  DRAW_RESPONSE, RECONNECT, ERROR,
} from "./messages";
import { Game } from "./Game";
import { validateWsMessage } from "./utils/wsValidator";
import { wsLog } from "./utils/logger";

// ── UserMeta ────────────────────────────────────────────────────────
// Attached to each socket after JWT verification in index.ts.
// Used for DB lookups, reconnection, and self-match prevention.
interface UserMeta {
  userId: number;
  name: string;
}

// ── PendingUser ─────────────────────────────────────────────────────
// A player waiting in the matchmaking queue.
interface PendingUser {
  socket: WebSocket;
  userId: number;
  name: string;
}

// ── Disconnect timer ────────────────────────────────────────────────
// When a player drops, we give them 30 seconds to reconnect
// before forfeiting the game.
const DISCONNECT_GRACE_MS = 30_000;

// ── Heartbeat ───────────────────────────────────────────────────────
// Ping every connected client every 30s. If they don't pong back,
// we consider them dead and clean up.
const HEARTBEAT_INTERVAL_MS = 30_000;

// ══════════════════════════════════════════════════════════════════════
//  GameManager
//  Owns all active games, matchmaking, and socket lifecycle.
// ══════════════════════════════════════════════════════════════════════
export class GameManager {
  // gameId → Game instance
  private games: Map<string, Game> = new Map();

  // socket → Game (for quick lookup when a message arrives)
  private socketToGame: Map<WebSocket, Game> = new Map();

  // socket → user identity
  private socketToUser: Map<WebSocket, UserMeta> = new Map();

  // userId → gameId (for reconnection — find their game by userId)
  private userIdToGameId: Map<number, string> = new Map();

  // userId → active socket (to prevent duplicate connections)
  private userIdToSocket: Map<number, WebSocket> = new Map();

  // Matchmaking queue — just one slot (FIFO).
  // When a second player joins, they're matched with the pending one.
  private pendingUser: PendingUser | null = null;

  // Disconnect grace timers — userId → setTimeout handle
  private disconnectTimers: Map<number, ReturnType<typeof setTimeout>> = new Map();

  // Heartbeat interval handle
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHeartbeat();
  }

  // ══════════════════════════════════════════════════════════════════
  //  PUBLIC: addUser
  //  Called from index.ts when a new authenticated WS connection opens.
  // ══════════════════════════════════════════════════════════════════
  addUser(socket: WebSocket, userMeta: UserMeta) {
    // If this user already has an open socket, close the old one.
    // This prevents self-matching and duplicate connections.
    const existingSocket = this.userIdToSocket.get(userMeta.userId);
    if (existingSocket && existingSocket !== socket) {
      try {
        this.safeSend(existingSocket, { type: "replaced" });
        // Give the client 500ms to receive the message and close itself.
        // If it fails to close within 500ms, we force-close it.
        setTimeout(() => {
          try {
            if (existingSocket.readyState === existingSocket.OPEN) {
              existingSocket.close(4002, "Replaced by new connection");
            }
          } catch {
            // Ignore
          }
        }, 500);
      } catch {
        // Old socket might already be dead.
      }
      this.cleanupSocket(existingSocket);
    }

    this.socketToUser.set(socket, userMeta);
    this.userIdToSocket.set(userMeta.userId, socket);

    // Mark socket as alive for heartbeat tracking.
    (socket as any).__alive = true;

    this.addHandler(socket);
    wsLog.debug({ userId: userMeta.userId, name: userMeta.name }, "user connected");

    // ── Auto-reconnect ──────────────────────────────────────────────
    // If this user was in an active game and disconnected, reconnect them.
    const existingGameId = this.userIdToGameId.get(userMeta.userId);
    if (existingGameId) {
      const game = this.games.get(existingGameId);
      if (game && !game.isEnded()) {
        this.handleReconnect(socket, userMeta.userId);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  PUBLIC: getActiveGameCount
  //  Used by the health endpoint.
  // ══════════════════════════════════════════════════════════════════
  getActiveGameCount(): number {
    return this.games.size;
  }

  // ══════════════════════════════════════════════════════════════════
  //  PUBLIC: shutdown
  //  Called during graceful server shutdown.
  //  Persists any in-progress games and closes all sockets.
  // ══════════════════════════════════════════════════════════════════
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Clear all disconnect timers.
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();

    wsLog.info("GameManager shutting down");
  }

  // ══════════════════════════════════════════════════════════════════
  //  PRIVATE: addHandler
  //  Sets up message routing and disconnect handling for a socket.
  // ══════════════════════════════════════════════════════════════════
  private addHandler(socket: WebSocket) {
    socket.on("message", (data) => {
      // Parse and validate the raw message.
      let raw: unknown;
      try {
        raw = JSON.parse(data.toString());
      } catch {
        return; // Not valid JSON — ignore silently.
      }

      const message = validateWsMessage(raw);
      if (!message) {
        this.safeSend(socket, {
          type: ERROR,
          payload: { message: "Invalid message format" },
        });
        return;
      }

      // Route to the correct handler based on message type.
      switch (message.type) {
        case INIT_GAME:
          this.handleInitGame(socket);
          break;
        case MOVE:
          this.handleMove(socket, message.payload.move);
          break;
        case CHAT_MESSAGE:
          this.handleChat(socket, message.payload.text);
          break;
        case RESIGN:
          this.handleResign(socket);
          break;
        case OFFER_DRAW:
          this.handleOfferDraw(socket);
          break;
        case DRAW_RESPONSE:
          this.handleDrawResponse(socket, message.payload.accept);
          break;
        case RECONNECT:
          // Manual reconnect (client sends gameId explicitly).
          // Auto-reconnect in addUser() handles most cases already.
          break;
      }
    });

    // Respond to pong frames for heartbeat.
    socket.on("pong", () => {
      (socket as any).__alive = true;
    });

    socket.on("close", () => {
      this.handleDisconnect(socket);
    });

    socket.on("error", () => {
      // Error always fires before close, so close handler will clean up.
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  Matchmaking
  // ══════════════════════════════════════════════════════════════════
  private handleInitGame(socket: WebSocket) {
    const userMeta = this.socketToUser.get(socket);
    if (!userMeta) return;

    // Already in a game — ignore.
    if (this.socketToGame.has(socket)) return;

    // Already in queue — ignore.
    if (this.pendingUser?.userId === userMeta.userId) return;

    if (this.pendingUser) {
      // Self-match prevention: can't match with yourself.
      if (this.pendingUser.userId === userMeta.userId) {
        this.safeSend(socket, {
          type: ERROR,
          payload: { message: "Cannot match with yourself" },
        });
        return;
      }

      // ── Match found! Create a new game. ───────────────────────────
      const white = {
        socket: this.pendingUser.socket,
        userId: this.pendingUser.userId,
        name: this.pendingUser.name,
      };
      const black = {
        socket,
        userId: userMeta.userId,
        name: userMeta.name,
      };

      const game = new Game(white, black, 5 * 60 * 1000, (endedGame) => {
        this.onGameEnd(endedGame);
      });

      // Register the game in all lookup maps.
      this.games.set(game.id, game);
      this.socketToGame.set(white.socket, game);
      this.socketToGame.set(black.socket, game);
      this.userIdToGameId.set(white.userId, game.id);
      this.userIdToGameId.set(black.userId, game.id);

      wsLog.info(
        { gameId: game.id, white: white.name, black: black.name },
        "match created"
      );

      this.pendingUser = null;
    } else {
      // No one waiting — put this player in the queue.
      this.pendingUser = {
        socket,
        userId: userMeta.userId,
        name: userMeta.name,
      };
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  Move / Chat / Resign / Draw
  // ══════════════════════════════════════════════════════════════════
  private handleMove(socket: WebSocket, move: { from: string; to: string; promotion?: string }) {
    const game = this.socketToGame.get(socket);
    if (game) game.makeMove(socket, move);
  }

  private handleChat(socket: WebSocket, text: string) {
    const game = this.socketToGame.get(socket);
    if (game) game.sendChatMessage(socket, text);
  }

  private handleResign(socket: WebSocket) {
    const game = this.socketToGame.get(socket);
    if (game) game.resign(socket);
  }

  private handleOfferDraw(socket: WebSocket) {
    const game = this.socketToGame.get(socket);
    if (game) game.offerDraw(socket);
  }

  private handleDrawResponse(socket: WebSocket, accept: boolean) {
    const game = this.socketToGame.get(socket);
    if (game) game.respondToDraw(socket, accept);
  }

  // ══════════════════════════════════════════════════════════════════
  //  Reconnection
  //  When a player reconnects, swap their socket in the game and
  //  send them the full game state so they can catch up.
  // ══════════════════════════════════════════════════════════════════
  private handleReconnect(socket: WebSocket, userId: number) {
    const gameId = this.userIdToGameId.get(userId);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (!game || game.isEnded()) return;

    // Cancel the forfeit timer if it's running.
    const timer = this.disconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(userId);
      wsLog.info({ userId, gameId }, "reconnect: cancelled forfeit timer");
    }

    // Swap the dead socket for the new one.
    game.replaceSocket(userId, socket);
    this.socketToGame.set(socket, game);

    // Send the full game state so the client can restore everything.
    const state = game.getFullState(userId);
    this.safeSend(socket, state);

    wsLog.info({ userId, gameId }, "player reconnected to game");
  }

  // ══════════════════════════════════════════════════════════════════
  //  Disconnect handling
  //  When a socket closes: if the player was in a game, start a
  //  grace period. If they don't reconnect in time, they forfeit.
  // ══════════════════════════════════════════════════════════════════
  private handleDisconnect(socket: WebSocket) {
    const userMeta = this.socketToUser.get(socket);

    // If they were waiting in the queue, remove them.
    if (this.pendingUser?.socket === socket) {
      this.pendingUser = null;
    }

    // If they were in a game, start the grace period.
    const game = this.socketToGame.get(socket);
    if (game && !game.isEnded() && userMeta) {
      wsLog.info(
        { userId: userMeta.userId, gameId: game.id },
        "player disconnected, starting grace period"
      );

      // Notify the opponent.
      this.safeSend(
        game.white.userId === userMeta.userId ? game.black.socket : game.white.socket,
        { type: "opponent_disconnected", payload: { gracePeriodMs: DISCONNECT_GRACE_MS } }
      );

      // Start the forfeit timer.
      const timer = setTimeout(() => {
        this.disconnectTimers.delete(userMeta.userId);

        // If the game is still active and the player hasn't reconnected,
        // they lose by forfeit.
        if (!game.isEnded()) {
          wsLog.info({ userId: userMeta.userId, gameId: game.id }, "grace period expired, forfeiting");
          game.handleDisconnect(socket);
        }
      }, DISCONNECT_GRACE_MS);

      this.disconnectTimers.set(userMeta.userId, timer);
    }

    this.cleanupSocket(socket);
  }

  // ══════════════════════════════════════════════════════════════════
  //  Game end callback
  //  Called by Game.ts when a game ends (checkmate, resign, etc).
  //  Cleans up all maps but keeps userIdToGameId for a while so
  //  we can show "game just ended" on reconnect.
  // ══════════════════════════════════════════════════════════════════
  private onGameEnd(game: Game) {
    // Remove socket→game mappings.
    this.socketToGame.delete(game.white.socket);
    this.socketToGame.delete(game.black.socket);

    // Schedule cleanup of game data after 5 minutes.
    // This gives time for any reconnecting clients to get the final state.
    setTimeout(() => {
      this.games.delete(game.id);
      this.userIdToGameId.delete(game.white.userId);
      this.userIdToGameId.delete(game.black.userId);
    }, 5 * 60 * 1000);
  }

  // ══════════════════════════════════════════════════════════════════
  //  Heartbeat
  //  Pings all clients every 30s. If a client doesn't pong back,
  //  their socket is terminated (which triggers the close handler).
  // ══════════════════════════════════════════════════════════════════
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      for (const [socket] of this.socketToUser) {
        if (!(socket as any).__alive) {
          // Didn't respond to last ping — dead connection.
          wsLog.debug("terminating unresponsive socket");
          socket.terminate();
          continue;
        }

        // Mark as not-alive, then ping. If they're alive, the pong
        // handler will set it back to true.
        (socket as any).__alive = false;
        try {
          socket.ping();
        } catch {
          // Socket is already broken.
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  // ══════════════════════════════════════════════════════════════════
  //  Cleanup helpers
  // ══════════════════════════════════════════════════════════════════

  // Remove a socket from all tracking maps (but NOT the userId→gameId
  // map, because they might reconnect).
  private cleanupSocket(socket: WebSocket) {
    const userMeta = this.socketToUser.get(socket);
    this.socketToUser.delete(socket);
    this.socketToGame.delete(socket);

    // Only clear userIdToSocket if this is still the active socket
    // (not if a newer connection already replaced it).
    if (userMeta) {
      const currentSocket = this.userIdToSocket.get(userMeta.userId);
      if (currentSocket === socket) {
        this.userIdToSocket.delete(userMeta.userId);
      }
    }
  }

  private safeSend(ws: WebSocket, payload: any) {
    try {
      if ((ws as any).readyState === (WebSocket as any).OPEN) {
        ws.send(JSON.stringify(payload));
      }
    } catch {
      // Ignore send errors.
    }
  }
}
