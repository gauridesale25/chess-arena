import { WebSocket } from "ws";
import { Chess } from "chess.js";
import crypto from "crypto";
import { GAME_OVER, INIT_GAME, MOVE, CHAT_MESSAGE, OFFER_DRAW, DRAW_RESPONSE, GAME_STATE } from "./messages";
import prisma from "./utils/prisma";
import { gameLog } from "./utils/logger";

type Color = "white" | "black";

// ── Player ──────────────────────────────────────────────────────────
// Each player has a socket (which can be swapped on reconnect),
// a database userId, and a display name.
interface Player {
  socket: WebSocket;
  userId: number;
  name: string;
}

// ── MoveRecord ──────────────────────────────────────────────────────
// One entry per move, stored in memory during the game and
// bulk-inserted to the DB when the game ends.
interface MoveRecord {
  moveNum: number;
  from: string;
  to: string;
  san: string;   // Standard Algebraic Notation, e.g. "Nf3"
  fen: string;   // Board state AFTER this move
  timestamp: number;
}

// ── Game ─────────────────────────────────────────────────────────────
// Represents a single chess game between two authenticated players.
// Handles move validation, timers, chat, resign, draw offers,
// persistence to DB, and reconnection.
export class Game {
  public readonly id: string;
  public white: Player;
  public black: Player;
  public board: Chess;
  private moveHistory: MoveRecord[] = [];
  private lastMoveTime: number;
  public timeLeft: { white: number; black: number };
  private ended: boolean = false;
  private readonly initialTimeMs: number;

  // ── Active timer ──────────────────────────────────────────────────
  // Instead of lazily checking time only when a move is made,
  // we set a real setTimeout that fires when the current player's
  // clock runs out. This catches AFK players who never make a move.
  private clockTimer: ReturnType<typeof setTimeout> | null = null;

  // Draw offer state — only one outstanding offer at a time
  private drawOfferFrom: Color | null = null;

  // Called by GameManager when the game ends, so it can clean up maps.
  private onGameEnd: ((game: Game) => void) | null = null;

  constructor(
    white: Player,
    black: Player,
    initialTimeMs = 5 * 60 * 1000,
    onGameEnd?: (game: Game) => void
  ) {
    this.id = crypto.randomUUID();
    this.white = white;
    this.black = black;
    this.board = new Chess();
    this.lastMoveTime = Date.now();
    this.initialTimeMs = initialTimeMs;
    this.timeLeft = { white: initialTimeMs, black: initialTimeMs };
    this.onGameEnd = onGameEnd ?? null;

    gameLog.info({ gameId: this.id, white: white.name, black: black.name }, "game started");

    // Tell each player their color, opponent name, and starting clock.
    this.safeSend(this.white.socket, {
      type: INIT_GAME,
      payload: {
        color: "white",
        name: this.white.name,
        opponent: this.black.name,
        timeLeft: { white: this.timeLeft.white, black: this.timeLeft.black },
        gameId: this.id,
      },
    });

    this.safeSend(this.black.socket, {
      type: INIT_GAME,
      payload: {
        color: "black",
        name: this.black.name,
        opponent: this.white.name,
        timeLeft: { white: this.timeLeft.white, black: this.timeLeft.black },
        gameId: this.id,
      },
    });

    // Start the clock for white (first to move).
    this.startClock("white");
  }

