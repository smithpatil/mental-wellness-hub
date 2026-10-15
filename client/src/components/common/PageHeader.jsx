export default function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="page-title mb-2">{title}</h1>
        {subtitle && <p className="text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="card text-center py-14 flex flex-col items-center col-span-full">
      {Icon && <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4"><Icon size={26} /></div>}
      <p className="font-semibold text-ink mb-1">{title}</p>
      <p className="text-sm text-ink-3 max-w-sm">{children}</p>
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-ink-3" role="status">
      <div className="w-9 h-9 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin mb-3" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
