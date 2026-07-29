import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { socket } from '../socket';
import type { RoomState, Player, Team, BuzzerResult, ActivityEntry } from '../types';
import { playBuzzerSound } from '../utils/audio';

function Avatar({ player, size = 40 }: { player: Player; size?: number }) {
  const initials = player.username.slice(0, 2).toUpperCase();
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {player.avatar ? (
        <img src={player.avatar} className="rounded-full object-cover w-full h-full" alt={player.username} />
      ) : (
        <div
          className="rounded-full flex items-center justify-center font-bold text-white"
          style={{ width: size, height: size, background: 'linear-gradient(135deg, #6C5CE7, #FF4B4B)', fontSize: size * 0.35 }}
        >
          {initials}
        </div>
      )}
      {/* Online dot */}
      <span
        className="absolute bottom-0 right-0 rounded-full border-2 border-[#151B2B]"
        style={{
          width: size * 0.28,
          height: size * 0.28,
          background: player.online ? '#2ECC71' : '#9CA3AF',
        }}
      />
    </div>
  );
}

function ActivityFeed({ log }: { log: ActivityEntry[] }) {
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [log.length]);

  const icons: Record<string, string> = {
    join: '👋', team_join: '🤝', team_switch: '🔄', buzz_win: '⚡', room_start: '🚀', round_end: '🏁',
  };

  return (
    <div ref={feedRef} className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
      {log.length === 0 ? (
        <p className="text-[#9CA3AF]/50 text-xs italic py-2">No activity yet...</p>
      ) : (
        log.map((entry, idx) => (
          <div
            key={entry.id}
            className="flex items-start gap-2 py-1 text-sm animate-[slideIn_0.2s_ease-out]"
            style={{ opacity: 1 - idx * 0.025 }}
          >
            <span className="text-base flex-shrink-0">{icons[entry.type] || '•'}</span>
            <div>
              <span style={{ color: entry.teamColor || '#9CA3AF' }} className="font-semibold">
                {entry.playerName && `${entry.playerName} `}
              </span>
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

export default function AdminRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [buzzerResult, setBuzzerResult] = useState<BuzzerResult | null>(null);
  const [buzzerOpen, setBuzzerOpen] = useState(false);
  const [flashWin, setFlashWin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const adminUsername = sessionStorage.getItem('buzzin_adminUsername') || '';
    let isMounted = true;
    let joined = false;

    socket.emit('room:admin_rejoin', { roomCode, adminUsername }, (response: any) => {
      if (!isMounted) return;
      joined = true;
      if (response && !response.error) {
        setRoom(response);
        setBuzzerOpen(response.buzzerState === 'OPEN');
      } else {
        setError(response?.error || 'Room not found');
      }
    });

    // Fallback if backend doesn't know 'room:admin_rejoin'
    setTimeout(() => {
      if (!joined && isMounted) {
        socket.emit('room:get_state', roomCode, (response: any) => {
          if (!isMounted) return;
          joined = true;
          if (response && !response.error) {
            setRoom(response);
            setBuzzerOpen(response.buzzerState === 'OPEN');
          } else {
            setError(response?.error || 'Room not found');
          }
        });
      }
    }, 2000);

    // Timeout fallback
    setTimeout(() => {
      if (!joined && isMounted) {
        setError('Connection timeout. The server might be starting up or the room does not exist.');
      }
    }, 7000);

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
      setTimeout(() => setFlashWin(false), 800);
    });

    return () => {
      isMounted = false;
      socket.off('room:state');
      socket.off('buzzer:opened');
      socket.off('buzzer:result');
    };
  }, [roomCode]);

  const handleOpenBuzzer = () => socket.emit('buzzer:open', { roomCode });
  const handleStartRoom = () => socket.emit('room:start', { roomCode });
  const handleKick = (playerId: string) => socket.emit('player:kick', { roomCode, playerId });
  const handleEndRoom = () => {
    if (confirm('End the room for all players?')) socket.emit('room:end', { roomCode });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-white text-2xl font-bold mb-2">Oops!</h2>
        <p className="text-[#9CA3AF] mb-6 text-center max-w-md">{error}</p>
        <a href="/" className="px-6 py-3 rounded-xl bg-[#6C5CE7] text-white font-bold hover:bg-[#5a4cd6] transition-colors">
          Go Back Home
        </a>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#6C5CE7] border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-[#9CA3AF] text-lg font-medium animate-pulse">Loading room…</div>
      </div>
    );
  }

  const teams = Object.values(room.teams);
  const teamA = teams.find(t => t.slot === 'A');
  const teamB = teams.find(t => t.slot === 'B');

  const getTeamPlayers = (team?: Team) =>
    team ? Object.values(room.players).filter(p => p.teamId === team.id) : [];
  const unassigned = Object.values(room.players).filter(p => !p.teamId);

  return (
    <div className={`min-h-screen bg-[#0B0F19] text-white transition-all duration-150 ${flashWin ? 'ring-8 ring-[#FF4B4B]/60 ring-inset' : ''}`}>
      {/* Header */}
      <header className="bg-[#151B2B]/80 backdrop-blur-sm border-b border-[#252C42] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6C5CE7] to-[#FF4B4B] flex items-center justify-center text-sm">⚡</div>
          <div>
            <h1 className="font-black text-lg">Admin Console</h1>
            <p className="text-[#9CA3AF] text-xs">
              Room: <span className="font-mono font-black text-white tracking-widest">{room.code}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            room.status === 'LIVE' ? 'bg-[#2ECC71]/20 text-[#2ECC71]' :
            room.status === 'LOBBY' ? 'bg-[#FFB020]/20 text-[#FFB020]' :
            'bg-[#9CA3AF]/20 text-[#9CA3AF]'
          }`}>{room.status}</span>
          {room.status === 'LOBBY' && (
            <button onClick={handleStartRoom}
              className="px-5 py-2 rounded-xl bg-[#2ECC71] text-black font-bold text-sm hover:bg-[#27ae60] transition-all shadow-[0_0_15px_rgba(46,204,113,0.4)]">
              Start Room
            </button>
          )}
          <a href={`/presentation/${roomCode}`} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-[#1D2438] border border-[#252C42] text-sm font-medium hover:border-[#6C5CE7] transition-all">
            📺 Presentation
          </a>
          <button onClick={handleEndRoom}
            className="px-4 py-2 rounded-xl bg-[#FF4B4B]/10 border border-[#FF4B4B]/30 text-[#FF4B4B] text-sm font-medium hover:bg-[#FF4B4B]/20 transition-all">
            End Room
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Buzz Display */}
          <div className={`relative bg-[#151B2B] border rounded-2xl p-8 min-h-[320px] flex flex-col items-center justify-center transition-all duration-300 ${
            buzzerResult ? 'border-[#FF4B4B]/60 shadow-[0_0_40px_rgba(255,75,75,0.2)]' : 'border-[#252C42]'
          }`}>
            {buzzerOpen && !buzzerResult && (
              <div className="text-center">
                <div className="text-6xl animate-bounce mb-4">🟢</div>
                <h3 className="text-2xl font-bold text-[#2ECC71]">Buzzer is OPEN</h3>
                <p className="text-[#9CA3AF] mt-2">Waiting for players to buzz in…</p>
              </div>
            )}
            {buzzerResult && (
              <div className="text-center w-full">
                <div className="text-[#FF4B4B] text-xs font-black uppercase tracking-[0.3em] mb-4 animate-pulse">⚡ Live Buzz!</div>
                <Avatar player={buzzerResult.winner} size={96} />
                <h2 className="text-5xl font-black mt-5 mb-2">{buzzerResult.winner.username}</h2>
                {buzzerResult.team && (
                  <span
                    className="inline-block px-4 py-1 rounded-full text-sm font-bold mt-1"
                    style={{ background: `${buzzerResult.team.color}25`, color: buzzerResult.team.color }}
                  >
                    {buzzerResult.team.name}
                  </span>
                )}
                <p className="text-[#9CA3AF] text-sm mt-3 font-mono">Reaction: {buzzerResult.reactionMs}ms</p>
              </div>
            )}
            {!buzzerOpen && !buzzerResult && (
              <div className="text-center opacity-30">
                <div className="text-6xl mb-4">🔒</div>
                <p className="text-[#9CA3AF]">Open the buzzer for the next question</p>
              </div>
            )}
          </div>

          {/* Buzzer Control */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleOpenBuzzer}
              disabled={buzzerOpen}
              className="px-10 py-4 rounded-2xl font-bold text-xl text-white bg-gradient-to-r from-[#2ECC71] to-[#27ae60] hover:shadow-[0_0_30px_rgba(46,204,113,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {buzzerOpen ? 'Buzzer is Open' : '▶ Open Buzzer'}
            </button>
          </div>

          {/* Activity Feed */}
          <div className="bg-[#151B2B] border border-[#252C42] rounded-2xl p-6">
            <h3 className="text-sm font-black text-[#9CA3AF] uppercase tracking-widest mb-4">Activity Feed</h3>
            <ActivityFeed log={room.activityLog || []} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* MLFQ Queue */}
          <div className="bg-[#151B2B] border border-[#252C42] rounded-2xl p-5">
            <h3 className="text-sm font-black text-[#9CA3AF] uppercase tracking-widest mb-4">Buzzer Queue</h3>
            <div className="space-y-2">
              {room.queue.length === 0 ? (
                <p className="text-[#9CA3AF]/50 text-xs italic">No players</p>
              ) : (
                room.queue.map((pid, idx) => {
                  const p = room.players[pid];
                  if (!p) return null;
                  const wins = room.consecutiveWins[p.id] || 0;
                  const team = p.teamId ? room.teams[p.teamId] : undefined;
                  return (
                    <div key={pid} className="flex items-center gap-3 p-3 rounded-xl bg-[#1D2438]">
                      <span className="text-[#9CA3AF] text-xs font-mono w-4">{idx + 1}</span>
                      <Avatar player={p} size={28} />
                      <span className="flex-1 text-sm font-medium truncate">{p.username}</span>
                      {team && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: team.color }} />}
                      <span className="text-xs text-[#9CA3AF] font-mono">{wins}/2 🔥</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Teams */}
          {[teamA, teamB].map(team => {
            if (!team) return null;
            const members = getTeamPlayers(team);
            return (
              <div key={team.id} className="bg-[#151B2B] border border-[#252C42] rounded-2xl p-5" style={{ borderLeftWidth: 3, borderLeftColor: team.color }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm" style={{ color: team.color }}>{team.name}</h3>
                  <span className="text-xs text-[#9CA3AF]">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {members.length === 0 ? (
                    <p className="text-[#9CA3AF]/40 text-xs italic">No members yet</p>
                  ) : (
                    members.map(p => (
                      <div key={p.id} className="flex items-center gap-2 group">
                        <Avatar player={p} size={28} />
                        <span className="flex-1 text-sm truncate">{p.username}</span>
                        <button onClick={() => handleKick(p.id)} className="opacity-0 group-hover:opacity-100 text-[#FF4B4B] text-xs px-2 py-0.5 rounded bg-[#FF4B4B]/10 hover:bg-[#FF4B4B]/20 transition-all">kick</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* Unassigned */}
          {unassigned.length > 0 && (
            <div className="bg-[#151B2B] border border-[#252C42] border-dashed rounded-2xl p-5">
              <h3 className="text-xs font-black text-[#9CA3AF] uppercase tracking-widest mb-3">Unassigned</h3>
              <div className="space-y-2">
                {unassigned.map(p => (
                  <div key={p.id} className="flex items-center gap-2 group">
                    <Avatar player={p} size={28} />
                    <span className="flex-1 text-sm truncate text-[#9CA3AF]">{p.username}</span>
                    <button onClick={() => handleKick(p.id)} className="opacity-0 group-hover:opacity-100 text-[#FF4B4B] text-xs px-2 py-0.5 rounded bg-[#FF4B4B]/10 transition-all">kick</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
