import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Uses the same port as the HTTP server, with /ws path.
// Override via VITE_WS_URL for other environments.
const WS_URL =
  import.meta.env.VITE_WS_URL ||
  (window.location.protocol === "https:" ? "wss://" : "ws://") +
    (import.meta.env.DEV ? "localhost:3000" : window.location.host) +
    "/ws";

const MAX_DELAY = 10_000;

interface SocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useSocketContext = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const retriesRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    unmountedRef.current = false;

    function connect() {
      if (unmountedRef.current) return;

      // Avoid duplicate connections (e.g. React StrictMode double-invoking effects).
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.CONNECTING ||
          wsRef.current.readyState === WebSocket.OPEN)
      ) {
        return;
      }

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmountedRef.current) {
          ws.close();
          return;
        }
        retriesRef.current = 0;
        setSocket(ws);
        setIsConnected(true);
      };

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        if (unmountedRef.current) return;

        setSocket(null);
        setIsConnected(false);

        // Exponential backoff so a dead server doesn't get flooded with retries.
        const delay = Math.min(1000 * 2 ** retriesRef.current, MAX_DELAY);
        retriesRef.current++;
        timerRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
