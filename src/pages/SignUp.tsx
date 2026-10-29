// src/pages/SignUp.tsx
import React, { useState, useEffect } from 'react';
import { 
  Shield, Eye, EyeOff, Lock, Mail, User, ArrowRight, 
  AlertTriangle, Key, Copy, CheckCircle2, XCircle, RefreshCw, Check, X 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { authService, UserProfile } from '../services/authService';
import { isCommonWeakPassword } from '../utils/passwords';
import { cn } from '../components/ui/StatCard';

interface SignUpProps {
  onNavigateToSignIn: () => void;
}

export function SignUp({ onNavigateToSignIn }: SignUpProps) {
  const { signUp, setUserState } = useAuth();
  
  // Input States
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [billingCurrency, setBillingCurrency] = useState<'IRT' | 'USD'>('IRT');

  // Username Uniqueness & Loading States
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'valid' | 'invalid' | null>(null);
  const [usernameMsg, setUsernameMsg] = useState('');

  // Email Uniqueness & Loading States
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'valid' | 'invalid' | null>(null);
  const [emailMsg, setEmailMsg] = useState('');

  // General Form States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Recovery Keys Modal State
  const [signupUser, setSignupUser] = useState<UserProfile | null>(null);
  const [recoveryKeys, setRecoveryKeys] = useState<string[]>([]);
  const [keysCopied, setKeysCopied] = useState(false);
  const [hasConfirmedSave, setHasConfirmedSave] = useState(false);

  // ==========================================
  // 1. DEBOUNCED USERNAME CHECK
  // ==========================================
  useEffect(() => {
    const clean = username.trim();
    if (!clean) {
      setUsernameLoading(false);
      setUsernameStatus(null);
      setUsernameMsg('');
      return;
    }

    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]*[a-zA-Z0-9]?$/;
    if (clean.length < 3) {
      setUsernameLoading(false);
      setUsernameStatus('invalid');
      setUsernameMsg('Username must be at least 3 characters');
      return;
    }
    if (!usernameRegex.test(clean)) {
      setUsernameLoading(false);
      setUsernameStatus('invalid');
      setUsernameMsg('Must start with a letter and contain letters/numbers/underscores');
      return;
    }

    setUsernameStatus(null);
    setUsernameMsg('');

    const loadingTimer = setTimeout(() => {
      setUsernameLoading(true);
    }, 200);

    const apiTimer = setTimeout(async () => {
      try {
        const isAvailable = await authService.checkUsernameAvailability(clean);
        setUsernameLoading(false);
        if (isAvailable) {
          setUsernameStatus('valid');
          setUsernameMsg('Username is available');
        } else {
          setUsernameStatus('invalid');
          setUsernameMsg('Username is already taken');
        }
      } catch {
        setUsernameLoading(false);
        setUsernameStatus('invalid');
        setUsernameMsg('Could not verify username availability');
      }
    }, 1500);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(apiTimer);
    };
  }, [username]);

  // ==========================================
  // 2. DEBOUNCED EMAIL CHECK
  // ==========================================
  useEffect(() => {
    const clean = email.trim();
    if (!clean) {
      setEmailLoading(false);
      setEmailStatus(null);
      setEmailMsg('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      setEmailLoading(false);
      setEmailStatus('invalid');
      setEmailMsg('Invalid email format');
      return;
    }

    setEmailStatus(null);
    setEmailMsg('');

    const loadingTimer = setTimeout(() => {
      setEmailLoading(true);
    }, 200);

    const apiTimer = setTimeout(async () => {
      try {
        const isAvailable = await authService.checkEmailAvailability(clean);
        setEmailLoading(false);
        if (isAvailable) {
          setEmailStatus('valid');
          setEmailMsg('Email is available');
        } else {
          setEmailStatus('invalid');
          setEmailMsg('Email is already registered');
        }
      } catch {
        setEmailLoading(false);
        setEmailStatus('invalid');
        setEmailMsg('Could not verify email availability');
      }
    }, 1500);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(apiTimer);
    };
  }, [email]);

  // ==========================================
  // 3. PASSWORD SIMPLICITY / STRENGTH EVALUATION
  // ==========================================
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

  const passwordReqs = getPasswordRequirements(password);
  const passwordScore = Object.values(passwordReqs).filter(Boolean).length;
  const isPasswordStrong = passwordScore === 6;
  const isPasswordMatching = confirmPassword.length > 0 && password === confirmPassword;

  // ==========================================
  // FORM SUBMIT HANDLER
  // ==========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim();

    if (usernameStatus !== 'valid') {
      setError(usernameMsg || 'Please provide a valid, available username.');
      return;
    }
    if (emailStatus !== 'valid') {
      setError(emailMsg || 'Please provide a valid, available email.');
      return;
    }
    if (!isPasswordStrong) {
      setError('Please choose a stronger password that meets all complexity criteria.');
      return;
    }
    if (!isPasswordMatching) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp(cleanUsername, cleanEmail, password, confirmPassword, billingCurrency);
      setSignupUser(result.user);
      setRecoveryKeys(result.recovery_keys || []);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboardFallback = (text: string): boolean => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch {
      return false;
    }
  };

  const handleCopyAllKeys = async () => {
    const textToCopy = `PAYG MNG RECOVERY KEYS FOR @${signupUser?.username}\n=============================\n` + 
      recoveryKeys.map((k, i) => `${i + 1}. ${k}`).join('\n') + 
      `\n=============================\nKeep these keys safe. They are required for account recovery.`;

    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        copied = true;
      } catch {
        copied = copyToClipboardFallback(textToCopy);
      }
    } else {
      copied = copyToClipboardFallback(textToCopy);
    }

    if (copied) {
      setKeysCopied(true);
      setTimeout(() => setKeysCopied(false), 2500);
    }
  };

  const handleProceedToDashboard = () => {
    if (signupUser) {
      setUserState(signupUser);
    }
  };

  return (
    <div className="w-full min-h-screen flex-1 flex flex-col justify-center items-center px-4 py-8 bg-zinc-950 text-zinc-100 font-sans transition-colors duration-200">
      
      {/* RECOVERY KEYS SCREEN */}
      {signupUser && recoveryKeys.length > 0 ? (
        <motion.div 
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-lg rounded-2xl bg-zinc-900/40 border border-zinc-800/60 p-6 sm:p-7 space-y-5 my-auto"
        >
          <div className="text-center space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-850 border border-zinc-800 text-amber-400 flex items-center justify-center mx-auto mb-1">
              <Key size={20} />
            </div>
            <h2 className="text-lg font-bold text-zinc-100">Save Your 12 Recovery Keys</h2>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal max-w-sm mx-auto">
              These 12 keys are generated for your account. <strong className="text-zinc-200 font-semibold">They will not be shown again.</strong> If you lose your password, these keys are required to recover access.
            </p>
          </div>

          {/* 12 Keys Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-zinc-950 p-3.5 rounded-xl border border-zinc-850">
            {recoveryKeys.map((key, index) => (
              <div 
                key={index} 
                className="bg-zinc-900/60 border border-zinc-800/60 px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 min-w-0"
              >
                <span className="text-[10px] text-zinc-500 font-mono select-none">
                  {index + 1}.
                </span>
                <span className="font-mono text-xs font-semibold text-zinc-200 truncate select-all">
                  {key}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleCopyAllKeys}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-medium rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer active:scale-[0.99]"
            >
              {keysCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{keysCopied ? "Copied All Keys!" : "Copy All Recovery Keys"}</span>
            </button>

            <label className="flex items-start space-x-2.5 text-xs text-zinc-400 cursor-pointer select-none py-1">
              <input 
                type="checkbox"
                checked={hasConfirmedSave}
                onChange={(e) => setHasConfirmedSave(e.target.checked)}
                className="mt-0.5 rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="leading-snug">I have safely saved my 12 recovery keys in a secure location.</span>
            </label>

            <button
              type="button"
              onClick={handleProceedToDashboard}
              disabled={!hasConfirmedSave}
              className="w-full py-2.5 bg-zinc-100 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      ) : (

        /* SIGN-UP FORM CARD */
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-[440px] space-y-6 my-auto"
        >
          {/* Exact Preserved Brand Header */}
          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-emerald-400 mb-1 shadow-inner">
              <Shield size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-50">PAYG MNG</h1>
            <p className="text-sm text-zinc-400 font-normal max-w-xs mx-auto">
              Create an account to start routing your traffic securely
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/60 p-6 sm:p-7 space-y-5">
            
            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-100">Create New Account</h2>
              <p className="text-xs text-zinc-400 font-normal leading-relaxed">
                Ensure you use a valid email address as it is required for password recovery.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              
              {/* Error Alert */}
              {error && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* USERNAME INPUT */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-zinc-400 block">Username</label>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">
                    Permanent
                  </span>
                </div>
                
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <User size={15} />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors h-9 font-medium"
                    required
                  />

                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                    {usernameLoading && (
                      <RefreshCw size={13} className="animate-spin text-emerald-400" />
                    )}
                    {!usernameLoading && usernameStatus === 'valid' && (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    )}
                    {!usernameLoading && usernameStatus === 'invalid' && (
                      <XCircle size={14} className="text-rose-500" />
                    )}
                  </div>
                </div>

                {usernameMsg && (
                  <p className={`text-[10px] font-medium flex items-center gap-1 mt-0.5 ${
                    usernameStatus === 'valid' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {usernameStatus === 'valid' ? <Check size={10} /> : <X size={10} />}
                    <span>{usernameMsg}</span>
                  </p>
                )}
              </div>

              {/* EMAIL INPUT */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">Email Address</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors h-9 font-medium font-mono"
                    required
                  />

                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                    {emailLoading && (
                      <RefreshCw size={13} className="animate-spin text-emerald-400" />
                    )}
                    {!emailLoading && emailStatus === 'valid' && (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    )}
                    {!emailLoading && emailStatus === 'invalid' && (
                      <XCircle size={14} className="text-rose-500" />
                    )}
                  </div>
                </div>

                {emailMsg && (
                  <p className={`text-[10px] font-medium flex items-center gap-1 mt-0.5 ${
                    emailStatus === 'valid' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {emailStatus === 'valid' ? <Check size={10} /> : <X size={10} />}
                    <span>{emailMsg}</span>
                  </p>
                )}
              </div>

              {/* PASSWORD INPUT & PROGRESS */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-400 block">Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock size={15} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters with numbers & symbols"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors h-9 font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {/* Password Complexity Checklist */}
                {password.length > 0 && (
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

              {/* CONFIRM PASSWORD */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock size={15} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors h-9 font-medium"
                    required
                  />

                  {confirmPassword.length > 0 && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                      {isPasswordMatching ? (
                        <CheckCircle2 size={13} className="text-emerald-400" />
                      ) : (
                        <XCircle size={13} className="text-rose-500" />
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

              {/* OPTION B: EXPLICIT REGISTRATION BILLING ZONE & CURRENCY SELECTOR */}
              <div className="space-y-2 pt-1 border-t border-zinc-850/60">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-200 block uppercase tracking-wider">
                    Billing Zone & Currency
                  </label>
                  <span className="text-[9px] font-mono text-amber-400">Locked after signup</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingCurrency('IRT')}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1",
                      billingCurrency === 'IRT'
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-xs"
                        : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">🇮🇷</span>
                      <span className="text-[10px] font-mono font-bold uppercase">IRT</span>
                    </div>
                    <span className="font-bold text-xs text-zinc-100">Iran Zone (Toman)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingCurrency('USD')}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1",
                      billingCurrency === 'USD'
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-xs"
                        : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">🌍 & 🇷🇺</span>
                      <span className="text-[10px] font-mono font-bold uppercase">USD</span>
                    </div>
                    <span className="font-bold text-xs text-zinc-100">Global Zone & Russia ($)</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  isLoading || 
                  usernameStatus !== 'valid' || 
                  emailStatus !== 'valid' || 
                  !isPasswordStrong || 
                  !isPasswordMatching
                }
                className="w-full py-2.5 bg-zinc-100 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center space-x-1.5 mt-2 cursor-pointer shadow-xs active:scale-[0.99]"
              >
                {isLoading ? (
                  <span className="flex items-center space-x-1.5">
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Creating Account...</span>
                  </span>
                ) : (
                  <>
                    <span>Register Account</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            {/* Navigation to Sign In */}
            <div className="text-center border-t border-zinc-800/40 pt-4">
              <p className="text-xs text-zinc-400 font-normal">
                Already have an account?{' '}
                <button 
                  type="button"
                  onClick={onNavigateToSignIn}
                  className="text-zinc-200 hover:text-white font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            </div>

          </div>
        </motion.div>
      )}

    </div>
  );
}

export default SignUp;