import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3000" : window.location.origin);

export default function SignUp() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const googleSignUp = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const googleRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });

        const { email, name, picture } = googleRes.data;

        // Get a JWT from our backend (creates the user if new).
        const backendRes = await axios.post(`${API_URL}/api/auth/google`, {
          email, name, picture,
        });

        const { token, user } = backendRes.data;

        localStorage.setItem("token", token);
        localStorage.setItem("rating", String(user.rating));
        localStorage.setItem("googleUser", JSON.stringify(googleRes.data));

        authLogin(email, { name, picture });
        navigate("/home");
      } catch (err) {
        console.error("Google sign up failed", err);
      }
    },
    onError: () => {
      console.error("Google sign up failed");
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
        <span className="absolute text-[10rem] opacity-[0.03] text-white top-[10%] right-[10%] rotate-[12deg]">♛</span>
        <span className="absolute text-[8rem] opacity-[0.03] text-white bottom-[10%] left-[10%] rotate-[-8deg]">♝</span>
      </div>

      {/* Sign Up Card */}
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
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white">Create Your Account</h2>
          <p className="text-zinc-500 mt-2">Join the game in seconds</p>
        </div>

        {/* Pawn image (grayscale filter applied) */}
        <div className="flex justify-center mb-6">
          <img
            className="w-36 drop-shadow-lg filter grayscale"
            src="/pawn-on-board.png"
            alt="Chess piece"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/signup/email')}
            className="w-full bg-white hover:bg-zinc-200 text-black text-lg font-bold py-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"/>
            </svg>
            Continue with Email
          </button>

          <button
            onClick={() => googleSignUp()}
            className="w-full bg-black hover:bg-zinc-900 border border-zinc-800 text-white text-lg font-bold py-4 rounded-lg cursor-pointer flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98]"
          >
            <img src="/google-icon.svg" alt="Google" className="h-5 w-5 filter grayscale" />
            Continue with Google
          </button>
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
