import { io } from 'socket.io-client';

const URL = import.meta.env.PROD 
  ? import.meta.env.VITE_BACKEND_URL   // Set this in Vercel project settings
  : 'http://localhost:3001';

export const socket = io(URL as string, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});
