import { Request, Response } from 'express';
import { userSchema } from '../schemas/user.schema';
import { comparePassword, hashPassword } from '../utils/hash';
import prisma from '../utils/prisma';
import { env } from '../utils/env';
import { authLog } from '../utils/logger';
import jwt from 'jsonwebtoken';
export const signup = async (req: Request, res: Response) => {
    const result = userSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
    }

    const { email, password, } = result.data;

    try {
        const existingUser = await prisma.user.findUnique({ where: { Email: email } });

        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const hashedPassword = await hashPassword(password);

        const newUser = await prisma.user.create({
            data: {
                Email: email,
                Password: hashedPassword,
                Rating: 1200,
                
            },
        });

        const token = jwt.sign(
            { userId: newUser.id },
            env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const safeUser = {
            id: newUser.id,
            email: newUser.Email,
            rating: newUser.Rating
        };

        return res.status(201).json({
            message: "User created successfully",
            token,
            user: safeUser
        });

    } catch (e) {
        authLog.error(e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const login = async (req: Request, res: Response) => {
    const result = userSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ message: 'Validation failed' });
    }

    const { email, password } = result.data;

    try {
        const user = await prisma.user.findUnique({ where: { Email: email } });

        if (!user || !(await comparePassword(password, user.Password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // ✅ Generate JWT
        const token = jwt.sign(
            { userId: user.id },
            env.JWT_SECRET,
            { expiresIn: '1h' }
        );



        // ✅ Send only safe user data
        const safeUser = {
            id: user.id,
            email: user.Email,
            rating: user.Rating || 1200, // default if null
            
        };

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: safeUser
        });

    } catch (error) {
        authLog.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// ── Google OAuth Login ──────────────────────────────────────────────
// Frontend sends Google user info after getting it from Google's API.
// We find or create the user in our DB, then return a JWT so the
// WebSocket can authenticate them.
export const googleLogin = async (req: Request, res: Response) => {
    const { email, name, picture } = req.body;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Find existing user or create a new one.
        // Google users don't have a password — they auth via Google.
        let user = await prisma.user.findUnique({ where: { Email: email } });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    Email: email,
                    Password: '', // no password for Google users
                    Rating: 1200,
                },
            });
            authLog.info({ email }, 'new Google user created');
        }

        const token = jwt.sign(
            { userId: user.id },
            env.JWT_SECRET,
            { expiresIn: '7d' } // longer expiry for Google users
        );

        return res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.Email,
                rating: user.Rating || 1200,
                name: name || undefined,
                picture: picture || undefined,
            },
        });
    } catch (error) {
        authLog.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
