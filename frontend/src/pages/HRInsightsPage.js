import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ScatterChart, Scatter, ZAxis,
  RadialBarChart, RadialBar, Treemap
} from 'recharts';
import { Briefcase, Download, Users, DollarSign, GraduationCap, UserCheck, Heart, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../contexts/AuthContext';

const COLORS = ['#FF6B35', '#0038FF', '#16A34A', '#F59E0B', '#7C3AED', '#DC2626', '#0284C7', '#EC4899'];

const StatCard = ({ label, value, icon: Icon, color, subtext }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-md p-5 hover:border-[#FF6B35] transition-all duration-150">
    <div className="p-2.5 rounded-md inline-block mb-3" style={{ backgroundColor: `${color}15` }}>
      <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.5} />
    </div>
    <div className="text-3xl font-black tracking-tighter text-[#0A0A0A]">{value}</div>
    <div className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mt-1">{label}</div>
    {subtext && <div className="text-xs text-[#A1A1AA] mt-1">{subtext}</div>}
  </div>
);

const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
    <h3 className="text-base font-semibold text-[#0A0A0A] mb-1">{title}</h3>
    {subtitle && <p className="text-xs text-[#52525B] mb-4">{subtitle}</p>}
    {children}
  </div>
);

export function HRInsightsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(`${API}/analytics/hr-insights`);
      setData(data);
    } catch (error) {
      toast.error('Failed to load HR insights');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await axios.get(`${API}/analytics/export/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `goalforge_executive_summary_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Executive Summary PDF downloaded!');
    } catch (error) {
      toast.error('PDF export failed');
    }
  };

  if (loading) return <Layout><div className="flex items-center justify-center py-20"><div className="inline-block w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div></div></Layout>;

  if (!data) return <Layout><div className="p-8 text-center"><p>No data available</p></div></Layout>;

  const totalEmployees = data.gender_distribution.reduce((s, x) => s + x.value, 0);
  const totalPayroll = data.salary_by_department.reduce((s, x) => s + (x.avg_salary * 10), 0); // rough
  const avgSalary = Math.round(data.salary_by_department.reduce((s, x) => s + x.avg_salary, 0) / data.salary_by_department.length);

  return (
    <Layout>
      <div className="max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A] mb-2 flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-[#FF6B35]" strokeWidth={1.5} />
              HR Insights
            </h1>
            <p className="text-sm text-[#52525B]">Workforce analytics inspired by HR & Employee Performance datasets</p>
          </div>
          <Button data-testid="export-pdf-button" onClick={handleExportPDF} className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white h-11 px-5">
            <Download className="w-4 h-4 mr-2" />Executive Summary PDF
          </Button>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Employees" value={totalEmployees} icon={Users} color="#FF6B35" subtext={`Across ${data.salary_by_department.length} departments`} />
          <StatCard label="Avg Salary" value={`₹${(avgSalary / 1000).toFixed(0)}K`} icon={DollarSign} color="#16A34A" subtext="Annual average" />
          <StatCard label="Avg Training" value={`${Math.round(data.training_by_dept.reduce((s, x) => s + x.avg_hours, 0) / data.training_by_dept.length)}h`} icon={GraduationCap} color="#0038FF" subtext="Per employee" />
          <StatCard label="Promotion Eligible" value={data.promotion_eligibility.find(p => p.name === 'Eligible')?.value || 0} icon={UserCheck} color="#7C3AED" subtext="Identified for growth" />
        </div>

        {/* Row 1: Salary by Dept Bar + Salary Distribution Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ChartCard title="Average Salary by Department" subtitle="Min/Max/Avg salary range per department">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.salary_by_department}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="min_salary" fill="#FFD7C4" name="Min" radius={[2, 2, 0, 0]} />
                <Bar dataKey="avg_salary" fill="#FF6B35" name="Average" radius={[2, 2, 0, 0]} />
                <Bar dataKey="max_salary" fill="#0038FF" name="Max" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Salary Distribution" subtitle="Number of employees in each salary band">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={data.salary_distribution} cx="50%" cy="50%" outerRadius={110} innerRadius={50} fill="#8884d8" dataKey="count" label={({ band, count }) => `${band}: ${count}`}>
                  {data.salary_distribution.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 2: Demographics - Gender, Marital, Position, Age */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <ChartCard title="Gender Distribution">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.gender_distribution} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {data.gender_distribution.map((entry, i) => <Cell key={i} fill={i === 0 ? '#0038FF' : '#EC4899'} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Marital Status">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.marital_distribution} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {data.marital_distribution.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Position Levels">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.position_distribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                <Tooltip />
                <Bar dataKey="value" fill="#7C3AED" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Age Distribution">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.age_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="band" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 3: Hiring Trend Line + Salary vs Performance Scatter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ChartCard title="Annual Hiring Trend" subtitle="Number of hires per year">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.hire_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="hires" stroke="#FF6B35" strokeWidth={3} dot={{ fill: '#FF6B35', r: 5 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Salary vs Performance" subtitle="Are top performers fairly compensated?">
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="salary" name="Salary" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} label={{ value: 'Annual Salary', position: 'bottom', offset: -5, fontSize: 11 }} />
                <YAxis dataKey="performance" name="Performance" tick={{ fontSize: 10 }} domain={[0, 5]} label={{ value: 'Score', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <ZAxis dataKey="tenure" range={[40, 200]} name="Tenure" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const d = payload[0].payload;
                      return <div className="bg-white border border-[#E5E7EB] rounded p-2 text-xs">
                        <p className="font-semibold">{d.name}</p>
                        <p>Dept: {d.department}</p>
                        <p>Salary: ₹{d.salary.toLocaleString()}</p>
                        <p>Performance: {d.performance}</p>
                        <p>Tenure: {d.tenure} yrs</p>
                      </div>;
                    }
                    return null;
                  }}
                />
                <Scatter data={data.salary_performance_scatter} fill="#0038FF" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 4: Training Hours + Absences */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ChartCard title="Avg Training Hours by Department" subtitle="L&D investment per department">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.training_by_dept}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avg_hours" fill="#0284C7" radius={[4, 4, 0, 0]}>
                  {data.training_by_dept.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Avg Absences by Department" subtitle="Days absent per employee (lower is better)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.absence_by_dept}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avg_absences" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Row 5: Promotion Eligibility Radial */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Promotion Eligibility" subtitle="Employees ready for advancement">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.promotion_eligibility} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}>
                  {data.promotion_eligibility.map((entry, i) => <Cell key={i} fill={i === 0 ? '#16A34A' : '#A1A1AA'} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Department Headcount Treemap" subtitle="Visual workforce distribution">
            <ResponsiveContainer width="100%" height={280}>
              <Treemap
                data={data.salary_by_department.map((d, i) => ({ name: d.department, size: d.avg_salary, fill: COLORS[i % COLORS.length] }))}
                dataKey="size"
                stroke="#fff"
                fill="#FF6B35"
                content={({ depth, x, y, width, height, name, fill }) => (
                  <g>
                    <rect x={x} y={y} width={width} height={height} style={{ fill, stroke: '#fff', strokeWidth: 2 }} />
                    {width > 50 && height > 30 && (
                      <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
                        {name}
                      </text>
                    )}
                  </g>
                )}
              />
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </Layout>
  );
}
