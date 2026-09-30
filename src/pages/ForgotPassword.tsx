// vpn-payg-frontend/src/pages/ForgotPassword.tsx
import React, { useState } from 'react';
import { KeyRound, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, CheckCircle2, Check, X, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { isCommonWeakPassword } from '../utils/passwords';

interface ForgotPasswordProps {
  onNavigateToSignIn: () => void;
}

export function ForgotPassword({ onNavigateToSignIn }: ForgotPasswordProps) {
  const { requestPasswordResetEmail, confirmPasswordReset } = useAuth();

  const [activeTab, setActiveTab] = useState<'key' | 'email'>('key');

  // Tab 1: Reset via Recovery Key
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Tab 2: Request Key via Email
  const [email, setEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password Complexity Evaluation
  const getPasswordRequirements = (pwd: string) => ({
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_=+\\/]/.test(pwd),
    notCommon: !isCommonWeakPassword(pwd),
  });

  const passwordReqs = getPasswordRequirements(newPassword);
  const passwordScore = Object.values(passwordReqs).filter(Boolean).length;
  const isPasswordStrong = passwordScore === 6;
  const isPasswordMatching = confirmPassword.length > 0 && newPassword === confirmPassword;

  // Handle Reset via Recovery Key
  const handleKeyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanKey = recoveryKey.trim().toUpperCase();
    if (cleanKey.length !== 12) {
      setError('Recovery key must be exactly 12 characters long.');
      return;
    }
    if (!isPasswordStrong) {
      setError('New password must meet all complexity requirements.');
      return;
    }
    if (!isPasswordMatching) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const message = await confirmPasswordReset(cleanKey, newPassword, confirmPassword);
      setSuccessMsg(message || 'Password reset successfully! You can now sign in.');
      setRecoveryKey('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired recovery key.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Request Key via Email
  const handleEmailRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const message = await requestPasswordResetEmail(email.trim());
      setSuccessMsg(message);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex-1 flex flex-col justify-center items-center px-4 py-8 bg-[#09090b] text-zinc-100 relative overflow-hidden">
      
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.05),transparent_60%)] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[460px] space-y-7 z-10 my-auto"
      >
        {/* Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-1 shadow-inner">
            <KeyRound size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-50">Password Recovery</h1>
          <p className="text-sm text-zinc-400 font-light max-w-xs mx-auto">
            Reset your password using a recovery key or request one via email
          </p>
        </div>

        {/* Card Wrapper */}
        <div className="bg-[#121214] border border-zinc-800/80 rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-md space-y-6">
          
          {/* Method Selector Tabs */}
          <div className="flex bg-[#09090b] border border-zinc-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => { setActiveTab('key'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'key' ? 'bg-zinc-900 text-emerald-400 border border-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Use Recovery Key
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('email'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'email' ? 'bg-zinc-900 text-emerald-400 border border-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Send Key via Email
            </button>
          </div>

          {/* Feedback Messages */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3.5 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs font-medium leading-relaxed">
              {error}
            </motion.div>
          )}

          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium flex items-start space-x-2 leading-relaxed">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* Option 1: Recovery Key Reset Form */}
          {activeTab === 'key' && (
            <form onSubmit={handleKeyReset} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">12-Character Recovery Key</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <KeyRound size={18} />
                  </span>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="e.g. A9K3P2M8L1W7"
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value.toUpperCase())}
                    className="w-full pl-11 pr-4 py-3 bg-[#09090b] border border-zinc-800 rounded-xl text-sm font-mono text-emerald-400 uppercase tracking-widest outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">New Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      <Lock size={18} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters with numbers & symbols"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-11 pr-3 py-3 bg-[#09090b] border border-zinc-800 rounded-xl text-sm text-zinc-100 outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>

                  {/* Password Complexity Progress & Checklist */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between text-[10px] font-medium">
                        <span className="text-zinc-500">Complexity</span>
                        <span className={
                          passwordScore <= 2 ? 'text-rose-400' :
                          passwordScore < 6 ? 'text-amber-400' : 'text-emerald-400'
                        }>
                          {passwordScore <= 2 ? 'Weak' : passwordScore < 6 ? 'Fair' : 'Strong'}
                        </span>
                      </div>

                      <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden flex gap-1">
                        {[1, 2, 3, 4, 5, 6].map((step) => (
                          <div 
                            key={step} 
                            className={`h-full flex-1 rounded-full transition-all ${
                              step <= passwordScore 
                                ? passwordScore <= 2 ? 'bg-rose-500' : passwordScore < 6 ? 'bg-amber-400' : 'bg-emerald-400' 
                                : 'bg-zinc-850'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-500 pt-0.5">
                        <div className={`flex items-center gap-1 ${passwordReqs.minLength ? 'text-emerald-400' : ''}`}>
                          {passwordReqs.minLength ? <Check size={10} /> : <X size={10} />}
                          <span>Min 8 characters</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordReqs.hasUpper ? 'text-emerald-400' : ''}`}>
                          {passwordReqs.hasUpper ? <Check size={10} /> : <X size={10} />}
                          <span>Uppercase (A-Z)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordReqs.hasLower ? 'text-emerald-400' : ''}`}>
                          {passwordReqs.hasLower ? <Check size={10} /> : <X size={10} />}
                          <span>Lowercase (a-z)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordReqs.hasNumber ? 'text-emerald-400' : ''}`}>
                          {passwordReqs.hasNumber ? <Check size={10} /> : <X size={10} />}
                          <span>Number (0-9)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordReqs.hasSpecial ? 'text-emerald-400' : ''}`}>
                          {passwordReqs.hasSpecial ? <Check size={10} /> : <X size={10} />}
                          <span>Special symbol (!@#$)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordReqs.notCommon ? 'text-emerald-400' : ''}`}>
                          {passwordReqs.notCommon ? <Check size={10} /> : <X size={10} />}
                          <span>Not common</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">Confirm Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      <Lock size={18} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-8 py-3 bg-[#09090b] border border-zinc-800 rounded-xl text-sm text-zinc-100 outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                    {confirmPassword.length > 0 && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                        {isPasswordMatching ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : (
                          <XCircle size={16} className="text-rose-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {confirmPassword.length > 0 && (
                    <p className={`text-[10px] font-medium flex items-center gap-1 mt-0.5 ${
                      isPasswordMatching ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isPasswordMatching ? <Check size={10} /> : <X size={10} />}
                      <span>{isPasswordMatching ? 'Passwords match' : 'Passwords do not match'}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 font-medium flex items-center space-x-1 p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isPasswordStrong || !isPasswordMatching}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-extrabold rounded-xl text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-emerald-950/40 mt-2"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Option 2: Request Key via Email */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailRequest} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">Registered Email Address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-[#09090b] border border-zinc-800 rounded-xl text-sm text-zinc-100 outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-600/50 text-zinc-950 font-extrabold rounded-xl text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-amber-950/40 mt-2"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Recovery Key</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Back to Sign In Link */}
          <div className="mt-6 text-center border-t border-zinc-800/80 pt-5">
            <button 
              type="button"
              onClick={onNavigateToSignIn}
              className="text-xs text-zinc-400 hover:text-zinc-200 font-bold flex items-center justify-center space-x-1.5 mx-auto cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}