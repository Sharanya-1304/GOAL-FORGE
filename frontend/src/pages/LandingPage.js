import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Target, BarChart3, Users, Sparkles, Trophy, Shield, Zap, ArrowRight, CheckCircle, Activity, Library, Bot } from 'lucide-react';
import { Button } from '../components/ui/button';

export function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { icon: Target, title: 'Smart Goal Setting', desc: 'Create SMART goals with 4 UoM types: Numeric, Percentage, Timeline & Zero-based', color: '#FF6B35' },
    { icon: Bot, title: 'AI-Powered Suggestions', desc: 'Get instant SMART goal recommendations powered by Claude AI', color: '#0038FF' },
    { icon: Users, title: 'Team Collaboration', desc: 'Manager approval workflows, inline editing, and team-wide visibility', color: '#16A34A' },
    { icon: BarChart3, title: 'Real-time Analytics', desc: 'Quarter-on-quarter trends, heatmaps, and completion dashboards', color: '#0284C7' },
    { icon: Activity, title: 'Activity Feed', desc: 'Live updates of team activities, approvals, and achievements', color: '#7C3AED' },
    { icon: Trophy, title: 'Gamification', desc: 'Points, badges, leaderboards to drive engagement and performance', color: '#F59E0B' },
    { icon: Library, title: 'Goal Templates', desc: '12+ pre-built templates for Sales, Engineering, HR, and more', color: '#DC2626' },
    { icon: Shield, title: 'Audit Trail', desc: 'Complete change history with who-what-when tracking for compliance', color: '#52525B' },
  ];

  const stats = [
    { value: '4', label: 'Quarterly Check-ins' },
    { value: '3', label: 'Role-Based Views' },
    { value: '12+', label: 'Goal Templates' },
    { value: '100%', label: 'Audit Ready' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-[#E5E7EB] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B35] to-[#FF8C42] rounded-md flex items-center justify-center shadow-sm">
              <Flame className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="font-['Chivo'] font-black text-2xl tracking-tight block leading-none">GoalForge</span>
              <span className="text-[10px] text-[#A1A1AA] tracking-widest uppercase">Forge Your Future</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              data-testid="nav-login-button"
              onClick={() => navigate('/login')}
              className="bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#0A0A0A] h-10 px-5 rounded-md transition-all duration-150"
            >
              Sign In
            </Button>
            <Button
              data-testid="nav-getstarted-button"
              onClick={() => navigate('/login?mode=register')}
              className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white h-10 px-5 rounded-md transition-all duration-150"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFF4ED] border border-[#FFD7C4] rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-[#FF6B35]" />
              <span className="text-xs font-semibold text-[#FF6B35] tracking-wide">AI-POWERED GOAL MANAGEMENT</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter text-[#0A0A0A] mb-6 leading-[0.9]">
              Forge Goals.<br />
              <span className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] bg-clip-text text-transparent">
                Drive Results.
              </span>
            </h1>
            <p className="text-lg text-[#52525B] leading-relaxed mb-8 max-w-xl">
              The complete enterprise goal management platform that aligns teams, tracks progress, 
              and accelerates organizational excellence with intelligent insights.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Button
                data-testid="hero-cta-button"
                onClick={() => navigate('/login?mode=register')}
                className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white h-12 px-8 rounded-md text-base font-medium transition-all duration-150 group"
              >
                Start Free Today
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-150" />
              </Button>
              <Button
                data-testid="hero-demo-button"
                onClick={() => navigate('/login')}
                className="bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#0A0A0A] h-12 px-8 rounded-md text-base font-medium transition-all duration-150"
              >
                View Demo
              </Button>
            </div>
            <div className="flex items-center gap-6 text-sm text-[#52525B]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                Free forever
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35]/20 to-[#FF8C42]/20 rounded-2xl blur-3xl"></div>
            <div className="relative bg-white border border-[#E5E7EB] rounded-md p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-1">Q3 PROGRESS</p>
                  <h3 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">Goal Achievement</h3>
                </div>
                <div className="px-3 py-1 bg-[#16A34A15] text-[#16A34A] text-xs font-semibold rounded-md">
                  +24% MoM
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                {[
                  { label: 'Sales Revenue', progress: 85, color: '#FF6B35' },
                  { label: 'Engineering Velocity', progress: 92, color: '#0038FF' },
                  { label: 'Customer Satisfaction', progress: 78, color: '#16A34A' },
                  { label: 'Cost Optimization', progress: 65, color: '#F59E0B' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-[#0A0A0A]">{item.label}</span>
                      <span className="font-semibold text-[#52525B]">{item.progress}%</span>
                    </div>
                    <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${item.progress}%`, backgroundColor: item.color }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[#E5E7EB]">
                <div>
                  <p className="text-2xl font-black tracking-tighter text-[#0A0A0A]">24</p>
                  <p className="text-xs text-[#52525B]">Active</p>
                </div>
                <div>
                  <p className="text-2xl font-black tracking-tighter text-[#16A34A]">18</p>
                  <p className="text-xs text-[#52525B]">Approved</p>
                </div>
                <div>
                  <p className="text-2xl font-black tracking-tighter text-[#FF6B35]">87%</p>
                  <p className="text-xs text-[#52525B]">On Track</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#0A0A0A] text-white py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-5xl lg:text-6xl font-black tracking-tighter text-[#FF6B35] mb-2">{stat.value}</p>
                <p className="text-sm text-[#A1A1AA] tracking-wide uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest text-[#FF6B35] uppercase mb-3">FEATURES</p>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-[#0A0A0A] mb-4">
            Everything You Need to Excel
          </h2>
          <p className="text-lg text-[#52525B] max-w-2xl mx-auto">
            Powerful features designed for modern organizations to align, track, and achieve goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="group bg-white border border-[#E5E7EB] rounded-md p-6 hover:border-[#FF6B35] hover:shadow-sm transition-all duration-150"
              >
                <div
                  className="w-12 h-12 rounded-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-150"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color: feature.color }} strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-[#0A0A0A] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#52525B] leading-relaxed">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#F9FAFB] py-20 lg:py-32 border-t border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest text-[#FF6B35] uppercase mb-3">HOW IT WORKS</p>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-[#0A0A0A] mb-4">
              From Goal to Achievement in 4 Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Set Goals', desc: 'Create SMART goals with AI assistance or templates', icon: Target },
              { step: '02', title: 'Get Approved', desc: 'Manager reviews and approves with inline editing', icon: CheckCircle },
              { step: '03', title: 'Track Progress', desc: 'Quarterly check-ins with auto-calculated scores', icon: Activity },
              { step: '04', title: 'Achieve & Earn', desc: 'Complete goals, earn points and badges', icon: Trophy },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="relative">
                  <div className="text-7xl font-black tracking-tighter text-[#F3F4F6] mb-4 leading-none">
                    {item.step}
                  </div>
                  <div className="w-12 h-12 bg-[#FF6B35] rounded-md flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0A0A0A] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#52525B] leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-32">
        <div className="bg-gradient-to-br from-[#FF6B35] to-[#FF8C42] rounded-md p-12 lg:p-16 text-center">
          <Zap className="w-16 h-16 text-white mx-auto mb-6" strokeWidth={1.5} />
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-white mb-4">
            Ready to Transform Your Goals?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join the modern way of managing organizational goals. Start in seconds.
          </p>
          <Button
            data-testid="cta-button"
            onClick={() => navigate('/login?mode=register')}
            className="bg-white text-[#FF6B35] hover:bg-[#FFF4ED] h-14 px-10 rounded-md text-base font-semibold transition-all duration-150"
          >
            Start Building Goals
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B35] to-[#FF8C42] rounded-md flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <span className="font-['Chivo'] font-black text-lg">GoalForge</span>
          </div>
          <p className="text-sm text-[#52525B]">© 2026 GoalForge. Built for AtomQuest Hackathon.</p>
        </div>
      </footer>
    </div>
  );
}
