import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

export default function AdminLanding() {
  const navigate = useNavigate();
  const [adminUsername, setAdminUsername] = useState('');
  const [teamAName, setTeamAName] = useState('Team A');
  const [teamBName, setTeamBName] = useState('Team B');
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername) return;
    setLoading(true);

    socket.emit('room:create', { adminUsername, teamAName, teamBName }, (roomCode: string) => {
      sessionStorage.setItem('buzzin_adminRoom', roomCode);
      sessionStorage.setItem('buzzin_adminUsername', adminUsername);
      navigate(`/admin/${roomCode}`);
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#6C5CE7]/15 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-[#6C5CE7]/8 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#6C5CE7] mb-4 shadow-[0_0_40px_rgba(108,92,231,0.6)]">
            <span className="text-3xl">🎙️</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Admin Portal</h1>
          <p className="text-[#9CA3AF] mt-2">Create and host a BuzzIn room</p>
        </div>

        <div className="bg-[#151B2B] border border-[#6C5CE7]/20 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleCreateRoom} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-1.5">Host Name</label>
              <input
                type="text"
                value={adminUsername}
                onChange={e => setAdminUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1D2438] border border-[#252C42] text-white placeholder-[#9CA3AF]/50 focus:outline-none focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7]/50 transition-all"
                placeholder="e.g. Host Alex"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-1.5">Team A Name</label>
                <input
                  type="text"
                  maxLength={20}
                  value={teamAName}
                  onChange={e => setTeamAName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#1D2438] border border-[#252C42] text-white placeholder-[#9CA3AF]/50 focus:outline-none focus:border-[#6C5CE7] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-1.5">Team B Name</label>
                <input
                  type="text"
                  maxLength={20}
                  value={teamBName}
                  onChange={e => setTeamBName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#1D2438] border border-[#252C42] text-white placeholder-[#9CA3AF]/50 focus:outline-none focus:border-[#6C5CE7] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!adminUsername || loading}
              className="w-full py-4 rounded-xl font-bold text-white text-lg bg-gradient-to-r from-[#6C5CE7] to-[#8b7cf8] hover:from-[#5a4cd6] hover:to-[#7a6be8] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_25px_rgba(108,92,231,0.4)] hover:shadow-[0_0_35px_rgba(108,92,231,0.6)] active:scale-95"
            >
              {loading ? 'Creating...' : 'Create Room →'}
            </button>

            <a href="/" className="block text-center text-[#9CA3AF] text-sm hover:text-white transition-colors">
              Join as a player instead
            </a>
          </form>
        </div>
      </div>
    </div>
  );
}