  // ══════════════════════════════════════════════════════════════════
  //  PUBLIC: makeMove
  // ══════════════════════════════════════════════════════════════════
  makeMove(socket: WebSocket, move: { from: string; to: string; promotion?: string }) {
    if (this.ended) return;

    const turnColor: Color = this.board.turn() === "w" ? "white" : "black";
    const expectedSocket = turnColor === "white" ? this.white.socket : this.black.socket;

    // Only the player whose turn it is can move.
    if (socket !== expectedSocket) {
      this.safeSend(socket, {
        type: MOVE,
        payload: { ok: false, reason: "not_your_turn" },
      });
      return;
    }

    // Validate that the move is legal before touching anything.
    const legalMoves = this.board.moves({ verbose: true });
    const isLegal = legalMoves.some(
      (m) => m.from === move.from && m.to === move.to
    );

    if (!isLegal) {
      this.safeSend(socket, {
        type: MOVE,
        payload: { ok: false, reason: "illegal_move", move },
      });
      return;
    }

    // ── Update clock ────────────────────────────────────────────────
    const now = Date.now();
    const elapsed = now - this.lastMoveTime;
    this.timeLeft[turnColor] -= elapsed;
    this.lastMoveTime = now;

    // If the player ran out of time between moves (shouldn't happen
    // because the active timer would fire first, but just in case).
    if (this.timeLeft[turnColor] <= 0) {
      this.timeLeft[turnColor] = 0;
      const winner: Color = turnColor === "white" ? "black" : "white";
      this.endGame("timeout", winner, `${turnColor}_flag_fall`);
      return;
    }

    // ── Execute the move ────────────────────────────────────────────
    const result = this.board.move({
      from: move.from,
      to: move.to,
      promotion: (move.promotion as any) || "q",
    });

    if (!result) {
      // Should never happen since we checked legality above, but be safe.
      this.safeSend(socket, {
        type: MOVE,
        payload: { ok: false, reason: "move_failed" },
      });
      return;
    }

    // Record move in history for DB persistence and client replay.
    this.moveHistory.push({
      moveNum: this.moveHistory.length + 1,
      from: move.from,
      to: move.to,
      san: result.san,
      fen: this.board.fen(),
      timestamp: now,
    });

    // Clear any pending draw offer when a move is made.
    this.drawOfferFrom = null;

    // ── Broadcast move to both players ──────────────────────────────
    const moveMessage = {
      type: MOVE,
      payload: {
        ok: true,
        move: { from: move.from, to: move.to },
        san: result.san,
        board: this.board.fen(),
        turn: this.board.turn() === "w" ? "white" : "black",
        timeLeft: this.timeLeft,
        players: { white: this.white.name, black: this.black.name },
        moveHistory: this.moveHistory,
      },
    };

    this.sendToBoth(moveMessage);

    // ── Check end conditions ────────────────────────────────────────
    if (this.board.isCheckmate()) {
      const loser = this.board.turn() === "w" ? "white" : "black";
      const winner: Color = loser === "white" ? "black" : "white";
      this.endGame("checkmate", winner);
      return;
    }

    if (
      this.board.isStalemate() ||
      this.board.isInsufficientMaterial() ||
      this.board.isThreefoldRepetition() ||
      this.board.isDraw()
    ) {
      this.endGame("draw", null);
      return;
    }

    // ── Restart clock for the next player ────────────────────────────
    const nextTurn: Color = this.board.turn() === "w" ? "white" : "black";
    this.startClock(nextTurn);
  }

  // ══════════════════════════════════════════════════════════════════
  //  PUBLIC: resign
  // ══════════════════════════════════════════════════════════════════
  resign(socket: WebSocket) {
    if (this.ended) return;

    const resigner: Color = socket === this.white.socket ? "white" : "black";
    const winner: Color = resigner === "white" ? "black" : "white";
    this.endGame("resignation", winner, `${resigner}_resigned`);
  }

  // ══════════════════════════════════════════════════════════════════
  //  PUBLIC: offerDraw / respondToDraw
  // ══════════════════════════════════════════════════════════════════
  offerDraw(socket: WebSocket) {
    if (this.ended) return;

    const offerer: Color = socket === this.white.socket ? "white" : "black";

    // Can't offer draw to yourself twice in a row.
    if (this.drawOfferFrom === offerer) return;

    this.drawOfferFrom = offerer;
    const opponent = offerer === "white" ? this.black : this.white;

    this.safeSend(opponent.socket, {
      type: OFFER_DRAW,
      payload: { from: offerer },
    });
  }

