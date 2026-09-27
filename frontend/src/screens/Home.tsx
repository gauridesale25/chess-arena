import { useNavigate } from "react-router-dom";
import { LoginSidebar } from "../components/LoginSidebar";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="relative flex w-full min-h-screen bg-[#070a0f] text-[#e2e8f0] overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-slate-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vh] bg-slate-800/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Sidebar */}
      <LoginSidebar />

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 p-8 md:p-12 overflow-y-auto bg-transparent">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-900">
          <div className="flex items-center gap-4">
            {user?.picture ? (
              <div className="relative">
                <img
                  src={user.picture}
                  alt="Profile"
                  className="w-14 h-14 rounded-full border-2 border-slate-700/50 filter grayscale hover:grayscale-0 transition-all duration-300"
                />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#070a0f] rounded-full" />
              </div>
            ) : (
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-[#111625] border-2 border-[#1e293b] flex items-center justify-center text-xl font-bold text-[#f1f5f9]">
                  {(user?.name || user?.email || "G")[0].toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#070a0f] rounded-full" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#f1f5f9] via-[#cbd5e1] to-[#94a3b8]">
                Welcome back, {user?.name || "Player"}
              </h1>
              <div className="text-sm text-slate-500 font-medium">{user?.email || "Offline Guest"}</div>
            </div>
          </div>
        </div>

        {/* Quick Play Section */}
        <div className="mb-10">
          <h2 className="text-xl font-extrabold mb-5 tracking-wide uppercase text-slate-400">Quick Play</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate("/game", { state: { mode: "online" } })}
              className="group bg-[#e2e8f0] text-[#0f172a] hover:bg-[#cbd5e1] p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-white/5 flex flex-col items-center justify-center text-center"
            >
              <svg className="w-8 h-8 mb-2 text-[#0f172a] group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              <div className="font-black text-lg tracking-tight">Play Online</div>
              <div className="text-xs opacity-75 mt-0.5">5 min timed match</div>
            </button>

            <button
              onClick={() => navigate("/game", { state: { mode: "online" } })}
              className="group bg-[#111625]/60 hover:bg-[#1e293b]/70 border border-[#1e293b] hover:border-[#334155] p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] flex flex-col items-center justify-center text-center"
            >
              <svg className="w-8 h-8 mb-2 text-slate-400 group-hover:text-white group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
              <div className="font-extrabold text-lg text-slate-200 tracking-tight group-hover:text-white">New Game</div>
              <div className="text-xs text-slate-500 mt-0.5">Custom game configurations</div>
            </button>

            <button
              onClick={() => navigate("/game", { state: { mode: "online" } })}
              className="group bg-[#111625]/60 hover:bg-[#1e293b]/70 border border-[#1e293b] hover:border-[#334155] p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] flex flex-col items-center justify-center text-center"
            >
              <svg className="w-8 h-8 mb-2 text-slate-400 group-hover:text-white group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <div className="font-extrabold text-lg text-slate-200 tracking-tight group-hover:text-white">Play a Friend</div>
              <div className="text-xs text-slate-500 mt-0.5">Generate invite link</div>
            </button>

            <button
              onClick={() => navigate("/game", { state: { mode: "computer" } })}
              className="group bg-[#111625]/60 hover:bg-[#1e293b]/70 border border-[#1e293b] hover:border-[#334155] p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] flex flex-col items-center justify-center text-center"
            >
              <svg className="w-8 h-8 mb-2 text-slate-400 group-hover:text-white group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <circle cx="12" cy="5" r="2"/>
                <path d="M12 7v4"/>
              </svg>
              <div className="font-extrabold text-lg text-slate-200 tracking-tight group-hover:text-white">Play Bots</div>
              <div className="text-xs text-slate-500 mt-0.5">Play vs. Stockfish (Offline)</div>
            </button>
          </div>
        </div>

        {/* Feature Cards Section */}
        <div>
          <h2 className="text-xl font-extrabold mb-5 tracking-wide uppercase text-slate-400">Tactics & Strategy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lessons */}
            <div
              onClick={() => navigate("/learn")}
              className="group bg-[#111625]/40 hover:bg-[#111625]/80 rounded-2xl overflow-hidden border border-[#1e293b] hover:border-slate-500 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-slate-500/5 hover:translate-y-[-4px]"
            >
              <div className="h-44 bg-gradient-to-br from-[#1e293b]/50 to-[#0a0d14] flex items-center justify-center border-b border-[#1e293b] relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />
                <svg className="w-14 h-14 stroke-slate-500 group-hover:stroke-white group-hover:scale-110 transition-all duration-500 relative z-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3L1 9l11 6 9-5v6h2V9l-11-6z"/>
                  <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                </svg>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-black text-slate-100 group-hover:text-white transition-colors duration-250">Chess Lessons</h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">Master openings, endgame structures, and mid-game tactics (Coming Soon).</p>
              </div>
            </div>

            {/* Game Review */}
            <div
              onClick={() => navigate("/review")}
              className="group bg-[#111625]/40 hover:bg-[#111625]/80 rounded-2xl overflow-hidden border border-[#1e293b] hover:border-slate-500 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-slate-500/5 hover:translate-y-[-4px]"
            >
              <div className="h-44 bg-gradient-to-br from-[#1e293b]/50 to-[#0a0d14] flex items-center justify-center border-b border-[#1e293b] relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />
                <svg className="w-14 h-14 stroke-slate-500 group-hover:stroke-white group-hover:scale-110 transition-all duration-500 relative z-10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-black text-slate-100 group-hover:text-white transition-colors duration-250">Game Review</h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">Deeply analyze your matches and discover improvements using our engines.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
