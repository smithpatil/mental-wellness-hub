import { useLocation } from 'react-router-dom';
import { Menu, LifeBuoy } from 'lucide-react';

const TITLES = {
  '/dashboard': 'Overview', '/mood': 'Mood & journal', '/tools': 'Self-help tools', '/rewards': 'Progress',
  '/awareness': 'Awareness', '/resources': 'Resource library', '/community': 'Community',
  '/counselling': 'Counselling', '/emergency': 'Emergency help', '/privacy': 'Privacy & data', '/admin': 'Admin dashboard',
};

export default function TopHeader({ onMenu, onHelp }) {
  const { pathname } = useLocation();
  return (
    <header className="h-16 shrink-0 bg-canvas/80 backdrop-blur border-b border-line flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="lg:hidden w-10 h-10 rounded-xl bg-white border border-line flex items-center justify-center" aria-label="Open menu"><Menu size={20} /></button>
        <span className="font-display text-lg font-semibold">{TITLES[pathname] || 'Mental Wellness Hub'}</span>
      </div>
      <button onClick={onHelp} className="btn btn-sm bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-500 hover:text-white">
        <LifeBuoy size={16} /> <span className="hidden sm:inline">Need help now?</span><span className="sm:hidden">Help</span>
      </button>
    </header>
  );
}
