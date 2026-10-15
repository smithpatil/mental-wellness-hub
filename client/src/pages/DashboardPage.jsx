import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Wind, Users, BookOpen, Flame, Star, Target, ArrowRight, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { moodAPI, gamificationAPI, errorMessage } from '../lib/api';
import { MOODS, greeting, scoreLabel } from '../lib/moods';

const shortcuts = [
  { to: '/counselling', icon: Users, tone: 'bg-lav-50 text-lav-700', title: 'Book a session', text: 'Talk with a qualified counsellor.' },
  { to: '/tools', icon: Wind, tone: 'bg-brand-50 text-brand-700', title: 'Self-help tools', text: 'Breathing, journaling, calming sounds.' },
  { to: '/resources', icon: BookOpen, tone: 'bg-peach-50 text-peach-700', title: 'Find resources', text: 'Describe how you feel, get suggestions.' },
  { to: '/awareness', icon: Lightbulb, tone: 'bg-sky-soft text-sky-deep', title: 'Learn the signs', text: 'Understand what you are experiencing.' },
];

function Stat({ icon: Icon, tone, label, value, sub }) {
  return (
    <div className="card flex items-center gap-4 !p-5">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tone}`}><Icon size={22} /></div>
      <div>
        <p className="text-xs font-semibold text-ink-3 uppercase tracking-wider m-0">{label}</p>
        <p className="font-display text-2xl m-0 leading-tight">{value}</p>
        {sub && <p className="text-xs text-ink-3 m-0">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [trends, setTrends] = useState([]);
  const [rewards, setRewards] = useState(null);
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([moodAPI.getTrends('week'), gamificationAPI.getRewards()]);
      setTrends(t.data.data || []);
      setRewards(r.data.data);
    } catch { /* new accounts may have no data yet */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const checkIn = async (key) => {
    setSaving(true);
    try {
      await moodAPI.logMood({ mood: key });
      setPicked(key);
      toast.success('Check-in saved. Thanks for taking a moment for yourself.');
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save your check-in'));
    } finally {
      setSaving(false);
    }
  };

  const goal = rewards?.weeklyGoals?.moodLogs;
  const pct = goal ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
  const hasData = trends.some((t) => t.moodScore);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow mb-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 className="page-title">{greeting()}, {user?.name?.split(' ')[0] || 'friend'}</h1>
      </div>

      {/* Check-in */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-brand-50 border border-brand-100 p-6 sm:p-10">
        <div className="soft-blob w-72 h-72 bg-brand-200 -right-20 -top-20" />
        <div className="relative max-w-3xl mx-auto text-center">
          <span className="badge badge-brand mb-4">Today&apos;s reflection</span>
          <h2 className="text-2xl sm:text-3xl mb-2">How are you feeling right now?</h2>
          <p className="text-ink-2 text-sm mb-8">There is no right answer. Checking in helps you notice patterns and look after yourself.</p>
          <div className="grid grid-cols-5 gap-2 sm:gap-4" role="radiogroup" aria-label="Mood">
            {MOODS.map((m) => (
              <button
                key={m.key}
                role="radio"
                aria-checked={picked === m.key}
                onClick={() => checkIn(m.key)}
                disabled={saving}
                className={`bg-white rounded-2xl py-3 sm:py-5 flex flex-col items-center gap-1.5 border-2 transition-all hover:-translate-y-1 hover:shadow-md ${picked === m.key ? 'border-brand-500 shadow-md' : 'border-transparent'}`}
              >
                <span className="text-3xl sm:text-4xl">{m.emoji}</span>
                <span className="text-[11px] sm:text-sm font-semibold text-ink-2">{m.label}</span>
              </button>
            ))}
          </div>
          {picked === 'crying' && (
            <p className="mt-6 text-sm text-rose-700 bg-rose-50 rounded-xl p-3 m-0">
              Sorry you are struggling. Try a <Link to="/tools" className="font-semibold underline">breathing exercise</Link>, <Link to="/counselling" className="font-semibold underline">talk to a counsellor</Link>, or use <strong>Need help now?</strong> at the top.
            </p>
          )}
        </div>
      </section>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={Flame} tone="bg-peach-50 text-peach-700" label="Streak" value={`${rewards?.streak ?? 0} days`} sub="Keep checking in" />
        <Stat icon={Star} tone="bg-lav-50 text-lav-700" label="Points" value={rewards?.points ?? 0} sub="Earned from healthy habits" />
        <Stat icon={Target} tone="bg-brand-50 text-brand-700" label="Weekly goal" value={goal ? `${goal.current} / ${goal.target}` : '0 / 5'} sub={`${pct}% of mood check-ins`} />
      </div>

      {/* Chart + progress */}
      <div className="grid lg:grid-cols-5 gap-6">
        <section className="card lg:col-span-3 flex flex-col min-h-[22rem]">
          <div className="flex items-start justify-between mb-4">
            <div><h2 className="text-xl mb-1">Your mood this week</h2><p className="text-sm text-ink-3 m-0">A gentle look at recent check-ins</p></div>
            <Link to="/mood" className="text-sm font-semibold text-brand-700 hover:underline whitespace-nowrap">View history</Link>
          </div>
          {hasData ? (
            <div className="flex-1 min-h-[14rem]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b968b" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b968b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('en', { weekday: 'short' })} axisLine={false} tickLine={false} tick={{ fill: '#6d7d8d', fontSize: 12 }} />
                  <YAxis domain={[0.5, 5.5]} ticks={[1, 3, 5]} tickFormatter={scoreLabel} axisLine={false} tickLine={false} tick={{ fill: '#6d7d8d', fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v) => [scoreLabel(v), 'Mood']} labelFormatter={(v) => new Date(v).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })} contentStyle={{ borderRadius: 12, border: '1px solid #e8e4da' }} />
                  <Area type="monotone" dataKey="moodScore" stroke="#2d7d73" strokeWidth={3} fill="url(#moodFill)" connectNulls dot={{ r: 4, fill: '#fff', stroke: '#2d7d73', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-ink-3 py-8">
              <div className="text-4xl mb-3">🌱</div>
              <p className="font-semibold text-ink mb-1">Your chart will grow here</p>
              <p className="text-sm m-0">Check in above to start seeing your pattern.</p>
            </div>
          )}
        </section>

        <section className="card lg:col-span-2 flex flex-col justify-center">
          <h2 className="text-xl mb-1">Weekly progress</h2>
          <p className="text-sm text-ink-3 mb-6">You are building a healthy habit.</p>
          <div className="flex items-end justify-between mb-3">
            <span className="font-display text-4xl">{pct}%</span>
            <span className="text-sm text-ink-3">{goal?.current ?? 0} of {goal?.target ?? 5} check-ins</span>
          </div>
          <div className="h-3 rounded-full bg-brand-50 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <Link to="/rewards" className="btn btn-soft btn-sm mt-6 self-start">See rewards <ArrowRight size={14} /></Link>
        </section>
      </div>

      {/* Shortcuts */}
      <section>
        <h2 className="text-xl mb-4">Explore your support space</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {shortcuts.map(({ to, icon: Icon, tone, title, text }) => (
            <Link key={to} to={to} className="card card-hover !p-5 flex flex-col">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${tone}`}><Icon size={20} /></div>
              <h3 className="text-base font-sans font-bold mb-1">{title}</h3>
              <p className="text-sm text-ink-3 m-0">{text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-brand-900 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0"><Wind size={26} /></div>
          <div>
            <h2 className="!text-white text-xl mb-1">Need a moment to reset?</h2>
            <p className="text-brand-100 text-sm m-0">Take 60 seconds with a guided breathing exercise. Come back to it anytime.</p>
          </div>
        </div>
        <Link to="/tools" className="btn bg-white text-brand-900 hover:bg-brand-50 shrink-0">Start breathing <ArrowRight size={16} /></Link>
      </section>
    </div>
  );
}
