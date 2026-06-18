import { useEffect } from "react";
import { socket, connectSocket, disconnectSocket } from "@/lib/socket";

export function useSocket() {
  useEffect(() => {
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);
  return socket;
}
