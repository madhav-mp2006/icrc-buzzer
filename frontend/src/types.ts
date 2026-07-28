export interface Player {
  id: string;
  username: string;
  avatar?: string;
  teamId?: string;
  online: boolean;
  joinedAt: number;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  slot: 'A' | 'B';
}

export interface RoundConfig {
  enabled: boolean;
  numRounds: number;
  secondsPerRound: number;
  currentRound: number;
}

export interface ActivityEntry {
  id: string;
  type: 'join' | 'team_join' | 'team_switch' | 'buzz_win' | 'buzz_lock' | 'room_start' | 'round_end';
  playerId?: string;
  playerName?: string;
  teamName?: string;
  teamColor?: string;
  message: string;
  timestamp: number;
}

export interface BuzzerResult {
  winner: Player;
  team?: Team;
  reactionMs: number;
  queue: Player[];
}

export interface RoomState {
  code: string;
  adminId: string | null;
  adminUsername: string | null;
  status: 'LOBBY' | 'LIVE' | 'ENDED';
  players: Record<string, Player>;
  teams: Record<string, Team>;
  roundConfig: RoundConfig;
  activityLog: ActivityEntry[];

  queue: string[];
  consecutiveWins: Record<string, number>;
  buzzerState: 'LOCKED' | 'OPEN';
  currentWindowBuzzes: { playerId: string; timestamp: number }[];
  lastWinner: string | null;
  lastBuzzerResult: BuzzerResult | null;
  roundTimerRemaining: number | null;
}
