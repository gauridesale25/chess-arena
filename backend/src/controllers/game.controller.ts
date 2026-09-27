import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { gameLog } from "../utils/logger";

// ── Game History Controller ─────────────────────────────────────────
// REST endpoints for viewing completed games and their moves.
// Used by the Review screen on the frontend.

// GET /api/games/me?page=1&limit=10
// Returns the authenticated user's completed games, newest first.
export const getMyGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    // Fetch games where this user played as white OR black.
    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where: {
          OR: [
            { whitePlayerId: userId },
            { blackPlayerId: userId },
          ],
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          User_Game_whitePlayerIdToUser: { select: { Email: true, Rating: true } },
          User_Game_blackPlayerIdToUser: { select: { Email: true, Rating: true } },
          _count: { select: { moves: true } },
        },
      }),
      prisma.game.count({
        where: {
          OR: [
            { whitePlayerId: userId },
            { blackPlayerId: userId },
          ],
        },
      }),
    ]);

    // Transform the raw DB rows into a clean API response.
    const gameList = games.map((g) => ({
      id: g.id,
      whitePlayer: g.User_Game_whitePlayerIdToUser?.Email ?? "Unknown",
      blackPlayer: g.User_Game_blackPlayerIdToUser?.Email ?? "Unknown",
      result: g.result,
      endReason: g.endReason,
      createdAt: g.createdAt,
      endedAt: g.endedAt,
      moveCount: g._count.moves,
      // Did this user win, lose, or draw?
      outcome: g.result === "draw"
        ? "draw"
        : g.winnerId === userId
          ? "win"
          : "loss",
    }));

    res.json({ games: gameList, total, page, limit });
  } catch (err) {
    gameLog.error(err, "failed to fetch user games");
    res.status(500).json({ error: "Failed to fetch games" });
  }
};

// GET /api/games/:gameId
// Returns full game detail including all moves for replay.
export const getGameDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId } = req.params;
    const userId = req.user!.userId;

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        User_Game_whitePlayerIdToUser: { select: { Email: true, Rating: true } },
        User_Game_blackPlayerIdToUser: { select: { Email: true, Rating: true } },
        moves: {
          orderBy: { moveNum: "asc" },
        },
      },
    });

    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    // Only let the game's participants view the detail.
    if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
      res.status(403).json({ error: "Not authorized to view this game" });
      return;
    }

    res.json({
      game: {
        id: game.id,
        whitePlayer: game.User_Game_whitePlayerIdToUser?.Email ?? "Unknown",
        blackPlayer: game.User_Game_blackPlayerIdToUser?.Email ?? "Unknown",
        result: game.result,
        endReason: game.endReason,
        pgn: game.pgn,
        finalFen: game.finalFen,
        timeControl: game.timeControl,
        createdAt: game.createdAt,
        endedAt: game.endedAt,
        moves: game.moves.map((m) => ({
          moveNum: m.moveNum,
          from: m.from,
          to: m.to,
          san: m.san,
          fen: m.fen,
        })),
      },
    });
  } catch (err) {
    gameLog.error(err, "failed to fetch game detail");
    res.status(500).json({ error: "Failed to fetch game detail" });
  }
};
