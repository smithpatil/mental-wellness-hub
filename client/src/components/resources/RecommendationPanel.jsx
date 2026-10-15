import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowUpRight, ShieldCheck, Phone, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { recommendAPI, authAPI, errorMessage } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { HELPLINES } from '../../lib/moods';

const TOPICS = ['Exam stress', 'Sleep', 'Anxiety', 'Low mood', 'Loneliness', 'Time management', 'Relaxation', 'Focus'];
const CAT_LABEL = {
  exam_stress: 'Exam stress', sleep: 'Sleep difficulty', anxiety: 'Anxiety', low_mood: 'Low mood',
  loneliness: 'Loneliness', time_management: 'Time management', relaxation: 'Relaxation', focus: 'Focus',
};

function EmergencyPanel() {
  return (
    <div className="mt-6 p-5 rounded-2xl bg-rose-50 border border-rose-100" role="alert">
      <h3 className="text-lg font-sans font-bold text-rose-700 mb-1">You matter, and support is available right now</h3>
      <p className="text-sm text-rose-700 mb-4">
        What you wrote sounds very painful. We are not showing self-help suggestions here. Please reach out to someone now:
        a helpline below, a trusted person, or a campus counsellor.
      </p>
      <ul className="list-none p-0 m-0 grid sm:grid-cols-2 gap-3">
        {HELPLINES.slice(0, 4).map((h) => (
          <li key={h.number}>
            <a href={`tel:${h.number.replace(/[^\d+]/g, '')}`} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-transparent hover:border-rose-500">
              <span className="w-9 h-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0"><Phone size={16} /></span>
              <span className="min-w-0"><span className="block text-sm font-bold text-rose-700">{h.number}</span><span className="block text-xs text-ink-2 truncate">{h.name}</span></span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-rose-700 mt-4 mb-0">
        You can also <Link to="/counselling" className="underline font-semibold">book a counsellor</Link> or read the <Link to="/emergency" className="underline font-semibold">emergency page</Link>.
      </p>
    </div>
  );
}

export default function RecommendationPanel({ onBrowseCategory }) {
  const { user, updateUser } = useAuth();
  const hasConsent = !!user?.consent?.recommender;
  const [text, setText] = useState('');
  const [picked, setPicked] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);

  const toggle = (c) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const giveConsent = async () => {
    try {
      await authAPI.grantRecommenderConsent();
      updateUser({ consent: { ...(user?.consent || {}), recommender: true } });
      toast.success('Thank you. You can withdraw this any time under Privacy & data.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save your choice'));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const query = [text.trim(), ...picked].filter(Boolean).join('. ');
    if (!query) return toast.error('Please describe how you are feeling or pick a topic.');
    setLoading(true);
    try {
      const { data } = await recommendAPI.recommend({ text: query });
      setResult(data);
    } catch (err) {
      if (err.response?.data?.status === 'UNAVAILABLE') setResult(err.response.data);
      else if (err.response?.data?.code === 'CONSENT_REQUIRED') updateUser({ consent: { ...(user?.consent || {}), recommender: false } });
      else toast.error(errorMessage(err, 'Could not get suggestions'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-lav-50 border border-lav-100 p-6 sm:p-8 mb-10">
      <div className="soft-blob w-64 h-64 bg-lav-100 -right-16 -top-16" />
      <div className="relative">
        <div className="flex items-center gap-2 text-lav-700 font-bold text-sm mb-2"><Sparkles size={16} /> Personalised suggestions</div>
        <h2 className="text-2xl mb-1">What is on your mind?</h2>
        <p className="text-ink-2 text-sm mb-5 max-w-2xl">
          Describe it in a sentence or pick topics, and we suggest self-help resources from a reviewed library. It only retrieves
          existing resources: no diagnosis, no generated advice.
        </p>

        {!hasConsent ? (
          <div className="bg-white rounded-2xl border border-lav-100 p-5 max-w-2xl">
            <div className="flex gap-3 items-start mb-4">
              <ShieldCheck className="text-brand-600 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-ink-2 m-0">
                <strong className="text-ink">Before you use this:</strong> what you type is analysed to find resources and to check for
                signs of crisis. It is processed in memory and <strong>not stored</strong>. If it suggests you may be in danger, we show
                helplines instead of suggestions. You can withdraw consent any time under Privacy &amp; data.
              </p>
            </div>
            <label className="flex gap-3 items-start text-sm text-ink-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 w-4 h-4 accent-brand-600" />
              <span>I understand and agree to this use of what I type.</span>
            </label>
            <button disabled={!agree} onClick={giveConsent} className="btn btn-primary">Turn on suggestions</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="concern" className="sr-only">Describe how you feel</label>
            <textarea id="concern" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={2} className="input mb-4 !min-h-0" placeholder="e.g. I am stressed about exams and cannot sleep" />
            <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Topics">
              {TOPICS.map((c) => <button type="button" key={c} onClick={() => toggle(c)} aria-pressed={picked.includes(c)} className="chip">{c}</button>)}
            </div>
            <button disabled={loading} className="btn btn-primary">{loading ? 'Finding…' : 'Suggest resources'}</button>
          </form>
        )}

        {result?.status === 'EMERGENCY' && <EmergencyPanel />}

        {result?.status === 'CATEGORY_BROWSE' && (
          <div className="mt-6 bg-white rounded-2xl border border-lav-100 p-5">
            <div className="flex gap-3 items-start mb-3"><Info size={18} className="text-lav-700 shrink-0 mt-0.5" />
              <p className="text-sm text-ink-2 m-0">We could not find a confident match for that. Try rephrasing, or browse a topic:</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(result.categories || []).map((c) => <button key={c} onClick={() => onBrowseCategory?.(c)} className="chip">{CAT_LABEL[c] || c}</button>)}
            </div>
          </div>
        )}

        {result?.status === 'UNAVAILABLE' && (
          <div className="mt-6 bg-white rounded-2xl border border-lav-100 p-5 text-sm text-ink-2">
            Suggestions are temporarily unavailable. You can still browse the library below by topic. If you are in distress,
            please use <strong>Need help now?</strong> at the top of the page or call 14416 (Tele-MANAS, 24/7).
          </div>
        )}

        {result?.status === 'OK' && (
          <div className="mt-8">
            <div className="grid md:grid-cols-3 gap-4">
              {result.results.slice(0, 3).map((r) => (
                <article key={r.id} className="card !p-5 bg-white flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <span className="badge badge-lav">{CAT_LABEL[r.category] || r.category}</span>
                    <span className="text-xs text-ink-3">{r.duration_min} min · {r.type}</span>
                  </div>
                  <h3 className="text-base font-sans font-bold mb-1 flex items-start gap-1">{r.title}<ArrowUpRight size={14} className="mt-1 shrink-0 text-ink-3" /></h3>
                  <p className="text-xs text-ink-2 mb-3 flex-1">{r.description}</p>
                  <p className="text-[11px] text-ink-3 m-0 border-t border-line pt-2">
                    <strong>Why this?</strong>{' '}
                    {r.why?.matched_terms?.length
                      ? <>matched “{r.why.matched_terms.slice(0, 4).join('”, “')}”{r.why.matched_tags?.length ? ` · tags: ${r.why.matched_tags.slice(0, 3).join(', ')}` : ''}</>
                      : <>similar in meaning to what you described ({CAT_LABEL[r.category] || r.category})</>}
                  </p>
                </article>
              ))}
            </div>
            <p className="text-[11px] text-ink-3 mt-4 mb-0">These are general wellness suggestions, not a diagnosis or treatment.</p>
          </div>
        )}
      </div>
    </section>
  );
}
