import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Plus, Target, Search, Filter, Trash2, Sparkles, X, Lock, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

export function GoalsPage() {
  const [searchParams] = useSearchParams();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiInput, setAiInput] = useState({ department: '', role: 'Employee', thrust_area: '' });
  const [formData, setFormData] = useState({
    thrust_area: '', title: '', description: '', uom: 'numeric',
    target: '', weightage: 10, metric_type: 'higher_better', priority: 'medium', tags: []
  });

  useEffect(() => {
    fetchGoals();
    // Handle template prefill from URL
    const template = searchParams.get('template');
    if (template) {
      try {
        const data = JSON.parse(decodeURIComponent(template));
        setFormData({ ...formData, ...data });
        setShowForm(true);
      } catch (e) {}
    }
  }, []);

  const fetchGoals = async () => {
    try {
      const { data } = await axios.get(`${API}/goals`);
      setGoals(data);
    } catch (error) {
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const totalWeightage = goals.reduce((sum, g) => sum + parseFloat(g.weightage || 0), 0) + parseFloat(formData.weightage);
    if (totalWeightage > 100) {
      toast.error(`Total weightage cannot exceed 100%. Current: ${totalWeightage}%`);
      return;
    }
    if (goals.length >= 8) {
      toast.error('Maximum 8 goals allowed');
      return;
    }

    try {
      await axios.post(`${API}/goals`, formData);
      toast.success('Goal created successfully!');
      setShowForm(false);
      setFormData({ thrust_area: '', title: '', description: '', uom: 'numeric', target: '', weightage: 10, metric_type: 'higher_better', priority: 'medium', tags: [] });
      fetchGoals();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create goal');
    }
  };

  const handleDelete = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await axios.delete(`${API}/goals/${goalId}`);
      toast.success('Goal deleted');
      fetchGoals();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleAISuggest = async () => {
    if (!aiInput.department) {
      toast.error('Please enter department');
      return;
    }
    setAiLoading(true);
    try {
      const { data } = await axios.post(`${API}/ai/suggest-goals`, aiInput);
      setAiSuggestions(data.suggestions || []);
      if (data.suggestions?.length === 0) toast.info('No suggestions generated. Try again.');
    } catch (error) {
      toast.error('AI service unavailable. Try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const useAISuggestion = (suggestion) => {
    setFormData({
      ...formData,
      thrust_area: suggestion.thrust_area || '',
      title: suggestion.title || '',
      description: suggestion.description || '',
      uom: suggestion.uom || 'numeric',
      target: suggestion.target || '',
      metric_type: suggestion.metric_type || 'higher_better',
    });
    setShowAI(false);
    setShowForm(true);
    toast.success('Suggestion applied!');
  };

  const getStatusColor = (status) => ({
    pending: '#F59E0B', approved: '#16A34A', rejected: '#DC2626', rework: '#F59E0B'
  }[status] || '#A1A1AA');

  const getPriorityColor = (priority) => ({
    high: '#DC2626', medium: '#F59E0B', low: '#16A34A'
  }[priority] || '#A1A1AA');

  const filteredGoals = goals.filter(g => {
    if (filterStatus !== 'all' && g.status !== filterStatus) return false;
    if (searchTerm && !g.title.toLowerCase().includes(searchTerm.toLowerCase()) && !g.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const currentWeightage = goals.reduce((sum, g) => sum + parseFloat(g.weightage || 0), 0);

  if (loading) {
    return <Layout><div className="flex items-center justify-center py-20"><div className="inline-block w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div></div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A] mb-2">My Goals</h1>
            <p className="text-sm text-[#52525B]">
              Total Weightage: <span className="font-semibold text-[#FF6B35]">{currentWeightage}%</span> / 100% • 
              <span className="ml-2">{goals.length}/8 goals</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              data-testid="ai-suggest-button"
              onClick={() => setShowAI(true)}
              className="bg-gradient-to-r from-[#7C3AED] to-[#9333EA] hover:from-[#6D28D9] hover:to-[#7E22CE] text-white h-11 px-5 rounded-md transition-all duration-150"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Suggest
            </Button>
            {!showForm && goals.length < 8 && (
              <Button
                data-testid="create-goal-button"
                onClick={() => setShowForm(true)}
                className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white h-11 px-5 rounded-md transition-all duration-150"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Goal
              </Button>
            )}
          </div>
        </div>

        {/* AI Suggestion Modal */}
        {showAI && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAI(false)}>
            <div className="bg-white rounded-md p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#9333EA] rounded-md flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0A0A0A]">AI Goal Suggestions</h3>
                    <p className="text-xs text-[#52525B]">Powered by Claude AI</p>
                  </div>
                </div>
                <button onClick={() => setShowAI(false)} className="p-2 hover:bg-[#F3F4F6] rounded-md">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <Input data-testid="ai-department-input" placeholder="Department" value={aiInput.department} onChange={(e) => setAiInput({ ...aiInput, department: e.target.value })} className="h-11" />
                <Input data-testid="ai-role-input" placeholder="Role" value={aiInput.role} onChange={(e) => setAiInput({ ...aiInput, role: e.target.value })} className="h-11" />
                <Input data-testid="ai-thrust-input" placeholder="Focus area (optional)" value={aiInput.thrust_area} onChange={(e) => setAiInput({ ...aiInput, thrust_area: e.target.value })} className="h-11" />
              </div>
              <Button data-testid="ai-generate-button" onClick={handleAISuggest} disabled={aiLoading} className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11 mb-4">
                {aiLoading ? 'Generating SMART goals...' : 'Generate Suggestions'}
              </Button>

              <div className="space-y-3">
                {aiSuggestions.map((s, i) => (
                  <div key={i} className="p-4 border border-[#E5E7EB] rounded-md hover:border-[#7C3AED] transition-all duration-150">
                    <h4 className="font-semibold text-[#0A0A0A] mb-1">{s.title}</h4>
                    <p className="text-sm text-[#52525B] mb-3">{s.description}</p>
                    <div className="flex flex-wrap gap-2 mb-3 text-xs">
                      <span className="px-2 py-1 bg-[#F3F4F6] rounded">{s.thrust_area}</span>
                      <span className="px-2 py-1 bg-[#F3F4F6] rounded">UoM: {s.uom}</span>
                      <span className="px-2 py-1 bg-[#F3F4F6] rounded">Target: {s.target}</span>
                    </div>
                    <Button onClick={() => handleAISuggestion(s)} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-9 px-4 text-sm">
                      Use This Goal
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" />
            <Input
              data-testid="search-goals"
              placeholder="Search goals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <select
            data-testid="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-11 px-3 border border-[#E5E7EB] rounded-md text-sm focus:border-[#FF6B35] focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rework">Rework</option>
          </select>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white border border-[#E5E7EB] rounded-md p-6 mb-6" data-testid="goal-form">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[#0A0A0A]">Create New Goal</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-[#F3F4F6] rounded-md"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Thrust Area</Label>
                  <Input data-testid="thrust-area-input" value={formData.thrust_area} onChange={(e) => setFormData({ ...formData, thrust_area: e.target.value })} placeholder="e.g., Sales, Engineering" className="h-11" required />
                </div>
                <div>
                  <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Goal Title</Label>
                  <Input data-testid="goal-title-input" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Increase revenue 20%" className="h-11" required />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Description</Label>
                <textarea data-testid="goal-description-input" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the goal in detail..." className="w-full h-24 px-3 py-2 border border-[#E5E7EB] rounded-md text-sm focus:border-[#FF6B35] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">UoM</Label>
                  <select data-testid="uom-select" value={formData.uom} onChange={(e) => setFormData({ ...formData, uom: e.target.value })} className="w-full h-11 px-3 border border-[#E5E7EB] rounded-md text-sm focus:border-[#FF6B35] focus:outline-none">
                    <option value="numeric">Numeric</option>
                    <option value="percentage">Percentage</option>
                    <option value="timeline">Timeline</option>
                    <option value="zero">Zero-based</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Target</Label>
                  <Input data-testid="target-input" value={formData.target} onChange={(e) => setFormData({ ...formData, target: e.target.value })} placeholder="100" className="h-11" required />
                </div>
                <div>
                  <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Weightage %</Label>
                  <Input data-testid="weightage-input" type="number" min="10" max="100" value={formData.weightage} onChange={(e) => setFormData({ ...formData, weightage: parseFloat(e.target.value) })} className="h-11" required />
                </div>
                <div>
                  <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Priority</Label>
                  <select data-testid="priority-select" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full h-11 px-3 border border-[#E5E7EB] rounded-md text-sm focus:border-[#FF6B35] focus:outline-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              {(formData.uom === 'numeric' || formData.uom === 'percentage') && (
                <div>
                  <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Metric Type</Label>
                  <select value={formData.metric_type} onChange={(e) => setFormData({ ...formData, metric_type: e.target.value })} className="w-full h-11 px-3 border border-[#E5E7EB] rounded-md text-sm focus:border-[#FF6B35] focus:outline-none">
                    <option value="higher_better">Higher is Better (Revenue, Sales)</option>
                    <option value="lower_better">Lower is Better (Cost, TAT)</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <Button type="submit" data-testid="submit-goal-button" className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white h-11 px-6">Create Goal</Button>
                <Button type="button" onClick={() => setShowForm(false)} className="bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#0A0A0A] h-11 px-6">Cancel</Button>
              </div>
            </form>
          </div>
        )}

        {/* Goals List */}
        <div className="space-y-4">
          {filteredGoals.length === 0 ? (
            <div className="text-center py-20 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md">
              <Target className="w-16 h-16 text-[#A1A1AA] mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-medium text-[#0A0A0A] mb-2">{goals.length === 0 ? 'No goals yet' : 'No goals match your filter'}</h3>
              <p className="text-sm text-[#52525B]">{goals.length === 0 ? 'Create your first goal to get started' : 'Try adjusting your search or filters'}</p>
            </div>
          ) : (
            filteredGoals.map((goal, index) => (
              <div key={goal.id || index} data-testid={`goal-card-${index}`} className="bg-white border border-[#E5E7EB] rounded-md p-6 hover:border-[#FF6B35] hover:shadow-sm transition-all duration-150">
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-[#0A0A0A]">{goal.title}</h3>
                      <span className="px-2 py-1 text-xs font-semibold rounded" style={{ backgroundColor: `${getStatusColor(goal.status)}15`, color: getStatusColor(goal.status) }}>
                        {goal.status.toUpperCase()}
                      </span>
                      {goal.priority && (
                        <span className="px-2 py-1 text-xs font-semibold rounded" style={{ backgroundColor: `${getPriorityColor(goal.priority)}15`, color: getPriorityColor(goal.priority) }}>
                          {goal.priority.toUpperCase()} PRIORITY
                        </span>
                      )}
                      {goal.locked && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-[#A1A1AA15] text-[#A1A1AA] flex items-center gap-1">
                          <Lock className="w-3 h-3" />LOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold tracking-widest text-[#FF6B35] uppercase mb-2">{goal.thrust_area}</p>
                    <p className="text-sm text-[#52525B] leading-relaxed mb-3">{goal.description}</p>
                  </div>
                  {!goal.locked && (
                    <button onClick={() => handleDelete(goal.id)} data-testid={`delete-goal-${index}`} className="p-2 hover:bg-[#FEE2E2] rounded-md transition-all duration-150">
                      <Trash2 className="w-4 h-4 text-[#DC2626]" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#E5E7EB]">
                  <div><p className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-1">UoM</p><p className="text-sm font-medium text-[#0A0A0A] capitalize">{goal.uom}</p></div>
                  <div><p className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-1">Target</p><p className="text-sm font-medium text-[#0A0A0A]">{goal.target}</p></div>
                  <div><p className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-1">Weightage</p><p className="text-sm font-medium text-[#0A0A0A]">{goal.weightage}%</p></div>
                  <div><p className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-1">Metric</p><p className="text-sm font-medium text-[#0A0A0A] capitalize">{(goal.metric_type || 'N/A').replace('_', ' ')}</p></div>
                </div>
                {goal.status === 'rework' && goal.rejection_reason && (
                  <div className="mt-4 p-3 bg-[#FEE2E2] border border-[#DC2626] rounded-md">
                    <p className="text-xs font-semibold tracking-widest text-[#DC2626] uppercase mb-1">Feedback for Rework</p>
                    <p className="text-sm text-[#DC2626]">{goal.rejection_reason}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
