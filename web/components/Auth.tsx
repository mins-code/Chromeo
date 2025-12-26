import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { ThemeOption } from '../types';
import { Mail, Lock } from 'lucide-react';

interface AuthProps {
  theme: ThemeOption;
}

const Auth: React.FC<AuthProps> = ({ theme }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ 
          type: 'success', 
          text: 'Check your email for the confirmation link!' 
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Welcome to ChronoDeX!' });
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'An error occurred' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-900 theme-${theme}`}>
      {/* Dynamic Background with better contrast */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-slate-100 to-purple-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"></div>

      {/* Main Auth Card */}
      <div className="relative w-full max-w-md z-10">
        <div className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header Section */}
          <div className="relative bg-gradient-to-br from-blue-600 to-purple-600 p-8 text-white">
            <div className="relative z-10 text-center">
              {/* Logo */}
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4 ring-4 ring-white/30 shadow-2xl">
                <span className="text-4xl">📋</span>
              </div>
              
              <h1 className="text-4xl font-black tracking-tight mb-2 drop-shadow-lg">
                ChronoDeX
              </h1>
              <p className="text-white/90 font-semibold text-sm uppercase tracking-widest">
                Task Management
              </p>
            </div>

            {/* Decorative Wave */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-8">
                <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" className="fill-white/20"></path>
                <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" className="fill-white/20"></path>
                <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" className="fill-white/30"></path>
              </svg>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8">
            {/* Toggle Buttons */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1.5 mb-8 border-2 border-slate-200 dark:border-slate-600 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setMessage(null);
                }}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
                  !isSignUp
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setMessage(null);
                }}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
                  isSignUp
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`mb-6 p-4 rounded-xl border-2 ${
                message.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300'
              }`}>
                <p className="text-sm font-semibold">{message.text}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-300 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-300 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black text-lg transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 group relative overflow-hidden"
              >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                )}
              </button>
            </form>

            {/* Footer Text */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setMessage(null);
                  }}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Decorative Elements Below Card */}
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium opacity-60">
            Organize. Track. Achieve.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;