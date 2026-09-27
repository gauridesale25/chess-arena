import { Request, Response, NextFunction } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Endpoint to analyze the current chess board position using either Gemini or Grok APIs.
 * Supports custom client-supplied keys sent in headers or falls back to server-side keys.
 * POST /api/coach/analyze
 * 
 * Body: { fen: string, pgn?: string, engine?: "gemini" | "grok" }
 */
export const analyzePosition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fen, pgn, engine = "gemini" } = req.body;

    if (!fen) {
      res.status(400).json({ error: "Missing FEN string in request body." });
      return;
    }

    const clientGeminiKey = req.headers["x-gemini-key"] as string | undefined;
    const clientGrokKey = req.headers["x-grok-key"] as string | undefined;

    // Common Coach Garry Prompt Instruction
    const systemPrompt = `You are Garry, a friendly and experienced Grandmaster chess coach. 
Analyze the current board state and give advice.

Current Board state (FEN): ${fen}
Game History (PGN): ${pgn || "No moves played yet."}

Please provide:
1. A quick strategic evaluation of the current position (who is better, key threats, pawn structure).
2. Practical advice: warn the player about any vulnerabilities (like pins, forks, undefended pieces) or validate their last move.
3. Strategic ideas: point them in the right direction (e.g., "try to control the d-file", "develop your bishop") without giving the exact coordinate move (like 'e2e4'), unless it's a critical tactical forced sequence.

Keep your response encouraging, clear, and around 2 to 3 concise paragraphs. Do not use markdown headers (like # or ##), but you can use bolding or bullet points where appropriate. Avoid any robotic AI-like meta-comments.`;

    if (engine === "grok") {
      const activeKey = clientGrokKey || process.env.GROK_API_KEY;

      if (!activeKey) {
        res.status(400).json({
          error: "No Grok API key found. Please enter your Grok API key in Settings to use the Grok Coach!"
        });
        return;
      }

      // Query xAI Grok completions API (OpenAI compatible REST endpoint)
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeKey}`
        },
        body: JSON.stringify({
          model: "grok-beta",
          messages: [
            { role: "system", content: "You are Garry, a friendly and experienced Grandmaster chess coach." },
            { role: "user", content: systemPrompt }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Grok API Error: ${response.status} - ${errText}`);
      }

      const data: any = await response.json();
      const text = data.choices?.[0]?.message?.content;

      res.json({
        analysis: text || "Grok couldn't think of anything. Try asking again!"
      });
      return;
    } else {
      // Default to Gemini
      const activeKey = clientGeminiKey || process.env.GEMINI_API_KEY;

      if (!activeKey) {
        // Friendly fallback if neither client nor developer has configured the key
        res.json({
          analysis: "👋 Welcome! Live AI Coaching is currently running in preview mode. To activate the full Grandmaster commentary, please set your GEMINI_API_KEY in backend1/.env or enter your own key in settings!\n\nFrom the current board state, make sure to develop your pieces, control the center squares, and prioritize king safety!"
        });
        return;
      }

      // Initialize the Gemini API client using the active key
      const genAI = new GoogleGenerativeAI(activeKey);
      
      // Using gemini-2.5-flash for fast, responsive natural language generation
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();

      res.json({
        analysis: text || "Garry is scratching his head and couldn't think of anything. Try asking again on your next move!"
      });
    }
  } catch (error) {
    console.error("AI Coach error during chess analysis:", error);
    res.status(500).json({ 
      error: "Failed to communicate with the Chess Coach API. Make sure your key is active/valid and try again." 
    });
  }
};
