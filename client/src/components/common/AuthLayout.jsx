import { Link } from 'react-router-dom';
import { ShieldCheck, Sprout, Lock, HeartHandshake } from 'lucide-react';
import Logo from './Logo';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-canvas">
      {/* Brand panel */}
      <aside className="hidden lg:flex relative overflow-hidden bg-brand-900 text-white p-14 flex-col justify-between">
        <div className="soft-blob w-96 h-96 bg-brand-500 -top-24 -right-24" />
        <div className="soft-blob w-80 h-80 bg-lav-500 bottom-0 -left-24 opacity-30" />
        <Logo light />
        <div className="relative max-w-md">
          <p className="eyebrow !text-brand-200 mb-4">A softer place to land</p>
          <h2 className="!text-white text-4xl mb-5">Your wellbeing is worth making space for.</h2>
          <p className="text-brand-100 mb-8 leading-relaxed">Awareness, self-help tools, counselling and emergency support, together in one calm place.</p>
          <ul className="list-none p-0 m-0 flex flex-col gap-4 text-sm text-brand-100">
            <li className="flex gap-3 items-center"><Sprout size={18} className="text-brand-200 shrink-0" /> Gentle tools: breathing, journaling, mood tracking</li>
            <li className="flex gap-3 items-center"><HeartHandshake size={18} className="text-brand-200 shrink-0" /> Book a confidential counselling session</li>
            <li className="flex gap-3 items-center"><Lock size={18} className="text-brand-200 shrink-0" /> Private by design, anonymous community</li>
          </ul>
        </div>
        <p className="relative text-xs text-brand-200 m-0 flex gap-2 items-start"><ShieldCheck size={16} className="shrink-0" /> For awareness and general wellness only. Not a substitute for professional diagnosis or treatment.</p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col justify-center px-5 sm:px-10 py-10">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h1 className="text-3xl mb-2">{title}</h1>
          <p className="text-ink-2 mb-8">{subtitle}</p>
          {children}
          <div className="mt-8 text-sm text-ink-2 text-center">{footer}</div>
          <p className="mt-6 text-center text-xs text-ink-3">
            <Link to="/" className="hover:text-brand-700 underline underline-offset-2">Back to home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
