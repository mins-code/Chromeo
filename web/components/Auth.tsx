
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import Button from './Button';
import Input from './Input';
import { APP_NAME } from '../constants';
import { Lock, Mail, Loader2, Sparkles, LayoutGrid } from 'lucide-react';

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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md p-8 glass rounded-2xl shadow-2xl relative z-10 mx-4 border border-white/10">
        <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
                <div className="p-3 bg-brand-500/20 rounded-xl text-brand-500 border border-brand-500/20">
                    <LayoutGrid size={32} />
                </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent font-display mb-2">{APP_NAME}</h1>
            <p className="text-slate-400">Your AI-powered productivity suite.</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            className="bg-black/20 border-white/10 text-white"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="bg-black/20 border-white/10 text-white"
          />

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button 
            variant="primary" 
            className="w-full h-12 text-lg shadow-brand-500/20 shadow-lg" 
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Create Account' : 'Sign In')}
          </Button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-brand-500 hover:text-brand-400 font-semibold transition-colors"
                >
                    {isSignUp ? "Sign In" : "Sign Up"}
                </button>
            </p>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Sparkles size={12} /> Powered by Gemini AI & Supabase
        </div>
      </div>
    </div>
  );
};

export default Auth;
