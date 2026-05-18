import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Flame, LayoutDashboard, Target, FileText, BarChart3, Users, LogOut, Menu, X, Bell, Sparkles, Activity, Trophy, Library, Search } from 'lucide-react';
import axios from 'axios';
import { API } from '../contexts/AuthContext';

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get(`${API}/notifications`);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.post(`${API}/notifications/read-all`);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['employee', 'manager', 'admin'] },
    { name: 'My Goals', href: '/goals', icon: Target, roles: ['employee', 'manager', 'admin'] },
    { name: 'Templates', href: '/templates', icon: Library, roles: ['employee', 'manager', 'admin'] },
    { name: 'Team Goals', href: '/team-goals', icon: Users, roles: ['manager', 'admin'] },
    { name: 'Check-ins', href: '/checkins', icon: FileText, roles: ['employee', 'manager', 'admin'] },
    { name: 'Activity Feed', href: '/activity', icon: Activity, roles: ['employee', 'manager', 'admin'] },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy, roles: ['employee', 'manager', 'admin'] },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin', 'manager'] },
    { name: 'HR Insights', href: '/hr-insights', icon: Sparkles, roles: ['admin', 'manager'] },
  ].filter(item => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-[#E5E7EB] z-50 px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B35] to-[#FF8C42] rounded-md flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <span className="font-['Chivo'] font-black text-xl">GoalForge</span>
        </Link>
        <button
          data-testid="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md hover:bg-[#F3F4F6] transition-all duration-150"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-[#E5E7EB] z-40 transition-transform duration-200 flex flex-col ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <Link to="/dashboard" className="p-6 border-b border-[#E5E7EB] flex items-center gap-2 hover:bg-[#F9FAFB] transition-all duration-150">
          <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B35] to-[#FF8C42] rounded-md flex items-center justify-center shadow-sm">
            <Flame className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <span className="font-['Chivo'] font-black text-2xl tracking-tight block leading-none">GoalForge</span>
            <span className="text-[10px] text-[#A1A1AA] tracking-widest uppercase">Forge Your Future</span>
          </div>
        </Link>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s/g, '-')}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#FFF4ED] text-[#FF6B35] border-l-2 border-[#FF6B35]'
                    : 'text-[#52525B] hover:bg-[#F9FAFB] hover:text-[#0A0A0A]'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E5E7EB]">
          <div className="mb-3 px-4 py-3 bg-[#F9FAFB] rounded-md">
            <p className="text-xs font-semibold tracking-widest text-[#A1A1AA] uppercase mb-1">Signed in as</p>
            <p className="text-sm font-medium text-[#0A0A0A]">{user?.name}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-[#A1A1AA] capitalize">{user?.role}</span>
              <span className="text-xs font-semibold text-[#FF6B35] flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                {user?.points || 0} pts
              </span>
            </div>
          </div>
          <button
            data-testid="logout-button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-[#52525B] hover:bg-[#FEE2E2] hover:text-[#DC2626] w-full transition-all duration-150"
          >
            <LogOut className="w-5 h-5" strokeWidth={1.5} />
            Logout
          </button>
        </div>
      </aside>

      {/* Top right notification bar */}
      <div className="hidden lg:flex fixed top-0 right-0 z-30 p-4 items-center gap-3">
        <button
          data-testid="notification-button"
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative p-2 bg-white border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] transition-all duration-150"
        >
          <Bell className="w-5 h-5 text-[#52525B]" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#DC2626] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        
        {notifOpen && (
          <div className="absolute top-16 right-4 w-80 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden">
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-[#FF6B35] hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-sm text-[#A1A1AA] text-center">No notifications</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-[#E5E7EB] hover:bg-[#F9FAFB] cursor-pointer transition-all duration-150 ${
                      !notif.read ? 'bg-[#FFF4ED]' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-[#0A0A0A] mb-1">{notif.title}</p>
                    <p className="text-xs text-[#52525B]">{notif.message}</p>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">{children}</div>
      </main>

      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
    </div>
  );
}
