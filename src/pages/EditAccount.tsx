// src/pages/EditAccount.tsx
import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Lock, Shield, CheckCircle2, XCircle, RefreshCw, 
  Check, X, Save, UserCog, Eye, EyeOff 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { isCommonWeakPassword } from '../utils/passwords';
import { cn } from '../components/ui/StatCard';

export function EditAccount() {
  const { user, setUserState } = useAuth();

  // Profile Form States
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  // Email Availability & Loading States
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'valid' | 'invalid' | null>('valid');
  const [emailMsg, setEmailMsg] = useState('');

  // Profile Action Feedback
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password Form States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Password Action Feedback
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Sync state if user changes in context
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // ==========================================
  // REAL-TIME EMAIL AVAILABILITY CHECK
  // ==========================================
  useEffect(() => {
    const clean = email.trim().toLowerCase();
    
    if (!clean) {
      setEmailLoading(false);
      setEmailStatus(null);
      setEmailMsg('');
      return;
    }

    // OWN EMAIL CHECK: If email matches user's current registered email, show valid immediately
    if (user && clean === user.email.toLowerCase()) {
      setEmailLoading(false);
      setEmailStatus('valid');
      setEmailMsg('This is your current registered email');
      return;
    }

    // Format regex check
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
          setEmailMsg('Email is already registered by another account');
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
  }, [email, user?.email]);

  // ==========================================
  // PASSWORD COMPLEXITY & MATCHING EVALUATION
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

  const passwordReqs = getPasswordRequirements(newPassword);
  const passwordScore = Object.values(passwordReqs).filter(Boolean).length;
  const isPasswordStrong = passwordScore === 6;
  const isPasswordMatching = confirmPassword.length > 0 && newPassword === confirmPassword;

  // ==========================================
  // PROFILE UPDATE SUBMIT HANDLER
  // ==========================================
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (emailStatus === 'invalid') {
      setProfileError(emailMsg || 'Please provide a valid, available email address.');
      return;
    }

    setProfileLoading(true);
    try {
      const updatedUser = await authService.updateProfile({
        email: email.trim(),
        name: displayName.trim(),
      });

      setUserState(updatedUser);
      setProfileSuccess('Profile details updated successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile details.');
    } finally {
      setProfileLoading(false);
    }
  };

  // ==========================================
  // PASSWORD CHANGE SUBMIT HANDLER
  // ==========================================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!isPasswordStrong) {
      setPasswordError('New password must meet all complexity requirements.');
      return;
    }
    if (!isPasswordMatching) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const msg = await authService.changePassword(oldPassword, newPassword, confirmPassword);
      setPasswordSuccess(msg || 'Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Incorrect current password or update failed.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 font-sans">
      
      {/* Page Header */}
      <div className="border-b border-zinc-800/40 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <UserCog size={20} className="text-emerald-400" />
          <span>Edit Account</span>
        </h2>
        <p className="text-xs text-zinc-400 font-normal mt-0.5">
          Update your profile details and manage your account security credentials.
        </p>
      </div>

      {/* SECTION 1: PROFILE & PERSONAL INFORMATION */}
      <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-zinc-800/40 pb-2.5">
          <User size={15} className="text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            Personal Information
          </h3>
        </div>

        {/* Profile Success/Error Banners */}
        {profileSuccess && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium flex items-center space-x-2">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs font-medium flex items-center space-x-2">
            <XCircle size={14} className="shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs">
          
          {/* USERNAME (IMMUTABLE) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                <Lock size={11} className="text-zinc-500" />
                <span>Username</span>
              </label>
              <span className="text-[9px] font-mono text-zinc-500 uppercase">
                Immutable
              </span>
            </div>
            
            <input 
              type="text" 
              value={user?.username || ''}
              disabled
              className="w-full px-3 py-2 rounded-xl bg-zinc-950/50 border border-zinc-850 text-xs font-mono text-zinc-500 cursor-not-allowed outline-none select-all"
            />
          </div>

          {/* DISPLAY NAME */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400 block">
              Display Name <span className="text-zinc-600">(Optional)</span>
            </label>
            <input 
              type="text" 
              value={displayName}
              placeholder="e.g. John Doe"
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          {/* EMAIL ADDRESS */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400 block">Email Address</label>
            <div className="relative">
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors font-mono"
              />

              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                {emailLoading && (
                  <RefreshCw size={13} className="animate-spin text-emerald-400" />
                )}
                {!emailLoading && emailStatus === 'valid' && (
                  <CheckCircle2 size={13} className="text-emerald-400" />
                )}
                {!emailLoading && emailStatus === 'invalid' && (
                  <XCircle size={13} className="text-rose-500" />
                )}
              </div>
            </div>

            {emailMsg && (
              <p className={`text-[11px] font-medium flex items-center gap-1 mt-0.5 ${
                emailStatus === 'valid' ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {emailStatus === 'valid' ? <Check size={11} /> : <X size={11} />}
                <span>{emailMsg}</span>
              </p>
            )}
          </div>

          {/* Submit Profile */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={profileLoading || emailStatus === 'invalid'}
              className="px-4 py-2 bg-zinc-100 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-xl text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              {profileLoading ? (
                <span className="flex items-center space-x-1">
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* SECTION 2: SECURITY & PASSWORD CHANGE */}
      <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-zinc-800/40 pb-2.5">
          <Shield size={15} className="text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            Security & Password
          </h3>
        </div>

        {/* Password Success/Error Banners */}
        {passwordSuccess && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium flex items-center space-x-2">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs font-medium flex items-center space-x-2">
            <XCircle size={14} className="shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
          
          {/* CURRENT PASSWORD */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400 block">Current Password</label>
            <div className="relative">
              <input 
                type={showPasswords ? 'text' : 'password'}
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
              >
                {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* NEW PASSWORD & PROGRESS */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 block">New Password</label>
            <div className="relative">
              <input 
                type={showPasswords ? 'text' : 'password'}
                placeholder="Min. 8 characters with numbers & symbols"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
              />
            </div>

            {/* Complexity Indicator */}
            {newPassword.length > 0 && (
              <div className="space-y-2 pt-0.5">
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
              <input 
                type={showPasswords ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
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
          </div>

          {/* Action Bar */}
          <div className="pt-2 flex items-center justify-between">
            <button 
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              {showPasswords ? 'Hide passwords' : 'Show passwords'}
            </button>

            <button
              type="submit"
              disabled={passwordLoading || !oldPassword || !isPasswordStrong || !isPasswordMatching}
              className="px-4 py-2 bg-zinc-100 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}

export default EditAccount;