import { WebSocket } from "ws";
import crypto from "crypto";
import {
  JOIN_QUEUE,
  MOVE,
  RECONNECT,
  ERROR,
  OPPONENT_DISCONNECTED,
  OPPONENT_RECONNECTED,
} from "./messages";
import { Game, type Color } from "./Game";
import { wsLog } from "./utils/logger";

// ── ConnMeta ──────────────────────────────────────────────────────
// Attached to each socket right after connect. No auth yet (Phase 5),
// so identity is just a random id + a display name.
interface ConnMeta {
  id: string;
  name: string;
}

interface PendingUser {
  socket: WebSocket;
  id: string;
  name: string;
}

// Give a dropped player 30s to reconnect before forfeiting.
const DISCONNECT_GRACE_MS = 30_000;

// Ping every connected client every 30s; if they don't pong back
// in time, consider them dead and terminate the socket.
const HEARTBEAT_INTERVAL_MS = 30_000;

interface TrackedSocket extends WebSocket {
  __alive?: boolean;
}

// ══════════════════════════════════════════════════════════════════
//  GameManager — owns all active games, matchmaking, and socket
//  lifecycle (connect, heartbeat, disconnect/reconnect).
// ══════════════════════════════════════════════════════════════════
export class GameManager {
  private games: Map<string, Game> = new Map();
  private socketToGame: Map<WebSocket, Game> = new Map();
  private socketToMeta: Map<WebSocket, ConnMeta> = new Map();

  // reconnect token → { gameId, color } so a fresh socket can rejoin.
  private tokenToGame: Map<string, { gameId: string; color: Color }> =
    new Map();

