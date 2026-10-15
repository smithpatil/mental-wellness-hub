import { useState } from 'react';
import { Download, Trash2, ShieldCheck, Lock, Clock, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI, errorMessage, clearSession } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/common/PageHeader';

export default function PrivacyPage() {
  const { user, updateUser } = useAuth();
  const [busy, setBusy] = useState('');
  const hasConsent = !!user?.consent?.recommender;

  const download = async () => {
    setBusy('export');
    try {
      const { data } = await authAPI.exportData();
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'my-wellness-hub-data.json';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) { toast.error(errorMessage(err, 'Export failed')); } finally { setBusy(''); }
  };

  const toggleConsent = async () => {
    setBusy('consent');
    try {
      if (hasConsent) await authAPI.withdrawRecommenderConsent(); else await authAPI.grantRecommenderConsent();
      updateUser({ consent: { ...(user?.consent || {}), recommender: !hasConsent } });
      toast.success(hasConsent ? 'Consent withdrawn' : 'Consent saved');
    } catch (err) { toast.error(errorMessage(err, 'Could not update consent')); } finally { setBusy(''); }
  };

  const erase = async () => {
    if (!window.confirm('Delete your account and all your data permanently? This cannot be undone.')) return;
    setBusy('delete');
    try {
      await authAPI.deleteAccount();
      clearSession();
      toast.success('Your account and data have been deleted.');
      window.location.assign('/');
    } catch (err) { toast.error(errorMessage(err, 'Could not delete account')); setBusy(''); }
  };

  return (
    <>
      <PageHeader eyebrow="You are in control" title="Privacy & data" subtitle="How your information is handled, and what you can do with it." />

      <div className="grid md:grid-cols-2 gap-5 mb-8">
        <div className="card flex gap-4"><Lock className="text-brand-600 shrink-0" /><div><h2 className="text-base font-sans font-bold mb-1">Encrypted journals</h2><p className="text-sm text-ink-2 m-0">Journal entries and counselling notes are encrypted before they are stored (AES-256-GCM).</p></div></div>
        <div className="card flex gap-4"><EyeOff className="text-brand-600 shrink-0" /><div><h2 className="text-base font-sans font-bold mb-1">Suggestions are not stored</h2><p className="text-sm text-ink-2 m-0">What you type into the suggestion box is processed in memory and is not saved. Crisis events are logged without the text.</p></div></div>
        <div className="card flex gap-4"><Clock className="text-brand-600 shrink-0" /><div><h2 className="text-base font-sans font-bold mb-1">Journals expire</h2><p className="text-sm text-ink-2 m-0">Journal text is removed automatically after 180 days. Your mood scores stay so charts remain accurate.</p></div></div>
        <div className="card flex gap-4"><ShieldCheck className="text-brand-600 shrink-0" /><div><h2 className="text-base font-sans font-bold mb-1">Access is logged</h2><p className="text-sm text-ink-2 m-0">Administrator and counsellor access to records is written to an audit log.</p></div></div>
      </div>

      <section className="card mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><h2 className="text-lg font-sans font-bold mb-1">Personalised suggestions</h2>
            <p className="text-sm text-ink-2 m-0">{hasConsent ? 'You have given consent. Your text is analysed to suggest resources and to check for crisis language.' : 'Off. Turn on to get resource suggestions from a description of how you feel.'}</p></div>
          <button disabled={busy === 'consent'} onClick={toggleConsent} className={`btn ${hasConsent ? 'btn-outline' : 'btn-primary'} shrink-0`}>{hasConsent ? 'Withdraw consent' : 'Give consent'}</button>
        </div>
      </section>

      <section className="card mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><h2 className="text-lg font-sans font-bold mb-1">Download your data</h2><p className="text-sm text-ink-2 m-0">A JSON file with your profile, mood journal, gratitude notes and counselling requests.</p></div>
          <button disabled={busy === 'export'} onClick={download} className="btn btn-soft shrink-0"><Download size={16} /> Export</button>
        </div>
      </section>

      <section className="card border-rose-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><h2 className="text-lg font-sans font-bold mb-1 text-rose-700">Delete my account</h2><p className="text-sm text-ink-2 m-0">Permanently removes your account, journal, notes, appointments and forum posts.</p></div>
          <button disabled={busy === 'delete'} onClick={erase} className="btn btn-danger shrink-0"><Trash2 size={16} /> Delete</button>
        </div>
      </section>
    </>
  );
}
