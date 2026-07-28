"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rooms = void 0;
exports.getRoom = getRoom;
exports.createRoom = createRoom;
exports.deleteRoom = deleteRoom;
exports.addActivityEntry = addActivityEntry;
exports.addPlayerToRoom = addPlayerToRoom;
exports.removePlayerFromRoom = removePlayerFromRoom;
exports.assignPlayerToTeam = assignPlayerToTeam;
exports.rooms = new Map();
function getRoom(code) {
    return exports.rooms.get(code);
}
function createRoom(adminId, adminUsername, teamAName = 'Team A', teamBName = 'Team B') {
    let code = '';
    do {
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (exports.rooms.has(code));
    const teamAId = 'team-a';
    const teamBId = 'team-b';
    const teamA = { id: teamAId, name: teamAName, color: '#6C5CE7', slot: 'A' };
    const teamB = { id: teamBId, name: teamBName, color: '#20C7C7', slot: 'B' };
    const initialRoomState = {
        code,
        adminId,
        adminUsername,
        status: 'LOBBY',
        players: {},
        teams: { [teamAId]: teamA, [teamBId]: teamB },
        roundConfig: { enabled: false, numRounds: 1, secondsPerRound: 60, currentRound: 1 },
        activityLog: [],
        queue: [],
        consecutiveWins: {},
        buzzerState: 'LOCKED',
        currentWindowBuzzes: [],
        lastWinner: null,
        lastBuzzerResult: null,
        roundTimerRemaining: null,
    };
    exports.rooms.set(code, initialRoomState);
    return code;
}
function deleteRoom(code) {
    exports.rooms.delete(code);
}
function addActivityEntry(room, entry) {
    const fullEntry = {
        ...entry,
        id: Math.random().toString(36).substring(2, 10),
        timestamp: Date.now(),
    };
    room.activityLog = [fullEntry, ...room.activityLog].slice(0, 50); // Keep last 50 entries
    return fullEntry;
}
function addPlayerToRoom(room, player) {
    room.players[player.id] = player;
    if (!room.queue.includes(player.id)) {
        room.queue.push(player.id);
    }
    if (room.consecutiveWins[player.id] === undefined) {
        room.consecutiveWins[player.id] = 0;
    }
    addActivityEntry(room, {
        type: 'join',
        playerId: player.id,
        playerName: player.username,
        message: `${player.username} joined the room`,
    });
}
function removePlayerFromRoom(room, playerId) {
    delete room.players[playerId];
    room.queue = room.queue.filter(id => id !== playerId);
    delete room.consecutiveWins[playerId];
    room.currentWindowBuzzes = room.currentWindowBuzzes.filter(b => b.playerId !== playerId);
}
function assignPlayerToTeam(room, playerId, teamId) {
    const player = room.players[playerId];
    const team = room.teams[teamId];
    if (player && team) {
        const prevTeamId = player.teamId;
        player.teamId = teamId;
        addActivityEntry(room, {
            type: prevTeamId ? 'team_switch' : 'team_join',
            playerId: player.id,
            playerName: player.username,
            teamName: team.name,
            teamColor: team.color,
            message: prevTeamId
                ? `${player.username} switched to ${team.name}`
                : `${player.username} joined ${team.name}`,
        });
    }
}
