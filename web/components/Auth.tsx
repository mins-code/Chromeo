
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import Button from './Button';
import Input from './Input';
import { APP_NAME } from '../constants';
import { Lock, Mail, Loader2, Sparkles } from 'lucide-react';

const Auth: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Check your email for the login link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/15 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl shadow-slate-200/50 relative z-10 mx-4 border border-slate-200">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/logo-light.jpg" alt={APP_NAME} className="h-16 w-auto rounded-2xl shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 font-display mb-2">{APP_NAME}</h1>
          <p className="text-slate-500">Your AI-powered productivity suite.</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            className="bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
          />

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <Button
            variant="primary"
            className="w-full h-12 text-lg shadow-brand-500/30 shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Create Account' : 'Sign In')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-brand-500 hover:text-brand-600 font-semibold transition-colors"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Sparkles size={12} /> Powered by Gemini AI & Supabase
        </div>
      </div>
    </div>
  );
};

export default Auth;
