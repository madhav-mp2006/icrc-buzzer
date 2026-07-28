import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

export default function PlayerLanding() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Client-side resize via canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 128, 128);
        setAvatar(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (username.length < 1) return setError('Username is required');
    if (roomCode.length !== 6) return setError('Room code must be 6 characters');
    setLoading(true);

    socket.emit('room:join', { roomCode: roomCode.toUpperCase(), username, avatar }, (response: any) => {
      setLoading(false);
      if (response.error) {
        setError(response.error);
      } else {
        sessionStorage.setItem('buzzin_username', username);
        sessionStorage.setItem('buzzin_roomCode', roomCode.toUpperCase());
        navigate(`/room/${roomCode.toUpperCase()}`);
      }
    });
  };

  const initials = username.slice(0, 2).toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-[#6C5CE7]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] rounded-full bg-[#FF4B4B]/8 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6C5CE7] to-[#FF4B4B] mb-4 shadow-[0_0_30px_rgba(108,92,231,0.4)]">
            <span className="text-3xl">⚡</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">BuzzIn</h1>
          <p className="text-[#9CA3AF] mt-2 text-base">Real-time quiz & debate buzzer</p>
        </div>

        <div className="bg-[#151B2B] border border-[#252C42] rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleJoin} className="space-y-5">
            {/* Avatar + Username Row */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex-shrink-0 w-16 h-16 rounded-full bg-[#1D2438] border-2 border-dashed border-[#252C42] hover:border-[#6C5CE7] transition-colors flex items-center justify-center overflow-hidden group"
              >
                {avatar ? (
                  <img src={avatar} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  <div className="text-center">
                    <span className="text-xl font-bold text-[#6C5CE7]">{initials}</span>
                    <span className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-[#9CA3AF]">upload</span>
                  </div>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

              <div className="flex-1">
                <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-1.5">Username</label>
                <input
                  type="text"
                  maxLength={20}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#1D2438] border border-[#252C42] text-white placeholder-[#9CA3AF]/50 focus:outline-none focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]/50 transition-all"
                  placeholder="e.g. QuizMaster99"
                />
              </div>
            </div>

            {/* Room Code */}
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-1.5">Room Code</label>
              <input
                type="text"
                maxLength={6}
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className="w-full px-4 py-4 rounded-xl bg-[#1D2438] border border-[#252C42] text-white text-2xl font-black tracking-[0.5em] text-center placeholder-[#9CA3AF]/30 focus:outline-none focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]/50 transition-all uppercase"
                placeholder="••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FF4B4B]/10 border border-[#FF4B4B]/30 text-[#FF4B4B] text-sm">
                <span>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!username || roomCode.length !== 6 || loading}
              className="w-full py-4 rounded-xl font-bold text-white text-lg bg-gradient-to-r from-[#6C5CE7] to-[#8b7cf8] hover:from-[#5a4cd6] hover:to-[#7a6be8] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(108,92,231,0.3)] hover:shadow-[0_0_30px_rgba(108,92,231,0.5)] active:scale-95"
            >
              {loading ? 'Connecting...' : 'Join Room →'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#9CA3AF]/40 text-xs mt-6">
          Format inspired by classic debate & quiz-bowl buzzer systems
        </p>
      </div>
    </div>
  );
}
