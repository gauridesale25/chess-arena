import { useState } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "../components/ChessBoard";
import { SideBar } from "../components/SideBar";
import { LoginSidebar } from "../components/LoginSidebar";
import { useAuth } from "../context/AuthContext";
import { sound } from "../utils/sound";

export default function Learn() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  // Background chessboard setup for a visually engaging theme
  const [chess] = useState(() => {
    const c = new Chess();
    // Set up an interesting tactical position in the background
    c.load("r1bqk2r/pppp1ppp/2n2n2/1B2p3/4P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 0 4");
    return c;
  });

  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);

    // Simulate server request
    setTimeout(() => {
      setIsLoading(false);
      setSubscribed(true);
      sound.playMove(); // play chess sound for button click confirmation
    }, 1000);
  };

  const theme = {
    screenBg: isLoggedIn ? "bg-[#0a0d14]" : "bg-[#151413]",
    panelBg: isLoggedIn ? "bg-[#111625]" : "bg-[#1a1918]",
    panelBorder: isLoggedIn ? "border-[#1e293b]" : "border-[#2c2b2a]",
  };

  return (
    <div className={`flex h-screen ${theme.screenBg} text-[#e2e8f0] overflow-hidden relative`}>
      {isLoggedIn ? <LoginSidebar /> : <SideBar />}

      {/* Main Content Area with glassmorphism overlay */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
        {/* Visual Background: Blurred, tilted Chessboard */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none transform rotate-12 scale-110 blur-[3px]">
          <div className="w-[500px] h-[500px]">
            <ChessBoard
              board={chess.board()}
              flipped={false}
              selectedSquare={null}
              validMoves={[]}
              lastMove={null}
              onSquareClick={() => {}}
            />
          </div>
        </div>

        {/* Dynamic ambient background spots */}
        <div className="absolute top-[20%] left-[20%] w-[35vw] h-[35vh] bg-slate-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[20%] right-[20%] w-[30vw] h-[30vh] bg-slate-800/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Premium Coming Soon Card */}
        <div className="relative z-10 max-w-lg w-full text-center px-6 py-12 md:py-16 bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3L1 9l11 6 9-5v6h2V9l-11-6zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
              </svg>
            </div>
          </div>

          <span className="text-[10px] bg-white/10 text-white px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-white/10">
            Chess.in Academy
          </span>

          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight mt-6">
            Master Chess with Garry AI
          </h1>
          <p className="mt-4 text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
            A premium learning experience is coming soon. Unlock interactive lessons, customized training drills, and grandmaster commentary curated specifically to elevate your ELO.
          </p>

          <div className="mt-8 max-w-sm mx-auto">
            {!subscribed ? (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 outline-none focus:border-white/30 transition-all font-medium"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 bg-[#efebe4] text-[#1c1b1a] font-bold rounded-xl text-xs hover:bg-[#e0dad0] transition-all cursor-pointer flex justify-center items-center gap-1.5 active:scale-[0.97]"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-zinc-800/30 border-t-zinc-800 rounded-full animate-spin" />
                  ) : (
                    "Join Waitlist"
                  )}
                </button>
              </form>
            ) : (
              <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl text-center animate-modal-pop">
                <div className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  You're on the list!
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 font-semibold">
                  We'll notify you as soon as the interactive lessons launch.
                </div>
              </div>
            )}
          </div>

          {/* Locked topics row */}
          <div className="mt-10 pt-8 border-t border-white/5 flex justify-center gap-6 md:gap-8 text-center">
            <div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Courses</div>
              <div className="text-xs font-extrabold text-white mt-1">24 Masterclasses</div>
            </div>
            <div className="w-px bg-white/5" />
            <div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Drills</div>
              <div className="text-xs font-extrabold text-white mt-1">150+ Interactive Drills</div>
            </div>
            <div className="w-px bg-white/5" />
            <div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">AI Support</div>
              <div className="text-xs font-extrabold text-white mt-1">Personalized Coaching</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
