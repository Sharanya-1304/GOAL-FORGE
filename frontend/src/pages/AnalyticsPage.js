import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area, ScatterChart,
  Scatter, ZAxis, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart
} from 'recharts';
import { Download, TrendingUp, Users, Award, AlertCircle, DollarSign, Activity, Target, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../contexts/AuthContext';

const COLORS = ['#FF6B35', '#0038FF', '#16A34A', '#F59E0B', '#7C3AED', '#DC2626', '#0284C7', '#EC4899'];
const HEATMAP_COLORS = ['#F4F4F5', '#FFE5D9', '#FFB59B', '#FF8C5C', '#FF6B35', '#E55A2B'];

const getHeatmapColor = (value) => {
  if (value >= 80) return HEATMAP_COLORS[5];
  if (value >= 65) return HEATMAP_COLORS[4];
  if (value >= 50) return HEATMAP_COLORS[3];
  if (value >= 35) return HEATMAP_COLORS[2];
  if (value >= 20) return HEATMAP_COLORS[1];
  return HEATMAP_COLORS[0];
};

const KPICard = ({ label, value, change, icon: Icon, color, suffix = '' }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-md p-5 hover:border-[#FF6B35] transition-all duration-150">
    <div className="flex items-start justify-between mb-3">
      <div className="p-2.5 rounded-md" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.5} />
      </div>
      {change !== undefined && (
        <span className={`text-xs font-semibold ${change >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
          {change >= 0 ? '+' : ''}{change}%
        </span>
      )}
    </div>
    <div className="text-3xl font-black tracking-tighter text-[#0A0A0A]">{value}{suffix}</div>
    <div className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mt-1">{label}</div>
  </div>
);

export function AnalyticsPage() {
  const [completionRates, setCompletionRates] = useState([]);
  const [qoqTrends, setQoqTrends] = useState([]);
  const [thrustDist, setThrustDist] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [workforce, setWorkforce] = useState(null);
  const [velocity, setVelocity] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [rates, qoq, thrust, audit, wf, vel, hm] = await Promise.all([
        axios.get(`${API}/analytics/completion-rates`),
        axios.get(`${API}/analytics/qoq-trends`),
        axios.get(`${API}/analytics/thrust-area-distribution`),
        axios.get(`${API}/analytics/audit-trail`).catch(() => ({ data: [] })),
        axios.get(`${API}/analytics/workforce-insights`).catch(() => ({ data: null })),
        axios.get(`${API}/analytics/goal-velocity`).catch(() => ({ data: [] })),
        axios.get(`${API}/analytics/heatmap`).catch(() => ({ data: [] })),
      ]);
      setCompletionRates(rates.data);
      setQoqTrends(qoq.data);
      setThrustDist(thrust.data);
      setAuditTrail(audit.data);
      setWorkforce(wf.data);
      setVelocity(vel.data);
      setHeatmap(hm.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/analytics/export/csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `goalforge_analytics_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export successful!');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  if (loading) return <Layout><div className="flex items-center justify-center py-20"><div className="inline-block w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div></div></Layout>;

  const totalGoals = completionRates.reduce((sum, r) => sum + r.total_goals, 0);
  const totalApproved = completionRates.reduce((sum, r) => sum + r.approved_goals, 0);
  const avgCompletion = completionRates.length > 0 ? Math.round(completionRates.reduce((sum, r) => sum + r.completion_rate, 0) / completionRates.length) : 0;
  const avgProgress = completionRates.length > 0 ? Math.round(completionRates.reduce((sum, r) => sum + r.avg_progress, 0) / completionRates.length) : 0;

  // Department metrics for radar chart
  const radarData = workforce?.department_metrics?.slice(0, 6).map(d => ({
    department: d.department,
    engagement: d.engagement,
    performance: d.performance,
    satisfaction: d.satisfaction
  })) || [];

  return (
    <Layout>
      <div className="max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A] mb-2 flex items-center gap-3">
              <Activity className="w-8 h-8 text-[#FF6B35]" strokeWidth={1.5} />
              Analytics Control Center
            </h1>
            <p className="text-sm text-[#52525B]">Real-time workforce, performance & goal analytics</p>
          </div>
          <Button data-testid="export-analytics" onClick={handleExport} className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white h-11 px-5">
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#E5E7EB] overflow-x-auto">
          {['overview', 'workforce', 'performance', 'audit'].map(t => (
            <button
              key={t}
              data-testid={`tab-${t}`}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-150 border-b-2 ${
                tab === t ? 'border-[#FF6B35] text-[#FF6B35]' : 'border-transparent text-[#52525B] hover:text-[#0A0A0A]'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              <KPICard label="Headcount" value={workforce?.total_headcount || 0} icon={Users} color="#FF6B35" />
              <KPICard label="Total Goals" value={totalGoals} change={24} icon={Target} color="#0038FF" />
              <KPICard label="Approved" value={totalApproved} change={18} icon={Award} color="#16A34A" />
              <KPICard label="Avg Completion" value={avgCompletion} suffix="%" change={12} icon={TrendingUp} color="#7C3AED" />
              <KPICard label="Avg Progress" value={avgProgress} suffix="%" change={8} icon={Zap} color="#F59E0B" />
              <KPICard label="At Risk" value={workforce?.attrition_risk?.find(a => a.level === 'high')?.count || 0} icon={AlertCircle} color="#DC2626" />
            </div>

            {/* QoQ trends + Goal Velocity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#FF6B35]" />Quarter-on-Quarter Progress
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={qoqTrends}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.7}/>
                        <stop offset="95%" stopColor="#FF6B35" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="avg_progress" stroke="#FF6B35" strokeWidth={2} fill="url(#g1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0038FF]" />12-Month Goal Velocity
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={velocity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="created" fill="#FF6B35" name="Created" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="approved" fill="#16A34A" name="Approved" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="checkins" stroke="#0038FF" strokeWidth={2} name="Check-ins" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Heatmap */}
            <div className="bg-white border border-[#E5E7EB] rounded-md p-6 mb-6">
              <h3 className="text-base font-semibold text-[#0A0A0A] mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FF6B35]" />Department × Quarter Performance Heatmap
              </h3>
              {heatmap.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-[#52525B] uppercase tracking-widest">Department</th>
                        {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                          <th key={q} className="text-center py-2 px-3 text-xs font-semibold text-[#52525B] uppercase tracking-widest">{q}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmap.map((row, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3 text-sm font-medium text-[#0A0A0A]">{row.department}</td>
                          {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                            <td key={q} className="p-1">
                              <div
                                className="h-14 rounded-md flex items-center justify-center font-bold text-sm transition-all duration-200 hover:scale-105 cursor-pointer"
                                style={{
                                  backgroundColor: getHeatmapColor(row[q] || 0),
                                  color: (row[q] || 0) >= 50 ? 'white' : '#0A0A0A'
                                }}
                                title={`${row.department} - ${q}: ${row[q]}%`}
                              >
                                {row[q] || 0}%
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center gap-3 mt-4 text-xs">
                    <span className="text-[#52525B]">Scale:</span>
                    {[0, 20, 35, 50, 65, 80].map((val, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: HEATMAP_COLORS[i] }}></div>
                        <span className="text-[#52525B]">{val}%+</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-[#52525B] text-center py-8">No data available</p>}
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-4">Thrust Area Distribution</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={thrustDist} cx="50%" cy="50%" outerRadius={90} innerRadius={50} fill="#8884d8" dataKey="total" label={({ name, total }) => `${name}: ${total}`}>
                      {thrustDist.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-4">Department Headcount</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={workforce?.department_counts || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                    <Bar dataKey="count" fill="#FF6B35" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {tab === 'workforce' && workforce && (
          <>
            {/* Workforce KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <KPICard label="Total Headcount" value={workforce.total_headcount} icon={Users} color="#FF6B35" />
              <KPICard label="Avg Salary" value={`₹${(workforce.salary_stats.avg / 1000).toFixed(0)}K`} icon={DollarSign} color="#16A34A" />
              <KPICard label="Total Payroll" value={`₹${(workforce.salary_stats.total_payroll / 100000).toFixed(1)}L`} icon={DollarSign} color="#0038FF" />
              <KPICard label="High Risk" value={workforce.attrition_risk.find(a => a.level === 'high')?.count || 0} icon={AlertCircle} color="#DC2626" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Engagement vs Performance Scatter */}
              <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-1">Engagement × Performance</h3>
                <p className="text-xs text-[#52525B] mb-4">Each dot is an employee. Top-right = High engagement & performance</p>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="engagement" name="Engagement" tick={{ fontSize: 11 }} domain={[0, 100]} label={{ value: 'Engagement Score', position: 'bottom', offset: -5, fontSize: 11 }} />
                    <YAxis dataKey="performance" name="Performance" tick={{ fontSize: 11 }} domain={[0, 100]} label={{ value: 'Performance', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                    <ZAxis dataKey="tenure" range={[40, 200]} name="Tenure" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }}
                      content={({ payload }) => {
                        if (payload && payload.length) {
                          const d = payload[0].payload;
                          return <div className="bg-white border border-[#E5E7EB] rounded p-2 text-xs">
                            <p className="font-semibold">{d.name}</p>
                            <p>Dept: {d.department}</p>
                            <p>Engagement: {d.engagement}</p>
                            <p>Performance: {d.performance}</p>
                            <p>Tenure: {d.tenure} yrs</p>
                          </div>;
                        }
                        return null;
                      }} />
                    <Scatter data={workforce.engagement_performance_scatter} fill="#FF6B35" fillOpacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Tenure Distribution */}
              <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-4">Tenure Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={workforce.tenure_distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {workforce.tenure_distribution.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Performance Distribution */}
              <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-4">Performance Score Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={workforce.performance_distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                    <Bar dataKey="count" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Recruitment Sources */}
              <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-1">Recruitment Source Effectiveness</h3>
                <p className="text-xs text-[#52525B] mb-4">Average performance score by hiring channel</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={workforce.recruitment_sources}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 5]} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar yAxisId="left" dataKey="count" fill="#0038FF" name="Hires" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="avg_performance" fill="#FF6B35" name="Avg Perf" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attrition Risk */}
            <div className="bg-white border border-[#E5E7EB] rounded-md p-6 mb-6">
              <h3 className="text-base font-semibold text-[#0A0A0A] mb-4">Attrition Risk Analysis</h3>
              <div className="grid grid-cols-3 gap-4">
                {workforce.attrition_risk.map((r, i) => {
                  const colors = { low: '#16A34A', medium: '#F59E0B', high: '#DC2626' };
                  const total = workforce.attrition_risk.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? (r.count / total) * 100 : 0;
                  return (
                    <div key={i} className="p-4 border-2 rounded-md" style={{ borderColor: colors[r.level] }}>
                      <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: colors[r.level] }}>
                        {r.level} Risk
                      </p>
                      <p className="text-4xl font-black tracking-tighter text-[#0A0A0A]">{r.count}</p>
                      <p className="text-xs text-[#52525B] mt-1">{pct.toFixed(1)}% of workforce</p>
                      <div className="mt-3 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: colors[r.level] }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === 'performance' && (
          <>
            {/* Department Radar */}
            {radarData.length > 0 && (
              <div className="bg-white border border-[#E5E7EB] rounded-md p-6 mb-6">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-1">Multi-Dimensional Department Performance</h3>
                <p className="text-xs text-[#52525B] mb-4">Engagement, Performance & Satisfaction radar by department</p>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis dataKey="department" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Engagement" dataKey="engagement" stroke="#FF6B35" fill="#FF6B35" fillOpacity={0.3} />
                    <Radar name="Performance" dataKey="performance" stroke="#0038FF" fill="#0038FF" fillOpacity={0.3} />
                    <Radar name="Satisfaction" dataKey="satisfaction" stroke="#16A34A" fill="#16A34A" fillOpacity={0.3} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Performers */}
            {workforce?.top_performers && (
              <div className="bg-white border border-[#E5E7EB] rounded-md p-6 mb-6">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#F59E0B]" />Top 10 Performers
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E5E7EB]">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-[#52525B] uppercase">Rank</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-[#52525B] uppercase">Employee</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-[#52525B] uppercase">Department</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-[#52525B] uppercase">Performance</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-[#52525B] uppercase">Engagement</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-[#52525B] uppercase">Tenure</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workforce.top_performers.map((p, i) => (
                        <tr key={i} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-all duration-150">
                          <td className="py-3 px-3 text-sm font-bold" style={{ color: i < 3 ? '#FF6B35' : '#52525B' }}>#{i + 1}</td>
                          <td className="py-3 px-3 text-sm text-[#0A0A0A] font-medium">{p.name}</td>
                          <td className="py-3 px-3 text-sm text-[#52525B]">{p.department}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-3 py-1 text-xs font-bold rounded-md bg-[#16A34A15] text-[#16A34A]">
                              {p.performance_score.toFixed(2)} / 5
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-sm font-medium text-[#FF6B35]">{p.engagement_score.toFixed(0)}</td>
                          <td className="py-3 px-3 text-center text-sm text-[#52525B]">{p.years} yrs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Employee Goal Performance Table */}
            <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
              <h3 className="text-base font-semibold text-[#0A0A0A] mb-4">Employee Goal Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-[#52525B] uppercase">Employee</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-[#52525B] uppercase">Department</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-[#52525B] uppercase">Goals</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-[#52525B] uppercase">Approved</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-[#52525B] uppercase">Completion</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-[#52525B] uppercase">Progress</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-[#52525B] uppercase">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completionRates.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-all duration-150">
                        <td className="py-2 px-3 text-sm text-[#0A0A0A]">{row.name}</td>
                        <td className="py-2 px-3 text-sm text-[#52525B]">{row.department}</td>
                        <td className="py-2 px-3 text-sm text-center font-medium">{row.total_goals}</td>
                        <td className="py-2 px-3 text-sm text-center font-medium text-[#16A34A]">{row.approved_goals}</td>
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                              <div className="h-full bg-[#FF6B35] rounded-full" style={{ width: `${row.completion_rate}%` }}></div>
                            </div>
                            <span className="text-xs font-semibold">{row.completion_rate}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-sm text-center font-medium text-[#FF6B35]">{row.avg_progress}%</td>
                        <td className="py-2 px-3 text-sm text-center font-bold text-[#7C3AED]">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'audit' && (
          <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
            <h3 className="text-base font-semibold text-[#0A0A0A] mb-4">Complete Audit Trail</h3>
            {auditTrail.length === 0 ? (
              <p className="text-sm text-[#52525B] text-center py-8">No audit logs yet</p>
            ) : (
              <div className="space-y-2">
                {auditTrail.map((log, i) => (
                  <div key={i} className="flex items-start justify-between p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md hover:bg-[#FFF4ED] transition-all duration-150">
                    <div>
                      <p className="text-sm text-[#0A0A0A]"><strong>{log.user_name}</strong> {log.action} a {log.entity_type}</p>
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <p className="text-xs text-[#52525B] mt-1">{JSON.stringify(log.changes)}</p>
                      )}
                    </div>
                    <span className="text-xs text-[#A1A1AA] whitespace-nowrap ml-3">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
