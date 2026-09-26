import type { Color, PieceSymbol, Square } from "chess.js";

type BoardSquare = {
  square: Square;
  type: PieceSymbol;
  color: Color;
} | null;

interface ChessBoardProps {
  board: BoardSquare[][];
  flipped: boolean;
  selectedSquare: string | null;
  validMoves: string[];
  lastMove: { from: string; to: string } | null;
  onSquareClick: (square: string) => void;
}

// Maps chess.js piece data to image filenames in /public
function getPieceImage(color: Color, type: PieceSymbol): string {
  const prefix = color === "b" ? "b" : "w";
  return `/${prefix}${type.toUpperCase()}.png`;
}

export const ChessBoard = ({
  board,
  flipped,
  selectedSquare,
  validMoves,
  lastMove,
  onSquareClick,
}: ChessBoardProps) => {
  const colIndices = flipped
    ? [7, 6, 5, 4, 3, 2, 1, 0]
    : [0, 1, 2, 3, 4, 5, 6, 7];
  const displayRows = flipped ? [...board].reverse() : board;

  return (
    <div className="w-full h-full select-none rounded-xl overflow-hidden shadow-2xl border-4 border-app-border">
      <div
        className="grid w-full h-full"
        style={{
          gridTemplateColumns: "repeat(8, 1fr)",
          gridTemplateRows: "repeat(8, 1fr)",
        }}
      >
        {displayRows.map((row, displayRowIdx) => {
          const actualRow = flipped ? 7 - displayRowIdx : displayRowIdx;

          return colIndices.map((actualCol) => {
            const file = String.fromCharCode(97 + actualCol); // 'a' to 'h'
            const rank = `${8 - actualRow}`; // '8' to '1'
            const squareName = `${file}${rank}`;
            const piece = row[actualCol];
            const isValidTarget = validMoves.includes(squareName);
            const hasPiece = piece !== null;

            const isLight = (actualRow + actualCol) % 2 === 0;

            const showRankLabel = actualCol === (flipped ? 7 : 0);
            const showFileLabel = actualRow === (flipped ? 0 : 7);

            return (
              <div
                key={squareName}
                className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 ${
                  isLight ? "bg-board-light" : "bg-board-dark"
                }`}
                onClick={() => onSquareClick(squareName)}
              >
                {/* Selection highlight */}
                {squareName === selectedSquare && (
                  <div className="absolute inset-0 bg-board-select/30 border-2 border-board-select shadow-[inset_0_0_8px_rgba(250,204,21,0.5)] pointer-events-none z-10" />
                )}

                {/* Last move indicator */}
                {lastMove &&
                  (squareName === lastMove.from ||
                    squareName === lastMove.to) && (
                    <div className="absolute inset-0 bg-board-move/20 border border-board-move/60 pointer-events-none z-10" />
                  )}

                {/* Rank label (1-8 on left edge) */}
                {showRankLabel && (
                  <span
                    className="absolute top-1 left-1.5 font-black pointer-events-none select-none opacity-50"
                    style={{
                      color: isLight
                        ? "var(--color-board-dark)"
                        : "var(--color-board-light)",
                      fontSize: "0.6rem",
                    }}
                  >
                    {rank}
                  </span>
                )}

                {/* File label (a-h on bottom edge) */}
                {showFileLabel && (
                  <span
                    className="absolute bottom-1 right-1.5 font-black pointer-events-none select-none opacity-50"
                    style={{
                      color: isLight
                        ? "var(--color-board-dark)"
                        : "var(--color-board-light)",
                      fontSize: "0.6rem",
                    }}
                  >
                    {file}
                  </span>
                )}

                {/* Valid move indicator (empty square) */}
                {isValidTarget && !hasPiece && (
                  <div className="absolute w-[24%] h-[24%] rounded-full bg-board-move/70 pointer-events-none z-10 shadow-[0_0_6px_rgba(0,0,0,0.25)]" />
                )}

                {/* Valid capture indicator (ring around enemy piece) */}
                {isValidTarget && hasPiece && (
                  <div className="absolute inset-[6%] rounded-full border-2 border-board-move pointer-events-none z-10 animate-pulse" />
                )}

                {/* Piece image */}
                {piece && (
                  <img
                    src={getPieceImage(piece.color, piece.type)}
                    alt={`${piece.color}${piece.type}`}
                    className="w-[84%] h-[84%] object-contain pointer-events-none drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)] hover:scale-105 transition-transform duration-200 relative z-20"
                    draggable={false}
                  />
                )}
              </div>
            );
          });
        })}
      </div>
    </div>
  );
};
