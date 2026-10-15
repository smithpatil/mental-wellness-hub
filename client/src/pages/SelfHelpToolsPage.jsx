import { useState, useRef, useEffect } from 'react';
import { Wind, Heart, Brain, Music, X } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { BreathingExercise, GratitudeJournal, MemoryGame, Soundscapes } from '../components/tools/SelfHelpExercises';

const tools = [
  { id: 'breathe', title: 'Guided breathing', time: '1 min', icon: Wind, tone: 'bg-brand-50 text-brand-700', desc: 'Slow your heart rate and ease stress with a paced 4-4-6 breathing cycle.', View: BreathingExercise },
  { id: 'gratitude', title: 'Gratitude journal', time: '2 min', icon: Heart, tone: 'bg-rose-50 text-rose-700', desc: 'Note small good things to gently shift attention toward what is going well.', View: GratitudeJournal },
  { id: 'focus', title: 'Memory game', time: '3 min', icon: Brain, tone: 'bg-lav-50 text-lav-700', desc: 'Match the pairs. A light, screen-friendly way to refocus a busy mind.', View: MemoryGame },
  { id: 'soundscapes', title: 'Relaxation sounds', time: 'Any', icon: Music, tone: 'bg-peach-50 text-peach-700', desc: 'Rain, ocean or forest wind for winding down, studying or sleep.', View: Soundscapes },
];

export default function SelfHelpToolsPage() {
  const [activeId, setActiveId] = useState(null);
  const panelRef = useRef(null);
  const active = tools.find((t) => t.id === activeId);

  useEffect(() => {
    if (activeId) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeId]);

  return (
    <>
      <PageHeader eyebrow="Take a moment" title="Self-help tools" subtitle="Short, gentle exercises you can do anywhere to reset and refocus." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {tools.map((t) => (
          <button key={t.id} onClick={() => setActiveId(t.id)} aria-pressed={activeId === t.id}
            className={`card card-hover text-left flex flex-col ${activeId === t.id ? '!border-brand-500 ring-2 ring-brand-100' : ''}`}>
            <div className="flex items-start justify-between mb-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${t.tone}`}><t.icon size={26} /></div>
              <span className="badge badge-gray whitespace-nowrap">{t.time}</span>
            </div>
            <h2 className="text-lg font-sans font-bold mb-2">{t.title}</h2>
            <p className="text-sm text-ink-2 flex-1 mb-4">{t.desc}</p>
            <span className="text-sm font-semibold text-brand-700">{activeId === t.id ? 'Open below ↓' : 'Start exercise →'}</span>
          </button>
        ))}
      </div>

      {active && (
        <section ref={panelRef} className="card relative !p-6 sm:!p-10 scroll-mt-24" aria-label={active.title}>
          <button onClick={() => setActiveId(null)} aria-label="Close exercise" className="absolute top-4 right-4 w-9 h-9 rounded-full bg-canvas hover:bg-line flex items-center justify-center border-0"><X size={18} /></button>
          <div className="text-center mb-8">
            <h2 className="text-2xl mb-2">{active.title}</h2>
            <p className="text-ink-2 text-sm max-w-md mx-auto m-0">{active.desc}</p>
          </div>
          <active.View />
        </section>
      )}
    </>
  );
}
