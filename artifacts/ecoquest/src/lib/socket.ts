import { io, Socket } from "socket.io-client";

export const socket: Socket = io({
  path: "/socket.io",
  autoConnect: false, // Connect manually when needed
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};