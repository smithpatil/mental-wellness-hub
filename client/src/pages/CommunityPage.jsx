import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Heart, Flag, UserRound, Send, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { forumAPI, errorMessage } from '../lib/api';
import PageHeader, { EmptyState, Spinner } from '../components/common/PageHeader';

const CATEGORIES = ['general', 'anxiety', 'depression', 'stress', 'relationships'];
const TONE = { general: 'badge-gray', anxiety: 'badge-peach', depression: 'badge-lav', stress: 'badge-brand', relationships: 'badge-rose' };

function Post({ post, onChange }) {
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState(null);
  const [reply, setReply] = useState('');
  const [likes, setLikes] = useState(post.likeCount || 0);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(post.replyCount || 0);

  const like = async () => {
    try { const { data } = await forumAPI.toggleLike(post._id); setLikes(data.likeCount); setLiked(data.isLiked); }
    catch (err) { toast.error(errorMessage(err, 'Could not like')); }
  };
  const report = async () => {
    if (!window.confirm('Report this post to the moderators?')) return;
    try { await forumAPI.report(post._id); toast.success('Thanks. A moderator will take a look.'); }
    catch (err) { toast.error(errorMessage(err, 'Could not report')); }
  };
  const toggle = async () => {
    const next = !open; setOpen(next);
    if (next && replies === null) {
      try { const { data } = await forumAPI.getPost(post._id); setReplies(data.data.replies || []); } catch { setReplies([]); }
    }
  };
  const send = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    try {
      await forumAPI.reply(post._id, { body: reply.trim() });
      setReply(''); setCount((c) => c + 1);
      const { data } = await forumAPI.getPost(post._id); setReplies(data.data.replies || []);
      onChange?.();
    } catch (err) { toast.error(errorMessage(err, 'Could not send reply')); }
  };

  return (
    <article className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-lav-50 text-lav-700 flex items-center justify-center"><UserRound size={18} /></div>
          <div>
            <p className="text-sm font-semibold m-0">Anonymous member</p>
            <time className="text-xs text-ink-3">{new Date(post.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</time>
          </div>
        </div>
        <span className={`badge capitalize ${TONE[post.category] || 'badge-gray'}`}>{post.category}</span>
      </div>
      <h3 className="text-xl mb-2">{post.title}</h3>
      <p className="text-ink-2 text-sm whitespace-pre-wrap mb-5">{post.body}</p>

      <div className="flex items-center gap-2 pt-4 border-t border-line">
        <button onClick={like} aria-pressed={liked} className={`btn btn-sm ${liked ? 'bg-rose-50 text-rose-700' : 'btn-outline'}`}><Heart size={15} className={liked ? 'fill-rose-500 text-rose-500' : ''} /> {likes}</button>
        <button onClick={toggle} className="btn btn-outline btn-sm"><MessageCircle size={15} /> {count}</button>
        <button onClick={report} className="ml-auto text-xs font-semibold text-ink-3 hover:text-rose-500 flex items-center gap-1 bg-transparent border-0"><Flag size={13} /> Report</button>
      </div>

      {open && (
        <div className="mt-5 flex flex-col gap-3">
          {replies === null && <Spinner label="Loading replies…" />}
          {replies?.map((r) => (
            <div key={r._id} className="bg-canvas rounded-xl p-3 text-sm">
              <p className="font-semibold text-xs text-ink-3 mb-1">Anonymous member</p>
              <p className="m-0 text-ink-2 whitespace-pre-wrap">{r.body}</p>
            </div>
          ))}
          <form onSubmit={send} className="flex gap-2">
            <input className="input" placeholder="Write a supportive reply…" aria-label="Reply" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={1000} />
            <button className="btn btn-primary btn-sm shrink-0" aria-label="Send reply"><Send size={15} /></button>
          </form>
        </div>
      )}
    </article>
  );
}

export default function CommunityPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ title: '', body: '', category: 'general' });
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try { const { data } = await forumAPI.getPosts(filter === 'all' ? {} : { category: filter }); setPosts(data.data || []); }
    catch { setPosts([]); } finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      await forumAPI.createPost({ ...form, isAnonymous: true });
      toast.success('Posted anonymously');
      setForm({ title: '', body: '', category: 'general' });
      load();
    } catch (err) { toast.error(errorMessage(err, 'Could not post')); }
    finally { setPosting(false); }
  };

  return (
    <>
      <PageHeader eyebrow="Shared experiences" title="Community" subtitle="You are not alone. Share and support each other anonymously. Please be kind; posts are moderated." />
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 flex flex-col gap-5 order-2 lg:order-1">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter posts">
            {['all', ...CATEGORIES].map((c) => <button key={c} onClick={() => setFilter(c)} aria-pressed={filter === c} className="chip capitalize">{c}</button>)}
          </div>
          {loading ? <Spinner /> : posts.map((p) => <Post key={p._id} post={p} />)}
          {!loading && posts.length === 0 && <EmptyState icon={Users} title="No posts yet">Be the first to share. Someone out there will relate.</EmptyState>}
        </div>

        <form onSubmit={create} className="card lg:sticky lg:top-4 flex flex-col gap-4 order-1 lg:order-2">
          <div>
            <h2 className="text-xl mb-1">Share your thoughts</h2>
            <p className="text-xs text-ink-3 m-0">Your name is never shown.</p>
          </div>
          <div>
            <label className="label" htmlFor="cat">Topic</label>
            <select id="cat" className="input capitalize" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ptitle">Title</label>
            <input id="ptitle" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} required />
          </div>
          <div>
            <label className="label" htmlFor="pbody">Your message</label>
            <textarea id="pbody" className="input" rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={5000} required />
          </div>
          <button disabled={posting} className="btn btn-primary">{posting ? 'Posting…' : 'Post anonymously'}</button>
        </form>
      </div>
    </>
  );
}
