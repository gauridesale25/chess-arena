/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

// ── WebSocket URL ───────────────────────────────────────────────────
// Uses the same port as the HTTP server, with /ws path.
// In production, change this via VITE_WS_URL env var.
const WS_URL = import.meta.env.VITE_WS_URL ||
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
  (import.meta.env.DEV ? 'localhost:3000' : window.location.host) + '/ws';
const MAX_DELAY = 10_000;

interface SocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocketContext = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const retriesRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);
  const replacedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    unmountedRef.current = false;
    replacedRef.current = false;

    // Only connect if the user is logged in.
    // Auth is required for all WebSocket connections.
    const token = localStorage.getItem("token");
    if (!user || !token) {
      // Not logged in — don't even try to connect.
      setSocket(null);
      setIsConnected(false);
      return;
    }

    function connect() {
      if (unmountedRef.current) return;

      // Prevent duplicate connections (e.g. React Strict Mode double-fires useEffect).
      // If we already have a socket that's connecting or open, don't create another.
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.CONNECTING ||
          wsRef.current.readyState === WebSocket.OPEN)
      ) {
        return;
      }

      const currentToken = localStorage.getItem("token");
      if (!currentToken) return;

      const url = `${WS_URL}?token=${currentToken}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "replaced") {
            replacedRef.current = true;
            console.warn("WebSocket connection replaced by new session — closing self");
            ws.close(4002, "Replaced by new connection");
          }
        } catch {
          // Ignore
        }
      };

      ws.addEventListener("message", handleMessage);

      ws.onopen = () => {
        if (unmountedRef.current) {
          ws.close();
          return;
        }
        retriesRef.current = 0;
        setSocket(ws);
        setIsConnected(true);
      };

      ws.onclose = (event) => {
        ws.removeEventListener("message", handleMessage);

        // Clear the ref if this is still the current socket.
        if (wsRef.current === ws) {
          wsRef.current = null;
        }

        if (unmountedRef.current) return;
        setSocket(null);
        setIsConnected(false);

        // Code 4001 = auth failure.
        // Code 4002 = duplicate connection/replaced by new connection.
        // Or if we received a "replaced" message.
        if (event.code === 4001 || event.code === 4002 || replacedRef.current) {
          console.warn(`WebSocket closed (code ${event.code}, replaced: ${replacedRef.current}) — not retrying`);
          return;
        }

        // Exponential backoff to avoid flooding the server on disconnect.
        const delay = Math.min(1000 * 2 ** retriesRef.current, MAX_DELAY);
        retriesRef.current++;
        timerRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Close the ref'd socket directly — no state setter gymnastics needed.
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
