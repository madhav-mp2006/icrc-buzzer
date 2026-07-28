import { Server, Socket } from 'socket.io';
import {
  rooms, getRoom, createRoom, addPlayerToRoom,
  removePlayerFromRoom, assignPlayerToTeam, addActivityEntry
} from './state';
import type { Player, BuzzerResult } from './types';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    // ─── Admin: Create Room ───────────────────────────────────────────────────
    socket.on('room:create', (
      data: { adminUsername: string; teamAName?: string; teamBName?: string },
      callback: (roomCode: string) => void
    ) => {
      const roomCode = createRoom(socket.id, data.adminUsername, data.teamAName, data.teamBName);
      socket.join(roomCode);
      callback(roomCode);
    });

    // ─── Get State (for reconnects / page loads) ──────────────────────────────
    socket.on('room:get_state', (roomCode: string, callback: (res: any) => void) => {
      const room = getRoom(roomCode);
      if (room) {
        socket.join(roomCode);
        callback(room);
      } else {
        callback({ error: 'Room not found' });
      }
    });

    // ─── Player: Join Room ────────────────────────────────────────────────────
    socket.on('room:join', (
      data: { roomCode: string; username: string; avatar?: string },
      callback: (res: any) => void
    ) => {
      const room = getRoom(data.roomCode);
      if (!room) return callback({ error: 'Room not found' });

      const player: Player = {
        id: socket.id,
        username: data.username.slice(0, 20),
        avatar: data.avatar,
        online: true,
        joinedAt: Date.now(),
      };

      addPlayerToRoom(room, player);
      socket.join(room.code);
      io.to(room.code).emit('room:state', room);
      callback({ success: true, room });
    });

    // ─── Player: Join Team (A or B) ───────────────────────────────────────────
    socket.on('team:join', (data: { roomCode: string; teamId: string }) => {
      const room = getRoom(data.roomCode);
      if (!room) return;
      assignPlayerToTeam(room, socket.id, data.teamId);
      io.to(room.code).emit('room:state', room);
    });

    // ─── Admin: Start Room ────────────────────────────────────────────────────
    socket.on('room:start', (data: { roomCode: string }) => {
      const room = getRoom(data.roomCode);
      if (room && room.adminId === socket.id) {
        room.status = 'LIVE';
        addActivityEntry(room, { type: 'room_start', message: 'The round has started! Buzzers are now active.' });
        io.to(room.code).emit('room:state', room);
      }
    });

    // ─── Admin: Kick Player ───────────────────────────────────────────────────
    socket.on('player:kick', (data: { roomCode: string; playerId: string }) => {
      const room = getRoom(data.roomCode);
      if (room && room.adminId === socket.id) {
        const kickedName = room.players[data.playerId]?.username;
        removePlayerFromRoom(room, data.playerId);
        io.to(data.playerId).emit('player:kicked');
        io.to(room.code).emit('room:state', room);
        if (kickedName) {
          addActivityEntry(room, { type: 'join', message: `${kickedName} was removed by the admin.` });
        }
      }
    });

    // ─── Admin: Open Buzzer ───────────────────────────────────────────────────
    socket.on('buzzer:open', (data: { roomCode: string }) => {
      const room = getRoom(data.roomCode);
      if (room && room.adminId === socket.id) {
        room.buzzerState = 'OPEN';
        room.currentWindowBuzzes = [];
        room.lastBuzzerResult = null;
        io.to(room.code).emit('buzzer:opened');
      }
    });

    // ─── Player: Press Buzzer ─────────────────────────────────────────────────
    socket.on('buzzer:press', (data: { roomCode: string }) => {
      const room = getRoom(data.roomCode);
      if (!room || room.buzzerState !== 'OPEN') return;
      if (room.currentWindowBuzzes.find(b => b.playerId === socket.id)) return;

      const timestamp = Date.now();
      room.currentWindowBuzzes.push({ playerId: socket.id, timestamp });

      if (room.currentWindowBuzzes.length === 1) {
        room.buzzerState = 'LOCKED';
        setTimeout(() => resolveWinner(room.code, io), 200);
      }
    });

    // ─── Admin: Configure Rounds ──────────────────────────────────────────────
    socket.on('round:configure', (data: {
      roomCode: string;
      enabled: boolean;
      numRounds: number;
      secondsPerRound: number;
    }) => {
      const room = getRoom(data.roomCode);
      if (room && room.adminId === socket.id) {
        room.roundConfig = { ...room.roundConfig, ...data };
        io.to(room.code).emit('room:state', room);
      }
    });

    // ─── Admin: End Room ──────────────────────────────────────────────────────
    socket.on('room:end', (data: { roomCode: string }) => {
      const room = getRoom(data.roomCode);
      if (room && room.adminId === socket.id) {
        room.status = 'ENDED';
        io.to(room.code).emit('room:ended', { room });
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      // Mark player offline in all rooms they were in
      for (const [, room] of (rooms as any)) {
        if (room.players[socket.id]) {
          room.players[socket.id].online = false;
          io.to(room.code).emit('room:state', room);
          break;
        }
      }
    });
  });
}



function resolveWinner(roomCode: string, io: Server) {
  const room = getRoom(roomCode);
  if (!room || room.currentWindowBuzzes.length === 0) return;

  const openedAt = room.currentWindowBuzzes[0].timestamp;
  room.currentWindowBuzzes.sort((a, b) => a.timestamp - b.timestamp);

  let winnerId: string | null = null;

  for (const buzz of room.currentWindowBuzzes) {
    if ((room.consecutiveWins[buzz.playerId] || 0) < 2) {
      winnerId = buzz.playerId;
      break;
    } else {
      // MLFQ demotion
      room.consecutiveWins[buzz.playerId] = 0;
      room.queue = room.queue.filter(id => id !== buzz.playerId);
      room.queue.push(buzz.playerId);
    }
  }

  if (winnerId) {
    const winTimestamp = room.currentWindowBuzzes.find(b => b.playerId === winnerId)!.timestamp;
    const reactionMs = winTimestamp - openedAt;

    room.consecutiveWins[winnerId] = (room.consecutiveWins[winnerId] || 0) + 1;
    room.queue = room.queue.filter(id => id !== winnerId);
    room.queue.unshift(winnerId);
    room.lastWinner = winnerId;

    const winner = room.players[winnerId];
    const team = winner?.teamId ? room.teams[winner.teamId] : undefined;

    const result: BuzzerResult = {
      winner,
      team,
      reactionMs,
      queue: room.queue.map(id => room.players[id]).filter(Boolean),
    };
    room.lastBuzzerResult = result;

    addActivityEntry(room, {
      type: 'buzz_win',
      playerId: winner?.id,
      playerName: winner?.username,
      teamName: team?.name,
      teamColor: team?.color,
      message: `${winner?.username} buzzed in! (${reactionMs}ms)`,
    });

    io.to(room.code).emit('buzzer:result', result);
    io.to(room.code).emit('room:state', room);
  } else {
    room.buzzerState = 'OPEN';
    io.to(room.code).emit('buzzer:opened');
  }
}
