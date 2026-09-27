import { Router } from "express";
import { analyzePosition } from "../controllers/coach.controller";
import { rateLimiter } from "../middlewares/rateLimiter";

const router = Router();

router.post("/analyze", rateLimiter, analyzePosition);

export default router;
