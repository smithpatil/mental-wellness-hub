import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Eye, Hand, Ear, Flower2, Cookie, AlertTriangle, HeartHandshake } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { HELPLINES } from '../lib/moods';

const steps = [
  { n: 5, icon: Eye, t: 'things you can see', d: 'Look around and name five things.' },
  { n: 4, icon: Hand, t: 'things you can touch', d: 'Feel the chair, your clothes, the floor.' },
  { n: 3, icon: Ear, t: 'things you can hear', d: 'Listen for sounds near and far.' },
  { n: 2, icon: Flower2, t: 'things you can smell', d: 'Or think of two smells you like.' },
  { n: 1, icon: Cookie, t: 'thing you can taste', d: 'Take a sip of water or notice your mouth.' },
];

export default function EmergencyPage() {
  const [done, setDone] = useState([]);
  const toggle = (n) => setDone((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n]));

  return (
    <>
      <PageHeader eyebrow="Immediate support" title="Emergency help" subtitle="If you are in danger or thinking about harming yourself, please reach out right now. Help is free, confidential and available 24/7." />

      <div className="rounded-2xl bg-rose-50 border border-rose-100 p-5 mb-8 flex gap-4 items-start" role="alert">
        <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={22} />
        <p className="m-0 text-rose-700 text-sm"><strong>In immediate danger?</strong> Call <a href="tel:112" className="font-bold underline">112</a> or go to the nearest hospital. This platform cannot provide emergency care.</p>
      </div>

      <h2 className="text-2xl mb-4">Helplines (India)</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-12">
        {HELPLINES.map((h) => (
          <a key={h.number} href={`tel:${h.number.replace(/[^\d+]/g, '')}`} className="card card-hover !p-5 flex items-center gap-4 hover:!border-rose-500">
            <span className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0"><Phone size={20} /></span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold">{h.name}</span>
              <span className="block text-xs text-ink-3">{h.desc}</span>
            </span>
            <span className="font-bold text-rose-700 whitespace-nowrap">{h.number}</span>
          </a>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl mb-2">5-4-3-2-1 grounding</h2>
          <p className="text-ink-2 text-sm mb-5">If you feel panicky or overwhelmed, this brings you back to the present. Tick each step as you go.</p>
          <ul className="list-none p-0 m-0 flex flex-col gap-3">
            {steps.map(({ n, icon: Icon, t, d }) => (
              <li key={n}>
                <button onClick={() => toggle(n)} aria-pressed={done.includes(n)} className={`w-full card !p-4 flex items-center gap-4 text-left transition-colors ${done.includes(n) ? '!bg-brand-50 !border-brand-200' : ''}`}>
                  <span className={`w-11 h-11 rounded-full font-display text-xl flex items-center justify-center shrink-0 ${done.includes(n) ? 'bg-brand-600 text-white' : 'bg-canvas text-ink'}`}>{n}</span>
                  <span className="flex-1"><span className="block font-semibold">{t}</span><span className="block text-xs text-ink-3">{d}</span></span>
                  <Icon size={20} className="text-ink-3" />
                </button>
              </li>
            ))}
          </ul>
          {done.length === steps.length && <p className="mt-4 text-sm text-brand-700 font-semibold">Well done. Take a slow breath. <Link to="/tools" className="underline">Try guided breathing</Link>.</p>}
        </section>

        <section className="card self-start">
          <div className="w-12 h-12 rounded-2xl bg-lav-50 text-lav-700 flex items-center justify-center mb-4"><HeartHandshake size={22} /></div>
          <h2 className="text-2xl mb-3">Helping a friend in crisis</h2>
          <ul className="text-sm text-ink-2 pl-5 m-0 flex flex-col gap-2 list-disc">
            <li>Stay with them if you can, and listen without judging.</li>
            <li>Ask directly if they are thinking about hurting themselves. Asking does not put the idea in their mind.</li>
            <li>Remove immediate means of harm if it is safe to do so.</li>
            <li>Help them contact a helpline, a counsellor or emergency services.</li>
            <li>Look after yourself too, and tell a trusted adult.</li>
          </ul>
          <Link to="/counselling" className="btn btn-primary mt-6">Book a counsellor</Link>
        </section>
      </div>
    </>
  );
}
