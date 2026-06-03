import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authAPI } from '../../api/index.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-brand px-8 py-6 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Flame size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Reset Password</h1>
          </div>

          <div className="px-8 py-8">
            {sent ? (
              <div className="text-center">
                <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">Check your email</h3>
                <p className="text-gray-500 text-sm mt-2">If that email is registered, a password reset link has been sent.</p>
                <Link to="/login" className="btn-primary mt-6 justify-center">
                  <ArrowLeft size={16} />
                  Back to Login
                </Link>
              </div>
            ) : (
              <>
                <p className="text-gray-600 text-sm mb-6">Enter your email address and we'll send you a link to reset your password.</p>
                {error && <div className="mb-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input-field"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                    {loading ? 'Sending...' : <><Mail size={16} />Send Reset Link</>}
                  </button>
                </form>
                <Link to="/login" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mt-4 justify-center">
                  <ArrowLeft size={14} />Back to login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
