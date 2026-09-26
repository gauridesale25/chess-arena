// ── WebSocket message types ──────────────────────────────────────────
// Shared string constants for the "type" field of every WS message.
// The frontend mirrors these exactly for routing.

// Matchmaking / lifecycle
export const JOIN_QUEUE = "join_queue";
export const GAME_START = "game_start";
export const GAME_OVER = "game_over";

// Gameplay
export const MOVE = "move";

// Connection health
export const OPPONENT_DISCONNECTED = "opponent_disconnected";
export const OPPONENT_RECONNECTED = "opponent_reconnected";
export const RECONNECT = "reconnect";
export const GAME_STATE = "game_state";

// Server → client error messages
export const ERROR = "error";
