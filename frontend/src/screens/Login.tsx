import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3000" : window.location.origin);

export default function Login() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    if (!email || !password) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      const { token, user } = res.data;

      // Update local storage session cache
      authLogin(user.email);
      localStorage.setItem("token", token);
      localStorage.setItem("rating", String(user.rating));

      setStatus("success");
      setTimeout(() => navigate("/home"), 800);
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.response?.data?.error || e?.response?.data?.message || "Login failed. Try again.");
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Get user info from Google.
        const googleRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const { email, name, picture } = googleRes.data;

        // Send to our backend to get a JWT token.
        // This creates the user in our DB if they don't exist.
        const backendRes = await axios.post(`${API_URL}/api/auth/google`, {
          email, name, picture,
        });

        const { token, user } = backendRes.data;

        // Store JWT so the WebSocket can authenticate.
        localStorage.setItem("token", token);
        localStorage.setItem("rating", String(user.rating));
        localStorage.setItem("googleUser", JSON.stringify(googleRes.data));

        authLogin(email, { name, picture });
        navigate("/home");
      } catch (err) {
        console.error("Google login failed", err);
        setStatus("error");
        setErrorMsg("Google login failed. Please try again.");
      }
    },
    onError: () => {
      console.error("Google login failed");
    },
    flow: 'implicit',
  });

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Grayscale background decoration */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, #27272a 0%, #000000 100%)",
          }}
        />
        <span className="absolute text-[10rem] opacity-[0.03] text-white top-[5%] left-[5%] rotate-[-10deg]">♜</span>
        <span className="absolute text-[12rem] opacity-[0.03] text-white bottom-[5%] right-[5%] rotate-[15deg]">♞</span>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div
          className="text-center mb-8 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3c0 .87.37 1.66 1 2.21A6.74 6.74 0 0 0 7 13.5c0 1 .5 1.5 1.5 1.5h7c1 0 1.5-.5 1.5-1.5a6.74 6.74 0 0 0-3-6.29c.63-.55 1-1.34 1-2.21a3 3 0 0 0-3-3z"/>
                <path d="M8 19h8"/>
                <path d="M6 22h12"/>
            </svg>
            Chess<span className="text-zinc-500">.in</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Welcome back</p>
        </div>

        {/* Form card */}
        <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-xl shadow-2xl">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 p-3.5 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 outline-none focus:border-white transition-colors"
            placeholder="Username or Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full mb-5 p-3.5 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 outline-none focus:border-white transition-colors"
            placeholder="Password"
          />
          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            className={`w-full bg-white hover:bg-zinc-200 text-black p-3.5 rounded-lg text-lg font-bold cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-[0.98] ${status === "loading" ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {status === "loading" ? "Logging in..." : "Log In"}
          </button>

          {status === "success" && (
            <div className="mt-4 p-3 bg-zinc-900 border border-zinc-850 rounded-lg text-center text-white font-semibold text-sm">
              ✓ Login successful! Redirecting...
            </div>
          )}
          {status === "error" && (
            <div className="mt-4 p-3 bg-zinc-900 border border-zinc-850 rounded-lg text-center text-zinc-400 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-500 text-xs font-medium tracking-widest uppercase">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Google */}
          <button
            onClick={() => googleLogin()}
            className="w-full bg-black hover:bg-zinc-905 border border-zinc-800 text-white p-3.5 rounded-lg font-semibold flex items-center justify-center gap-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
          >
            <img src="/google-icon.svg" alt="Google" className="h-5 w-5 filter grayscale" />
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-500 text-sm mt-6">
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/signup")}
            className="text-white hover:underline cursor-pointer font-semibold transition-colors"
          >
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
}
