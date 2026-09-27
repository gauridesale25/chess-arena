import { useNavigate } from "react-router-dom";
import { SideBar } from "../components/SideBar";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-[#0f0f0e]">
      <SideBar />

      <div className="flex-1 relative overflow-hidden bg-[#0f0f0e]">
        {/* Grayscale background radial glow */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, #222220 0%, #0f0f0e 100%)",
          }}
        />

        {/* Floating monochrome chess pieces */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <span className="absolute text-7xl opacity-[0.03] text-white top-[10%] left-[10%] rotate-[-15deg]">♜</span>
          <span className="absolute text-9xl opacity-[0.03] text-white top-[60%] left-[5%] rotate-[20deg]">♞</span>
          <span className="absolute text-8xl opacity-[0.03] text-white top-[20%] right-[8%] rotate-[10deg]">♝</span>
          <span className="absolute text-6xl opacity-[0.03] text-white bottom-[15%] right-[15%] rotate-[-25deg]">♛</span>
          <span className="absolute text-7xl opacity-[0.03] text-white bottom-[30%] left-[30%] rotate-[5deg]">♚</span>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex h-full items-center justify-center px-8">
          <div className="flex flex-col md:flex-row items-center gap-12 max-w-5xl">
            {/* Left: Board image - using a grayscale filter for theme consistency */}
            <div className="flex-shrink-0">
              <img
                className="w-80 md:w-96 rounded-xl shadow-2xl shadow-black/80 filter grayscale"
                src="/board.png"
                alt="Chess Board"
              />
            </div>

            {/* Right: Text + CTA */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <h1 className="text-5xl md:text-6xl font-black text-[#f4f4f0] leading-tight tracking-tight">
                Play Chess
                <br />
                <span className="bg-gradient-to-r from-[#f4f4f0] to-[#b3b3aa] bg-clip-text text-transparent">
                  Online
                </span>
              </h1>
              <p className="mt-4 text-lg text-[#a8a89f] max-w-md">
                Real-time multiplayer chess. Find an opponent instantly,
                challenge a friend, or improve with puzzles.
              </p>

              <button
                onClick={() => navigate("/game")}
                className="mt-8 group relative bg-[#efebe4] hover:bg-[#e0dad0] text-[#1c1b1a] font-bold text-xl py-4 px-12 rounded-xl cursor-pointer transition-all duration-300 shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  Play Online
                </span>
                <span className="block text-sm font-normal mt-0.5 opacity-75">
                  Play with someone at your level
                </span>
              </button>

              {/* Stats row */}
              <div className="mt-10 flex gap-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-[#f4f4f0]">5 min</div>
                  <div className="text-xs text-[#7d7d74] uppercase tracking-wider">Timed Games</div>
                </div>
                <div className="w-px bg-[#2c2c2a]" />
                <div>
                  <div className="text-2xl font-bold text-[#f4f4f0]">Live</div>
                  <div className="text-xs text-[#7d7d74] uppercase tracking-wider">In-Game Chat</div>
                </div>
                <div className="w-px bg-[#2c2c2a]" />
                <div>
                  <div className="text-2xl font-bold text-[#f4f4f0]">Free</div>
                  <div className="text-xs text-[#7d7d74] uppercase tracking-wider">No Account Needed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}