// src/pages/SignIn.tsx
import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, User, ArrowRight, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';

interface SignInProps {
  onNavigateToSignUp: () => void;
  onNavigateToForgot: () => void;
}

export function SignIn({ onNavigateToSignUp, onNavigateToForgot }: SignInProps) {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your email address or username.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(identifier.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid email/username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex-1 flex flex-col justify-center items-center px-4 py-8 bg-zinc-950 text-zinc-100 font-sans transition-colors duration-200">
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[420px] space-y-6 my-auto"
      >
        
        {/* Exact Preserved Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-emerald-400 mb-1 shadow-inner">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-50">PAYG VPN</h1>
          <p className="text-sm text-zinc-400 font-normal max-w-xs mx-auto">
            Pay-As-You-Go Proxy Routing & Management Portal
          </p>
        </div>

        {/* Sign In Form Card */}
        <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/60 p-6 sm:p-7 space-y-5">
          
          <div>
            <h2 className="text-base font-bold text-zinc-100">Sign In to Your Account</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            
            {/* Error Alert */}
            {error && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Email or Username Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-400 block">Email or Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <User size={15} />
                </span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter email or username"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors h-9 font-medium"
                  required
                />
              </div>
            </div>

            {/* Password Input & Forgot Password Link */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-medium text-zinc-400 block">Password</label>
                <button
                  type="button"
                  onClick={onNavigateToForgot}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Lock size={15} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors h-9 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-zinc-100 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center space-x-1.5 mt-2 cursor-pointer shadow-xs active:scale-[0.99]"
            >
              {isLoading ? (
                <span className="flex items-center space-x-1.5">
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Signing In...</span>
                </span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Navigation to Registration */}
          <div className="text-center border-t border-zinc-800/40 pt-4">
            <p className="text-xs text-zinc-400 font-normal">
              Don't have an account?{' '}
              <button 
                type="button"
                onClick={onNavigateToSignUp}
                className="text-zinc-200 hover:text-white font-semibold underline underline-offset-4 cursor-pointer"
              >
                Create Account
              </button>
            </p>
          </div>

        </div>

      </motion.div>
    </div>
  );
}

export default SignIn;