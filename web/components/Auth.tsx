
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import Button from './Button';
import Input from './Input';
import { APP_NAME } from '../constants';
import { Lock, Mail, Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';

const Auth: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccessMessage('Password reset instructions sent. Please check your email.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMessage('Registration successful! Please check your email to confirm your account, then sign in.');
        setIsSignUp(false);
        setPassword('');
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

  const handleModeSwitch = () => {
    setError('');
    setSuccessMessage('');
    if (isResettingPassword) {
      setIsResettingPassword(false);
    } else {
      setIsSignUp(!isSignUp);
    }
  };

  // Determine key UI text based on mode
  let title = APP_NAME;
  let subtitle = "Your AI-powered productivity suite.";
  let buttonText = isSignUp ? 'Create Account' : 'Sign In';

  if (isResettingPassword) {
    title = "Reset Password";
    subtitle = "Enter your email to receive reset instructions.";
    buttonText = "Send Reset Link";
  } else if (isSignUp) {
    title = "Create Account";
    subtitle = "Join us to boost your productivity.";
  } else {
    title = "Welcome Back";
  }

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
          <h1 className="text-3xl font-bold text-slate-800 font-display mb-2">{title}</h1>
          <p className="text-slate-500">{subtitle}</p>
        </div>

        <form onSubmit={isResettingPassword ? handlePasswordReset : handleAuth} className="space-y-6">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            className="bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
          />
          
          {!isResettingPassword && (
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[35px] text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          )}

          {!isSignUp && !isResettingPassword && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsResettingPassword(true);
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-sm text-brand-500 hover:text-brand-600 font-medium"
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-600 text-sm">
              {successMessage}
            </div>
          )}

          <Button
            variant="primary"
            className="w-full h-12 text-lg shadow-brand-500/30 shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : buttonText}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            {isResettingPassword ? (
              <button
                onClick={handleModeSwitch}
                className="text-slate-600 hover:text-slate-800 font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                ← Back to Sign In
              </button>
            ) : (
              <>
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  onClick={handleModeSwitch}
                  className="text-brand-500 hover:text-brand-600 font-semibold transition-colors"
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </>
            )}
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
