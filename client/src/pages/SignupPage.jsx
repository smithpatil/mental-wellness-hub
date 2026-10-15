import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage } from '../lib/api';
import AuthLayout from '../components/common/AuthLayout';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', institution: '' });
  const [show, setShow] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const okLen = form.password.length >= 6;
  const okNum = /\d/.test(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!okLen) return toast.error('Password must be at least 6 characters');
    if (!okNum) return toast.error('Password must contain a number');
    if (!consent) return toast.error('Please accept the terms and privacy notice to continue');
    setLoading(true);
    try {
      await signup({ ...form, consent: true });
      toast.success('Account created. Welcome aboard!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(errorMessage(err, 'Signup failed'));
    } finally {
      setLoading(false);
    }
  };

  const Rule = ({ ok, children }) => (
    <span className={`inline-flex items-center gap-1.5 text-xs ${ok ? 'text-brand-700' : 'text-ink-3'}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${ok ? 'bg-brand-600 text-white' : 'bg-line'}`}><Check size={10} /></span>{children}
    </span>
  );

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free, private and takes less than a minute."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" autoComplete="name" className="input" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" className="input" placeholder="you@university.edu" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} autoComplete="new-password" className="input pr-12" placeholder="Create a password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink bg-transparent border-0 p-1">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="flex gap-4 mt-2"><Rule ok={okLen}>6+ characters</Rule><Rule ok={okNum}>Contains a number</Rule></div>
        </div>
        <div>
          <label className="label" htmlFor="institution">Institution <span className="font-normal text-ink-3">(optional)</span></label>
          <input id="institution" className="input" placeholder="Your school or college" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
        </div>
        <label className="flex gap-3 items-start text-sm text-ink-2 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-4 h-4 accent-brand-600" required />
          <span>
            I agree to the terms and understand how my data is used: journals and counselling notes are encrypted, free-text
            suggestions are processed but not stored, and I can export or delete my data at any time. This service is for
            awareness and general wellness and is not a substitute for professional care.
          </span>
        </label>
        <button type="submit" disabled={loading || !consent} className="btn btn-primary w-full py-3.5">{loading ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthLayout>
  );
}
