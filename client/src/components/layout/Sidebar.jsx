import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, HeartPulse, Compass, Trophy, Users, BookOpen, MessagesSquare, Lightbulb, LifeBuoy, Shield, LogOut, X, ShieldCheck } from 'lucide-react';
import Logo from '../common/Logo';

const groups = [
  { title: 'Your space', items: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/mood', label: 'Mood & journal', icon: HeartPulse },
    { to: '/tools', label: 'Self-help tools', icon: Compass },
    { to: '/rewards', label: 'Progress', icon: Trophy },
  ] },
  { title: 'Learn & connect', items: [
    { to: '/awareness', label: 'Awareness', icon: Lightbulb },
    { to: '/resources', label: 'Resource library', icon: BookOpen },
    { to: '/community', label: 'Community', icon: MessagesSquare },
  ] },
  { title: 'Get support', items: [
    { to: '/counselling', label: 'Counselling', icon: Users },
    { to: '/emergency', label: 'Emergency help', icon: LifeBuoy },
  ] },
  { title: 'Account', items: [
    { to: '/privacy', label: 'Privacy & data', icon: ShieldCheck },
  ] },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const link = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-2 hover:bg-canvas hover:text-ink'
    }`;

  return (
    <>
      {open && <div className="fixed inset-0 bg-ink/40 z-40 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 shrink-0 bg-white border-r border-line flex flex-col transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <Logo to="/dashboard" />
          <button onClick={onClose} className="lg:hidden w-9 h-9 rounded-full bg-canvas flex items-center justify-center border-0" aria-label="Close menu"><X size={18} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-6">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="px-3.5 mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-3">{g.title}</p>
              <div className="flex flex-col gap-1">
                {g.items.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} onClick={onClose} className={link}><Icon size={18} />{label}</NavLink>
                ))}
              </div>
            </div>
          ))}
          {user?.role === 'admin' && (
            <div>
              <p className="px-3.5 mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-3">Admin</p>
              <NavLink to="/admin" onClick={onClose} className={link}><Shield size={18} />Admin dashboard</NavLink>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-line">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-lav-100 text-lav-700 flex items-center justify-center font-bold">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate m-0">{user?.name || 'Friend'}</p>
              <p className="text-xs text-ink-3 truncate m-0">{user?.email}</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="btn btn-outline w-full btn-sm"><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
    </>
  );
}
