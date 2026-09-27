// ── WebSocket Message Types ─────────────────────────────────────────
// These string constants are the "type" field in every WS message.
// Both the frontend and backend use matching constants for routing.

// Core game lifecycle
export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";

// In-game communication
export const CHAT_MESSAGE = "chat_message";

// Player actions
export const RESIGN = "resign";
export const OFFER_DRAW = "offer_draw";
export const DRAW_RESPONSE = "draw_response";

// Reconnection — when a player refreshes or drops connection mid-game
export const RECONNECT = "reconnect";
export const GAME_STATE = "game_state";

// Server → client error messages
export const ERROR = "error";