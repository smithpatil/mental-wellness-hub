import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Heart, X } from 'lucide-react';
import { HELPLINES } from '../../lib/moods';

export default function EmergencyModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Emergency help" className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-9 h-9 rounded-full bg-canvas text-ink-2 hover:bg-line flex items-center justify-center border-0">
          <X size={18} />
        </button>
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4"><Heart size={26} /></div>
          <h2 className="text-2xl mb-2">You are not alone</h2>
          <p className="text-ink-2 text-sm">If you are in crisis or in immediate danger, please call now. These lines are free and confidential.</p>
        </div>
        <ul className="flex flex-col gap-3 list-none p-0 m-0 mb-6">
          {HELPLINES.map((h) => (
            <li key={h.number}>
              <a href={`tel:${h.number.replace(/[^\d+]/g, '')}`} className="flex items-center gap-4 p-4 rounded-2xl border border-line hover:border-rose-500 hover:bg-rose-50 transition-colors">
                <span className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0"><Phone size={18} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-sm">{h.name}</span>
                  <span className="block text-xs text-ink-3">{h.desc}</span>
                </span>
                <span className="font-bold text-rose-700 text-sm whitespace-nowrap">{h.number}</span>
              </a>
            </li>
          ))}
        </ul>
        <Link to="/emergency" onClick={onClose} className="btn btn-soft w-full">Grounding steps &amp; more support</Link>
        <p className="text-[11px] text-ink-3 text-center mt-4 mb-0">This platform offers awareness and self-help only. It does not provide diagnosis or emergency treatment.</p>
      </div>
    </div>
  );
}
