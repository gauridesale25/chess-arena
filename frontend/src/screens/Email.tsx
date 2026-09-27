import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? "http://localhost:3000" : window.location.origin);

export default function Email() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async () => {
        if (!email || !password) return;
        setStatus("loading");

        try {
            const res = await axios.post(`${API_URL}/api/auth/signup`, {
                email,
                password,
            });

            const { token, user } = res.data;

            login(user.email);
            localStorage.setItem("token", token);
            localStorage.setItem("rating", user.rating);

            setStatus("success");
            setTimeout(() => navigate("/home"), 800);
        } catch (e: any) {
            setStatus("error");
            setErrorMsg(
              e?.response?.data?.error ||
              e?.response?.data?.message ||
              e?.response?.data?.details?.fieldErrors?.password?.[0] ||
              "Sign up failed. Try again."
            );
        }
    };

    return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, #27272a 0%, #000000 100%)",
          }}
        />
      </div>

      {/* Form */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div
          className="text-center mb-6 cursor-pointer"
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
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Create Your Account</h2>
          <p className="text-zinc-500 mt-1">Enter your email and a password</p>
        </div>

        {/* Form card */}
        <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-xl shadow-2xl">
          <div className="relative mb-4">
            <img
              src="/mail-svgrepo-com.svg"
              alt="Email"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40 filter grayscale"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 p-3.5 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="relative mb-6">
            <img
              src="/password-svgrepo-com.svg"
              alt="Password"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40 filter grayscale"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full pl-11 pr-4 p-3.5 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 outline-none focus:border-white transition-colors"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            className={`w-full bg-white hover:bg-zinc-200 text-black p-3.5 rounded-lg text-lg font-bold cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-[0.98] ${status === "loading" ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {status === "loading" ? "Creating account..." : "Continue"}
          </button>

          {/* Status messages */}
          {status === "success" && (
            <div className="mt-4 p-3 bg-zinc-900 border border-zinc-850 rounded-lg text-center text-white font-semibold text-sm">
              ✓ Account created! Redirecting...
            </div>
          )}
          {status === "error" && (
            <div className="mt-4 p-3 bg-zinc-900 border border-zinc-850 rounded-lg text-center text-zinc-400 text-sm">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-500 text-sm mt-6">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-white hover:underline cursor-pointer font-semibold transition-colors"
          >
            Log In
          </span>
        </p>
      </div>
    </div>
    );
}
