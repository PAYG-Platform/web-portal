// src/components/common/ForcedPasswordChangeModal.tsx
import React, { useState } from 'react';
import { ShieldAlert, Key, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, Copy, Check, X, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { isCommonWeakPassword } from '../../utils/passwords';

export function ForcedPasswordChangeModal() {
  const { user, setUserState } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password Complexity Evaluation
  const getPasswordRequirements = (pwd: string) => {
    return {
      minLength: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_=+\\/]/.test(pwd),
      notCommon: !isCommonWeakPassword(pwd),
    };
  };

  const passwordReqs = getPasswordRequirements(newPassword);
  const passwordScore = Object.values(passwordReqs).filter(Boolean).length;
  const isPasswordStrong = passwordScore === 6;
  const isPasswordMatching = confirmPassword.length > 0 && newPassword === confirmPassword;

  // Step 2: Recovery Keys
  const [recoveryKeys, setRecoveryKeys] = useState<string[]>([]);
  const [keysCopied, setKeysCopied] = useState(false);
  const [hasConfirmedSave, setHasConfirmedSave] = useState(false);

  if (!user || !user.must_change_password) {
    return null;
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<any>('/api/iam/users/me/force-change-password', {
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setRecoveryKeys(res.recovery_keys || []);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKeys = () => {
    const textToCopy = `PAYG MNG RECOVERY KEYS FOR @${user.username}\n` +
      recoveryKeys.map((k, i) => `${i + 1}. ${k}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setKeysCopied(true);
    setTimeout(() => setKeysCopied(false), 2500);
  };

  const handleFinish = () => {
    if (user) {
      setUserState({
        ...user,
        must_change_password: false
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#121214] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {recoveryKeys.length === 0 ? (
          /* STEP 1: CHANGE PASSWORD FORM */
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <ShieldAlert size={28} />
              </div>
              <h2 className="text-2xl font-black text-zinc-50">Password Change Required</h2>
              <p className="text-xs sm:text-sm text-zinc-400 font-light leading-relaxed max-w-sm mx-auto">
                Your account was created by a reseller. For security, please set a new personal password to continue.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* New Password Input & Meter */}
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
                    className="w-full pl-11 pr-11 py-3 bg-[#09090b] border border-zinc-800 rounded-xl text-sm text-zinc-100 outline-none focus:border-emerald-500 transition-colors font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Complexity Progress & Checklist */}
                {newPassword.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-zinc-400">Password Complexity:</span>
                      <span className={
                        passwordScore <= 2 ? 'text-rose-400' :
                        passwordScore < 6 ? 'text-amber-400' : 'text-emerald-400'
                      }>
                        {passwordScore <= 2 ? 'Weak' : passwordScore < 6 ? 'Fair' : 'Strong'}
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4, 5, 6].map((step) => (
                        <div 
                          key={step} 
                          className={`h-full flex-1 rounded-full transition-all duration-300 ${
                            step <= passwordScore 
                              ? passwordScore <= 2 ? 'bg-rose-500' : passwordScore < 6 ? 'bg-amber-400' : 'bg-emerald-400' 
                              : 'bg-zinc-800'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] text-zinc-400 pt-1">
                      <div className={`flex items-center gap-1 ${passwordReqs.minLength ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {passwordReqs.minLength ? <Check size={10} /> : <X size={10} />}
                        <span>Min. 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordReqs.hasUpper ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {passwordReqs.hasUpper ? <Check size={10} /> : <X size={10} />}
                        <span>Uppercase (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordReqs.hasLower ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {passwordReqs.hasLower ? <Check size={10} /> : <X size={10} />}
                        <span>Lowercase (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordReqs.hasNumber ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {passwordReqs.hasNumber ? <Check size={10} /> : <X size={10} />}
                        <span>Number (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordReqs.hasSpecial ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {passwordReqs.hasSpecial ? <Check size={10} /> : <X size={10} />}
                        <span>Special char (!@#$)</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordReqs.notCommon ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {passwordReqs.notCommon ? <Check size={10} /> : <X size={10} />}
                        <span>Not weak</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Input & Matching Indicator */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-[#09090b] border border-zinc-800 rounded-xl text-sm text-zinc-100 outline-none focus:border-emerald-500 transition-colors font-medium"
                    required
                  />

                  {confirmPassword.length > 0 && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                      {isPasswordMatching ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <XCircle size={18} className="text-rose-500" />
                      )}
                    </div>
                  )}
                </div>

                {confirmPassword.length > 0 && (
                  <p className={`text-xs font-medium flex items-center gap-1 mt-1 ${
                    isPasswordMatching ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isPasswordMatching ? <Check size={12} /> : <X size={12} />}
                    <span>{isPasswordMatching ? 'Passwords match' : 'Passwords do not match'}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordStrong || !isPasswordMatching}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600/30 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 font-extrabold rounded-xl text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: RECOVERY KEYS DISPLAY MODAL (EXACT SAME MATCH TO REGISTRATION) */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Key size={28} />
              </div>
              <h2 className="text-2xl font-extrabold text-zinc-50">Save Your 12 Recovery Keys</h2>
              <p className="text-xs sm:text-sm text-zinc-400 font-light leading-relaxed max-w-md mx-auto">
                These 12 unique recovery keys are generated for your account. <strong className="text-zinc-200">They will never be shown again.</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#09090b] p-4 rounded-2xl border border-zinc-800">
              {recoveryKeys.map((key, index) => (
                <div key={index} className="bg-[#121214] border border-zinc-800/80 px-2.5 py-2 rounded-xl flex items-center justify-center space-x-1.5">
                  <span className="text-[10px] text-zinc-500 font-mono select-none">{index + 1}.</span>
                  <span className="font-mono text-xs font-bold text-emerald-400 truncate select-all">{key}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={handleCopyKeys}
                className="w-full py-3 bg-[#09090b] hover:bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                {keysCopied ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
                <span>{keysCopied ? "Copied All Keys!" : "Copy All Recovery Keys"}</span>
              </button>

              <label className="flex items-start space-x-3 text-xs text-zinc-400 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={hasConfirmedSave}
                  onChange={(e) => setHasConfirmedSave(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-800 bg-[#09090b] text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>I have safely saved my 12 recovery keys in a secure location.</span>
              </label>

              <button
                type="button"
                onClick={handleFinish}
                disabled={!hasConfirmedSave}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-extrabold rounded-xl text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}