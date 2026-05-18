import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { Target, TrendingUp, TrendingDown, CheckCircle, Clock, Trophy, Sparkles, ArrowRight, Users, Activity, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API } from '../contexts/AuthContext';
import {
  AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const COLORS = ['#FF6B35', '#0038FF', '#16A34A', '#F59E0B', '#7C3AED', '#DC2626', '#0284C7', '#EC4899'];

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [qoq, setQoq] = useState([]);
  const [thrustDist, setThrustDist] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [velocity, setVelocity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 20000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const requests = [
        axios.get(`${API}/analytics/dashboard`),
        axios.get(`${API}/activities?limit=8`),
        axios.get(`${API}/analytics/leaderboard`).catch(() => ({ data: [] })),
      ];
      
      const isManagement = user?.role === 'admin' || user?.role === 'manager';
      if (isManagement) {
        requests.push(
          axios.get(`${API}/analytics/qoq-trends`),
          axios.get(`${API}/analytics/thrust-area-distribution`),
          axios.get(`${API}/analytics/goal-velocity`)
        );
      }
      
      const responses = await Promise.all(requests);
      setStats(responses[0].data);
      setActivities(responses[1].data);
      setLeaders(responses[2].data);
      if (isManagement) {
        setQoq(responses[3].data);
        setThrustDist(responses[4].data);
        setVelocity(responses[5].data);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center py-20"><div className="inline-block w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div></div></Layout>;
  }

  const getStatCards = () => {
    if (user?.role === 'admin') {
      return [
        { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: '#FF6B35', trend: '+12%' },
        { label: 'Total Goals', value: stats?.total_goals || 0, icon: Target, color: '#0038FF', trend: '+24%' },
        { label: 'Approved', value: stats?.approved_goals || 0, icon: CheckCircle, color: '#16A34A', trend: '+18%' },
        { label: 'Check-ins', value: stats?.total_checkins || 0, icon: Activity, color: '#7C3AED', trend: '+8%' },
      ];
    } else if (user?.role === 'manager') {
      return [
        { label: 'Team Size', value: stats?.team_size || 0, icon: Users, color: '#FF6B35' },
        { label: 'Team Goals', value: stats?.team_goals || 0, icon: Target, color: '#0038FF' },
        { label: 'Pending', value: stats?.pending_approvals || 0, icon: Clock, color: '#F59E0B' },
        { label: 'Approved', value: stats?.approved_goals || 0, icon: CheckCircle, color: '#16A34A' },
      ];
    }
    return [
      { label: 'My Goals', value: stats?.my_goals || 0, icon: Target, color: '#FF6B35' },
      { label: 'Approved', value: stats?.approved_goals || 0, icon: CheckCircle, color: '#16A34A' },
      { label: 'Pending', value: stats?.pending_goals || 0, icon: Clock, color: '#F59E0B' },
      { label: 'Points Earned', value: user?.points || 0, icon: Trophy, color: '#7C3AED' },
    ];
  };

  const isManagement = user?.role === 'admin' || user?.role === 'manager';
  const goalStatusPie = stats ? [
    { name: 'Approved', value: stats.approved_goals || 0, color: '#16A34A' },
    { name: 'Pending', value: stats.pending_goals || (stats.total_goals - stats.approved_goals - 0) || 0, color: '#F59E0B' },
  ].filter(d => d.value > 0) : [];

  // Month-over-Month growth calculation
  const computeMoM = () => {
    if (velocity.length < 2) return null;
    const current = velocity[velocity.length - 1];
    const previous = velocity[velocity.length - 2];
    const pct = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };
    return {
      currentMonth: current.month_full || current.month,
      previousMonth: previous.month_full || previous.month,
      created: { current: current.created, previous: previous.created, change: pct(current.created, previous.created) },
      approved: { current: current.approved, previous: previous.approved, change: pct(current.approved, previous.approved) },
      checkins: { current: current.checkins, previous: previous.checkins, change: pct(current.checkins, previous.checkins) },
    };
  };
  const mom = isManagement ? computeMoM() : null;

  return (
    <Layout>
      <div className="max-w-7xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A] mb-2">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-sm text-[#52525B]">
              {user?.role === 'admin' ? 'Organization-wide performance overview' :
               user?.role === 'manager' ? 'Team performance and goal management' :
               'Track your goals and progress'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E7EB] rounded-md" data-testid="live-indicator">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]"></span>
              </span>
              <span className="text-xs font-medium text-[#52525B]">
                Live · Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <button onClick={() => fetchData(true)} className="ml-1 p-1 hover:bg-[#F3F4F6] rounded transition-all" data-testid="refresh-button">
                <RefreshCw className={`w-3 h-3 text-[#52525B] ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {user?.role === 'employee' && (
              <Link to="/goals" className="inline-flex items-center gap-2 px-5 py-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white text-sm font-medium rounded-md transition-all duration-150 group">
                <Sparkles className="w-4 h-4" />Create Goal
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {getStatCards().map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`} className="bg-white border border-[#E5E7EB] rounded-md p-5 hover:border-[#FF6B35] transition-all duration-150 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-md group-hover:scale-110 transition-transform duration-150" style={{ backgroundColor: `${stat.color}15` }}>
                    <Icon className="w-5 h-5" style={{ color: stat.color }} strokeWidth={1.5} />
                  </div>
                  {stat.trend && <span className="text-xs font-semibold text-[#16A34A]">{stat.trend}</span>}
                </div>
                <div className="text-3xl font-black tracking-tighter text-[#0A0A0A] mb-1">{stat.value}</div>
                <div className="text-xs font-semibold tracking-widest text-[#52525B] uppercase">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Month-over-Month Growth Story */}
        {mom && (
          <div className="bg-gradient-to-r from-[#FFF4ED] to-[#FFE5D9] border border-[#FFD7C4] rounded-md p-5 mb-6" data-testid="mom-growth-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold tracking-widest text-[#FF6B35] uppercase mb-1">📈 Growth Story</p>
                <h3 className="text-base font-semibold text-[#0A0A0A]">
                  {mom.currentMonth} <span className="text-[#A1A1AA] font-normal">vs</span> {mom.previousMonth}
                </h3>
              </div>
              <Sparkles className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'Goals Created', ...mom.created, color: '#FF6B35' },
                { label: 'Goals Approved', ...mom.approved, color: '#16A34A' },
                { label: 'Check-ins Logged', ...mom.checkins, color: '#0038FF' },
              ].map((metric, i) => {
                const isPositive = metric.change >= 0;
                const TrendIcon = isPositive ? TrendingUp : TrendingDown;
                return (
                  <div key={i} className="bg-white rounded-md p-4 border border-[#FFD7C4]" data-testid={`mom-metric-${i}`}>
                    <p className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2">{metric.label}</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black tracking-tighter text-[#0A0A0A]">{metric.current}</span>
                      <span className="text-sm text-[#A1A1AA]">from {metric.previous}</span>
                    </div>
                    <div className={`flex items-center gap-1 mt-2 px-2 py-1 rounded text-xs font-semibold inline-flex ${
                      isPositive ? 'bg-[#16A34A15] text-[#16A34A]' : 'bg-[#DC262615] text-[#DC2626]'
                    }`}>
                      <TrendIcon className="w-3 h-3" />
                      {isPositive ? '+' : ''}{metric.change}% {isPositive ? 'growth' : 'decline'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Monthly Bar Chart + Status Pie + QoQ + Thrust (only for managers/admin) */}
        {isManagement && velocity.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Monthly Goal Velocity Bar Chart */}
              <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#0A0A0A] flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#FF6B35]" />Monthly Goal Activity
                    </h3>
                    <p className="text-xs text-[#52525B] mt-1">Goals created, approved & check-ins by month</p>
                  </div>
                  <Link to="/analytics" className="text-xs text-[#FF6B35] hover:underline">View all</Link>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={velocity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="created" fill="#FF6B35" name="Created" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="approved" fill="#16A34A" name="Approved" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="checkins" fill="#0038FF" name="Check-ins" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Goal Status Pie Chart */}
              <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-1">Goal Status</h3>
                <p className="text-xs text-[#52525B] mb-4">Current distribution</p>
                {goalStatusPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={goalStatusPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${value}`}
                      >
                        {goalStatusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-xs text-[#A1A1AA] text-center py-12">No data yet</p>}
              </div>
            </div>

            {/* QoQ Trend + Thrust Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-md p-6">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-1 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#FF6B35]" />Quarterly Progress Trend
                </h3>
                <p className="text-xs text-[#52525B] mb-4">Average progress score across quarters</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={qoq}>
                    <defs>
                      <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.7}/>
                        <stop offset="95%" stopColor="#FF6B35" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="avg_progress" stroke="#FF6B35" strokeWidth={2} fill="url(#dashGrad)" name="Avg Progress %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Thrust Area Donut */}
              <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-1">Thrust Areas</h3>
                <p className="text-xs text-[#52525B] mb-4">Goals by focus area</p>
                {thrustDist.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={thrustDist.slice(0, 6)} cx="50%" cy="50%" outerRadius={80} innerRadius={45} fill="#8884d8" dataKey="total">
                        {thrustDist.slice(0, 6).map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-xs text-[#A1A1AA] text-center py-12">No data</p>}
              </div>
            </div>
          </>
        )}

        {/* Bottom: Quarterly Timeline, Activity, Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
            <h3 className="text-base font-semibold text-[#0A0A0A] mb-4">Quarterly Timeline</h3>
            <div className="space-y-2">
              {[
                { quarter: 'Q1', period: 'July', completed: true },
                { quarter: 'Q2', period: 'October', active: true },
                { quarter: 'Q3', period: 'January', },
                { quarter: 'Q4', period: 'March-April', },
              ].map((item, index) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded-md border transition-all duration-150 ${
                  item.active ? 'bg-[#FFF4ED] border-[#FF6B35]' : item.completed ? 'bg-[#F0FDF4] border-[#16A34A]' : 'bg-[#F9FAFB] border-[#E5E7EB]'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center font-bold text-xs ${
                      item.active ? 'bg-[#FF6B35] text-white' : item.completed ? 'bg-[#16A34A] text-white' : 'bg-white border border-[#E5E7EB] text-[#52525B]'
                    }`}>{item.quarter}</div>
                    <div>
                      <p className="text-sm font-medium text-[#0A0A0A]">{item.period}</p>
                      <p className="text-xs text-[#A1A1AA]">{item.active ? 'Current' : item.completed ? 'Completed' : 'Upcoming'}</p>
                    </div>
                  </div>
                  {item.active && <span className="px-2 py-1 bg-[#FF6B35] text-white text-xs font-semibold rounded">LIVE</span>}
                  {item.completed && <CheckCircle className="w-4 h-4 text-[#16A34A]" />}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#0A0A0A]">Live Activity</h3>
              <Link to="/activity" className="text-xs text-[#FF6B35] hover:underline">View all</Link>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {activities.length === 0 ? (
                <p className="text-sm text-[#A1A1AA] text-center py-4">No recent activity</p>
              ) : (
                activities.slice(0, 6).map((act, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 hover:bg-[#F9FAFB] rounded-md transition-all duration-150">
                    <div className="w-8 h-8 bg-[#FFF4ED] rounded-md flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-[#FF6B35]" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#0A0A0A] truncate"><strong>{act.user_name}</strong> {act.description}</p>
                      <p className="text-xs text-[#A1A1AA]">{new Date(act.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#0A0A0A] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#F59E0B]" />Top Performers
              </h3>
              <Link to="/leaderboard" className="text-xs text-[#FF6B35] hover:underline">Full ranking</Link>
            </div>
            <div className="space-y-2">
              {leaders.length === 0 ? (
                <p className="text-sm text-[#A1A1AA] text-center py-4">No data yet</p>
              ) : (
                leaders.slice(0, 5).map((l, i) => (
                  <div key={l.id} className="flex items-center gap-3 p-2 hover:bg-[#F9FAFB] rounded-md transition-all duration-150">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-[#FEF3C7] text-[#F59E0B]' : i === 1 ? 'bg-[#F3F4F6] text-[#A1A1AA]' : i === 2 ? 'bg-[#FED7AA] text-[#FB923C]' : 'bg-[#F9FAFB] text-[#52525B]'
                    }`}>#{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#0A0A0A] truncate">{l.name}</p>
                      <p className="text-xs text-[#A1A1AA]">{l.department}</p>
                    </div>
                    <span className="text-sm font-bold text-[#FF6B35]">{l.points}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
