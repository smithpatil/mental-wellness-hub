import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, UserPlus, Calendar, TrendingUp, Search, Plus, Trash2, X, Flag, UserCheck, MessagesSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, errorMessage } from '../../lib/api';
import PageHeader, { EmptyState } from '../../components/common/PageHeader';
import { moodByKey } from '../../lib/moods';

const TABS = [
  { key: 'analytics', icon: TrendingUp, label: 'Analytics' },
  { key: 'users', icon: Users, label: 'Users' },
  { key: 'counselors', icon: UserPlus, label: 'Counsellors' },
  { key: 'appointments', icon: Calendar, label: 'Appointments' },
  { key: 'moderation', icon: Flag, label: 'Moderation' },
];
const STATUS_TONE = { scheduled: 'badge-brand', rescheduled: 'badge-peach', completed: 'badge-gray', cancelled: 'badge-rose' };

function Table({ head, children, empty }) {
  return (
    <div className="card !p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-line bg-canvas/60">{head.map((h) => <th key={h} className="text-left text-xs uppercase tracking-wider text-ink-3 font-bold px-5 py-3">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="text-center text-ink-3 py-10 m-0">{empty}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [reported, setReported] = useState([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState({ name: '', specialization: 'general', bio: '', experience: 0 });

  const load = useCallback(async () => {
    try {
      if (tab === 'analytics') setAnalytics((await adminAPI.getAnalytics()).data.data);
      if (tab === 'users') setUsers((await adminAPI.getUsers({ search })).data.data || []);
      if (tab === 'counselors') setCounselors((await adminAPI.getCounselors()).data.data || []);
      if (tab === 'appointments') setAppointments((await adminAPI.getAppointments()).data.data || []);
      if (tab === 'moderation') setReported((await adminAPI.getReportedPosts()).data.data || []);
    } catch (err) { toast.error(errorMessage(err, 'Could not load data')); }
  }, [tab, search]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => { try { await fn(); toast.success(ok); load(); } catch (err) { toast.error(errorMessage(err, 'Action failed')); } };

  const addCounselor = async (e) => {
    e.preventDefault();
    await run(() => adminAPI.addCounselor({ ...nc, experience: Number(nc.experience) || 0 }), 'Counsellor added');
    setAdding(false); setNc({ name: '', specialization: 'general', bio: '', experience: 0 });
  };

  const stats = analytics && [
    { label: 'Total users', value: analytics.totalUsers, icon: Users, tone: 'bg-lav-50 text-lav-700' },
    { label: 'Active users', value: analytics.activeUsers, icon: UserCheck, tone: 'bg-brand-50 text-brand-700' },
    { label: 'Counsellors', value: analytics.totalCounselors, icon: UserPlus, tone: 'bg-sky-soft text-sky-deep' },
    { label: 'Appointments', value: analytics.totalAppointments, icon: Calendar, tone: 'bg-peach-50 text-peach-700' },
  ];
  const moodData = (analytics?.moodDistribution || []).map((m) => ({ name: moodByKey(m._id)?.label || m._id, value: m.count, color: moodByKey(m._id)?.color || '#7b6fc9' }));

  return (
    <>
      <PageHeader eyebrow="Administration" title="Admin dashboard" subtitle="Manage users, counsellors, sessions and community moderation." />

      <div className="flex flex-wrap gap-2 mb-8" role="tablist">
        {TABS.map(({ key, icon: Icon, label }) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className="chip"  aria-pressed={tab === key}><Icon size={15} />{label}</button>
        ))}
      </div>

      {tab === 'analytics' && analytics && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="card !p-5"><div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tone}`}><Icon size={19} /></div><p className="font-display text-3xl m-0">{value}</p><p className="text-xs text-ink-3 m-0">{label}</p></div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <section className="card">
              <h2 className="text-lg mb-4">Mood distribution</h2>
              {moodData.length ? (
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart><Pie data={moodData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>{moodData.map((m) => <Cell key={m.name} fill={m.color} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              ) : <p className="text-ink-3 text-sm">No mood data yet.</p>}
              <div className="flex flex-wrap gap-3 mt-2">{moodData.map((m) => <span key={m.name} className="text-xs flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: m.color }} />{m.name} ({m.value})</span>)}</div>
            </section>
            <section className="card">
              <h2 className="text-lg mb-4">Quick stats</h2>
              {[['New users (30 days)', analytics.newUsers], ['Appointments this month', analytics.monthlyAppointments], ['Forum posts', analytics.totalForumPosts]].map(([l, v]) => (
                <div key={l} className="flex justify-between py-3 border-b border-line last:border-0 text-sm"><span className="text-ink-2">{l}</span><span className="font-bold">{v ?? 0}</span></div>
              ))}
            </section>
          </div>
        </>
      )}

      {tab === 'users' && (
        <>
          <div className="relative mb-4 max-w-sm"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" /><input className="input !pl-11" placeholder="Search users…" aria-label="Search users" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Table head={['Name', 'Email', 'Role', 'Status', 'Action']} empty={users.length === 0 && 'No users found'}>
            {users.map((u) => (
              <tr key={u._id}>
                <td className="px-5 py-3 font-semibold">{u.name}</td><td className="px-5 py-3 text-ink-2">{u.email}</td>
                <td className="px-5 py-3"><span className="badge badge-lav capitalize">{u.role}</span></td>
                <td className="px-5 py-3"><span className={`badge ${u.isActive ? 'badge-brand' : 'badge-rose'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                <td className="px-5 py-3"><button className="btn btn-outline btn-sm" onClick={() => run(() => adminAPI.toggleUserStatus(u._id), 'User status updated')}>{u.isActive ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
          </Table>
        </>
      )}

      {tab === 'counselors' && (
        <>
          <button onClick={() => setAdding(!adding)} className="btn btn-primary btn-sm mb-4">{adding ? <X size={15} /> : <Plus size={15} />} {adding ? 'Cancel' : 'Add counsellor'}</button>
          {adding && (
            <form onSubmit={addCounselor} className="card mb-6 grid sm:grid-cols-2 gap-4">
              <div><label className="label" htmlFor="cn">Name</label><input id="cn" className="input" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} required /></div>
              <div><label className="label" htmlFor="cs">Focus area</label><select id="cs" className="input capitalize" value={nc.specialization} onChange={(e) => setNc({ ...nc, specialization: e.target.value })}>{['anxiety', 'depression', 'stress', 'relationships', 'mindfulness', 'general'].map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="label" htmlFor="ce">Experience (years)</label><input id="ce" type="number" min="0" className="input" value={nc.experience} onChange={(e) => setNc({ ...nc, experience: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="label" htmlFor="cb">Bio</label><textarea id="cb" className="input" rows={2} value={nc.bio} onChange={(e) => setNc({ ...nc, bio: e.target.value })} /></div>
              <div><button className="btn btn-primary btn-sm">Save counsellor</button></div>
            </form>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            {counselors.map((c) => (
              <div key={c._id} className="card !p-4 flex items-center justify-between"><div><p className="font-semibold m-0">{c.name}</p><p className="text-xs text-ink-3 capitalize m-0">{c.specialization} · {c.experience || 0} yrs</p></div>
                <button aria-label={`Remove ${c.name}`} onClick={() => window.confirm(`Remove ${c.name}?`) && run(() => adminAPI.deleteCounselor(c._id), 'Counsellor removed')} className="text-ink-3 hover:text-rose-500 bg-transparent border-0 p-2"><Trash2 size={17} /></button></div>
            ))}
            {counselors.length === 0 && <EmptyState icon={UserPlus} title="No counsellors yet">Add your first counsellor above.</EmptyState>}
          </div>
        </>
      )}

      {tab === 'appointments' && (
        <Table head={['Student', 'Counsellor', 'Date & time', 'Status']} empty={appointments.length === 0 && 'No appointments yet'}>
          {appointments.map((a) => (
            <tr key={a._id}><td className="px-5 py-3 font-semibold">{a.userId?.name}</td><td className="px-5 py-3 text-ink-2">{a.counselorId?.name}</td><td className="px-5 py-3 text-ink-2">{new Date(a.dateTime).toLocaleString()}</td><td className="px-5 py-3"><span className={`badge ${STATUS_TONE[a.status] || 'badge-gray'}`}>{a.status}</span></td></tr>
          ))}
        </Table>
      )}

      {tab === 'moderation' && (
        <div className="flex flex-col gap-3">
          {reported.length === 0 && <EmptyState icon={MessagesSquare} title="Nothing to review">No reported posts right now.</EmptyState>}
          {reported.map((p) => (
            <div key={p._id} className="card !p-5 flex items-start justify-between gap-4">
              <div><h3 className="text-base font-sans font-bold mb-1">{p.title}</h3><p className="text-sm text-ink-2 m-0 line-clamp-2">{p.body}</p><span className="badge badge-rose mt-2">{p.reportCount} reports</span></div>
              <button className="btn btn-danger btn-sm shrink-0" onClick={() => window.confirm('Delete this post?') && run(() => adminAPI.deletePost(p._id), 'Post deleted')}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
