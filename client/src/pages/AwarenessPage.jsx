import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, CloudRain, MoonStar, Users2, Footprints, Salad, Smartphone, HeartHandshake, ChevronDown, ArrowRight } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';

const signs = [
  { icon: CloudRain, t: 'Persistent low mood', d: 'Feeling sad, empty or hopeless for two weeks or more.' },
  { icon: MoonStar, t: 'Sleep changes', d: 'Trouble falling asleep, waking often, or sleeping far more than usual.' },
  { icon: Users2, t: 'Withdrawing from people', d: 'Avoiding friends, classes or things you used to enjoy.' },
  { icon: Brain, t: 'Trouble concentrating', d: 'Racing thoughts, constant worry or difficulty focusing on study or work.' },
];

const myths = [
  ['Mental health problems are a sign of weakness.', 'They are health conditions, not character flaws. They can affect anyone, regardless of strength or intelligence.'],
  ['Only people with severe illness need support.', 'Support helps at every stage. Talking early with a counsellor can prevent things from getting harder.'],
  ['You can just "snap out of it".', 'Recovery usually takes time, tools and support, the same as physical health.'],
  ['Talking about it makes it worse.', 'Talking to someone you trust usually brings relief and helps you feel less alone.'],
  ['Students are too young to feel this way.', 'Academic pressure, change and uncertainty affect young people strongly. Many mental health conditions first appear in youth.'],
];

const habits = [
  { icon: MoonStar, t: 'Protect your sleep', d: 'Keep regular sleep and wake times and wind down without screens.' },
  { icon: Footprints, t: 'Move a little daily', d: 'Even a 15-minute walk can lift mood and reduce stress.' },
  { icon: Salad, t: 'Eat and hydrate regularly', d: 'Skipping meals and caffeine overload can worsen anxiety.' },
  { icon: Smartphone, t: 'Take screen breaks', d: 'Limit doom-scrolling and comparison on social media.' },
  { icon: HeartHandshake, t: 'Stay connected', d: 'Regular contact with friends or family protects wellbeing.' },
  { icon: Brain, t: 'Practise mindfulness', d: 'A minute of slow breathing calms the body. Try our guided tool.' },
];

function Myth({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card !p-0 overflow-hidden">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between gap-4 text-left p-5 bg-transparent border-0">
        <span><span className="badge badge-rose mr-2">Myth</span><span className="font-semibold">{q}</span></span>
        <ChevronDown size={18} className={`shrink-0 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 text-sm text-ink-2"><span className="badge badge-brand mr-2">Fact</span>{a}</div>}
    </div>
  );
}

export default function AwarenessPage() {
  return (
    <>
      <PageHeader eyebrow="Mental health awareness" title="Understand your mind" subtitle="Plain-language information to help you recognise what you are feeling and know when to reach out." />

      <section className="rounded-[1.75rem] bg-peach-50 border border-peach-100 p-6 sm:p-10 mb-12 grid md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2">
          <h2 className="text-2xl sm:text-3xl mb-3">Mental health is part of everyday health</h2>
          <p className="text-ink-2 m-0">It affects how we think, feel, study, work and relate to others. Everyone has good days and hard days. Struggling does not mean something is wrong with you, and asking for help is a sign of strength.</p>
        </div>
        <div className="text-center"><p className="font-display text-5xl text-peach-700 m-0">1 in 8</p><p className="text-sm text-ink-2 m-0">people worldwide live with a mental health condition (WHO, 2022)</p></div>
      </section>

      <h2 className="text-2xl mb-2">Common signs to notice</h2>
      <p className="text-ink-2 mb-6">Having one of these occasionally is normal. If several last for weeks and affect daily life, consider talking to someone.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {signs.map(({ icon: Icon, t, d }) => (
          <div key={t} className="card !p-5">
            <div className="w-11 h-11 rounded-xl bg-lav-50 text-lav-700 flex items-center justify-center mb-3"><Icon size={20} /></div>
            <h3 className="text-base font-sans font-bold mb-1">{t}</h3>
            <p className="text-sm text-ink-2 m-0">{d}</p>
          </div>
        ))}
      </div>

      <h2 className="text-2xl mb-6">Myths &amp; facts</h2>
      <div className="flex flex-col gap-3 mb-12">{myths.map(([q, a]) => <Myth key={q} q={q} a={a} />)}</div>

      <h2 className="text-2xl mb-6">Everyday habits that help</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {habits.map(({ icon: Icon, t, d }) => (
          <div key={t} className="card !p-5 flex gap-4">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0"><Icon size={20} /></div>
            <div><h3 className="text-base font-sans font-bold mb-1">{t}</h3><p className="text-sm text-ink-2 m-0">{d}</p></div>
          </div>
        ))}
      </div>

      <section className="rounded-[1.75rem] bg-brand-900 text-white p-6 sm:p-10">
        <h2 className="!text-white text-2xl mb-2">When to reach out</h2>
        <p className="text-brand-100 mb-6 max-w-2xl">If low mood, worry or stress is lasting, getting in the way of daily life, or you have thoughts of harming yourself, please speak to a professional. You deserve support.</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/counselling" className="btn bg-white text-brand-900 hover:bg-brand-50">Book a counsellor <ArrowRight size={16} /></Link>
          <Link to="/emergency" className="btn border-white/40 text-white hover:bg-white/10">Emergency help</Link>
          <Link to="/resources" className="btn border-white/40 text-white hover:bg-white/10">Find resources</Link>
        </div>
      </section>
      <p className="text-xs text-ink-3 mt-6">This information is educational and is not a diagnosis or a substitute for professional advice.</p>
    </>
  );
}
