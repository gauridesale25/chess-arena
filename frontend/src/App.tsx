import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { ChessBoard } from "./components/ChessBoard";

function App() {
  const [chess] = useState(() => new Chess());
  const [board, setBoard] = useState(chess.board());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(
    null,
  );
  const [flipped, setFlipped] = useState(false);
  const [historyLog, setHistoryLog] = useState<string[]>([]);

  const turn = chess.turn() === "w" ? "white" : "black";

  const status = useMemo(() => {
    if (chess.isCheckmate())
      return `Checkmate — ${turn === "white" ? "Black" : "White"} wins!`;
    if (chess.isStalemate()) return "Stalemate — draw";
    if (chess.isDraw()) return "Draw";
    if (chess.inCheck())
      return `${turn === "white" ? "White" : "Black"} is in check`;
    return `${turn === "white" ? "White" : "Black"} to move`;
  }, [chess, turn, historyLog]);

  function selectSquare(square: string) {
    setSelectedSquare(square);
    const moves = chess.moves({ square: square as Square, verbose: true });
    setValidMoves(moves.map((m) => m.to));
  }

  function clearSelection() {
    setSelectedSquare(null);
    setValidMoves([]);
  }

  function handleSquareClick(square: string) {
    const piece = chess.get(square as Square);

    // No selection yet — select own piece
    if (!selectedSquare) {
      if (piece && piece.color === chess.turn()) selectSquare(square);
      return;
    }

    // Clicking the same square deselects
    if (square === selectedSquare) {
      clearSelection();
      return;
    }

    // Clicking a valid target — attempt the move
    if (validMoves.includes(square)) {
      const movingPiece = chess.get(selectedSquare as Square);
      const isPromotion =
        movingPiece?.type === "p" && (square[1] === "8" || square[1] === "1");

      const result = chess.move({
        from: selectedSquare,
        to: square,
        promotion: isPromotion ? "q" : undefined,
      });

      if (result) {
        setBoard(chess.board());
        setHistoryLog(chess.history());
        setLastMove({ from: result.from, to: result.to });
      }
      clearSelection();
      return;
    }

    // Clicking another own piece — switch selection
    if (piece && piece.color === chess.turn()) {
      selectSquare(square);
      return;
    }

    clearSelection();
  }

  function handleReset() {
    chess.reset();
    setBoard(chess.board());
    setHistoryLog([]);
    setLastMove(null);
    clearSelection();
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-text flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-app-accent">
        chessss
      </h1>

      <div className="w-full max-w-[560px] aspect-square">
        <ChessBoard
          board={board}
          flipped={flipped}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          lastMove={lastMove}
          onSquareClick={handleSquareClick}
        />
      </div>

      <div className="flex items-center gap-4">
        <span className="px-4 py-2 rounded-lg bg-app-panel border border-app-border text-sm font-medium">
          {status}
        </span>
        <button
          onClick={() => setFlipped((f) => !f)}
          className="px-4 py-2 rounded-lg bg-app-panel border border-app-border hover:border-app-accent transition-colors text-sm"
        >
          Flip board
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-lg bg-app-accent text-app-bg font-semibold hover:opacity-90 transition-opacity text-sm"
        >
          New game
        </button>
      </div>

      {historyLog.length > 0 && (
        <div className="w-full max-w-[560px] text-xs text-app-text-muted text-center">
          {historyLog.join(" ")}
        </div>
      )}
    </div>
  );
}

export default App;
