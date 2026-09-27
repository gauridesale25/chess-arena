/**
 * StockfishEngine manages communication with the local Stockfish Web Worker
 * via the standard Universal Chess Interface (UCI) protocol.
 */
export class StockfishEngine {
  private worker: Worker | null = null;
  private onBestMoveCallback: ((move: string) => void) | null = null;

  constructor() {
    this.initWorker();
  }

  /**
   * Initializes the browser Web Worker pointing to public/stockfish.js.
   * This is done on-demand and kept as a single persistent instance.
   */
  private initWorker() {
    if (this.worker) return;

    try {
      // Load stockfish.js from the public directory (shares the same origin)
      this.worker = new Worker("/stockfish.js");

      // Handle message outputs from the Stockfish engine
      this.worker.onmessage = (e: MessageEvent) => {
        const line = e.data;
        
        // Stockfish outputs bestmove in the format: "bestmove e2e4 ponder e7e5"
        if (line.startsWith("bestmove")) {
          const parts = line.split(" ");
          const bestMove = parts[1]; // e.g., "e2e4"

          if (this.onBestMoveCallback && bestMove && bestMove !== "(none)") {
            this.onBestMoveCallback(bestMove);
            this.onBestMoveCallback = null;
          }
        }
      };

      // Initialize the UCI protocol handshake
      this.worker.postMessage("uci");
      this.worker.postMessage("isready");
    } catch (err) {
      console.error("Failed to initialize Stockfish worker:", err);
    }
  }

  /**
   * Calculates the best move for a given position FEN.
   * 
   * @param fen The Forsyth-Edwards Notation string representing the current board state
   * @param depth The calculation depth limit (higher is stronger but takes longer)
   * @param skillLevel The Stockfish skill level option (0 to 20)
   * @returns A promise that resolves to the best move string (e.g., "e2e4")
   */
  getBestMove(fen: string, depth: number, skillLevel: number): Promise<string> {
    return new Promise((resolve) => {
      // Re-initialize worker if it was terminated or failed earlier
      if (!this.worker) {
        this.initWorker();
      }

      if (!this.worker) {
        resolve(""); // Fallback in case worker is unavailable
        return;
      }

      // Register the resolve callback to trigger when the engine responds
      this.onBestMoveCallback = resolve;

      // Set engine options: Skill Level sets internal strength
      this.worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
      
      // Load current position FEN into the engine
      this.worker.postMessage(`position fen ${fen}`);
      
      // Instruct engine to start searching up to the specified depth
      this.worker.postMessage(`go depth ${depth}`);
    });
  }

  /**
   * Terminate the worker instance to release CPU resources.
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.onBestMoveCallback = null;
    }
  }
}

export const stockfishEngine = new StockfishEngine();
