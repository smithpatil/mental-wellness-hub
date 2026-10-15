import { useState, useEffect, useCallback } from 'react';
import { Video, Clock, Star, Briefcase, CalendarDays, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { counselorAPI, appointmentAPI, errorMessage } from '../lib/api';
import PageHeader, { EmptyState, Spinner } from '../components/common/PageHeader';

const SPECS = ['all', 'anxiety', 'depression', 'stress', 'relationships', 'mindfulness', 'general'];
const SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
const STATUS_TONE = { scheduled: 'badge-brand', rescheduled: 'badge-peach', completed: 'badge-gray', cancelled: 'badge-rose' };

const isoDate = (d) => d.toISOString().slice(0, 10);
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return isoDate(d); };

export default function CounsellingPage() {
  const [counselors, setCounselors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [spec, setSpec] = useState('all');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [form, setForm] = useState({ date: tomorrow(), time: '10:00', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadAppointments = useCallback(async () => {
    try { const { data } = await appointmentAPI.getAll(); setAppointments(data.data || []); } catch { /* silent */ }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await counselorAPI.getAll(spec === 'all' ? {} : { specialization: spec });
        setCounselors(data.data || []);
      } catch (err) { toast.error(errorMessage(err, 'Could not load counsellors')); }
      finally { setLoading(false); }
    })();
  }, [spec]);
  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const submit = async (e) => {
    e.preventDefault();
    const dateTime = new Date(`${form.date}T${form.time}:00`);
    if (dateTime <= new Date()) return toast.error('Please choose a time in the future.');
    setSubmitting(true);
    try {
      await appointmentAPI.book({ counselorId: booking._id, dateTime: dateTime.toISOString(), notes: form.notes });
      toast.success(`Session booked with ${booking.name}`);
      setBooking(null); setForm({ date: tomorrow(), time: '10:00', notes: '' });
      loadAppointments();
    } catch (err) { toast.error(errorMessage(err, 'Could not book this session')); }
    finally { setSubmitting(false); }
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this session?')) return;
    try { await appointmentAPI.cancel(id); toast.success('Session cancelled'); loadAppointments(); }
    catch (err) { toast.error(errorMessage(err, 'Could not cancel')); }
  };

  const upcoming = appointments.filter((a) => ['scheduled', 'rescheduled'].includes(a.status) && new Date(a.dateTime) > new Date());

  return (
    <>
      <PageHeader eyebrow="Human support" title="Counselling" subtitle="Talk with someone who understands. Sessions are confidential and held over video." />

      {upcoming.length > 0 && (
        <section className="mb-10" aria-label="Your upcoming sessions">
          <h2 className="text-xl mb-4">Your upcoming sessions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {upcoming.map((a) => (
              <div key={a._id} className="card !p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 flex flex-col items-center justify-center shrink-0 leading-none">
                  <span className="text-[10px] font-bold uppercase">{new Date(a.dateTime).toLocaleDateString('en', { month: 'short' })}</span>
                  <span className="font-display text-xl">{new Date(a.dateTime).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold m-0 truncate">{a.counselorId?.name || 'Counsellor'}</p>
                  <p className="text-xs text-ink-3 m-0">{new Date(a.dateTime).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })} · 50 min video</p>
                  <span className={`badge mt-1 ${STATUS_TONE[a.status]}`}>{a.status}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {a.videoLink && <a href={a.videoLink} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-sm">Join</a>}
                  <button onClick={() => cancel(a._id)} className="btn btn-outline btn-sm">Cancel</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter by focus area">
        {SPECS.map((s) => <button key={s} onClick={() => setSpec(s)} aria-pressed={spec === s} className="chip capitalize">{s}</button>)}
      </div>

      {loading ? <Spinner label="Finding counsellors…" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {counselors.map((c) => (
            <article key={c._id} className="card card-hover flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <img src={c.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=d3ece8&color=256760&bold=true`} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                <div className="min-w-0">
                  <h3 className="text-lg font-sans font-bold m-0 truncate">{c.name}</h3>
                  <span className="badge badge-brand mt-1 capitalize">{c.specialization}</span>
                </div>
              </div>
              <p className="text-sm text-ink-2 flex-1 mb-4 line-clamp-3">{c.bio || 'An experienced professional here to support your wellbeing.'}</p>
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-ink-2 mb-5">
                {c.rating > 0 && <span className="flex items-center gap-1"><Star size={14} className="text-peach-500 fill-peach-500" />{Number(c.rating).toFixed(1)}</span>}
                {c.experience > 0 && <span className="flex items-center gap-1"><Briefcase size={14} className="text-ink-3" />{c.experience} yrs</span>}
                <span className="flex items-center gap-1"><Video size={14} className="text-ink-3" />Video</span>
                <span className="flex items-center gap-1"><Clock size={14} className="text-ink-3" />50 min</span>
              </div>
              <button onClick={() => setBooking(c)} className="btn btn-primary w-full">Book a session</button>
            </article>
          ))}
          {counselors.length === 0 && <EmptyState icon={CalendarDays} title="No counsellors available">Try a different focus area.</EmptyState>}
        </div>
      )}

      {booking && (
        <div className="fixed inset-0 z-[90] bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setBooking(null)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Book ${booking.name}`} className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button type="button" onClick={() => setBooking(null)} aria-label="Close" className="absolute top-4 right-4 w-9 h-9 rounded-full bg-canvas flex items-center justify-center border-0"><X size={18} /></button>
            <h2 className="text-2xl mb-1">Book a session</h2>
            <p className="text-ink-2 text-sm mb-6">50-minute video session with <strong className="text-ink">{booking.name}</strong></p>

            <div className="flex flex-col gap-5">
              <div>
                <label className="label" htmlFor="date">Date</label>
                <input id="date" type="date" className="input" min={tomorrow()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div>
                <span className="label">Time</span>
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Time">
                  {SLOTS.map((s) => <button type="button" key={s} onClick={() => setForm({ ...form, time: s })} aria-pressed={form.time === s} className="chip !justify-center !px-0">{s}</button>)}
                </div>
              </div>
              <div>
                <label className="label" htmlFor="notes">What would you like to talk about? <span className="font-normal text-ink-3">(optional)</span></label>
                <textarea id="notes" className="input" rows={3} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Only your counsellor will see this." />
              </div>
              <p className="flex gap-2 items-start text-xs text-ink-3 bg-brand-50 rounded-xl p-3 m-0"><ShieldCheck size={16} className="text-brand-600 shrink-0" /> Confidential. If this is an emergency, please use the <strong>Need help now?</strong> button instead.</p>
              <button disabled={submitting} className="btn btn-primary w-full py-3.5">{submitting ? 'Booking…' : 'Confirm booking'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