  respondToDraw(socket: WebSocket, accept: boolean) {
    if (this.ended || !this.drawOfferFrom) return;

    // Only the player who received the offer can respond.
    const responder: Color = socket === this.white.socket ? "white" : "black";
    if (responder === this.drawOfferFrom) return;

    if (accept) {
      this.endGame("draw", null, "draw_agreed");
    } else {
      // Notify the offerer that their draw was declined.
      const offerer = this.drawOfferFrom === "white" ? this.white : this.black;
      this.safeSend(offerer.socket, {
        type: DRAW_RESPONSE,
        payload: { accepted: false },
      });
      this.drawOfferFrom = null;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  PUBLIC: sendChatMessage
  // ══════════════════════════════════════════════════════════════════
  sendChatMessage(senderSocket: WebSocket, text: string) {
    if (this.ended) return;

    const senderName = senderSocket === this.white.socket
      ? this.white.name
      : this.black.name;

    const trimmed = typeof text === "string" ? text.trim().slice(0, 1000) : "";

    this.sendToBoth({
      type: CHAT_MESSAGE,
      payload: { sender: senderName, text: trimmed },
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  PUBLIC: handleDisconnect
  //  Called by GameManager when a player's socket closes.
  //  The opponent wins by forfeit.
  // ══════════════════════════════════════════════════════════════════
  handleDisconnect(disconnectedSocket: WebSocket) {
    if (this.ended) return;

    const disconnectedColor: Color =
      disconnectedSocket === this.white.socket ? "white" : "black";
    const winner: Color = disconnectedColor === "white" ? "black" : "white";

    this.endGame("abandonment", winner, `${disconnectedColor}_disconnected`);
  }

  // ══════════════════════════════════════════════════════════════════
  //  PUBLIC: replaceSocket
  //  Swaps a dead socket for a new one during reconnection.
  // ══════════════════════════════════════════════════════════════════
  replaceSocket(userId: number, newSocket: WebSocket): boolean {
    if (this.white.userId === userId) {
      this.white.socket = newSocket;
      return true;
    }
    if (this.black.userId === userId) {
      this.black.socket = newSocket;
      return true;
    }
    return false;
  }

  // ══════════════════════════════════════════════════════════════════
  //  PUBLIC: getFullState
  //  Returns everything the client needs to restore a game mid-progress.
  //  Used when a player reconnects after a dropped connection.
  // ══════════════════════════════════════════════════════════════════
  getFullState(forUserId: number) {
    const isWhite = this.white.userId === forUserId;
    return {
      type: GAME_STATE,
      payload: {
        gameId: this.id,
        color: isWhite ? "white" : "black",
        name: isWhite ? this.white.name : this.black.name,
        opponent: isWhite ? this.black.name : this.white.name,
        board: this.board.fen(),
        turn: this.board.turn() === "w" ? "white" : "black",
        timeLeft: this.timeLeft,
        players: { white: this.white.name, black: this.black.name },
        moveHistory: this.moveHistory,
        started: true,
        ended: this.ended,
      },
    };
  }

  // Check if a userId belongs to this game.
  hasPlayer(userId: number): boolean {
    return this.white.userId === userId || this.black.userId === userId;
  }

  isEnded(): boolean {
    return this.ended;
  }

  // ══════════════════════════════════════════════════════════════════
  //  PRIVATE: Clock management
  // ══════════════════════════════════════════════════════════════════

  // Starts a real timer for the given color. When it fires, that
  // player loses on time — no move needed to trigger it.
  private startClock(color: Color) {
    this.clearClock();

    const remaining = this.timeLeft[color];
    if (remaining <= 0) {
      const winner: Color = color === "white" ? "black" : "white";
      this.endGame("timeout", winner, `${color}_flag_fall`);
      return;
    }

    this.clockTimer = setTimeout(() => {
      // Double-check that the game hasn't ended while the timer was waiting.
      if (this.ended) return;

      // Deduct any remaining time.
      const now = Date.now();
      const elapsed = now - this.lastMoveTime;
      this.timeLeft[color] = Math.max(0, this.timeLeft[color] - elapsed);

      const winner: Color = color === "white" ? "black" : "white";
      this.endGame("timeout", winner, `${color}_flag_fall`);
    }, remaining);
  }

  private clearClock() {
    if (this.clockTimer) {
      clearTimeout(this.clockTimer);
      this.clockTimer = null;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  PRIVATE: endGame
  //  Central exit point for ALL game-ending conditions.
  //  Persists the completed game to the database.
  // ══════════════════════════════════════════════════════════════════
  private async endGame(
    result: "checkmate" | "draw" | "timeout" | "resignation" | "abandonment",
    winnerColor: Color | null,
    reason?: string
  ) {
    if (this.ended) return;
    this.ended = true;
    this.clearClock();

    const winnerPlayer = winnerColor === "white" ? this.white : winnerColor === "black" ? this.black : null;
    const winnerName = winnerPlayer?.name ?? null;
    const winnerId = winnerPlayer?.userId ?? null;

    gameLog.info(
      { gameId: this.id, result, winner: winnerName, reason, moves: this.moveHistory.length },
      "game ended"
    );

    // Notify both players.
    this.sendToBoth({
      type: GAME_OVER,
      payload: {
        result,
        winner: winnerColor,
        winnerName,
        reason: reason ?? null,
        players: { white: this.white.name, black: this.black.name },
        board: this.board.fen(),
        timeLeft: this.timeLeft,
        moveHistory: this.moveHistory,
      },
    });

    // ── Persist to database ──────────────────────────────────────────
    // We fire-and-forget the DB write so it doesn't block the WS response.
    this.persistGame(result, winnerId, reason ?? result).catch((err) => {
      gameLog.error({ gameId: this.id, err }, "failed to save game to database");
    });

    // Tell the GameManager to clean up its maps for this game.
    if (this.onGameEnd) {
      this.onGameEnd(this);
    }
  }

  private async persistGame(result: string, winnerId: number | null, endReason: string) {
    await prisma.game.create({
      data: {
        id: this.id,
        whitePlayerId: this.white.userId,
        blackPlayerId: this.black.userId,
        winnerId,
        result,
        endReason,
        pgn: this.board.pgn(),
        finalFen: this.board.fen(),
        timeControl: this.initialTimeMs,
        endedAt: new Date(),
        moves: {
          create: this.moveHistory.map((m) => ({
            moveNum: m.moveNum,
            from: m.from,
            to: m.to,
            san: m.san,
            fen: m.fen,
          })),
        },
      },
    });

    gameLog.info({ gameId: this.id }, "game saved to database");
  }

  // ══════════════════════════════════════════════════════════════════
  //  PRIVATE: Send helpers
  // ══════════════════════════════════════════════════════════════════

  private sendToBoth(payload: any) {
    this.safeSend(this.white.socket, payload);
    this.safeSend(this.black.socket, payload);
  }

  private safeSend(ws: WebSocket, payload: any) {
    try {
      if ((ws as any).readyState === (WebSocket as any).OPEN) {
        ws.send(JSON.stringify(payload));
      }
    } catch {
      // Swallow send errors — the socket is dead or closing.
    }
  }
}
