import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { gratitudeAPI, errorMessage } from '../../lib/api';

// ---------- Guided breathing (inhale 4 · hold 4 · exhale 6, for 60 seconds) ----------
const PHASES = [
  { label: 'Breathe in', secs: 4, scale: 1.45 },
  { label: 'Hold', secs: 4, scale: 1.45 },
  { label: 'Breathe out', secs: 6, scale: 1 },
];

export function BreathingExercise() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState(60);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (left <= 0 && running) {
      setRunning(false); setPhase(0); setLeft(60);
      toast.success('Well done. Notice how you feel now.');
    }
  }, [left, running]);

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASES[phase].secs * 1000);
    return () => clearTimeout(t);
  }, [running, phase]);

  const cur = PHASES[phase];
  return (
    <div className="text-center">
      <div className="h-64 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-40 h-40 rounded-full bg-brand-100" style={{ transform: `scale(${running ? cur.scale * 1.15 : 1.1})`, transition: `transform ${running ? cur.secs : 0.6}s ease-in-out` }} />
          <div className="relative w-40 h-40 rounded-full bg-brand-500 text-white font-semibold flex items-center justify-center shadow-lg" style={{ transform: `scale(${running ? cur.scale : 1})`, transition: `transform ${running ? cur.secs : 0.6}s ease-in-out` }} aria-live="polite">
            {running ? cur.label : 'Ready'}
          </div>
        </div>
      </div>
      <p className="text-ink-3 text-sm mb-5">{running ? `${left}s remaining` : '60 seconds · inhale 4, hold 4, exhale 6'}</p>
      <button onClick={() => { setRunning((r) => !r); setPhase(0); setLeft(60); }} className="btn btn-primary px-10">{running ? 'Stop' : 'Begin'}</button>
    </div>
  );
}

// ---------- Gratitude journal (saved via /api/gratitude) ----------
export function GratitudeJournal() {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    try { const { data } = await gratitudeAPI.getNotes(); setNotes(data.data || []); } catch { /* silent */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    if (!text.trim()) return toast.error('Write something you are grateful for first.');
    try {
      await gratitudeAPI.createNote(text.trim());
      setText(''); toast.success('Saved'); load();
    } catch (err) { toast.error(errorMessage(err, 'Could not save note')); }
  };
  const remove = async (id) => { try { await gratitudeAPI.deleteNote(id); load(); } catch { toast.error('Could not delete'); } };

  return (
    <div className="max-w-xl mx-auto text-left">
      <form onSubmit={save} className="flex gap-2 mb-5">
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Today I am grateful for…" aria-label="Gratitude note" />
        <button className="btn btn-primary shrink-0">Add</button>
      </form>
      <ul className="list-none p-0 m-0 flex flex-col gap-2 max-h-64 overflow-y-auto">
        {notes.length === 0 && <li className="text-center text-sm text-ink-3 py-6">No notes yet. Start with one small thing.</li>}
        {notes.map((n) => (
          <li key={n._id} className="flex items-start justify-between gap-3 bg-canvas rounded-xl px-4 py-3 text-sm">
            <span className="text-ink-2">{n.content}</span>
            <button onClick={() => remove(n._id)} aria-label="Delete note" className="text-ink-3 hover:text-rose-500 bg-transparent border-0 p-0"><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Memory game ----------
const SYMBOLS = ['🌱', '🌊', '☀️', '🌙', '🍃', '🌸'];
const shuffled = () => [...SYMBOLS, ...SYMBOLS].map((s, i) => ({ id: i, s, k: Math.random() })).sort((a, b) => a.k - b.k);

export function MemoryGame() {
  const [cards, setCards] = useState(shuffled);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const lock = useRef(false);

  const flip = (card) => {
    if (lock.current || flipped.includes(card.id) || matched.includes(card.id)) return;
    const next = [...flipped, card.id];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((id) => cards.find((c) => c.id === id));
      if (a.s === b.s) { setMatched((m) => [...m, a.id, b.id]); setFlipped([]); }
      else { lock.current = true; setTimeout(() => { setFlipped([]); lock.current = false; }, 800); }
    }
  };
  const reset = () => { setCards(shuffled()); setFlipped([]); setMatched([]); setMoves(0); };
  const won = matched.length === cards.length;

  return (
    <div className="text-center">
      <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto mb-5">
        {cards.map((c) => {
          const open = flipped.includes(c.id) || matched.includes(c.id);
          return (
            <button key={c.id} onClick={() => flip(c)} aria-label={open ? c.s : 'Hidden card'}
              className={`aspect-square rounded-2xl text-3xl border-2 transition-all ${open ? 'bg-brand-50 border-brand-200' : 'bg-brand-600 border-brand-600 hover:bg-brand-700'} ${matched.includes(c.id) ? 'opacity-60' : ''}`}>
              {open ? c.s : ''}
            </button>
          );
        })}
      </div>
      <p className="text-ink-2 text-sm mb-4" aria-live="polite">{won ? `Nicely done! All pairs matched in ${moves} moves.` : `Moves: ${moves}`}</p>
      <button onClick={reset} className="btn btn-outline btn-sm">New game</button>
    </div>
  );
}

// ---------- Relaxation soundscapes (synthesised with Web Audio; no audio files) ----------
const SOUNDS = {
  rain: { label: 'Rain', emoji: '🌧️', filter: 'highpass', freq: 1200, gain: 0.25 },
  ocean: { label: 'Ocean waves', emoji: '🌊', filter: 'lowpass', freq: 500, gain: 0.5, lfo: 0.12 },
  forest: { label: 'Forest wind', emoji: '🌲', filter: 'bandpass', freq: 700, gain: 0.35, lfo: 0.3 },
};

export function Soundscapes() {
  const [active, setActive] = useState(null);
  const nodes = useRef(null);

  const stop = useCallback(() => {
    if (nodes.current) {
      try { nodes.current.src.stop(); nodes.current.lfo?.stop(); nodes.current.ctx.close(); } catch { /* already stopped */ }
      nodes.current = null;
    }
  }, []);
  useEffect(() => stop, [stop]);

  const play = (key) => {
    stop();
    if (active === key) return setActive(null);
    const cfg = SOUNDS[key];
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = cfg.filter; filter.frequency.value = cfg.freq;
    const gain = ctx.createGain(); gain.gain.value = cfg.gain;
    let lfo = null;
    if (cfg.lfo) {
      lfo = ctx.createOscillator(); lfo.frequency.value = cfg.lfo;
      const depth = ctx.createGain(); depth.gain.value = cfg.gain * 0.6;
      lfo.connect(depth).connect(gain.gain); lfo.start();
    }
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    nodes.current = { ctx, src, lfo };
    setActive(key);
  };

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {Object.entries(SOUNDS).map(([key, s]) => (
          <button key={key} onClick={() => play(key)} aria-pressed={active === key}
            className={`rounded-2xl p-5 border-2 flex flex-col items-center gap-2 transition-all ${active === key ? 'bg-peach-50 border-peach-500' : 'bg-canvas border-transparent hover:border-line'}`}>
            <span className="text-3xl">{s.emoji}</span>
            <span className="font-semibold text-sm">{s.label}</span>
            <span className="text-xs text-ink-3">{active === key ? 'Playing · tap to stop' : 'Tap to play'}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-3 text-center mt-4 mb-0">Sounds are generated in your browser. Adjust your device volume to a comfortable level.</p>
    </div>
  );
}
