import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "../components/Button";
import { ChessBoard } from "../components/ChessBoard";
import { SideBar } from "../components/SideBar";
import { useSocket } from "../hooks/useSockets";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { LoginSidebar } from "../components/LoginSidebar";
import { useAuth } from "../context/AuthContext";
import { sound } from "../utils/sound";
import axios from "axios";
import { stockfishEngine } from "../utils/stockfish";

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3000" : window.location.origin);

export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";
export const CHAT_MESSAGE = "chat_message";

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

// Guest play removed — online requires login.

export default function Game() {
  const { user } = useAuth();
  
  // Theme configurations for guest vs logged-in screens
  const isLoggedIn = !!user;
  const theme = {
    screenBg: isLoggedIn ? "bg-[#0a0d14]" : "bg-[#151413]",
    sidebarBorder: isLoggedIn ? "border-[#1e293b]" : "border-[#2c2b2a]",
    panelBg: isLoggedIn ? "bg-[#111625]" : "bg-[#1a1918]",
    panelBorder: isLoggedIn ? "border-[#1e293b]" : "border-[#2c2b2a]",
    chatBg: isLoggedIn ? "bg-[#111625]" : "bg-[#1a1918]",
    inputBg: isLoggedIn ? "bg-[#090c15]" : "bg-[#151413]",
    inputFocus: isLoggedIn ? "focus:border-[#e2e8f0]" : "focus:border-[#efebe4]",
    textMuted: isLoggedIn ? "text-[#64748b]" : "text-[#8e8d89]",
    badgeInactive: isLoggedIn ? "bg-[#1e293b] border-[#334155] text-[#64748b]" : "bg-[#2c2b2a] border-[#3e3d3a] text-[#8e8d89]",
    badgeActive: isLoggedIn ? "bg-[#e2e8f0] text-[#0f172a]" : "bg-[#efebe4] text-[#1c1b1a]",
    playerHudActive: isLoggedIn ? "bg-[#e2e8f0] text-[#0f172a]" : "bg-[#efebe4] text-[#1c1b1a]",
    playerHudInactive: isLoggedIn ? "bg-[#111625] text-[#64748b]" : "bg-[#1a1918] text-[#8e8d89]",
    playerHudAvatarActive: isLoggedIn ? "bg-[#0f172a] text-[#e2e8f0]" : "bg-[#1c1b1a] text-[#efebe4]",
    playerHudAvatarInactive: isLoggedIn ? "bg-[#1e293b] text-[#cbd5e1]" : "bg-[#2c2b2a] text-white",
    bubbleMine: isLoggedIn ? "bg-[#e2e8f0] text-[#0f172a] font-semibold shadow-sm" : "bg-[#efebe4] text-[#1c1b1a] font-semibold shadow-sm",
    bubbleOpponent: isLoggedIn ? "bg-[#1e293b] border border-[#334155] text-white" : "bg-[#2c2b2a] border border-[#3e3d3a] text-white",
    btnPrimary: isLoggedIn ? "bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#0f172a]" : "bg-[#efebe4] hover:bg-[#e0dad0] text-[#1c1b1a]",
  };

  const socket = useSocket(); // WebSocket | null
  const [chess] = useState(() => new Chess());
  const [board, setBoard] = useState(chess.board());
  const [isMatching, setIsMatching] = useState(false);

  const location = useLocation();

  // Game mode & bot settings
  const [gameMode, setGameMode] = useState<"online" | "computer">(
    () => (location.state as any)?.mode || "online"
  );
  const [botLevel, setBotLevel] = useState<"novice" | "intermediate" | "master">("intermediate");
  const [playerColorPref, setPlayerColorPref] = useState<"white" | "black" | "random">("white");
  const [isBotGame, setIsBotGame] = useState(false);

  // Player & game state
  const [myName, setMyName] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<"white" | "black" | null>(null);
  const [players, setPlayers] = useState<{ white: string; black: string }>({
    white: "Waiting...",
    black: "Waiting...",
  });

  // Moves history, active tab, and AI coach states
  const [historyLog, setHistoryLog] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "moves" | "coach">("chat");
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [aiEngine, setAiEngine] = useState<"gemini" | "grok">("gemini");

  // Unified move executor to trigger UI updates and correct sound effects
  const processMove = (moveInput: any) => {
    try {
      const isCaptureBefore = chess.get(moveInput.to) !== null || (moveInput.promotion && chess.get(moveInput.to) === null && chess.get(moveInput.from)?.type === 'p' && moveInput.to[0] !== moveInput.from[0]);
      const result = chess.move(moveInput);
      if (!result) return false;

      // Update board and history log states
      setBoard(chess.board());
      setHistoryLog(chess.history());

      // Determine sound effect
      if (chess.isGameOver()) {
        if (chess.isCheckmate()) {
          const loserColor = chess.turn();
          const won = myColor ? (myColor[0] !== loserColor) : true;
          sound.playGameOver(won ? "win" : "loss");
        } else {
          sound.playGameOver("draw");
        }
      } else if (chess.inCheck()) {
        sound.playCheck();
      } else if (result.captured || isCaptureBefore) {
        sound.playCapture();
      } else {
        sound.playMove();
      }

      return result;
    } catch (err) {
      console.error("Move validation error:", err);
      return false;
    }
  };
  const [currentTurn, setCurrentTurn] = useState<"white" | "black">("white");
  const [started, setStarted] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);

  // Timers (ms)
  const [timeLeftMs, setTimeLeftMs] = useState<{ white: number; black: number }>({
    white: 5 * 60 * 1000,
    black: 5 * 60 * 1000,
  });
  const lastSyncRef = useRef(Date.now());
  const tickRef = useRef<number | null>(null);

  // Chat (hidden until game starts)
  const [chatMessages, setChatMessages] = useState<{ sender: string; message: string }[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);


  // Connection status
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [showWinBanner, setShowWinBanner] = useState(false);

  // Start offline bot game
  const startBotGame = () => {
    let chosenColor: "white" | "black";
    if (playerColorPref === "random") {
      chosenColor = Math.random() < 0.5 ? "white" : "black";
    } else {
      chosenColor = playerColorPref;
    }

    setMyColor(chosenColor);
    setIsBotGame(true);

    const guestStored = localStorage.getItem("guestName");
    const name = user?.email || guestStored || "You";

    setPlayers({
      white: chosenColor === "white" ? name : `Bot (${botLevel})`,
      black: chosenColor === "black" ? name : `Bot (${botLevel})`,
    });

    chess.reset();
    setBoard(chess.board());
    setHistoryLog([]);
    setLastMove(null);
    setGameOverMessage(null);
    setCurrentTurn("white");
    
    setTimeLeftMs({
      white: 10 * 60 * 1000,
      black: 10 * 60 * 1000,
    });
    lastSyncRef.current = Date.now();
    setStarted(true);
    setActiveTab("moves");
    setCoachFeedback(null);
  };

  // AI coach analysis API integration
  const askCoach = async () => {
    try {
      setIsCoachLoading(true);
      const res = await axios.post(
        `${API_URL}/api/coach/analyze`,
        {
          fen: chess.fen(),
          pgn: chess.history().join(" "),
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
      console.error("Coach API error:", err);
      const errMsg = err.response?.data?.error || "Could not reach the Coach. Try again shortly.";
      showToast(errMsg, "error");
    } finally {
      setIsCoachLoading(false);
    }
  };

  // Trigger Stockfish move calculation if it's the bot's turn
  useEffect(() => {
    if (!started || !isBotGame) return;

    const isBotTurn = (myColor === "white" && currentTurn === "black") || 
                      (myColor === "black" && currentTurn === "white");

    if (!isBotTurn) return;

    let active = true;

    const makeBotMove = async () => {
      let depth = 5;
      let skill = 8;
      if (botLevel === "novice") {
        depth = 1;
        skill = 0;
      } else if (botLevel === "master") {
        depth = 12;
        skill = 20;
      }

      await new Promise((r) => setTimeout(r, 600));
      if (!active) return;

      const fen = chess.fen();
      const bestMove = await stockfishEngine.getBestMove(fen, depth, skill);

      if (!active || !bestMove) return;

      const moveObj = {
        from: bestMove.slice(0, 2),
        to: bestMove.slice(2, 4),
        promotion: bestMove[4] || undefined,
      };

      const result = processMove(moveObj);
      if (result) {
        setLastMove({ from: moveObj.from, to: moveObj.to });
        setCurrentTurn(chess.turn() === "w" ? "white" : "black");
        
        if (chess.isCheckmate()) {
          showToast("Checkmate!", "success");
          triggerWinAnimation();
        } else if (chess.inCheck()) {
          showToast("Check!", "info");
        }
      }
    };

    makeBotMove();

    return () => {
      active = false;
    };
  }, [started, isBotGame, currentTurn, myColor, botLevel]);

  // Set player name from auth context.
  useEffect(() => {
    if (user?.email) {
      setMyName(user.email);
    } else {
      setMyName(null);
    }
  }, [user?.email]);

  // connection state tracking
  useEffect(() => {
    if (!socket) {
      setStatus("connecting");
      return;
    }
    setStatus((socket as any).readyState === 1 ? "open" : "connecting");
    const onOpen = () => setStatus("open");
    const onClose = () => setStatus("closed");
    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("close", onClose);
    };
  }, [socket]);

  // local ticking (1s) only when game started
  useEffect(() => {
    if (!started) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    if (tickRef.current) return;
    tickRef.current = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastSyncRef.current;
      lastSyncRef.current = now;

      setTimeLeftMs((prev) => {
        const updated = { ...prev };
        if (currentTurn === "white") updated.white = Math.max(0, prev.white - elapsed);
        else updated.black = Math.max(0, prev.black - elapsed);

        // Detect timeout inside the callback (always has fresh values)
        if (updated.white <= 0 && prev.white > 0) {
          setTimeout(() => {
            setStarted(false);
            setGameOverMessage(`${players.black} wins on time!`);
          }, 0);
        }
        if (updated.black <= 0 && prev.black > 0) {
          setTimeout(() => {
            setStarted(false);
            setGameOverMessage(`${players.white} wins on time!`);
          }, 0);
        }

        return updated;
      });
    }, 1000);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [ started, currentTurn]);

  // handle messages from server
  useEffect(() => {
    if (!socket) return;
    const handler = (e: MessageEvent) => {
      let message: any;
      try {
        message = JSON.parse(e.data);
      } catch {
        return;
      }

      switch (message.type) {
        case CHAT_MESSAGE: {
          const p = message.payload;
          const text = p.message ?? p.text ?? "";
          setChatMessages((s) => [...s, { sender: p.sender, message: text }]);
          break;
        }
        case INIT_GAME: {
          const p = message.payload;
          setMyColor(p.color);
          const whiteName = p.color === "white" ? (myName ?? p.name) : p.opponent;
          const blackName = p.color === "black" ? (myName ?? p.name) : p.opponent;
          setPlayers({ white: whiteName, black: blackName });

          if (p.board) {
            try {
              chess.load(p.board);
            } catch {}
          } else {
            chess.reset();
          }
          setBoard(chess.board());
          setHistoryLog(chess.history());
          sound.playMove();

          setTimeLeftMs({
            white: Math.max(0, p.timeLeft?.white ?? timeLeftMs.white),
            black: Math.max(0, p.timeLeft?.black ?? timeLeftMs.black),
          });
          lastSyncRef.current = Date.now();
          setCurrentTurn(p.turn ?? (chess.turn() === "w" ? "white" : "black"));
          setStarted(true);
          setGameOverMessage(null);
          setIsMatching(false);
          break;
        }
        case MOVE: {
          const p = message.payload;
          
          let moveResult: any = false;
          if (p.move) {
            moveResult = processMove(p.move);
          }
          
          if (!moveResult && p.board) {
            try {
              chess.load(p.board);
              setBoard(chess.board());
              setHistoryLog(chess.history());
              sound.playMove();
            } catch {}
          }
          
          if (p.move) {
            setLastMove(p.move);
          }

          if (chess.isCheckmate()) {
            showToast("Checkmate!", "success");
            triggerWinAnimation();
          } else if (chess.inCheck()) {
            showToast("Check!", "info");
          }

          setCurrentTurn(p.turn ?? (chess.turn() === "w" ? "white" : "black"));
          setTimeLeftMs({
            white: Math.max(0, p.timeLeft?.white ?? timeLeftMs.white),
            black: Math.max(0, p.timeLeft?.black ?? timeLeftMs.black),
          });
          lastSyncRef.current = Date.now();
          break;
        }
        case GAME_OVER: {
          const p = message.payload;
          if (p.result === "draw") {
            setGameOverMessage("Draw");
            sound.playGameOver("draw");
          } else if (p.winnerName) {
            setGameOverMessage(`${p.winnerName} won`);
            const weWon = myName && p.winnerName.toLowerCase() === myName.toLowerCase();
            sound.playGameOver(weWon ? "win" : "loss");
          } else {
            setGameOverMessage("Game Over");
            sound.playGameOver("draw");
          }

          setStarted(false);
          if (p.board) {
            try {
              chess.load(p.board);
            } catch {}
            setBoard(chess.board());
            setHistoryLog(chess.history());
          }
          break;
        }
      }
    };

    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [socket, chess, myName, timeLeftMs.white, timeLeftMs.black]);

  // Toast helper
  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3000);
  };

  // Start matchmaking flow — requires authentication.
  const startMatch = () => {
    if (!user?.email) {
      showToast("Please log in to play online.", "error");
      return;
    }

    if (!socket || (socket as any).readyState !== 1) {
      showToast("Socket not connected. Wait a moment and try again.", "error");
      return;
    }

    setIsMatching(true);

    socket.send(
      JSON.stringify({
        type: INIT_GAME,
        payload: { name: user.email },
      })
    );
  };


  // Called when the user clicks a square on the board
  const onSquareClick = (square: string) => {
    // Restrict move to correct player
    if (!myColor || myColor !== currentTurn) {
      showToast("It's not your turn!", "error");
      return;
    }

    const sq = square as Square;

    // Select/deselect piece
    if (selectedSquare === sq) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    const piece = chess.get(sq);

    // Selecting a piece
    if (piece && piece.color === myColor[0]) {
      const moves = chess.moves({ square: sq, verbose: true });
      if (moves.length === 0) {
        showToast("No valid moves for this piece!", "error");
        return;
      }
      setSelectedSquare(sq);
      setValidMoves(moves.map((m) => m.to));
    } 
    // Making a move
    else if (selectedSquare && validMoves.includes(sq)) {
      const move = processMove({ from: selectedSquare, to: sq });

      if (!move) {
        showToast("Invalid move!", "error");
        return;
      }

      // Send move to server if NOT a bot game
      if (!isBotGame && socket && (socket as any).readyState === 1) {
        socket.send(JSON.stringify({ type: MOVE, payload: { move: { from: selectedSquare, to: sq } } }));
      }
      setLastMove({ from: selectedSquare, to: sq });
      setSelectedSquare(null);
      setValidMoves([]);

      // Update local turn state if playing vs computer
      if (isBotGame) {
        setCurrentTurn(chess.turn() === "w" ? "white" : "black");
      }

      // Check/checkmate alerts
      if (chess.isCheckmate()) {
        showToast("Checkmate!", "success");
        triggerWinAnimation();
      } else if (chess.inCheck()) {
        showToast("Check!", "info");
      }
    } else {
      showToast("Select one of your pieces first", "info");
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };
  
  const triggerWinAnimation = () => {
    setShowWinBanner(true);
    setTimeout(() => setShowWinBanner(false), 3500);
  };


  // Chat send
  const sendChat = () => {
    const text = chatInput.trim();
    if (!text || !socket || (socket as any).readyState !== 1) return;

    // Send to backend
    socket.send(JSON.stringify({
      type: CHAT_MESSAGE,
      payload: { text }
    }));

    setChatInput("");
  };



  // Guest modal removed — online play requires login.

  // Play again
  const handlePlayAgain = () => {
    chess.reset();
    setBoard(chess.board());
    setGameOverMessage(null);
    if (isBotGame) {
      startBotGame();
    } else {
      startMatch();
    }
  };

  // Derived UI
  const whiteSeconds = Math.max(0, Math.floor(timeLeftMs.white / 1000));
  const blackSeconds = Math.max(0, Math.floor(timeLeftMs.black / 1000));
  const isMyTurn = myColor === currentTurn;

  // Board size class: smaller (85vmin) so top & bottom   // Board size class: smaller (85vmin) so top & bottom bars fit
  // Player bars above and below board are fixed-height so both names show
  return (
    <div className={`flex h-screen w-screen ${theme.screenBg} text-white`}>
      {!user ? <SideBar /> : <LoginSidebar />}

      <div className={`flex-1 flex flex-col items-center py-2 px-4 md:px-8 relative ${theme.screenBg}`}>
        {/* center game area */}
        <div className="flex flex-col items-center">
          {/* top player bar */}
          <div
            className={`w-full max-w-3xl p-2 rounded-t-xl flex items-center justify-between transition-colors duration-200 border ${theme.panelBorder} ${
              currentTurn === "black" ? `${theme.playerHudActive} font-bold` : `${theme.playerHudInactive}`
            }`}
            style={{ height: 48 }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                currentTurn === "black" ? theme.playerHudAvatarActive : theme.playerHudAvatarInactive
              }`}>
                {players.black?.slice(0, 2).toUpperCase() || "BL"}
              </div>
              <div className="flex flex-col">
                <div className="text-sm">{players.black || "Waiting..."}</div>
                <div className="text-xs opacity-75">Black</div>
              </div>
            </div>
            <div className="text-lg font-mono font-bold">
              {formatTime(blackSeconds)}
            </div>
          </div>

          {/* board container (smaller so both bars visible) */}
          <div className={`border-x ${theme.panelBorder}`} style={{ width: "85vmin", height: "85vmin", maxWidth: 720, maxHeight: 720 }}>
            <ChessBoard
              board={board}
              flipped={myColor === "black"}
              selectedSquare={selectedSquare}
              validMoves={validMoves}
              lastMove={lastMove}
              onSquareClick={onSquareClick}
            />
          </div>

          {/* bottom player bar */}
          <div
            className={`w-full max-w-3xl p-2 rounded-b-xl flex items-center justify-between transition-colors duration-200 border ${theme.panelBorder} ${
              currentTurn === "white" ? `${theme.playerHudActive} font-bold` : `${theme.playerHudInactive}`
            }`}
            style={{ height: 48 }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                currentTurn === "white" ? theme.playerHudAvatarActive : theme.playerHudAvatarInactive
              }`}>
                {players.white?.slice(0, 2).toUpperCase() || "WH"}
              </div>
              <div className="flex flex-col">
                <div className="text-sm">{players.white || "Waiting..."}</div>
                <div className="text-xs opacity-75">White</div>
              </div>
            </div>
            <div className="text-lg font-mono font-bold">
              {formatTime(whiteSeconds)}
            </div>
          </div>
        </div>
      </div>

      {/* right side: chat appears only when game started */}
      <div className={`flex flex-col ${theme.chatBg} border-l ${theme.sidebarBorder} w-80`}>
        <div className="flex flex-col items-center pt-4 px-4 mb-4 gap-2">
          <div className="text-xl font-bold tracking-wide text-white flex items-center justify-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3c0 .87.37 1.66 1 2.21A6.74 6.74 0 0 0 7 13.5c0 1 .5 1.5 1.5 1.5h7c1 0 1.5-.5 1.5-1.5a6.74 6.74 0 0 0-3-6.29c.63-.55 1-1.34 1-2.21a3 3 0 0 0-3-3z"/>
              <path d="M8 19h8"/>
              <path d="M6 22h12"/>
            </svg>
            Chess.in
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${status === 'open' ? 'bg-white' : status === 'connecting' ? 'bg-zinc-500 animate-pulse' : 'bg-zinc-800'}`}></span>
            <span className="text-zinc-500">{status === 'open' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}</span>
          </div>
          {started && (
            <div className={`text-sm font-semibold mt-1 px-3 py-1 rounded-full transition-colors ${isMyTurn ? `${theme.badgeActive} font-bold shadow-sm` : `${theme.badgeInactive}`}`}>
              {isMyTurn ? "Your turn" : "Opponent's turn"}
            </div>
          )}
        </div>

        {!started && (
          <div className="flex items-center justify-center px-4 w-full">
            <div className={`${theme.panelBg} p-6 rounded-xl border ${theme.panelBorder} w-full`}>
              {/* Game Mode Tab-switch Selector */}
              <div className="flex gap-2 mb-4 w-full">
                <button
                  onClick={() => setGameMode("online")}
                  disabled={isMatching}
                  className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-colors border cursor-pointer ${
                    gameMode === "online"
                      ? `${theme.badgeActive} border-transparent`
                      : `${theme.badgeInactive} border-[#2c2b2a] hover:text-white`
                  }`}
                >
                  Online Play
                </button>
                <button
                  onClick={() => setGameMode("computer")}
                  disabled={isMatching}
                  className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-colors border cursor-pointer ${
                    gameMode === "computer"
                      ? `${theme.badgeActive} border-transparent`
                      : `${theme.badgeInactive} border-[#2c2b2a] hover:text-white`
                  }`}
                >
                  vs. Computer
                </button>
              </div>

              {gameMode === "online" ? (
                <>
                  {!user ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-zinc-400 mb-4">Log in to play online matches</p>
                      <a href="/login" className={`inline-block ${theme.btnPrimary} py-2.5 px-6 rounded-lg font-bold transition-all duration-200 cursor-pointer text-center`}>
                        Log In
                      </a>
                    </div>
                  ) : (
                    <Button
                      onClick={() => startMatch()}
                      disabled={isMatching}
                      className={`w-full ${theme.btnPrimary} py-2.5 rounded-lg font-bold transition-all duration-200 cursor-pointer text-center ${isMatching ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {isMatching ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="matching-spinner"></span>Finding Opponent...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                          Play Online
                        </span>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {/* Bot Level select */}
                  <div className="mb-3">
                    <label className="text-[10px] text-zinc-500 font-bold block mb-1 uppercase tracking-wider">Bot Difficulty</label>
                    <select
                      value={botLevel}
                      onChange={(e) => setBotLevel(e.target.value as any)}
                      className={`w-full p-2.5 rounded-lg ${theme.inputBg} border ${theme.panelBorder} text-white text-sm outline-none`}
                    >
                      <option value="novice">Novice (ELO ~800)</option>
                      <option value="intermediate">Intermediate (ELO ~1500)</option>
                      <option value="master">Master (ELO ~2200)</option>
                    </select>
                  </div>
                  
                  {/* Play color selection */}
                  <div className="mb-4">
                    <label className="text-[10px] text-zinc-500 font-bold block mb-1 uppercase tracking-wider">Play As</label>
                    <select
                      value={playerColorPref}
                      onChange={(e) => setPlayerColorPref(e.target.value as any)}
                      className={`w-full p-2.5 rounded-lg ${theme.inputBg} border ${theme.panelBorder} text-white text-sm outline-none`}
                    >
                      <option value="white">White</option>
                      <option value="black">Black</option>
                      <option value="random">Random Color</option>
                    </select>
                  </div>

                  <Button
                    onClick={startBotGame}
                    className={`w-full ${theme.btnPrimary} py-2.5 rounded-lg font-bold transition-all duration-200 cursor-pointer text-center`}
                  >
                    Start Game
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {started && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tab switcher */}
            <div className={`flex border-b ${theme.panelBorder}`}>
              {!isBotGame && (
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === "chat"
                      ? "border-white text-white font-extrabold"
                      : `${theme.textMuted} border-transparent hover:text-white`
                  }`}
                >
                  Chat
                </button>
              )}
              <button
                onClick={() => setActiveTab("moves")}
                className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "moves"
                    ? "border-white text-white font-extrabold"
                    : `${theme.textMuted} border-transparent hover:text-white`
                }`}
              >
                Moves
              </button>
              <button
                onClick={() => setActiveTab("coach")}
                className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "coach"
                    ? "border-white text-white font-extrabold"
                    : `${theme.textMuted} border-transparent hover:text-white`
                }`}
              >
                Coach
              </button>
            </div>

            {activeTab === "chat" && !isBotGame ? (
              <div className={`flex flex-col p-3 border-t ${theme.panelBorder} flex-1 overflow-hidden`}>
                <div className={`text-xs font-bold ${theme.textMuted} uppercase tracking-wider mb-2`}>Chat</div>
                <div className="flex-1 overflow-y-auto mb-3 space-y-2 p-1 flex flex-col">
                  {chatMessages.length === 0 && (
                    <div className="text-xs text-zinc-650 italic">No messages yet — say hi!</div>
                  )}
                  {chatMessages.map((msg, i) => {
                    const mine = msg.sender === (myName || user?.email);
                    return (
                      <div
                        key={i}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`p-2 px-3 rounded-lg max-w-[85%] ${
                            mine ? theme.bubbleMine : theme.bubbleOpponent
                          }`}
                        >
                          <div className="text-[10px] opacity-75 font-mono mb-0.5">{msg.sender}</div>
                          <div className="text-sm leading-relaxed">{msg.message}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-1.5">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder="Type a message..."
                    className={`flex-1 p-2 ${theme.inputBg} border ${theme.panelBorder} rounded-lg text-white placeholder-zinc-650 outline-none ${theme.inputFocus} transition-colors text-sm`}
                  />
                  <Button onClick={sendChat} className={`${theme.btnPrimary} rounded-lg px-4 font-bold text-sm transition-colors`}>
                    Send
                  </Button>
                </div>
              </div>
            ) : activeTab === "moves" ? (() => {
              // Group historyLog into pairs
              const movePairs: { round: number; white: string; black?: string }[] = [];
              for (let i = 0; i < historyLog.length; i += 2) {
                movePairs.push({
                  round: Math.floor(i / 2) + 1,
                  white: historyLog[i],
                  black: historyLog[i + 1],
                });
              }

              return (
                <div className="flex flex-col p-3 flex-1 overflow-hidden">
                  <div className={`text-xs font-bold ${theme.textMuted} uppercase tracking-wider mb-3`}>Move History</div>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {movePairs.length === 0 ? (
                      <div className="text-xs text-zinc-650 italic">No moves played yet. Start the match!</div>
                    ) : (
                      <div className="grid grid-cols-12 gap-1 text-sm font-mono font-medium">
                        {movePairs.map((pair) => (
                          <div key={pair.round} className="col-span-12 grid grid-cols-12 py-1 px-2 rounded hover:bg-white/[0.03]">
                            <span className={`col-span-2 ${theme.textMuted} text-xs font-bold`}>{pair.round}.</span>
                            <span className="col-span-5 text-slate-100 font-bold">{pair.white}</span>
                            <span className="col-span-5 text-slate-400">{pair.black || ""}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className="flex flex-col p-4 flex-1 overflow-hidden border-t border-zinc-900">
                <div className="flex items-center justify-between gap-2 mb-3 w-full">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3c0 .87.37 1.66 1 2.21A6.74 6.74 0 0 0 7 13.5c0 1 .5 1.5 1.5 1.5h7c1 0 1.5-.5 1.5-1.5a6.74 6.74 0 0 0-3-6.29c.63-.55 1-1.34 1-2.21a3 3 0 0 0-3-3z"/>
                        <path d="M8 19h8"/>
                        <path d="M6 22h12"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{aiEngine === "gemini" ? "Garry" : "Grok"}</div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">AI Chess Coach</div>
                    </div>
                  </div>
                  <div>
                    <select
                      value={aiEngine}
                      onChange={(e) => setAiEngine(e.target.value as any)}
                      className={`p-1.5 rounded-lg bg-[#0f0f0e] border border-[#2c2c2a] text-white text-xs outline-none cursor-pointer focus:border-[#efebe4]`}
                    >
                      <option value="gemini">Gemini</option>
                      <option value="grok">Grok</option>
                    </select>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 mb-4 space-y-3">
                  {coachFeedback ? (
                    <div className={`p-3.5 rounded-xl text-sm leading-relaxed border ${theme.bubbleOpponent}`}>
                      {coachFeedback.split("\n\n").map((para, i) => (
                        <p key={i} className={i > 0 ? "mt-2.5" : ""}>
                          {para}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 italic text-center mt-8">
                      Click the button below to ask Coach {aiEngine === "gemini" ? "Garry" : "Grok"} for real-time strategic advice about the current position.
                    </div>
                  )}
                </div>

                <Button
                  onClick={askCoach}
                  disabled={isCoachLoading}
                  className={`w-full ${theme.btnPrimary} py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    isCoachLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isCoachLoading ? (
                    <>
                      <span className="matching-spinner shrink-0"></span>
                      <span>Thinking...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span>Ask Coach</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast notification (Sleek Stark Monochrome) */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 z-50 px-6 py-3 rounded-lg shadow-2xl text-sm font-semibold border flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-black border-white text-white' : 'bg-white border-black text-black'
          }`}
          style={{ animation: 'toastSlideIn 0.3s ease-out', transform: 'translateX(-50%)' }}
        >
          {toast.type === 'error' && (
            <svg className="w-4 h-4 shrink-0 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          )}
          {toast.message}
        </div>
      )}

      {/* Win celebration banner */}
      {showWinBanner && (
        <div className="win-animation flex items-center justify-center gap-3">
          <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/>
            <path d="M12 2a4 4 0 0 0-4 4v5c0 2.2 1.8 4 4 4s4-1.8 4-4V6a4 4 0 0 0-4-4z"/>
          </svg>
          <span>Victory</span>
          <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/>
            <path d="M12 2a4 4 0 0 0-4 4v5c0 2.2 1.8 4 4 4s4-1.8 4-4V6a4 4 0 0 0-4-4z"/>
          </svg>
        </div>
      )}

      {/* Game over modal (Stark Monochrome) */}
      {gameOverMessage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-40 animate-fade-in">
          <div className={`${theme.panelBg} border ${theme.panelBorder} p-10 rounded-xl text-center shadow-2xl min-w-[320px] animate-modal-pop`}>
            <div className="text-6xl mb-4 text-white flex justify-center">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3c0 .87.37 1.66 1 2.21A6.74 6.74 0 0 0 7 13.5c0 1 .5 1.5 1.5 1.5h7c1 0 1.5-.5 1.5-1.5a6.74 6.74 0 0 0-3-6.29c.63-.55 1-1.34 1-2.21a3 3 0 0 0-3-3z"/>
                <path d="M8 19h8"/>
                <path d="M6 22h12"/>
              </svg>
            </div>
            <div className="text-3xl font-black mb-2 text-white">{gameOverMessage}</div>
            <p className="text-zinc-500 mb-8">Good game!</p>
            <button
              onClick={handlePlayAgain}
              className={`${theme.btnPrimary} font-bold py-3 px-10 rounded-lg transition-all duration-200 cursor-pointer text-lg shadow-xl`}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
