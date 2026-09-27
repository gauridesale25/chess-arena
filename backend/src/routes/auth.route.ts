import { Router } from "express";
import { login, signup, googleLogin } from "../controllers/auth.controller";

const router = Router();

router.post('/signup', signup);
router.post('/login' , login);
router.post('/google', googleLogin);

export default router;