import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Input } from '../components/ui/input';
import { Library, Search, ArrowRight, TrendingUp, Target, Rocket, Bug, Users, GraduationCap, PiggyBank, Shield, Megaphone, Sparkles, Heart, Clock } from 'lucide-react';
import { API } from '../contexts/AuthContext';

const ICON_MAP = { TrendingUp, Target, Rocket, Bug, Users, GraduationCap, PiggyBank, Shield, Megaphone, Sparkles, Heart, Clock };

export function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data } = await axios.get(`${API}/templates`);
      setTemplates(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (template) => {
    const params = encodeURIComponent(JSON.stringify({
      thrust_area: template.thrust_area,
      title: template.title,
      description: template.description,
      uom: template.uom,
      target: template.target,
      metric_type: template.metric_type,
    }));
    navigate(`/goals?template=${params}`);
  };

  const categories = ['all', ...new Set(templates.map(t => t.category))];
  const filtered = templates.filter(t => {
    if (category !== 'all' && t.category !== category) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <Layout><div className="flex items-center justify-center py-20"><div className="inline-block w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div></div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A] mb-2 flex items-center gap-3">
            <Library className="w-8 h-8 text-[#FF6B35]" strokeWidth={1.5} />
            Goal Templates
          </h1>
          <p className="text-sm text-[#52525B]">Browse curated goal templates to jumpstart your goal-setting</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" />
            <Input data-testid="template-search" placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                data-testid={`category-${cat}`}
                onClick={() => setCategory(cat)}
                className={`px-4 h-11 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                  category === cat ? 'bg-[#FF6B35] text-white' : 'bg-white border border-[#E5E7EB] text-[#52525B] hover:bg-[#F3F4F6]'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template, i) => {
            const Icon = ICON_MAP[template.icon] || Target;
            return (
              <div
                key={template.id}
                data-testid={`template-card-${i}`}
                className="bg-white border border-[#E5E7EB] rounded-md p-6 hover:border-[#FF6B35] hover:shadow-sm transition-all duration-150 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-[#FFF4ED] rounded-md flex items-center justify-center group-hover:scale-110 transition-transform duration-150">
                    <Icon className="w-6 h-6 text-[#FF6B35]" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-semibold tracking-widest text-[#A1A1AA] uppercase">{template.category}</span>
                </div>
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-2">{template.title}</h3>
                <p className="text-sm text-[#52525B] leading-relaxed mb-4 line-clamp-2">{template.description}</p>
                <div className="flex flex-wrap gap-2 mb-4 text-xs">
                  <span className="px-2 py-1 bg-[#F3F4F6] rounded text-[#52525B]">UoM: {template.uom}</span>
                  <span className="px-2 py-1 bg-[#F3F4F6] rounded text-[#52525B]">Target: {template.target}</span>
                </div>
                <button
                  data-testid={`use-template-${i}`}
                  onClick={() => applyTemplate(template)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white text-sm font-medium rounded-md transition-all duration-150 group"
                >
                  Use Template
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-150" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
