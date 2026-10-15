import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI, errorMessage } from '../lib/api';
import AuthLayout from '../components/common/AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send reset email'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={sent ? 'Check your inbox for the next step.' : "Enter your email and we'll send you a reset link."}
      footer={<Link to="/login" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"><ArrowLeft size={14} /> Back to sign in</Link>}
    >
      {sent ? (
        <div className="card text-center">
          <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4"><MailCheck size={26} /></div>
          <p className="text-ink-2 text-sm m-0">If an account exists for <strong className="text-ink">{email}</strong>, a reset link is on its way.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="label" htmlFor="email">Email address</label>
            <input id="email" type="email" className="input" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full py-3.5">{loading ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </AuthLayout>
  );
}
