import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import type { RoomState, BuzzerResult } from '../types';
import { playBuzzerSound } from '../utils/audio';

export default function PlayerRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [buzzerOpen, setBuzzerOpen] = useState(false);
  const [lastResult, setLastResult] = useState<BuzzerResult | null>(null);
  const [iWon, setIWon] = useState(false);
  const [buzzLocked, setBuzzLocked] = useState(false);
  const [showWinFlash, setShowWinFlash] = useState(false);
  const pressTime = useRef<number>(0);

  const myId = socket.id;

  useEffect(() => {
    socket.emit('room:get_state', roomCode, (response: any) => {
      if (response.error) navigate('/');
      else {
        setRoom(response);
        setBuzzerOpen(response.buzzerState === 'OPEN');
      }
    });

    socket.on('room:state', (state: RoomState) => {
      setRoom(state);
      setBuzzerOpen(state.buzzerState === 'OPEN');
    });

    socket.on('buzzer:opened', () => {
      setBuzzerOpen(true);
      setBuzzLocked(false);
      setLastResult(null);
      setIWon(false);
    });

    socket.on('buzzer:result', (data: BuzzerResult) => {
      setBuzzerOpen(false);
      setLastResult(data);
      playBuzzerSound();
      if (data.winner.id === myId) {
        setIWon(true);
        setShowWinFlash(true);
        setTimeout(() => setShowWinFlash(false), 1000);
      }
    });

    socket.on('player:kicked', () => {
      alert('You have been removed from the room.');
      navigate('/');
    });

    return () => {
      socket.off('room:state');
      socket.off('buzzer:opened');
      socket.off('buzzer:result');
      socket.off('player:kicked');
    };
  }, [roomCode, myId]);

  const handleBuzz = () => {
    if (!buzzerOpen || buzzLocked) return;
    setBuzzLocked(true);
    pressTime.current = Date.now();
    socket.emit('buzzer:press', { roomCode });
  };

  const handleJoinTeam = (teamId: string) => {
    socket.emit('team:join', { roomCode, teamId });
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Connecting…</div>
      </div>
    );
  }

  const me = room.players[myId as string];
  const myTeam = me?.teamId ? room.teams[me.teamId] : null;
  const teams = Object.values(room.teams);

  // Team Select Screen
  if (!myTeam) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white">Choose Your Team</h2>
            <p className="text-[#9CA3AF] mt-2">Room: <span className="font-mono font-bold text-white">{room.code}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {teams.map(team => {
              const members = Object.values(room.players).filter(p => p.teamId === team.id);
              return (
                <button
                  key={team.id}
                  onClick={() => handleJoinTeam(team.id)}
                  className="relative flex flex-col items-center p-8 rounded-2xl border-2 transition-all group hover:scale-105 active:scale-95"
                  style={{
                    borderColor: team.color + '60',
                    background: `${team.color}10`,
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white mb-3 transition-transform group-hover:scale-110"
                    style={{ background: team.color }}
                  >
                    {team.slot}
                  </div>
                  <h3 className="font-black text-lg text-white">{team.name}</h3>
                  <p className="text-[#9CA3AF] text-sm mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                  <div className="flex gap-1 mt-3 flex-wrap justify-center">
                    {members.slice(0, 5).map(m => (
                      <div key={m.id} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: team.color }}>
                        {m.username[0]}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Status text
  const statusMap: Record<string, string> = {
    LOBBY: 'Waiting for admin to start…',
    LIVE: buzzerOpen ? 'Buzzer is OPEN — Hit it!' : (lastResult ? `${lastResult.winner.username} buzzed in!` : 'Wait for the next question…'),
    ENDED: 'Room has ended',
  };

  const buzzerDisabled = room.status !== 'LIVE' || !buzzerOpen || buzzLocked;

  return (
    <div className={`min-h-screen bg-[#0B0F19] flex flex-col transition-all duration-200 ${showWinFlash ? 'bg-[#2ECC71]/5' : ''}`}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#252C42] bg-[#151B2B]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {myTeam && (
            <div className="w-3 h-3 rounded-full" style={{ background: myTeam.color, boxShadow: `0 0 8px ${myTeam.color}` }} />
          )}
          <span className="font-bold text-white text-sm">{myTeam?.name}</span>
        </div>
        <span className="font-mono text-[#9CA3AF] text-sm tracking-widest">{room.code}</span>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
          room.status === 'LIVE' ? 'bg-[#2ECC71]/20 text-[#2ECC71]' : 'bg-[#FFB020]/20 text-[#FFB020]'
        }`}>{room.status}</span>
      </div>

      {/* Main Buzzer Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        {/* Status */}
        <p className="text-[#9CA3AF] text-center text-base max-w-xs">{statusMap[room.status]}</p>

        {/* Big Buzzer Button */}
        <button
          onPointerDown={handleBuzz}
          disabled={buzzerDisabled}
          className={`relative w-64 h-64 rounded-full flex items-center justify-center text-2xl font-black transition-all duration-150 select-none
            ${buzzerOpen && !buzzLocked
              ? 'bg-[#FF4B4B] shadow-[0_0_80px_rgba(255,75,75,0.7)] hover:scale-105 active:scale-90 cursor-pointer text-white animate-[pulse_2s_ease-in-out_infinite]'
              : iWon && lastResult
                ? 'bg-[#2ECC71] shadow-[0_0_60px_rgba(46,204,113,0.6)] text-white cursor-default'
                : 'bg-[#1D2438] border-4 border-[#252C42] text-[#9CA3AF]/50 cursor-not-allowed'
            }`}
        >
          {buzzerOpen && !buzzLocked && 'BUZZ IN!'}
          {buzzLocked && !lastResult && '…'}
          {lastResult && iWon && '🎙️ Your turn to speak!'}
          {lastResult && !iWon && lastResult.winner.username}
          {!buzzerOpen && !lastResult && room.status === 'LOBBY' && '🔒'}
          {!buzzerOpen && !lastResult && room.status === 'LIVE' && '🔒'}
        </button>

        {/* Last result info */}
        {lastResult && !iWon && (
          <div className="text-center text-sm text-[#9CA3AF]">
            <span className="font-bold text-white">{lastResult.winner.username}</span>
            {lastResult.team && <span style={{ color: lastResult.team.color }}> · {lastResult.team.name}</span>}
            <span className="ml-2 font-mono">({lastResult.reactionMs}ms)</span>
          </div>
        )}

        {/* Queue preview */}
        {room.status === 'LIVE' && room.queue.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
            <span>Queue:</span>
            {room.queue.slice(0, 5).map((pid, idx) => {
              const p = room.players[pid];
              if (!p) return null;
              return (
                <span key={pid} className={`font-medium ${pid === myId ? 'text-white' : ''}`}>
                  {idx + 1}. {p.username}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#252C42] text-center text-[#9CA3AF]/40 text-xs">
        Format inspired by classic debate & quiz-bowl buzzer systems
      </div>
    </div>
  );
}
