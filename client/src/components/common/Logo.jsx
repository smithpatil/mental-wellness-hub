import { Link } from 'react-router-dom';

export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="#2d7d73" />
      <path d="M20 31c-6.5-4.4-9.5-8-9.5-12.1A5.4 5.4 0 0 1 20 15.6a5.4 5.4 0 0 1 9.5 3.3C29.5 23 26.5 26.6 20 31Z" fill="#fff" />
      <path d="M20 12.5c0-2.1 1.7-3.8 3.8-3.8" stroke="#a9d9d2" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className="inline-flex items-center gap-3" aria-label="Mental Wellness Hub home">
      <LogoMark />
      <span className={`font-display text-lg font-semibold leading-tight ${light ? 'text-white' : 'text-ink'}`}>
        Mental Wellness<br /><span className={`text-sm font-sans font-medium ${light ? 'text-brand-100' : 'text-brand-600'}`}>Hub</span>
      </span>
    </Link>
  );
}
