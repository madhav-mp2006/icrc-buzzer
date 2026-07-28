import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { socket } from '../socket';
import type { RoomState, Team, Player, BuzzerResult, ActivityEntry } from '../types';
import { playBuzzerSound } from '../utils/audio';

function Avatar({ player, size = 40, teamColor }: { player: Player; size?: number; teamColor?: string }) {
  const initials = player.username.slice(0, 2).toUpperCase();
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {player.avatar ? (
        <img src={player.avatar} className="rounded-full object-cover w-full h-full" alt={player.username} />
      ) : (
        <div
          className="rounded-full flex items-center justify-center font-bold text-white"
          style={{ width: size, height: size, background: teamColor ?? 'linear-gradient(135deg, #6C5CE7, #FF4B4B)', fontSize: size * 0.35 }}
        >
          {initials}
        </div>
      )}
      <span
        className="absolute bottom-0 right-0 rounded-full border-2 border-[#0B0F19]"
        style={{ width: size * 0.3, height: size * 0.3, background: player.online ? '#2ECC71' : '#555' }}
      />
    </div>
  );
}

function TeamPanel({ team, players }: { team: Team; players: Player[] }) {
  return (
    <div
      className="flex-1 bg-[#151B2B] rounded-2xl p-6 border"
      style={{ borderColor: team.color + '40', borderTopWidth: 3, borderTopColor: team.color }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
          style={{ background: team.color }}
        >
          {team.slot}
        </div>
        <div>
          <h2 className="font-black text-lg text-white" style={{ color: team.color }}>{team.name}</h2>
          <p className="text-[#9CA3AF] text-xs">{players.length} member{players.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="space-y-3">
        {players.length === 0 ? (
          <p className="text-[#9CA3AF]/40 text-sm italic text-center py-4">No members yet</p>
        ) : (
          players.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#1D2438]">
              <Avatar player={p} size={36} teamColor={team.color} />
              <span className="text-white font-medium text-sm flex-1 truncate">{p.username}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: p.online ? '#2ECC71' : '#555', boxShadow: p.online ? '0 0 5px #2ECC71' : 'none' }}
                />
                <span className="text-xs text-[#9CA3AF]">{p.online ? 'online' : 'away'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ActivityFeed({ log }: { log: ActivityEntry[] }) {
  const icons: Record<string, string> = {
    join: '👋', team_join: '🤝', team_switch: '🔄', buzz_win: '⚡', room_start: '🚀', round_end: '🏁',
  };
  return (
    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
      {log.length === 0 ? (
        <p className="text-[#9CA3AF]/40 text-xs italic py-2">Waiting for activity…</p>
      ) : (
        log.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2 text-sm py-1">
            <span className="flex-shrink-0">{icons[entry.type] || '•'}</span>
            <div>
              {entry.playerName && (
                <span className="font-semibold" style={{ color: entry.teamColor || '#fff' }}>{entry.playerName} </span>
              )}
              <span className="text-[#9CA3AF]">{entry.message.replace(entry.playerName ? entry.playerName + ' ' : '', '')}</span>
              <span className="text-[#9CA3AF]/40 text-xs ml-2">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function PresentationRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [buzzerResult, setBuzzerResult] = useState<BuzzerResult | null>(null);
  const [buzzerOpen, setBuzzerOpen] = useState(false);
  const [flashWin, setFlashWin] = useState(false);

  useEffect(() => {
    socket.emit('room:get_state', roomCode, (response: any) => {
      if (!response.error) {
        setRoom(response);
        setBuzzerOpen(response.buzzerState === 'OPEN');
        setBuzzerResult(response.lastBuzzerResult ?? null);
      }
    });

    socket.on('room:state', (state: RoomState) => {
      setRoom(state);
      setBuzzerOpen(state.buzzerState === 'OPEN');
    });

    socket.on('buzzer:opened', () => {
      setBuzzerOpen(true);
      setBuzzerResult(null);
    });

    socket.on('buzzer:result', (data: BuzzerResult) => {
      setBuzzerOpen(false);
      setBuzzerResult(data);
      setFlashWin(true);
      playBuzzerSound();
      setTimeout(() => setFlashWin(false), 1000);
    });

    return () => {
      socket.off('room:state');
      socket.off('buzzer:opened');
      socket.off('buzzer:result');
    };
  }, [roomCode]);

  if (!room) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading presentation…</div>
      </div>
    );
  }

  const teams = Object.values(room.teams);
  const teamA = teams.find(t => t.slot === 'A');
  const teamB = teams.find(t => t.slot === 'B');
  const getTeamPlayers = (team?: Team) =>
    team ? Object.values(room.players).filter(p => p.teamId === team.id) : [];

  return (
    <div className={`min-h-screen bg-[#0B0F19] flex flex-col transition-colors duration-200 ${flashWin ? 'bg-[#1a0a0a]' : ''}`}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-[#252C42]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6C5CE7] to-[#FF4B4B] flex items-center justify-center text-sm">⚡</div>
          <h1 className="text-xl font-black text-white">BuzzIn</h1>
        </div>
        <div className="font-mono text-[#9CA3AF] tracking-widest text-sm">{room.code}</div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          room.status === 'LIVE' ? 'bg-[#2ECC71]/20 text-[#2ECC71]' : 'bg-[#FFB020]/20 text-[#FFB020]'
        }`}>{room.status}</span>
      </header>

      {/* Current Buzz Winner Banner */}
      {buzzerResult && (
        <div className={`flex items-center justify-center gap-6 py-6 border-b border-[#FF4B4B]/30 transition-all ${flashWin ? 'bg-[#FF4B4B]/10 shadow-[0_0_60px_rgba(255,75,75,0.3)]' : 'bg-[#FF4B4B]/5'}`}>
          <div className="text-2xl">⚡</div>
          <div className="text-center">
            <div className="text-[#FF4B4B] text-xs font-black uppercase tracking-[0.3em] mb-1">Live Buzz!</div>
            <div className="text-4xl font-black text-white">{buzzerResult.winner.username}</div>
            {buzzerResult.team && (
              <span className="inline-block px-3 py-0.5 rounded-full text-sm font-bold mt-1"
                style={{ background: `${buzzerResult.team.color}25`, color: buzzerResult.team.color }}>
                {buzzerResult.team.name}
              </span>
            )}
            <div className="text-[#9CA3AF] text-sm mt-1 font-mono">Reaction: {buzzerResult.reactionMs}ms</div>
          </div>
          <div className="text-2xl">⚡</div>
        </div>
      )}

      {/* Open Buzzer Banner */}
      {buzzerOpen && !buzzerResult && (
        <div className="flex items-center justify-center gap-4 py-5 bg-[#2ECC71]/5 border-b border-[#2ECC71]/30">
          <div className="w-3 h-3 rounded-full bg-[#2ECC71] animate-pulse shadow-[0_0_10px_#2ECC71]" />
          <span className="text-[#2ECC71] font-black text-xl uppercase tracking-widest">Buzzer is OPEN</span>
          <div className="w-3 h-3 rounded-full bg-[#2ECC71] animate-pulse shadow-[0_0_10px_#2ECC71]" />
        </div>
      )}

      {/* Main: Two Team Panels */}
      <main className="flex-1 grid grid-cols-5 gap-6 p-8">
        <div className="col-span-2">{teamA && <TeamPanel team={teamA} players={getTeamPlayers(teamA)} />}</div>

        {/* Center: Queue + Activity */}
        <div className="col-span-1 flex flex-col gap-6">
          {/* Queue */}
          <div className="bg-[#151B2B] border border-[#252C42] rounded-2xl p-4 flex-1">
            <h3 className="text-[#9CA3AF] text-xs font-black uppercase tracking-widest mb-3">Queue</h3>
            <div className="space-y-2">
              {room.queue.slice(0, 8).map((pid, idx) => {
                const p = room.players[pid];
                if (!p) return null;
                const team = p.teamId ? room.teams[p.teamId] : undefined;
                return (
                  <div key={pid} className="flex items-center gap-2 text-sm">
                    <span className="text-[#9CA3AF] text-xs w-4 font-mono">{idx + 1}.</span>
                    <span className="font-medium text-white truncate flex-1">{p.username}</span>
                    {team && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: team.color }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity */}
          <div className="bg-[#151B2B] border border-[#252C42] rounded-2xl p-4 flex-1 overflow-hidden">
            <h3 className="text-[#9CA3AF] text-xs font-black uppercase tracking-widest mb-3">Activity</h3>
            <ActivityFeed log={room.activityLog || []} />
          </div>
        </div>

        <div className="col-span-2">{teamB && <TeamPanel team={teamB} players={getTeamPlayers(teamB)} />}</div>
      </main>

      {/* Footer */}
      <footer className="text-center py-3 border-t border-[#252C42] text-[#9CA3AF]/30 text-xs">
        Format inspired by classic debate & quiz-bowl buzzer systems · BuzzIn
      </footer>
    </div>
  );
}
