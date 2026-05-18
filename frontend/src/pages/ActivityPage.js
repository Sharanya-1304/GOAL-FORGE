import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Activity, Target, CheckCircle, XCircle, Clock, Plus, Trash2 } from 'lucide-react';
import { API } from '../contexts/AuthContext';

export function ActivityPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    try {
      const { data } = await axios.get(`${API}/activities?limit=100`);
      setActivities(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => ({
    created: Plus, approved: CheckCircle, rejected: XCircle, 'checked-in': Activity, deleted: Trash2, updated: Target, unlocked: Clock
  }[action] || Activity);

  const getActionColor = (action) => ({
    created: '#FF6B35', approved: '#16A34A', rejected: '#DC2626', 'checked-in': '#0038FF', deleted: '#DC2626', updated: '#7C3AED', unlocked: '#F59E0B'
  }[action] || '#52525B');

  if (loading) return <Layout><div className="flex items-center justify-center py-20"><div className="inline-block w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div></div></Layout>;

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A] mb-2 flex items-center gap-3">
            <Activity className="w-8 h-8 text-[#FF6B35]" strokeWidth={1.5} />Activity Feed
          </h1>
          <p className="text-sm text-[#52525B]">Real-time updates from across the organization</p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
          {activities.length === 0 ? (
            <div className="text-center py-20">
              <Activity className="w-16 h-16 text-[#A1A1AA] mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-sm text-[#52525B]">No activity yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {activities.map((act, i) => {
                const Icon = getActionIcon(act.action);
                const color = getActionColor(act.action);
                return (
                  <div key={i} className="flex items-start gap-4 p-5 hover:bg-[#F9FAFB] transition-all duration-150" data-testid={`activity-${i}`}>
                    <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                      <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#0A0A0A] mb-1">
                        <strong>{act.user_name}</strong> {act.description}
                      </p>
                      <p className="text-xs text-[#A1A1AA]">{new Date(act.timestamp).toLocaleString()}</p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>{act.action}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
