import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Trophy, Medal, Award } from 'lucide-react';
import { API } from '../contexts/AuthContext';

export function LeaderboardPage() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    try {
      const { data } = await axios.get(`${API}/analytics/leaderboard`);
      setLeaders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Layout><div className="flex items-center justify-center py-20"><div className="inline-block w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div></div></Layout>;

  const getMedal = (rank) => {
    if (rank === 0) return { icon: Trophy, color: '#F59E0B', bg: '#FEF3C7' };
    if (rank === 1) return { icon: Medal, color: '#A1A1AA', bg: '#F3F4F6' };
    if (rank === 2) return { icon: Award, color: '#FB923C', bg: '#FED7AA' };
    return { icon: null, color: '#52525B', bg: '#F9FAFB' };
  };

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A] mb-2 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[#F59E0B]" strokeWidth={1.5} />Leaderboard
          </h1>
          <p className="text-sm text-[#52525B]">Top performers based on goal achievements and check-ins</p>
        </div>

        {/* Top 3 podium */}
        {leaders.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[1, 0, 2].map((idx) => {
              const leader = leaders[idx];
              if (!leader) return null;
              const medal = getMedal(idx);
              const Icon = medal.icon;
              return (
                <div
                  key={leader.id}
                  className={`bg-white border-2 rounded-md p-6 text-center ${
                    idx === 0 ? 'border-[#F59E0B] transform scale-105' : 'border-[#E5E7EB]'
                  }`}
                  style={{ marginTop: idx === 0 ? 0 : '20px' }}
                >
                  <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: medal.bg }}>
                    {Icon && <Icon className="w-8 h-8" style={{ color: medal.color }} strokeWidth={1.5} />}
                  </div>
                  <p className="text-2xl font-black tracking-tighter text-[#0A0A0A]">#{idx + 1}</p>
                  <p className="text-sm font-semibold text-[#0A0A0A] mt-2 truncate">{leader.name}</p>
                  <p className="text-xs text-[#A1A1AA]">{leader.department}</p>
                  <p className="text-3xl font-black tracking-tighter mt-3" style={{ color: medal.color }}>{leader.points}</p>
                  <p className="text-xs font-semibold tracking-widest text-[#52525B] uppercase">Points</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Full leaderboard */}
        <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
          <div className="p-4 bg-[#F9FAFB] border-b border-[#E5E7EB]">
            <h3 className="text-sm font-semibold text-[#0A0A0A]">Full Rankings</h3>
          </div>
          {leaders.length === 0 ? (
            <p className="text-center py-12 text-sm text-[#52525B]">No leaders yet. Create goals and complete check-ins to earn points!</p>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {leaders.map((leader, idx) => {
                const medal = getMedal(idx);
                const Icon = medal.icon;
                return (
                  <div key={leader.id} className="flex items-center gap-4 p-4 hover:bg-[#F9FAFB] transition-all duration-150" data-testid={`leader-${idx}`}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: medal.bg }}>
                      {Icon ? (
                        <Icon className="w-5 h-5" style={{ color: medal.color }} strokeWidth={1.5} />
                      ) : (
                        <span className="text-sm font-bold text-[#52525B]">#{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0A0A0A] truncate">{leader.name}</p>
                      <p className="text-xs text-[#A1A1AA]">{leader.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black tracking-tighter" style={{ color: medal.color }}>{leader.points}</p>
                      <p className="text-xs text-[#52525B]">points</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* How to earn */}
        <div className="mt-8 bg-[#FFF4ED] border border-[#FFD7C4] rounded-md p-6">
          <h3 className="text-lg font-semibold text-[#FF6B35] mb-4">How to Earn Points</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-[#FF6B35]">10</p>
              <p className="text-xs text-[#52525B] mt-1">Create a goal</p>
            </div>
            <div>
              <p className="text-2xl font-black text-[#16A34A]">25</p>
              <p className="text-xs text-[#52525B] mt-1">Goal approved</p>
            </div>
            <div>
              <p className="text-2xl font-black text-[#0038FF]">15</p>
              <p className="text-xs text-[#52525B] mt-1">On-track check-in</p>
            </div>
            <div>
              <p className="text-2xl font-black text-[#7C3AED]">50</p>
              <p className="text-xs text-[#52525B] mt-1">Complete goal</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
