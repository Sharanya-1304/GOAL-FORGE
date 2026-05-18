import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Flame, Mail, Lock, User as UserIcon, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isLogin) {
      const result = await login(email, password);
      if (result.success) navigate('/dashboard');
      else setError(result.error);
    } else {
      const result = await register({ email, password, name, role, department });
      if (result.success) navigate('/dashboard');
      else setError(result.error);
    }
    setLoading(false);
  };

  const quickLogin = async (email, password) => {
    setLoading(true);
    const result = await login(email, password);
    if (result.success) navigate('/dashboard');
    else setError(result.error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#52525B] hover:text-[#FF6B35] mb-8 transition-all duration-150">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="mb-8">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B35] to-[#FF8C42] rounded-md flex items-center justify-center shadow-sm">
                <Flame className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <span className="font-['Chivo'] font-black text-3xl tracking-tight block leading-none">GoalForge</span>
                <span className="text-[10px] text-[#A1A1AA] tracking-widest uppercase">Forge Your Future</span>
              </div>
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A0A0A] mb-2">
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </h1>
            <p className="text-sm text-[#52525B] leading-relaxed">
              {isLogin ? 'Sign in to access your goals' : 'Create your account in seconds'}
            </p>
          </div>

          {error && (
            <div data-testid="error-message" className="mb-4 p-4 bg-[#FEE2E2] border border-[#DC2626] rounded-md">
              <p className="text-sm text-[#DC2626]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Full Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" strokeWidth={1.5} />
                    <Input
                      data-testid="name-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="pl-10 h-12 border-[#E5E7EB] focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] rounded-md"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Role</Label>
                    <select
                      data-testid="role-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full h-12 px-3 border border-[#E5E7EB] rounded-md text-sm focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] focus:outline-none"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Department</Label>
                    <Input
                      data-testid="department-input"
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g., Engineering"
                      className="h-12 border-[#E5E7EB] focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] rounded-md"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" strokeWidth={1.5} />
                <Input
                  data-testid="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-10 h-12 border-[#E5E7EB] focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] rounded-md"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold tracking-widest text-[#52525B] uppercase mb-2 block">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" strokeWidth={1.5} />
                <Input
                  data-testid="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 h-12 border-[#E5E7EB] focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] rounded-md"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              data-testid="submit-button"
              disabled={loading}
              className="w-full h-12 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-medium rounded-md transition-all duration-150"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              data-testid="toggle-auth-mode"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm text-[#FF6B35] hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          {isLogin && (
            <div className="mt-8 p-4 bg-[#FFF4ED] border border-[#FFD7C4] rounded-md">
              <p className="text-xs font-semibold tracking-widest text-[#FF6B35] uppercase mb-3">Quick Demo Login</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => quickLogin('admin@goalforge.com', 'Admin@123')}
                  className="text-left p-2 bg-white border border-[#E5E7EB] rounded text-xs hover:border-[#FF6B35] transition-all duration-150"
                >
                  <strong>Admin:</strong> admin@goalforge.com / Admin@123
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin('manager@goalforge.com', 'Manager@123')}
                  className="text-left p-2 bg-white border border-[#E5E7EB] rounded text-xs hover:border-[#FF6B35] transition-all duration-150"
                >
                  <strong>Manager:</strong> manager@goalforge.com / Manager@123
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin('employee1@goalforge.com', 'Employee@123')}
                  className="text-left p-2 bg-white border border-[#E5E7EB] rounded text-xs hover:border-[#FF6B35] transition-all duration-150"
                >
                  <strong>Employee:</strong> employee1@goalforge.com / Employee@123
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="hidden lg:block relative bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1498262257252-c282316270bc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBhYnN0cmFjdCUyMGNvcnBvcmF0ZSUyMGFyY2hpdGVjdHVyZXxlbnwwfHx8fDE3NzkwMjY2MjR8MA&ixlib=rb-4.1.0&q=85)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35]/80 to-[#0A0A0A]/80"></div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-white max-w-lg">
            <Flame className="w-16 h-16 text-white mb-6" strokeWidth={1.5} />
            <h2 className="text-5xl font-bold tracking-tighter mb-4 leading-tight">
              Where Goals<br/>Meet Greatness
            </h2>
            <p className="text-lg opacity-90 leading-relaxed">
              The complete platform for setting, tracking, and achieving organizational goals 
              with AI-powered insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
