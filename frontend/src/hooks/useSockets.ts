import { useSocketContext } from "../context/SocketContext";

// Access the globally managed WebSocket connection (null until connected).
export const useSocket = () => {
  const { socket, isConnected } = useSocketContext();
  return { socket, isConnected };
};
