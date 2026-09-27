import { z } from 'zod';

// ── WebSocket Message Validation ────────────────────────────────────
// Every incoming WS message is validated before being processed.
// This prevents malformed or malicious payloads from crashing the game.

// Valid chess square: a1 through h8
const squarePattern = /^[a-h][1-8]$/;
const chessSquare = z.string().regex(squarePattern, 'Must be a valid chess square (a1-h8)');

// Promotion piece — only matters for pawn reaching 8th rank
const promotionPiece = z.enum(['q', 'r', 'b', 'n']).optional();

// ── Individual message schemas ──────────────────────────────────────

export const initGameSchema = z.object({
  type: z.literal('init_game'),
  payload: z.object({
    name: z.string().max(100).optional(),
  }),
});

export const moveSchema = z.object({
  type: z.literal('move'),
  payload: z.object({
    move: z.object({
      from: chessSquare,
      to: chessSquare,
      promotion: promotionPiece,
    }),
  }),
});

export const chatSchema = z.object({
  type: z.literal('chat_message'),
  payload: z.object({
    text: z.string().min(1).max(1000),
  }),
});

export const resignSchema = z.object({
  type: z.literal('resign'),
});

export const offerDrawSchema = z.object({
  type: z.literal('offer_draw'),
});

export const drawResponseSchema = z.object({
  type: z.literal('draw_response'),
  payload: z.object({
    accept: z.boolean(),
  }),
});

export const reconnectSchema = z.object({
  type: z.literal('reconnect'),
  payload: z.object({
    gameId: z.string().uuid(),
  }),
});

// ── Top-level validator ─────────────────────────────────────────────
// Tries each schema in order. Returns the parsed message or null.
// This is the single entry point for all WS message validation.

const schemas = [
  initGameSchema,
  moveSchema,
  chatSchema,
  resignSchema,
  offerDrawSchema,
  drawResponseSchema,
  reconnectSchema,
] as const;

export type ValidMessage = z.infer<typeof schemas[number]>;

export function validateWsMessage(raw: unknown): ValidMessage | null {
  if (typeof raw !== 'object' || raw === null || !('type' in raw)) {
    return null;
  }

  for (const schema of schemas) {
    const result = schema.safeParse(raw);
    if (result.success) {
      return result.data as ValidMessage;
    }
  }

  return null;
}
