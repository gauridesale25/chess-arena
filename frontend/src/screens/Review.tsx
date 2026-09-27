import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "../components/ChessBoard";
import { SideBar } from "../components/SideBar";
import { LoginSidebar } from "../components/LoginSidebar";
import { useAuth } from "../context/AuthContext";
import { sound } from "../utils/sound";
import axios from "axios";

// ── Types ───────────────────────────────────────────────────────────

interface GameSummary {
  id: string;
  whitePlayer: string;
  blackPlayer: string;
  result: string;
  endReason: string | null;
  createdAt: string;
  moveCount: number;
  outcome: "win" | "loss" | "draw";
}

interface MoveData {
  moveNum: number;
  from: string;
  to: string;
  san: string;
  fen: string;
}

interface GameDetail {
  id: string;
  whitePlayer: string;
  blackPlayer: string;
  result: string;
  endReason: string | null;
  pgn: string;
  finalFen: string | null;
  createdAt: string;
  endedAt: string | null;
  moves: MoveData[];
}

// ── API base URL ────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3000" : window.location.origin);

// ══════════════════════════════════════════════════════════════════════
//  Review Screen
//  Shows the user's completed game history. Clicking a game loads it
//  for move-by-move replay with board navigation and coach analysis.
// ══════════════════════════════════════════════════════════════════════
export default function Review() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  // ── Game list state ───────────────────────────────────────────────
  const [games, setGames] = useState<GameSummary[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  // ── Selected game replay state ────────────────────────────────────
  const [selectedGame, setSelectedGame] = useState<GameDetail | null>(null);
  const [movesList, setMovesList] = useState<string[]>([]);
  const [activeMoveIdx, setActiveMoveIdx] = useState(-1);
  const [flipped, setFlipped] = useState(false);

  const [chess, setChess] = useState(() => new Chess());
  const [board, setBoard] = useState(chess.board());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Auto-play state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(2000);
  const playIntervalRef = useRef<any>(null);

  // Coach state
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [aiEngine, setAiEngine] = useState<"gemini" | "grok">("gemini");

  const theme = {
    screenBg: isLoggedIn ? "bg-[#0a0d14]" : "bg-[#151413]",
    panelBg: isLoggedIn ? "bg-[#111625]" : "bg-[#1a1918]",
    panelBorder: isLoggedIn ? "border-[#1e293b]" : "border-[#2c2b2a]",
    textMuted: isLoggedIn ? "text-slate-400" : "text-zinc-500",
    btnPrimary: isLoggedIn
      ? "bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#0f172a]"
      : "bg-[#efebe4] hover:bg-[#e0dad0] text-[#1c1b1a]",
  };

  // ── Fetch user's game history ─────────────────────────────────────
  const fetchGames = async (pageNum: number) => {
    if (!isLoggedIn) return;

    setIsLoadingGames(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/games/me`, {
        params: { page: pageNum, limit: 10 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setGames(res.data.games);
      setTotalGames(res.data.total);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to fetch games:", err);
    } finally {
      setIsLoadingGames(false);
    }
  };

  // ── Fetch full game detail for replay ─────────────────────────────
  const loadGame = async (gameId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/games/${gameId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const game: GameDetail = res.data.game;
      setSelectedGame(game);
      setMovesList(game.moves.map((m) => m.san));
      setActiveMoveIdx(game.moves.length - 1);
      setCoachFeedback(null);
      setIsPlaying(false);
      sound.playMove();
    } catch (err) {
      console.error("Failed to load game:", err);
    }
  };

  // Load games on mount (if logged in).
  useEffect(() => {
    if (isLoggedIn) fetchGames(1);
  }, [isLoggedIn]);

  // ── Sync board to activeMoveIdx ───────────────────────────────────
  // Rebuilds the chess state from scratch up to the active move.
  useEffect(() => {
    const tempChess = new Chess();
    let moveObj = null;

    for (let i = 0; i <= activeMoveIdx; i++) {
      if (i < movesList.length) {
        moveObj = tempChess.move(movesList[i]);
      }
    }

    setChess(tempChess);
    setBoard(tempChess.board());
    setLastMove(moveObj ? { from: moveObj.from, to: moveObj.to } : null);
  }, [activeMoveIdx, movesList]);

  // ── Auto-play loop ────────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setActiveMoveIdx((prev) => {
          if (prev < movesList.length - 1) {
            sound.playMove();
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, playSpeed);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, movesList, playSpeed]);

  const handleNext = () => {
    if (activeMoveIdx < movesList.length - 1) {
      setActiveMoveIdx((prev) => prev + 1);
      sound.playMove();
    }
  };

  const handlePrev = () => {
    if (activeMoveIdx >= 0) {
      setActiveMoveIdx((prev) => prev - 1);
      sound.playMove();
    }
  };

  // ── Coach analysis ────────────────────────────────────────────────
  const askCoach = async () => {
    try {
      setIsCoachLoading(true);
      setCoachFeedback(null);

      const subMoves = movesList.slice(0, activeMoveIdx + 1);
      const res = await axios.post(
        `${API_URL}/api/coach/analyze`,
        {
          fen: chess.fen(),
          pgn: subMoves.join(" "),
          engine: aiEngine,
        },
        {
          headers: {
            "x-gemini-key": localStorage.getItem("user_gemini_key") || "",
            "x-grok-key": localStorage.getItem("user_grok_key") || "",
          },
        }
      );
      setCoachFeedback(res.data.analysis || null);
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error || "Could not reach the Coach. Try again shortly.";
      setCoachFeedback(`⚠️ Error: ${errMsg}`);
    } finally {
      setIsCoachLoading(false);
    }
  };

  // ── Helper: format date ───────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ── Helper: outcome badge colors ──────────────────────────────────
  const outcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "win":
        return "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40";
      case "loss":
        return "bg-rose-950/40 text-rose-400 border border-rose-900/40";
      default:
        return "bg-amber-950/40 text-amber-400 border border-amber-900/40";
    }
  };

  // Group moves into pairs for the move grid (1. e4 e5, 2. Nf3 Nc6...)
  const movePairs: { round: number; white: string; black?: string }[] = [];
  for (let i = 0; i < movesList.length; i += 2) {
    movePairs.push({
      round: Math.floor(i / 2) + 1,
      white: movesList[i],
      black: movesList[i + 1],
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════

  return (
    <div className={`flex h-screen ${theme.screenBg} text-[#e2e8f0] overflow-hidden`}>
      {isLoggedIn ? <LoginSidebar /> : <SideBar />}

      <div className="flex-1 flex flex-col lg:flex-row p-6 md:p-8 gap-8 overflow-y-auto">
        {/* ── Not logged in ──────────────────────────────────────── */}
        {!isLoggedIn ? (
          <div className="flex-1 flex items-center justify-center">
            <div className={`${theme.panelBg} border ${theme.panelBorder} p-10 rounded-2xl text-center max-w-md`}>
              <div className="text-4xl mb-4">♟️</div>
              <h2 className="text-xl font-black text-white mb-2">Game Review</h2>
              <p className="text-sm text-zinc-400 mb-6">
                Log in to view and replay your past matches move by move.
              </p>
              <a
                href="/login"
                className={`inline-block ${theme.btnPrimary} py-2.5 px-8 rounded-lg font-bold transition-all cursor-pointer`}
              >
                Log In
              </a>
            </div>
          </div>
        ) : !selectedGame ? (
          /* ── Game History List ──────────────────────────────────── */
          <div className="flex-1 max-w-3xl mx-auto w-full">
            <h1 className="text-2xl font-black text-white mb-1">Your Games</h1>
            <p className="text-sm text-zinc-500 mb-6">
              {totalGames} game{totalGames !== 1 ? "s" : ""} played. Click a game to replay it.
            </p>

            {isLoadingGames ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : games.length === 0 ? (
              <div className={`${theme.panelBg} border ${theme.panelBorder} p-8 rounded-2xl text-center`}>
                <p className="text-zinc-400">No games yet. Go play some chess!</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {games.map((g) => {
                    const opponent =
                      g.whitePlayer === user?.email ? g.blackPlayer : g.whitePlayer;
                    const myColor =
                      g.whitePlayer === user?.email ? "White" : "Black";

                    return (
                      <button
                        key={g.id}
                        onClick={() => loadGame(g.id)}
                        className={`w-full text-left ${theme.panelBg} border ${theme.panelBorder} p-4 rounded-xl hover:border-zinc-600 transition-all cursor-pointer group`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-sm text-white">
                              {opponent.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white group-hover:text-white">
                                vs {opponent}
                              </div>
                              <div className="text-[10px] text-zinc-500">
                                {formatDate(g.createdAt)} · {myColor} · {g.moveCount} moves
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[10px] font-black px-2 py-1 rounded ${outcomeBadge(
                                g.outcome
                              )}`}
                            >
                              {g.outcome.toUpperCase()}
                            </span>
                            <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
                              →
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalGames > 10 && (
                  <div className="flex justify-center gap-3 mt-6">
                    <button
                      onClick={() => fetchGames(page - 1)}
                      disabled={page <= 1}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-zinc-800 transition-colors"
                    >
                      ← Previous
                    </button>
                    <span className="px-4 py-2 text-xs text-zinc-500 font-bold">
                      Page {page} of {Math.ceil(totalGames / 10)}
                    </span>
                    <button
                      onClick={() => fetchGames(page + 1)}
                      disabled={page >= Math.ceil(totalGames / 10)}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-zinc-800 transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* ── Game Replay View ─────────────────────────────────── */
          <>
            {/* Left: Board + controls */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-[580px] mx-auto w-full">
              {/* Back button + player names */}
              <div className="flex justify-between w-full mb-3 px-3 items-center shrink-0">
                <button
                  onClick={() => setSelectedGame(null)}
                  className="text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer font-bold"
                >
                  ← Back to Games
                </button>
                <div className="text-[10px] text-zinc-500 font-bold">
                  Move {activeMoveIdx + 1} of {movesList.length}
                </div>
              </div>

              <div className="flex justify-between w-full mb-3 px-3 font-semibold text-xs text-zinc-400 shrink-0">
                <span className="flex items-center gap-1.5">
                  ⚪ {selectedGame.whitePlayer}
                </span>
                <span className="flex items-center gap-1.5">
                  ⚫ {selectedGame.blackPlayer}
                </span>
              </div>

              <div className="flex w-full aspect-square gap-3 relative mb-4 shrink-0">
                <div className="flex-1 aspect-square pointer-events-none">
                  <ChessBoard
                    board={board}
                    flipped={flipped}
                    selectedSquare={null}
                    validMoves={[]}
                    lastMove={lastMove}
                    onSquareClick={() => {}}
                  />
                </div>
              </div>

              {/* Playback controls */}
              <div className="flex flex-wrap gap-4 justify-between items-center w-full bg-white/5 border border-white/5 p-3 rounded-xl shrink-0">
                <div className="flex gap-1.5 items-center">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveMoveIdx(-1);
                    }}
                    className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer text-sm"
                    title="Start of Game"
                  >
                    ⏮
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      handlePrev();
                    }}
                    disabled={activeMoveIdx < 0}
                    className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous Move"
                  >
                    ◀
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`px-3.5 py-1.5 ${theme.btnPrimary} text-[10px] font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm`}
                  >
                    {isPlaying ? "⏸ Pause" : "▶ Play"}
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      handleNext();
                    }}
                    disabled={activeMoveIdx >= movesList.length - 1}
                    className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next Move"
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveMoveIdx(movesList.length - 1);
                    }}
                    className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer text-sm"
                    title="End of Game"
                  >
                    ⏭
                  </button>
                </div>

                <div className="flex gap-3 items-center">
                  <select
                    value={playSpeed}
                    onChange={(e) => setPlaySpeed(Number(e.target.value))}
                    className="bg-zinc-950 border border-white/5 text-[10px] text-zinc-400 rounded p-1 cursor-pointer outline-none"
                  >
                    <option value={3000}>3.0s</option>
                    <option value={2000}>2.0s</option>
                    <option value={1000}>1.0s</option>
                  </select>

                  <button
                    onClick={() => setFlipped(!flipped)}
                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold rounded-lg text-[10px] hover:bg-zinc-850 hover:text-white transition-colors cursor-pointer"
                  >
                    🔄 Flip
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Move list + Coach */}
            <div className="w-full lg:w-[420px] flex flex-col gap-6 h-full min-h-[500px]">
              {/* Game info header */}
              <div className={`p-4 rounded-2xl ${theme.panelBg} border ${theme.panelBorder} shadow-md shrink-0`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-white">
                      {selectedGame.whitePlayer} vs {selectedGame.blackPlayer}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {formatDate(selectedGame.createdAt)} · {selectedGame.result}
                      {selectedGame.endReason ? ` (${selectedGame.endReason})` : ""}
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded ${outcomeBadge(
                    selectedGame.result === "draw" ? "draw" :
                    (selectedGame.whitePlayer === user?.email && selectedGame.result === "checkmate" && activeMoveIdx === movesList.length - 1) ||
                    (selectedGame.blackPlayer === user?.email && selectedGame.result === "checkmate" && activeMoveIdx === movesList.length - 1)
                      ? "win" : "loss"
                  )}`}>
                    {selectedGame.result.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Clickable move grid */}
              <div className={`p-4 rounded-2xl ${theme.panelBg} border ${theme.panelBorder} flex-1 overflow-hidden flex flex-col min-h-[180px] shadow-md`}>
                <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 shrink-0 pb-1 border-b border-white/5">
                  Move History
                </h2>

                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                  {movePairs.map((pair, turnIdx) => {
                    const whiteMoveIdx = turnIdx * 2;
                    const blackMoveIdx = turnIdx * 2 + 1;

                    return (
                      <div
                        key={turnIdx}
                        className="grid grid-cols-12 gap-2 items-center text-xs py-1 border-b border-white/[0.02]"
                      >
                        <span className="col-span-2 text-zinc-500 font-bold text-[10px]">
                          {pair.round}.
                        </span>

                        <div className="col-span-5">
                          <button
                            onClick={() => {
                              setIsPlaying(false);
                              setActiveMoveIdx(whiteMoveIdx);
                            }}
                            className={`w-full py-1.5 px-2 rounded-lg text-left font-extrabold border transition-all text-xs cursor-pointer ${
                              activeMoveIdx === whiteMoveIdx
                                ? "bg-white text-zinc-950 border-white shadow-sm"
                                : "bg-zinc-950 border-zinc-800 text-white hover:border-zinc-700"
                            }`}
                          >
                            {pair.white}
                          </button>
                        </div>

                        <div className="col-span-5">
                          {pair.black && (
                            <button
                              onClick={() => {
                                setIsPlaying(false);
                                setActiveMoveIdx(blackMoveIdx);
                              }}
                              className={`w-full py-1.5 px-2 rounded-lg text-left font-extrabold border transition-all text-xs cursor-pointer ${
                                activeMoveIdx === blackMoveIdx
                                  ? "bg-white text-zinc-950 border-white shadow-sm"
                                  : "bg-zinc-950 border-zinc-800 text-white hover:border-zinc-700"
                              }`}
                            >
                              {pair.black}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Coach panel */}
              <div className={`p-5 rounded-2xl ${theme.panelBg} border ${theme.panelBorder} shrink-0 shadow-lg flex flex-col gap-4`}>
                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 border-2 border-[#efebe4] flex items-center justify-center font-black text-[#efebe4] text-sm shadow-md overflow-hidden relative">
                        G
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white">Garry AI Grandmaster</h3>
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">
                        Chess Coach
                      </p>
                    </div>
                  </div>

                  <select
                    value={aiEngine}
                    onChange={(e) => setAiEngine(e.target.value as any)}
                    className="bg-zinc-950 border border-white/5 text-[10px] text-white rounded p-1 outline-none cursor-pointer"
                  >
                    <option value="gemini">Gemini</option>
                    <option value="grok">Grok</option>
                  </select>
                </div>

                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 min-h-[120px] max-h-[160px] overflow-y-auto relative flex flex-col justify-center items-center">
                  {isCoachLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span className="text-[10px] text-zinc-400 font-bold">
                        Analyzing position...
                      </span>
                    </div>
                  ) : coachFeedback ? (
                    <div className="relative text-[11px] text-zinc-200 leading-relaxed font-semibold text-left w-full whitespace-pre-wrap">
                      {coachFeedback}
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-[11px] text-zinc-500 italic leading-relaxed">
                        Select a move and click evaluate for strategic advice.
                      </p>
                      <button
                        onClick={askCoach}
                        className={`mt-3.5 py-1.5 px-5 ${theme.btnPrimary} font-black rounded-lg text-[10px] transition-colors cursor-pointer`}
                      >
                        Evaluate Position
                      </button>
                    </div>
                  )}
                </div>

                {coachFeedback && !isCoachLoading && (
                  <button
                    onClick={askCoach}
                    className="py-1.5 w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer text-center"
                  >
                    Re-Analyze Position
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
