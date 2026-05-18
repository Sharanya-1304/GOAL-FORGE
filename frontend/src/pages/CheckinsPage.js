import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { API } from '../contexts/AuthContext';

export function CheckinsPage() {
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ quarter: 'Q1', actual_achievement: '', status: 'on_track', manager_comment: '' });

  useEffect(() => { fetchGoals(); }, []);

  const fetchGoals = async () => {
    try {
      const { data } = await axios.get(`${API}/goals?status=approved`);
      setGoals(data);
    } catch (error) {
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckins = async (goalId) => {
    try {
      const { data } = await axios.get(`${API}/checkins/goal/${goalId}`);
      setCheckins(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGoal) return;
    try {
      const { data } = await axios.post(`${API}/checkins/${selectedGoal.id}`, formData);
      
      // Celebrate completion!
      if (formData.status === 'completed' || data.progress_score >= 90) {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#FF6B35', '#FF8C42', '#16A34A', '#0038FF', '#F59E0B', '#7C3AED'],
          scalar: 1.2,
          ticks: 200,
        });
        toast.success(`🎉 Outstanding! Progress: ${data.progress_score}%`, { duration: 4000 });
      } else {
        toast.success(`Check-in recorded! Progress: ${data.progress_score}%`);
      }
      
      setFormData({ quarter: 'Q1', actual_achievement: '', status: 'on_track', manager_comment: '' });
      fetchCheckins(selectedGoal.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record check-in');
    }
  };

  if (loading) return <Layout><div className="flex items-center justify-center py-20"><div className="inline-block w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div></div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A] mb-2">Quarterly Check-ins</h1>
          <p className="text-sm text-[#52525B]">Update progress on your approved goals</p>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-20 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md">
            <FileText className="w-16 h-16 text-[#A1A1AA] mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="text-lg font-medium text-[#0A0A0A] mb-2">No approved goals</h3>
            <p className="text-sm text-[#52525B]">Wait for your goals to be approved</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-[#0A0A0A] mb-4">Select Goal</h3>
              <div className="space-y-3">
                {goals.map((goal, index) => (
                  <button
                    key={goal.id}
                    data-testid={`select-goal-${index}`}
                    onClick={() => { setSelectedGoal(goal); fetchCheckins(goal.id); }}
                    className={`w-full text-left p-4 border rounded-md transition-all duration-150 ${
                      selectedGoal?.id === goal.id ? 'border-[#FF6B35] bg-[#FFF4ED]' : 'border-[#E5E7EB] bg-white hover:border-[#FF6B35]'
                    }`}
                  >
                    <p className="text-sm font-medium text-[#0A0A0A] mb-1">{goal.title}</p>
                    <p className="text-xs text-[#A1A1AA]">{goal.thrust_area}</p>
                    <p className="text-xs text-[#52525B] mt-2">Target: {goal.target}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedGoal ? (
                <>
                  <div className="bg-white border border-[#E5E7EB] rounded-md p-6 mb-6">
                    <h3 className="text-lg font-semibold text-[#0A0A0A] mb-4">Log Check-in</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Quarter</Label>
                          <select data-testid="quarter-select" value={formData.quarter} onChange={(e) => setFormData({ ...formData, quarter: e.target.value })} className="w-full h-11 px-3 border border-[#E5E7EB] rounded-md text-sm focus:border-[#FF6B35] focus:outline-none">
                            <option value="Q1">Q1 (July)</option>
                            <option value="Q2">Q2 (October)</option>
                            <option value="Q3">Q3 (January)</option>
                            <option value="Q4">Q4 (March-April)</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Status</Label>
                          <select data-testid="status-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full h-11 px-3 border border-[#E5E7EB] rounded-md text-sm focus:border-[#FF6B35] focus:outline-none">
                            <option value="not_started">Not Started</option>
                            <option value="on_track">On Track</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Actual Achievement</Label>
                        <Input data-testid="actual-input" value={formData.actual_achievement} onChange={(e) => setFormData({ ...formData, actual_achievement: e.target.value })} placeholder={`Target: ${selectedGoal.target}`} className="h-11" required />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Comments</Label>
                        <textarea data-testid="comment-input" value={formData.manager_comment} onChange={(e) => setFormData({ ...formData, manager_comment: e.target.value })} placeholder="Add notes..." className="w-full h-20 px-3 py-2 border border-[#E5E7EB] rounded-md text-sm focus:border-[#FF6B35] focus:outline-none" />
                      </div>
                      <Button type="submit" data-testid="submit-checkin" className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white h-11 px-6">Record Check-in</Button>
                    </form>
                  </div>

                  <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
                    <h3 className="text-lg font-semibold text-[#0A0A0A] mb-4">Check-in History</h3>
                    {checkins.length === 0 ? (
                      <p className="text-sm text-[#A1A1AA] text-center py-6">No check-ins yet</p>
                    ) : (
                      <div className="space-y-3">
                        {checkins.map((c, i) => (
                          <div key={i} className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold">{c.quarter}</span>
                              <span className="px-2 py-1 text-xs font-semibold rounded" style={{
                                backgroundColor: c.status === 'completed' ? '#16A34A15' : c.status === 'on_track' ? '#0284C715' : '#F59E0B15',
                                color: c.status === 'completed' ? '#16A34A' : c.status === 'on_track' ? '#0284C7' : '#F59E0B'
                              }}>
                                {c.status.toUpperCase().replace('_', ' ')}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div><span className="text-[#52525B]">Achievement:</span> <strong>{c.actual_achievement}</strong></div>
                              <div><span className="text-[#52525B]">Progress:</span> <strong className="text-[#FF6B35]">{c.progress_score}%</strong></div>
                            </div>
                            <div className="mt-2 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                              <div className="h-full bg-[#FF6B35] rounded-full transition-all duration-500" style={{ width: `${Math.min(c.progress_score, 100)}%` }}></div>
                            </div>
                            {c.manager_comment && <p className="text-xs text-[#52525B] mt-2 pt-2 border-t border-[#E5E7EB]"><strong>Comment:</strong> {c.manager_comment}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-20 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md">
                  <p className="text-sm text-[#52525B]">Select a goal to log check-ins</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
