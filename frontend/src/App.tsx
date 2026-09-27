import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import Landing from "./screens/Landing";
import Game from "./screens/Game";
import SignUp from "./screens/SignUp";
import Login from "./screens/Login";
import Email from "./screens/Email";
import './index.css';
import './App.css';
import Home from "./screens/Home";
import Learn from "./screens/Learn";
import Review from "./screens/Review";

export function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/home" element={<Home />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signup/email" element={<Email />} />
            <Route path="/login" element={<Login />} />
            <Route path="/game" element={<Game />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/lesson" element={<Learn />} />
            <Route path="/review" element={<Review />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}
