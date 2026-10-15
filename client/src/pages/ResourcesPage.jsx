import { useState, useEffect } from 'react';
import { PlayCircle, FileText, GraduationCap, Search, Clock, ArrowUpRight } from 'lucide-react';
import { resourceAPI } from '../lib/api';
import PageHeader, { EmptyState, Spinner } from '../components/common/PageHeader';
import RecommendationPanel from '../components/resources/RecommendationPanel';

const CATS = ['all', 'exam_stress', 'sleep', 'anxiety', 'low_mood', 'loneliness', 'time_management', 'relaxation', 'focus'];
const CAT_LABEL = {
  all: 'All', exam_stress: 'Exam stress', sleep: 'Sleep', anxiety: 'Anxiety', low_mood: 'Low mood', loneliness: 'Loneliness',
  time_management: 'Time management', relaxation: 'Relaxation', focus: 'Focus',
};
const TYPE_ICON = { video: PlayCircle, course: GraduationCap, exercise: GraduationCap, article: FileText, guide: FileText, reading: FileText };
const TONE = { exam_stress: 'badge-brand', sleep: 'badge-lav', anxiety: 'badge-peach', low_mood: 'badge-lav', loneliness: 'badge-rose', time_management: 'badge-brand', relaxation: 'badge-brand', focus: 'badge-peach' };

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const params = {};
        if (search.trim()) params.search = search.trim();
        if (category !== 'all') params.category = category;
        const { data } = await resourceAPI.getAll(params);
        setResources(data.data || []);
      } catch { setResources([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search, category]);

  return (
    <>
      <PageHeader eyebrow="Knowledge base" title="Resource library" subtitle="Trusted articles, videos and courses. Learn at your own pace." />
      <RecommendationPanel onBrowseCategory={(c) => { setCategory(c); window.scrollTo({ top: 0 }); }} />

      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between mb-6">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          {CATS.map((c) => <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c} className="chip">{CAT_LABEL[c] || c}</button>)}
        </div>
        <div className="relative md:w-72">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <input className="input !pl-11 !rounded-full" placeholder="Search resources…" aria-label="Search resources" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {resources.map((r) => {
            const Icon = TYPE_ICON[r.type] || FileText;
            const Wrapper = r.externalUrl ? 'a' : 'div';
            return (
              <Wrapper key={r._id} {...(r.externalUrl ? { href: r.externalUrl, target: '_blank', rel: 'noopener noreferrer' } : {})} className="card card-hover flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center"><Icon size={22} /></div>
                  <span className={`badge ${TONE[r.category] || 'badge-gray'}`}>{CAT_LABEL[r.category] || r.category}</span>
                </div>
                <h3 className="text-lg font-sans font-bold mb-2 flex items-start gap-1">{r.title}{r.externalUrl && <ArrowUpRight size={15} className="mt-1 shrink-0 text-ink-3" />}</h3>
                <p className="text-sm text-ink-2 flex-1 mb-4">{r.description}</p>
                <div className="flex items-center gap-3 text-xs text-ink-3">
                  <span className="capitalize">{r.type}</span>{r.readTime && <span className="flex items-center gap-1"><Clock size={12} />{r.readTime} min</span>}
                </div>
              </Wrapper>
            );
          })}
          {resources.length === 0 && <EmptyState icon={Search} title="No resources found">Try a different search term or category.</EmptyState>}
        </div>
      )}
    </>
  );
}
