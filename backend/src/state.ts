import { RoomState, Player, Team, ActivityEntry } from './types';

export const rooms = new Map<string, RoomState>();

export function getRoom(code: string): RoomState | undefined {
  return rooms.get(code);
}

export function createRoom(adminId: string, adminUsername: string, teamAName = 'Team A', teamBName = 'Team B'): string {
  let code = '';
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (rooms.has(code));

  const teamAId = 'team-a';
  const teamBId = 'team-b';

  const teamA: Team = { id: teamAId, name: teamAName, color: '#6C5CE7', slot: 'A' };
  const teamB: Team = { id: teamBId, name: teamBName, color: '#20C7C7', slot: 'B' };

  const initialRoomState: RoomState = {
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

  rooms.set(code, initialRoomState);
  return code;
}

export function deleteRoom(code: string) {
  rooms.delete(code);
}

export function addActivityEntry(room: RoomState, entry: Omit<ActivityEntry, 'id' | 'timestamp'>) {
  const fullEntry: ActivityEntry = {
    ...entry,
    id: Math.random().toString(36).substring(2, 10),
    timestamp: Date.now(),
  };
  room.activityLog = [fullEntry, ...room.activityLog].slice(0, 50); // Keep last 50 entries
  return fullEntry;
}

export function addPlayerToRoom(room: RoomState, player: Player) {
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

export function removePlayerFromRoom(room: RoomState, playerId: string) {
  delete room.players[playerId];
  room.queue = room.queue.filter(id => id !== playerId);
  delete room.consecutiveWins[playerId];
  room.currentWindowBuzzes = room.currentWindowBuzzes.filter(b => b.playerId !== playerId);
}

export function assignPlayerToTeam(room: RoomState, playerId: string, teamId: string) {
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
