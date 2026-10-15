import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, NotebookPen } from 'lucide-react';
import toast from 'react-hot-toast';
import { moodAPI, errorMessage } from '../lib/api';
import { MOODS, moodByKey, scoreLabel } from '../lib/moods';
import PageHeader, { EmptyState } from '../components/common/PageHeader';

export default function MoodTrackingPage() {
  const [mood, setMood] = useState('');
  const [title, setTitle] = useState('');
  const [journal, setJournal] = useState('');
  const [history, setHistory] = useState([]);
  const [trends, setTrends] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, t] = await Promise.all([moodAPI.getHistory({ limit: 30 }), moodAPI.getTrends('week')]);
      setHistory(h.data.data || []);
      setTrends(t.data.data || []);
    } catch { /* empty state handles it */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    if (!mood) return toast.error('Pick how you are feeling first');
    setSaving(true);
    try {
      const body = title ? `${title}\n${journal}` : journal;
      await moodAPI.logMood({ mood, journal: body });
      toast.success('Private entry saved');
      setMood(''); setTitle(''); setJournal('');
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save entry'));
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = async () => {
    try {
      const { data } = await moodAPI.exportData();
      const rows = data.data?.entries || [];
      const csv = ['date,mood,journal', ...rows.map((r) => `${new Date(r.date).toISOString()},${r.mood},"${(r.journal || '').replace(/"/g, '""')}"`)].join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'mood-journal.csv';
      a.click();
    } catch (err) {
      toast.error(errorMessage(err, 'Export failed'));
    }
  };

  const hasData = trends.some((t) => t.moodScore);

  return (
    <>
      <PageHeader
        eyebrow="Your wellbeing journal"
        title="Mood & journal"
        subtitle="Notice how you feel, without judgement. Entries are private to you."
        action={<button onClick={exportCsv} className="btn btn-outline btn-sm self-start"><Download size={15} /> Export</button>}
      />

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <form onSubmit={save} className="card flex flex-col gap-5">
          <div>
            <h2 className="text-xl mb-1">New entry</h2>
            <p className="text-sm text-ink-3 m-0">Putting feelings into words can make them feel lighter.</p>
          </div>
          <fieldset className="border-0 p-0 m-0">
            <legend className="label">How are you feeling?</legend>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((m) => (
                <button type="button" key={m.key} onClick={() => setMood(m.key)} aria-pressed={mood === m.key}
                  className={`rounded-2xl py-3 flex flex-col items-center gap-1 border-2 transition-all ${mood === m.key ? 'bg-brand-50 border-brand-500' : 'bg-canvas border-transparent hover:border-line'}`}>
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[11px] font-semibold text-ink-2">{m.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="label" htmlFor="title">Title <span className="font-normal text-ink-3">(optional)</span></label>
            <input id="title" className="input" placeholder="e.g. Before my exam" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="journal">What is on your mind?</label>
            <textarea id="journal" className="input" rows={5} maxLength={2000} placeholder="Write freely. Only you can see this." value={journal} onChange={(e) => setJournal(e.target.value)} />
          </div>
          <button disabled={saving || !mood} className="btn btn-primary">{saving ? 'Saving…' : 'Save private entry'}</button>
        </form>

        <section className="card flex flex-col min-h-[24rem]">
          <h2 className="text-xl mb-1">Last 7 days</h2>
          <p className="text-sm text-ink-3 mb-4">A visual look at your recent entries.</p>
          {hasData ? (
            <div className="flex-1 min-h-[16rem]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7b6fc9" stopOpacity={0.35} /><stop offset="100%" stopColor="#7b6fc9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('en', { weekday: 'short' })} axisLine={false} tickLine={false} tick={{ fill: '#6d7d8d', fontSize: 12 }} />
                  <YAxis domain={[0.5, 5.5]} ticks={[1, 3, 5]} tickFormatter={scoreLabel} axisLine={false} tickLine={false} tick={{ fill: '#6d7d8d', fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v) => [scoreLabel(v), 'Mood']} contentStyle={{ borderRadius: 12, border: '1px solid #e8e4da' }} />
                  <Area type="monotone" dataKey="moodScore" stroke="#56499c" strokeWidth={3} fill="url(#mFill)" connectNulls dot={{ r: 4, fill: '#fff', stroke: '#56499c', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-ink-3 text-sm">Save your first entry to see your week here.</div>
          )}
        </section>
      </div>

      <h2 className="text-xl mb-4">Past entries</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {history.length === 0 && <EmptyState icon={NotebookPen} title="No entries yet">Your journal entries will appear here.</EmptyState>}
        {history.map((h) => {
          const m = moodByKey(h.mood);
          return (
            <article key={h._id} className="card !p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 font-semibold text-sm"><span className="text-xl">{m?.emoji}</span>{m?.label || h.mood}</span>
                <time className="text-xs text-ink-3">{new Date(h.date || h.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
              </div>
              {h.journal ? <p className="text-sm text-ink-2 m-0 whitespace-pre-wrap line-clamp-4">{h.journal}</p> : <p className="text-sm text-ink-3 italic m-0">No note</p>}
            </article>
          );
        })}
      </div>
    </>
  );
}
