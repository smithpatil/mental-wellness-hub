import { Link, Navigate } from 'react-router-dom';
import { Wind, HeartPulse, BookHeart, Users, Lightbulb, LifeBuoy, Sparkles, ArrowRight, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/common/Logo';
import { HELPLINES, MOODS } from '../lib/moods';

const features = [
  { icon: Lightbulb, tone: 'bg-peach-50 text-peach-700', title: 'Mental health awareness', text: 'Plain-language guides, myths vs facts and early warning signs, so you know what is normal and when to reach out.' },
  { icon: Wind, tone: 'bg-brand-50 text-brand-700', title: 'Self-help tools', text: 'Guided breathing, gratitude journal, a memory game and calming soundscapes. Two minutes is enough.' },
  { icon: HeartPulse, tone: 'bg-lav-50 text-lav-700', title: 'Mood tracking', text: 'Check in daily, write private notes and watch your patterns over time.' },
  { icon: Users, tone: 'bg-sky-soft text-sky-deep', title: 'Counselling support', text: 'Browse counsellors by focus area and book a confidential session in a few taps.' },
  { icon: Sparkles, tone: 'bg-brand-50 text-brand-700', title: 'Smart suggestions', text: 'Describe how you feel and we match relevant self-help resources, using NLP, never a diagnosis.' },
  { icon: BookHeart, tone: 'bg-peach-50 text-peach-700', title: 'Anonymous community', text: 'Share and read experiences from peers in a moderated, judgement-free space.' },
];

const steps = [
  ['1', 'Create a free account', 'Takes under a minute. Your entries stay private.'],
  ['2', 'Check in with yourself', 'Log your mood, try a tool, or describe what is on your mind.'],
  ['3', 'Get the right support', 'Follow suggested resources, or book a counsellor when you want to talk.'],
];

export default function LandingPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="bg-canvas">
      <header className="sticky top-0 z-40 bg-canvas/85 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-5 h-20 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-ink-2" aria-label="Sections">
            <a href="#features" className="hover:text-brand-700">Features</a>
            <a href="#how" className="hover:text-brand-700">How it works</a>
            <a href="#help" className="hover:text-brand-700">Get help now</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn btn-outline btn-sm">Sign in</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="soft-blob w-[28rem] h-[28rem] bg-brand-200 -top-32 -left-32" />
        <div className="soft-blob w-96 h-96 bg-lav-100 top-10 right-0" />
        <div className="relative max-w-6xl mx-auto px-5 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="badge badge-brand mb-5">Mental health awareness &amp; counselling</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-6 leading-[1.08]">It is okay to <em className="not-italic text-brand-600">not be okay</em>. You do not have to do it alone.</h1>
            <p className="text-lg text-ink-2 mb-8 max-w-xl">A calm, private space to understand your mind, practise small self-care habits and reach real counsellors when you need them.</p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link to="/signup" className="btn btn-primary py-4 px-7">Start feeling better <ArrowRight size={18} /></Link>
              <a href="#help" className="btn btn-outline py-4 px-7"><LifeBuoy size={18} /> I need help now</a>
            </div>
            <p className="text-sm text-ink-3 m-0">Free to use · Private by design · Not a substitute for professional care</p>
          </div>

          {/* Illustration: a live-looking check-in card cluster */}
          <div className="relative mx-auto w-full max-w-md mt-8 mb-16" aria-hidden="true">
            <div className="card floaty !p-7 rotate-[-2deg]">
              <p className="text-sm font-semibold text-ink-2 mb-1">Today&apos;s check-in</p>
              <p className="font-display text-2xl mb-5">How are you feeling?</p>
              <div className="flex justify-between gap-2">
                {MOODS.map((m, i) => (
                  <div key={m.key} className={`flex-1 text-center rounded-2xl py-3 ${i === 1 ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-canvas'}`}>
                    <div className="text-2xl">{m.emoji}</div>
                    <div className="text-[10px] font-semibold text-ink-2 mt-1">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card !p-5 absolute -bottom-16 right-0 sm:-right-6 w-60 rotate-[3deg] bg-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center"><Wind size={20} /></div>
                <div><p className="font-semibold text-sm m-0">Breathe with me</p><p className="text-xs text-ink-3 m-0">60 seconds · 4-4-6</p></div>
              </div>
            </div>
            <div className="card !p-4 absolute -top-10 right-4 rotate-[4deg] hidden sm:block">
              <p className="text-xs text-ink-3 m-0">Weekly streak</p>
              <p className="font-display text-2xl m-0">5 days 🌱</p>
            </div>
          </div>
        </div>
      </section>

      {/* Awareness strip */}
      <section className="bg-brand-900 text-white">
        <div className="max-w-6xl mx-auto px-5 py-14 grid sm:grid-cols-3 gap-8 text-center sm:text-left">
          {[
            ['1 in 8', 'people worldwide live with a mental health condition (WHO, 2022).'],
            ['Early', 'support makes a real difference. Reaching out sooner tends to mean easier recovery.'],
            ['Talking', 'helps. Stigma keeps many students silent; this space is built to make speaking up easier.'],
          ].map(([big, text]) => (
            <div key={big}>
              <p className="font-display text-4xl text-brand-200 m-0 mb-2">{big}</p>
              <p className="text-brand-100 text-sm m-0">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-20 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="eyebrow mb-3">Everything in one place</p>
          <h2 className="text-3xl sm:text-4xl mb-4">Support that meets you where you are</h2>
          <p className="text-ink-2">Awareness, everyday tools, and human help, without hopping between apps.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, tone, title, text }) => (
            <div key={title} className="card card-hover">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${tone}`}><Icon size={22} /></div>
              <h3 className="text-xl mb-2">{title}</h3>
              <p className="text-ink-2 text-sm m-0">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How */}
      <section id="how" className="bg-white border-y border-line scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <h2 className="text-3xl sm:text-4xl text-center mb-12">Three gentle steps</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map(([n, t, d]) => (
              <div key={n} className="text-center">
                <div className="w-14 h-14 rounded-full bg-brand-600 text-white font-display text-2xl flex items-center justify-center mx-auto mb-5">{n}</div>
                <h3 className="text-xl mb-2">{t}</h3>
                <p className="text-ink-2 text-sm max-w-xs mx-auto m-0">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Help */}
      <section id="help" className="max-w-6xl mx-auto px-5 py-20 scroll-mt-20">
        <div className="rounded-[2rem] bg-rose-50 border border-rose-100 p-8 sm:p-12">
          <div className="max-w-2xl mb-8">
            <span className="badge badge-rose mb-4">Available 24/7</span>
            <h2 className="text-3xl sm:text-4xl mb-3">In crisis? Talk to someone right now.</h2>
            <p className="text-ink-2 m-0">These helplines are free and confidential. If you are in immediate danger, call 112.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {HELPLINES.slice(0, 5).map((h) => (
              <a key={h.number} href={`tel:${h.number.replace(/[^\d+]/g, '')}`} className="bg-white rounded-2xl p-5 flex items-center gap-4 border border-transparent hover:border-rose-500 transition-colors">
                <span className="w-11 h-11 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0"><Phone size={18} /></span>
                <span className="min-w-0"><span className="block font-bold text-rose-700">{h.number}</span><span className="block text-xs text-ink-2 truncate">{h.name}</span></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + footer */}
      <section className="max-w-6xl mx-auto px-5 pb-20 text-center">
        <h2 className="text-3xl sm:text-4xl mb-4">Take the first small step today</h2>
        <p className="text-ink-2 mb-8">Create a free account and try a one-minute breathing exercise.</p>
        <Link to="/signup" className="btn btn-primary py-4 px-8">Create free account <ArrowRight size={18} /></Link>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col md:flex-row gap-4 justify-between items-center text-sm text-ink-3">
          <Logo />
          <p className="m-0 max-w-xl text-center md:text-right">Mental Wellness Hub provides awareness and general self-help only. It does not diagnose or treat any condition and is not a substitute for professional care.</p>
        </div>
      </footer>
    </div>
  );
}
