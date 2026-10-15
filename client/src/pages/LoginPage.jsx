import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage } from '../lib/api';
import AuthLayout from '../components/common/AuthLayout';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(errorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your wellness journey."
      footer={<>New here? <Link to="/signup" className="font-semibold text-brand-700 hover:underline">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="label" htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" className="input" placeholder="you@university.edu" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <div className="flex justify-between items-center">
            <label className="label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="text-xs font-semibold text-brand-700 hover:underline mb-1.5">Forgot password?</Link>
          </div>
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className="input pr-12" placeholder="Your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink bg-transparent border-0 p-1">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary w-full py-3.5">{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthLayout>
  );
}
