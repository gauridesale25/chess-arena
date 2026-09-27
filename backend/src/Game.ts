import { WebSocket } from "ws";
import { Chess } from "chess.js";
import crypto from "crypto";
import { GAME_OVER, GAME_START, MOVE } from "./messages";
import { gameLog } from "./utils/logger";

export type Color = "white" | "black";

// ── Player ────────────────────────────────────────────────────────
// No auth yet (Phase 5) — players are identified by a random
// reconnect token issued when the game starts, not a DB user id.
export interface Player {
  socket: WebSocket;
  token: string;
  name: string;
}

interface MoveRecord {
  moveNum: number;
  from: string;
  to: string;
  san: string;
  fen: string;
  timestamp: number;
}

const DEFAULT_TIME_MS = 5 * 60 * 1000;

// ── Game ──────────────────────────────────────────────────────────
// One active game: board state, per-side clocks, and server-side
// move validation via chess.js. The client is never trusted —
// every move is re-validated here before being broadcast.
export class Game {
  public readonly id: string;
  public white: Player;
  public black: Player;
  public board: Chess;
  private moveHistory: MoveRecord[] = [];
  private lastMoveTime: number;
  public timeLeft: { white: number; black: number };
  private ended = false;
  private clockTimer: ReturnType<typeof setTimeout> | null = null;
  private onGameEnd: ((game: Game) => void) | null = null;

  constructor(
    white: Player,
    black: Player,
    initialTimeMs = DEFAULT_TIME_MS,
    onGameEnd?: (game: Game) => void,
  ) {
    this.id = crypto.randomUUID();
    this.white = white;
    this.black = black;
    this.board = new Chess();
    this.lastMoveTime = Date.now();
    this.timeLeft = { white: initialTimeMs, black: initialTimeMs };
    this.onGameEnd = onGameEnd ?? null;

    gameLog.info(
      { gameId: this.id, white: white.name, black: black.name },
      "game started",
    );

    this.safeSend(this.white.socket, {
      type: GAME_START,
      payload: {
        gameId: this.id,
        color: "white",
        token: this.white.token,
        opponent: this.black.name,
        timeLeft: this.timeLeft,
      },
    });

    this.safeSend(this.black.socket, {
      type: GAME_START,
      payload: {
        gameId: this.id,
        color: "black",
        token: this.black.token,
        opponent: this.white.name,
        timeLeft: this.timeLeft,
      },
    });

    this.startClock("white");
  }

  // ── makeMove ──────────────────────────────────────────────────────
  makeMove(
    socket: WebSocket,
    move: { from: string; to: string; promotion?: string },
  ) {
    if (this.ended) return;

    const turnColor: Color = this.board.turn() === "w" ? "white" : "black";
    const expectedSocket =
      turnColor === "white" ? this.white.socket : this.black.socket;

    if (socket !== expectedSocket) {
      this.safeSend(socket, {
        type: MOVE,
        payload: { ok: false, reason: "not_your_turn" },
      });
      return;
    }

    const legalMoves = this.board.moves({ verbose: true });
    const isLegal = legalMoves.some(
      (m) => m.from === move.from && m.to === move.to,
    );

    if (!isLegal) {
      this.safeSend(socket, {
        type: MOVE,
        payload: { ok: false, reason: "illegal_move", move },
      });
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastMoveTime;
    this.timeLeft[turnColor] -= elapsed;
    this.lastMoveTime = now;

    if (this.timeLeft[turnColor] <= 0) {
      this.timeLeft[turnColor] = 0;
      this.endGame("timeout", turnColor === "white" ? "black" : "white");
      return;
    }

    const result = this.board.move({
      from: move.from,
      to: move.to,
      promotion: (move.promotion as "q" | "r" | "b" | "n" | undefined) || "q",
    });

    if (!result) {
      this.safeSend(socket, {
        type: MOVE,
        payload: { ok: false, reason: "move_failed" },
      });
      return;
    }

    this.moveHistory.push({
      moveNum: this.moveHistory.length + 1,
      from: move.from,
      to: move.to,
      san: result.san,
      fen: this.board.fen(),
      timestamp: now,
    });

    this.sendToBoth({
      type: MOVE,
      payload: {
        ok: true,
        move: { from: move.from, to: move.to },
        san: result.san,
        board: this.board.fen(),
        turn: this.board.turn() === "w" ? "white" : "black",
        timeLeft: this.timeLeft,
        moveHistory: this.moveHistory,
      },
    });

    if (this.board.isCheckmate()) {
      const loser: Color = this.board.turn() === "w" ? "white" : "black";
      this.endGame("checkmate", loser === "white" ? "black" : "white");
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

    this.startClock(this.board.turn() === "w" ? "white" : "black");
  }

  // ── Disconnect / reconnect ─────────────────────────────────────────
  // Called by GameManager once a disconnect grace period expires
  // without the player reconnecting.
  forfeit(color: Color) {
    if (this.ended) return;
    this.endGame(
      "abandonment",
      color === "white" ? "black" : "white",
      `${color}_disconnected`,
    );
  }

  replaceSocket(token: string, newSocket: WebSocket): Color | null {
    if (this.white.token === token) {
      this.white.socket = newSocket;
      return "white";
    }
    if (this.black.token === token) {
      this.black.socket = newSocket;
      return "black";
    }
    return null;
  }

  getFullState(token: string) {
    const isWhite = this.white.token === token;
    return {
      type: GAME_START,
      payload: {
        gameId: this.id,
        color: isWhite ? "white" : "black",
        token,
        opponent: isWhite ? this.black.name : this.white.name,
        board: this.board.fen(),
        turn: this.board.turn() === "w" ? "white" : "black",
        timeLeft: this.timeLeft,
        moveHistory: this.moveHistory,
        resumed: true,
      },
    };
  }

  hasToken(token: string): boolean {
    return this.white.token === token || this.black.token === token;
  }

  isEnded(): boolean {
    return this.ended;
  }

  // ── Clock management ────────────────────────────────────────────
  // A real setTimeout (not lazy per-move checking) so AFK players
  // who never move still lose on time.
  private startClock(color: Color) {
    this.clearClock();

    const remaining = this.timeLeft[color];
    if (remaining <= 0) {
      this.endGame("timeout", color === "white" ? "black" : "white");
      return;
    }

    this.clockTimer = setTimeout(() => {
      if (this.ended) return;
      const now = Date.now();
      const elapsed = now - this.lastMoveTime;
      this.timeLeft[color] = Math.max(0, this.timeLeft[color] - elapsed);
      this.endGame("timeout", color === "white" ? "black" : "white");
    }, remaining);
  }

  private clearClock() {
    if (this.clockTimer) {
      clearTimeout(this.clockTimer);
      this.clockTimer = null;
    }
  }

  private endGame(
    result: "checkmate" | "draw" | "timeout" | "abandonment",
    winner: Color | null,
    reason?: string,
  ) {
    if (this.ended) return;
    this.ended = true;
    this.clearClock();

    gameLog.info({ gameId: this.id, result, winner, reason }, "game ended");

    this.sendToBoth({
      type: GAME_OVER,
      payload: {
        result,
        winner,
        reason: reason ?? result,
        board: this.board.fen(),
      },
    });

    this.onGameEnd?.(this);
  }

  private sendToBoth(message: unknown) {
    this.safeSend(this.white.socket, message);
    this.safeSend(this.black.socket, message);
  }

  private safeSend(socket: WebSocket, message: unknown) {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }
}
