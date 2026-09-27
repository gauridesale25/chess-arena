import { Router } from "express";
import { getMyGames, getGameDetail } from "../controllers/game.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Both routes require authentication.
router.get("/me", authMiddleware, getMyGames);
router.get("/:gameId", authMiddleware, getGameDetail);

export default router;
