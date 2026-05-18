import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { CheckCircle, XCircle, Users, Download } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { API } from '../contexts/AuthContext';

export function TeamGoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [reason, setReason] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTeamGoals();
  }, []);

  const fetchTeamGoals = async () => {
    try {
      const { data } = await axios.get(`${API}/goals/team`);
      setGoals(data);
    } catch (error) {
      toast.error('Failed to load team goals');
    } finally {
      setLoading(false);
    }
  };

  const fireConfetti = () => {
    // Multi-burst confetti with brand colors
    const colors = ['#FF6B35', '#FF8C42', '#16A34A', '#0038FF', '#F59E0B', '#7C3AED'];
    
    // Burst from center
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.6 },
      colors,
      shapes: ['circle', 'square'],
      scalar: 1.2,
      ticks: 200,
    });
    
    // Burst from left
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
    }, 200);
    
    // Burst from right
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
    }, 400);
  };

  const handleApprove = async (goalId) => {
    try {
      await axios.post(`${API}/goals/${goalId}/approve`);
      fireConfetti();
      toast.success('🎉 Goal approved! Employee notified.', { duration: 4000 });
      fetchTeamGoals();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve');
    }
  };

  const handleReject = async (goalId) => {
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      await axios.post(`${API}/goals/${goalId}/reject`, { reason });
      toast.success('Goal returned for rework');
      setSelectedGoalId(null);
      setReason('');
      fetchTeamGoals();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/analytics/export/csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `goalforge_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export successful!');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const getStatusColor = (status) => ({ pending: '#F59E0B', approved: '#16A34A', rejected: '#DC2626', rework: '#F59E0B' }[status] || '#A1A1AA');

  const filtered = filter === 'all' ? goals : goals.filter(g => g.status === filter);
  const pending = goals.filter(g => g.status === 'pending').length;
  const approved = goals.filter(g => g.status === 'approved').length;

  if (loading) return <Layout><div className="flex items-center justify-center py-20"><div className="inline-block w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div></div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A] mb-2">Team Goals</h1>
            <p className="text-sm text-[#52525B]">Review and approve goals from your team</p>
          </div>
          <Button data-testid="export-button" onClick={handleExport} className="bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#0A0A0A] h-11 px-5">
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Pending Approval', value: pending, color: '#F59E0B' },
            { label: 'Approved', value: approved, color: '#16A34A' },
            { label: 'Total Goals', value: goals.length, color: '#FF6B35' },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-md p-6">
              <p className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2">{stat.label}</p>
              <p className="text-4xl font-black tracking-tighter" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['all', 'pending', 'approved', 'rework'].map(f => (
            <button key={f} onClick={() => setFilter(f)} data-testid={`filter-${f}`}
              className={`px-4 h-11 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                filter === f ? 'bg-[#FF6B35] text-white' : 'bg-white border border-[#E5E7EB] text-[#52525B] hover:bg-[#F3F4F6]'
              }`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md">
              <Users className="w-16 h-16 text-[#A1A1AA] mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-medium text-[#0A0A0A]">No goals to display</h3>
            </div>
          ) : (
            filtered.map((goal, index) => (
              <div key={goal.id} data-testid={`team-goal-${index}`} className="bg-white border border-[#E5E7EB] rounded-md p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-[#0A0A0A]">{goal.title}</h3>
                      <span className="px-2 py-1 text-xs font-semibold rounded" style={{ backgroundColor: `${getStatusColor(goal.status)}15`, color: getStatusColor(goal.status) }}>
                        {goal.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1AA] mb-1">By: {goal.user_name}</p>
                    <p className="text-xs font-semibold tracking-widest text-[#FF6B35] uppercase mb-2">{goal.thrust_area}</p>
                    <p className="text-sm text-[#52525B] mb-3">{goal.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 my-4 border-y border-[#E5E7EB]">
                  <div><p className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-1">UoM</p><p className="text-sm font-medium capitalize">{goal.uom}</p></div>
                  <div><p className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-1">Target</p><p className="text-sm font-medium">{goal.target}</p></div>
                  <div><p className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-1">Weightage</p><p className="text-sm font-medium">{goal.weightage}%</p></div>
                  <div><p className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-1">Priority</p><p className="text-sm font-medium capitalize">{goal.priority || 'medium'}</p></div>
                </div>

                {goal.status === 'pending' && (
                  selectedGoalId === goal.id ? (
                    <div className="space-y-3">
                      <textarea
                        data-testid="rejection-reason-input"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Provide reason for rework..."
                        className="w-full h-20 px-3 py-2 border border-[#E5E7EB] rounded-md text-sm focus:border-[#FF6B35] focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <Button data-testid="confirm-reject" onClick={() => handleReject(goal.id)} className="bg-[#DC2626] hover:bg-[#B91C1C] text-white h-10 px-5">Submit</Button>
                        <Button onClick={() => { setSelectedGoalId(null); setReason(''); }} className="bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#0A0A0A] h-10 px-5">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button data-testid={`approve-${index}`} onClick={() => handleApprove(goal.id)} className="bg-[#16A34A] hover:bg-[#15803D] text-white h-10 px-5">
                        <CheckCircle className="w-4 h-4 mr-2" />Approve
                      </Button>
                      <Button data-testid={`reject-${index}`} onClick={() => setSelectedGoalId(goal.id)} className="bg-white border border-[#E5E7EB] hover:bg-[#FEE2E2] hover:text-[#DC2626] text-[#0A0A0A] h-10 px-5">
                        <XCircle className="w-4 h-4 mr-2" />Return for Rework
                      </Button>
                    </div>
                  )
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
