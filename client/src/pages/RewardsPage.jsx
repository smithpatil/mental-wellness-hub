import { useState, useEffect } from 'react';
import { Trophy, Star, Target, Flame, Lock } from 'lucide-react';
import { gamificationAPI } from '../lib/api';
import PageHeader, { Spinner } from '../components/common/PageHeader';

function Goal({ label, goal }) {
  if (!goal) return null;
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5"><span className="font-semibold text-ink-2">{label}</span><span className="text-ink-3">{goal.current} / {goal.target}</span></div>
      <div className="h-2.5 rounded-full bg-brand-50 overflow-hidden"><div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function RewardsPage() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    gamificationAPI.checkBadges().catch(() => {}).finally(async () => {
      try { const res = await gamificationAPI.getRewards(); setData(res.data.data); } catch { setFailed(true); }
    });
  }, []);

  if (failed) return <p className="text-center text-ink-3 py-16">Could not load your progress right now.</p>;
  if (!data) return <Spinner label="Loading your progress…" />;

  const earnedIds = new Set((data.earnedBadges || []).map((b) => b._id));
  const badges = data.allBadges || [];

  return (
    <>
      <PageHeader eyebrow="Your journey" title="Progress & rewards" subtitle="Every small step counts. Celebrate the habits you are building." />

      <div className="grid md:grid-cols-3 gap-5 mb-10">
        <div className="rounded-[1.25rem] bg-brand-600 text-white p-6 relative overflow-hidden">
          <Star size={110} className="absolute -right-4 -top-4 text-white/10" />
          <Star size={24} className="mb-3 text-brand-100" />
          <p className="font-display text-5xl m-0">{data.points ?? 0}</p>
          <p className="text-brand-100 text-sm m-0">Total points</p>
        </div>
        <div className="card">
          <div className="w-11 h-11 rounded-xl bg-peach-50 text-peach-700 flex items-center justify-center mb-3"><Flame size={22} /></div>
          <p className="font-display text-4xl m-0">{data.streak ?? 0} <span className="text-lg text-ink-3 font-sans">days</span></p>
          <p className="text-ink-3 text-sm m-0">Current streak</p>
        </div>
        <div className="card flex flex-col justify-center gap-4">
          <div className="flex items-center gap-2"><Target size={18} className="text-brand-600" /><h2 className="text-base font-sans font-bold m-0">This week</h2></div>
          <Goal label="Mood check-ins" goal={data.weeklyGoals?.moodLogs} />
          <Goal label="Gratitude notes" goal={data.weeklyGoals?.gratitudeEntries} />
        </div>
      </div>

      <h2 className="text-xl mb-4 flex items-center gap-2"><Trophy size={20} className="text-brand-600" /> Badges</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {badges.map((b) => {
          const earned = earnedIds.has(b._id);
          return (
            <div key={b._id} className={`card !p-5 text-center ${earned ? '' : 'opacity-60'}`}>
              <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl ${earned ? 'bg-peach-50' : 'bg-canvas'}`}>{earned ? b.icon : <Lock size={22} className="text-ink-3" />}</div>
              <h3 className="text-sm font-sans font-bold mb-1">{b.name}</h3>
              <p className="text-xs text-ink-3 m-0">{b.description}</p>
            </div>
          );
        })}
        {badges.length === 0 && <p className="col-span-full text-center text-ink-3 py-8">Keep checking in to earn your first badge.</p>}
      </div>
    </>
  );
}
