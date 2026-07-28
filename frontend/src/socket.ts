import { io } from 'socket.io-client';

const URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_BACKEND_URL || 'https://icrc-buzzer-production.up.railway.app')
  : 'http://localhost:3001';

export const socket = io(URL as string, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});
