"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = setupSocketHandlers;
const state_1 = require("./state");
function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        // ─── Admin: Create Room ───────────────────────────────────────────────────
        socket.on('room:create', (data, callback) => {
            const roomCode = (0, state_1.createRoom)(socket.id, data.adminUsername, data.teamAName, data.teamBName);
            socket.join(roomCode);
            callback(roomCode);
        });
        // ─── Get State (for reconnects / page loads) ──────────────────────────────
        socket.on('room:get_state', (roomCode, callback) => {
            const room = (0, state_1.getRoom)(roomCode);
            if (room) {
                socket.join(roomCode);
                callback(room);
            }
            else {
                callback({ error: 'Room not found' });
            }
        });
        // ─── Player: Join Room ────────────────────────────────────────────────────
        socket.on('room:join', (data, callback) => {
            const room = (0, state_1.getRoom)(data.roomCode);
            if (!room)
                return callback({ error: 'Room not found' });
            const player = {
                id: socket.id,
                username: data.username.slice(0, 20),
                avatar: data.avatar,
                online: true,
                joinedAt: Date.now(),
            };
            (0, state_1.addPlayerToRoom)(room, player);
            socket.join(room.code);
            io.to(room.code).emit('room:state', room);
            callback({ success: true, room });
        });
        // ─── Player: Join Team (A or B) ───────────────────────────────────────────
        socket.on('team:join', (data) => {
            const room = (0, state_1.getRoom)(data.roomCode);
            if (!room)
                return;
            (0, state_1.assignPlayerToTeam)(room, socket.id, data.teamId);
            io.to(room.code).emit('room:state', room);
        });
        // ─── Admin: Start Room ────────────────────────────────────────────────────
        socket.on('room:start', (data) => {
            const room = (0, state_1.getRoom)(data.roomCode);
            if (room && room.adminId === socket.id) {
                room.status = 'LIVE';
                (0, state_1.addActivityEntry)(room, { type: 'room_start', message: 'The round has started! Buzzers are now active.' });
                io.to(room.code).emit('room:state', room);
            }
        });
        // ─── Admin: Kick Player ───────────────────────────────────────────────────
        socket.on('player:kick', (data) => {
            const room = (0, state_1.getRoom)(data.roomCode);
            if (room && room.adminId === socket.id) {
                const kickedName = room.players[data.playerId]?.username;
                (0, state_1.removePlayerFromRoom)(room, data.playerId);
                io.to(data.playerId).emit('player:kicked');
                io.to(room.code).emit('room:state', room);
                if (kickedName) {
                    (0, state_1.addActivityEntry)(room, { type: 'join', message: `${kickedName} was removed by the admin.` });
                }
            }
        });
        // ─── Admin: Open Buzzer ───────────────────────────────────────────────────
        socket.on('buzzer:open', (data) => {
            const room = (0, state_1.getRoom)(data.roomCode);
            if (room && room.adminId === socket.id) {
                room.buzzerState = 'OPEN';
                room.currentWindowBuzzes = [];
                room.lastBuzzerResult = null;
                io.to(room.code).emit('buzzer:opened');
            }
        });
        // ─── Player: Press Buzzer ─────────────────────────────────────────────────
        socket.on('buzzer:press', (data) => {
            const room = (0, state_1.getRoom)(data.roomCode);
            if (!room || room.buzzerState !== 'OPEN')
                return;
            if (room.currentWindowBuzzes.find(b => b.playerId === socket.id))
                return;
            const timestamp = Date.now();
            room.currentWindowBuzzes.push({ playerId: socket.id, timestamp });
            if (room.currentWindowBuzzes.length === 1) {
                room.buzzerState = 'LOCKED';
                setTimeout(() => resolveWinner(room.code, io), 200);
            }
        });
        // ─── Admin: Configure Rounds ──────────────────────────────────────────────
        socket.on('round:configure', (data) => {
            const room = (0, state_1.getRoom)(data.roomCode);
            if (room && room.adminId === socket.id) {
                room.roundConfig = { ...room.roundConfig, ...data };
                io.to(room.code).emit('room:state', room);
            }
        });
        // ─── Admin: End Room ──────────────────────────────────────────────────────
        socket.on('room:end', (data) => {
            const room = (0, state_1.getRoom)(data.roomCode);
            if (room && room.adminId === socket.id) {
                room.status = 'ENDED';
                io.to(room.code).emit('room:ended', { room });
            }
        });
        // ─── Disconnect ───────────────────────────────────────────────────────────
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            // Mark player offline in all rooms they were in
            for (const [, room] of state_1.rooms) {
                if (room.players[socket.id]) {
                    room.players[socket.id].online = false;
                    io.to(room.code).emit('room:state', room);
                    break;
                }
            }
        });
    });
}
function resolveWinner(roomCode, io) {
    const room = (0, state_1.getRoom)(roomCode);
    if (!room || room.currentWindowBuzzes.length === 0)
        return;
    const openedAt = room.currentWindowBuzzes[0].timestamp;
    room.currentWindowBuzzes.sort((a, b) => a.timestamp - b.timestamp);
    let winnerId = null;
    for (const buzz of room.currentWindowBuzzes) {
        if ((room.consecutiveWins[buzz.playerId] || 0) < 2) {
            winnerId = buzz.playerId;
            break;
        }
        else {
            // MLFQ demotion
            room.consecutiveWins[buzz.playerId] = 0;
            room.queue = room.queue.filter(id => id !== buzz.playerId);
            room.queue.push(buzz.playerId);
        }
    }
    if (winnerId) {
        const winTimestamp = room.currentWindowBuzzes.find(b => b.playerId === winnerId).timestamp;
        const reactionMs = winTimestamp - openedAt;
        room.consecutiveWins[winnerId] = (room.consecutiveWins[winnerId] || 0) + 1;
        room.queue = room.queue.filter(id => id !== winnerId);
        room.queue.unshift(winnerId);
        room.lastWinner = winnerId;
        const winner = room.players[winnerId];
        const team = winner?.teamId ? room.teams[winner.teamId] : undefined;
        const result = {
            winner,
            team,
            reactionMs,
            queue: room.queue.map(id => room.players[id]).filter(Boolean),
        };
        room.lastBuzzerResult = result;
        (0, state_1.addActivityEntry)(room, {
            type: 'buzz_win',
            playerId: winner?.id,
            playerName: winner?.username,
            teamName: team?.name,
            teamColor: team?.color,
            message: `${winner?.username} buzzed in! (${reactionMs}ms)`,
        });
        io.to(room.code).emit('buzzer:result', result);
        io.to(room.code).emit('room:state', room);
    }
    else {
        room.buzzerState = 'OPEN';
        io.to(room.code).emit('buzzer:opened');
    }
}