  private pendingUser: PendingUser | null = null;
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHeartbeat();
  }

  // ── PUBLIC: addConnection ────────────────────────────────────────
  // Called from index.ts for every new WebSocket upgrade.
  addConnection(socket: WebSocket) {
    const meta: ConnMeta = {
      id: crypto.randomUUID(),
      name: `Player-${crypto.randomUUID().slice(0, 4)}`,
    };
    this.socketToMeta.set(socket, meta);
    (socket as TrackedSocket).__alive = true;

    this.attachHandlers(socket);
    wsLog.debug({ id: meta.id }, "connection opened");
  }

  getActiveGameCount(): number {
    return this.games.size;
  }

  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const timer of this.disconnectTimers.values()) clearTimeout(timer);
    this.disconnectTimers.clear();
    wsLog.info("GameManager shutting down");
  }

  // ── PRIVATE: message routing ─────────────────────────────────────
  private attachHandlers(socket: WebSocket) {
    socket.on("message", (data) => {
      let raw: unknown;
      try {
        raw = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (typeof raw !== "object" || raw === null || !("type" in raw)) return;
      const message = raw as { type: string; payload?: unknown };

      switch (message.type) {
        case JOIN_QUEUE:
          this.handleJoinQueue(socket);
          break;
        case MOVE:
          this.handleMove(
            socket,
            message.payload as { from: string; to: string; promotion?: string },
          );
          break;
        case RECONNECT:
          this.handleReconnect(
            socket,
            (message.payload as { gameId?: string; token?: string })?.token,
          );
          break;
        default:
          this.safeSend(socket, {
            type: ERROR,
            payload: { message: "Unknown message type" },
          });
      }
    });

    socket.on("pong", () => {
      (socket as TrackedSocket).__alive = true;
    });

    socket.on("close", () => this.handleDisconnect(socket));
    socket.on("error", () => {
      /* close handler runs regardless and does cleanup */
    });
  }

  // ── Matchmaking (simple FIFO queue, one slot) ────────────────────
  private handleJoinQueue(socket: WebSocket) {
    const meta = this.socketToMeta.get(socket);
    if (!meta) return;
    if (this.socketToGame.has(socket)) return; // already in a game

    if (this.pendingUser) {
      if (this.pendingUser.socket === socket) return; // already queued

      const white = {
        socket: this.pendingUser.socket,
        token: crypto.randomUUID(),
        name: this.pendingUser.name,
      };
      const black = { socket, token: crypto.randomUUID(), name: meta.name };

      const game = new Game(white, black, 5 * 60 * 1000, (endedGame) =>
        this.onGameEnd(endedGame),
      );

      this.games.set(game.id, game);
      this.socketToGame.set(white.socket, game);
      this.socketToGame.set(black.socket, game);
      this.tokenToGame.set(white.token, { gameId: game.id, color: "white" });
      this.tokenToGame.set(black.token, { gameId: game.id, color: "black" });

      wsLog.info(
        { gameId: game.id, white: white.name, black: black.name },
        "match created",
      );
      this.pendingUser = null;
    } else {
      this.pendingUser = { socket, id: meta.id, name: meta.name };
      wsLog.debug({ id: meta.id }, "queued for matchmaking");
    }
  }

  private handleMove(
    socket: WebSocket,
    move: { from: string; to: string; promotion?: string },
  ) {
    this.socketToGame.get(socket)?.makeMove(socket, move);
  }

  // ── Reconnection ──────────────────────────────────────────────────
  private handleReconnect(socket: WebSocket, token: string | undefined) {
    if (!token) return;
    const entry = this.tokenToGame.get(token);
    if (!entry) return;

    const game = this.games.get(entry.gameId);
    if (!game || game.isEnded()) return;

    const timer = this.disconnectTimers.get(token);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(token);
    }

    const color = game.replaceSocket(token, socket);
    if (!color) return;

    this.socketToGame.set(socket, game);
    this.safeSend(socket, game.getFullState(token));

    const opponentSocket =
      color === "white" ? game.black.socket : game.white.socket;
    this.safeSend(opponentSocket, { type: OPPONENT_RECONNECTED, payload: {} });

    wsLog.info({ gameId: game.id, color }, "player reconnected");
  }

  // ── Disconnect handling ───────────────────────────────────────────
  private handleDisconnect(socket: WebSocket) {
    if (this.pendingUser?.socket === socket) this.pendingUser = null;

    const game = this.socketToGame.get(socket);
    if (game && !game.isEnded()) {
      const color: Color = game.white.socket === socket ? "white" : "black";
      const token = color === "white" ? game.white.token : game.black.token;
      const opponentSocket =
        color === "white" ? game.black.socket : game.white.socket;

      this.safeSend(opponentSocket, {
        type: OPPONENT_DISCONNECTED,
        payload: { gracePeriodMs: DISCONNECT_GRACE_MS },
      });

      wsLog.info(
        { gameId: game.id, color },
        "player disconnected, grace period started",
      );

      const timer = setTimeout(() => {
        this.disconnectTimers.delete(token);
        if (!game.isEnded()) game.forfeit(color);
      }, DISCONNECT_GRACE_MS);

      this.disconnectTimers.set(token, timer);
    }

    this.socketToGame.delete(socket);
    this.socketToMeta.delete(socket);
  }

  private onGameEnd(game: Game) {
    this.socketToGame.delete(game.white.socket);
    this.socketToGame.delete(game.black.socket);

    // Keep tokens/game around briefly so a late "reconnect" can still
    // fetch the final state, then drop everything.
    setTimeout(
      () => {
        this.games.delete(game.id);
        this.tokenToGame.delete(game.white.token);
        this.tokenToGame.delete(game.black.token);
      },
      5 * 60 * 1000,
    );
  }

  // ── Heartbeat ──────────────────────────────────────────────────────
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      for (const socket of this.socketToMeta.keys()) {
        const tracked = socket as TrackedSocket;
        if (tracked.__alive === false) {
          tracked.terminate();
          continue;
        }
        tracked.__alive = false;
        tracked.ping();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private safeSend(socket: WebSocket, message: unknown) {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }
}
