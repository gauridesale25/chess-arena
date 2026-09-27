import { useSocketContext } from "../context/SocketContext";

/**
 * Hook to access the globally managed WebSocket connection.
 * Returns the socket (null if not connected).
 */
export const useSocket = () => {
  const { socket } = useSocketContext();
  return socket;
};