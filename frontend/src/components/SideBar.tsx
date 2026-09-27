import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "./Button"

export const SideBar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [localGeminiKey, setLocalGeminiKey] = useState(() => localStorage.getItem("user_gemini_key") || "");
    const [localGrokKey, setLocalGrokKey] = useState(() => localStorage.getItem("user_grok_key") || "");

    const handleSaveKeys = () => {
        localStorage.setItem("user_gemini_key", localGeminiKey.trim());
        localStorage.setItem("user_grok_key", localGrokKey.trim());
        setShowSettingsModal(false);
    };

    const handleClearKeys = () => {
        localStorage.removeItem("user_gemini_key");
        localStorage.removeItem("user_grok_key");
        setLocalGeminiKey("");
        setLocalGrokKey("");
        setShowSettingsModal(false);
    };

    const isActive = (path: string) => location.pathname === path;

    return(
        <div className="flex flex-col justify-between w-48 bg-black text-white py-4 border-r border-zinc-900 shrink-0">
            <div className="flex flex-col gap-1">
                <Button 
                    className="flex justify-center items-center gap-2 font-bold text-2xl p-3 cursor-pointer hover:text-zinc-300 transition-colors duration-200" 
                    onClick={() => navigate("/")}>
                    <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3c0 .87.37 1.66 1 2.21A6.74 6.74 0 0 0 7 13.5c0 1 .5 1.5 1.5 1.5h7c1 0 1.5-.5 1.5-1.5a6.74 6.74 0 0 0-3-6.29c.63-.55 1-1.34 1-2.21a3 3 0 0 0-3-3z"/>
                        <path d="M8 19h8"/>
                        <path d="M6 22h12"/>
                    </svg>
                    Chess.in
                </Button>
                
                <div className="px-2 mt-4 flex flex-col gap-1">
                    <Button 
                        className={`w-full flex justify-start items-center gap-3 font-semibold text-lg p-2.5 pl-4 cursor-pointer rounded-lg transition-all duration-200 ${isActive("/game") ? "bg-white text-black font-bold" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}
                        onClick={() => navigate("/game")}>
                        <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h18v8zM6 15h2v-2h2v-2H8V9H6v2H4v2h2z"/>
                            <circle cx="14.5" cy="12.5" r="1.5"/>
                            <circle cx="18.5" cy="12.5" r="1.5"/>
                        </svg>
                        Play
                    </Button>
                    <Button 
                        className={`w-full flex justify-start items-center gap-3 font-semibold text-lg p-2.5 pl-4 cursor-pointer rounded-lg transition-all duration-200 ${isActive("/learn") ? "bg-white text-black font-bold" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}
                        onClick={() => navigate("/learn")}>
                        <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3L1 9l11 6 9-5v6h2V9l-11-6zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                        </svg>
                        Learn
                    </Button>
                    <Button 
                        className={`w-full flex justify-start items-center gap-3 font-semibold text-lg p-2.5 pl-4 cursor-pointer rounded-lg transition-all duration-200 ${isActive("/review") ? "bg-white text-black font-bold" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}
                        onClick={() => navigate("/review")}>
                        <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        Review
                    </Button>
                    <Button 
                        className={`w-full flex justify-start items-center gap-3 font-semibold text-lg p-2.5 pl-4 cursor-pointer rounded-lg transition-all duration-200 text-zinc-400 hover:bg-zinc-900 hover:text-white`}
                        onClick={() => setShowSettingsModal(true)}>
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                        API Settings
                    </Button>
                </div>
            </div>
            
            <div className="px-2 flex flex-col gap-2">
                <Button 
                    className="w-full flex justify-center items-center font-bold text-lg py-2.5 bg-white text-black hover:bg-zinc-200 rounded-lg cursor-pointer transition-colors duration-200" 
                    onClick={() => navigate("/signup")}>
                    Sign Up
                </Button>
                <Button 
                    className="w-full flex justify-center items-center font-bold text-lg py-2.5 bg-transparent border border-zinc-800 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors duration-200" 
                    onClick={() => navigate("/login")}>
                    Log In
                </Button>
            </div>

            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
                    <div className="bg-[#1a1918] border border-[#2c2c2a] p-6 rounded-xl text-left shadow-2xl min-w-[300px] max-w-sm animate-modal-pop text-white">
                        <h3 className="text-lg font-black mb-3">API Keys Settings</h3>
                        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                            Save your API keys to bypass server rate limits. Keys are stored safely in your local browser storage.
                        </p>

                        <div className="mb-3">
                            <label className="text-[10px] text-zinc-500 font-bold block mb-1 uppercase tracking-wider">Gemini API Key</label>
                            <input
                                type="password"
                                value={localGeminiKey}
                                onChange={(e) => setLocalGeminiKey(e.target.value)}
                                placeholder="AIzaSy... (Gemini Key)"
                                className="w-full p-2.5 rounded-lg bg-[#0f0f0e] border border-[#2c2c2a] text-white focus:border-[#efebe4] outline-none text-xs font-mono"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] text-zinc-500 font-bold block mb-1 uppercase tracking-wider">Grok (xAI) API Key</label>
                            <input
                                type="password"
                                value={localGrokKey}
                                onChange={(e) => setLocalGrokKey(e.target.value)}
                                placeholder="xai-... (Grok Key)"
                                className="w-full p-2.5 rounded-lg bg-[#0f0f0e] border border-[#2c2c2a] text-white focus:border-[#efebe4] outline-none text-xs font-mono"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveKeys}
                                className="flex-1 py-2 bg-[#efebe4] text-[#1c1b1a] font-bold rounded-lg hover:bg-[#e0dad0] text-xs transition-colors cursor-pointer text-center"
                            >
                                Save Keys
                            </button>
                            <button
                                onClick={handleClearKeys}
                                className="py-2 px-3 bg-red-950/40 text-red-400 border border-red-900/50 font-bold rounded-lg hover:bg-red-950/80 text-xs transition-colors cursor-pointer text-center"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="py-2 px-3 bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold rounded-lg hover:bg-zinc-850 text-xs transition-colors cursor-pointer text-center"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}