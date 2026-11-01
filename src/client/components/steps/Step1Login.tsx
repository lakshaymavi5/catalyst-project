import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, KeyRound, AlertCircle, CheckCircle, Wrench, User as UserIcon, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useRepairFlow } from '../../context/RepairFlowContext.js';

export const Step1Login: React.FC = () => {
  const { login, register } = useAuth();
  const { nextStep } = useRepairFlow();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [identifier, setIdentifier] = useState('demo@repairassist.in');
  const [password, setPassword] = useState('Password@123');

  // Registration fields
  const [regRole, setRegRole] = useState<'customer' | 'repairman'>('customer');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Repairman / Shopkeeper additional fields
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopCity, setShopCity] = useState('Bengaluru');
  const [shopPin, setShopPin] = useState('560038');
  const [shopPhone, _setShopPhone] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(identifier, password);
      // If user is a repairman, navigate directly to shopkeeper dispatch board
      const stored = localStorage.getItem('auth_token');
      if (stored) {
        const meRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${stored}` }
        });
        const meData = await meRes.json();
        if (meData?.data?.user?.role === 'repairman') {
          navigate('/dispatch');
          return;
        }
      }
      nextStep();
    } catch (err: any) {
      setError(err.message || 'Unable to sign in. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register(
        regFullName,
        regEmail,
        regPhone,
        regPassword,
        regRole,
        regRole === 'repairman'
          ? {
              shopName,
              shopAddress,
              shopCity,
              shopPin,
              shopPhone: shopPhone || regPhone
            }
          : undefined
      );

      if (regRole === 'repairman') {
        navigate('/dispatch');
      } else {
        nextStep();
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check the provided information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotEmail })
      });
      const data = await res.json();
      setForgotSuccess(data.message || 'Password reset link sent.');
    } catch (err) {
      setForgotSuccess('A recovery code has been generated. Please check your inbox.');
    }
  };

  const fillCustomerDemo = () => {
    setIdentifier('demo@repairassist.in');
    setPassword('Password@123');
    setError(null);
  };

  const fillRepairmanDemo = () => {
    setIdentifier('rajesh@indiranagarrepairs.in');
    setPassword('Password@123');
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto py-8">
      {/* Editorial Header */}
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink-primary mb-2">
          Account Portal & Marketplace
        </h2>
        <p className="text-sm text-ink-secondary leading-relaxed">
          Sign in as a device owner to estimate and compare local repair options, or as a verified repair workshop specialist to view open tickets and submit competitive price quotes.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex border border-base-border rounded-control p-1 bg-base-muted/50 mb-6" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          onClick={() => { setMode('signin'); setError(null); }}
          className={`flex-1 py-2 text-xs font-medium rounded-control transition-colors ${
            mode === 'signin'
              ? 'bg-base-surface text-ink-primary shadow-subtle border border-base-border font-semibold'
              : 'text-ink-secondary hover:text-ink-primary'
          }`}
        >
          Existing Account
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          onClick={() => { setMode('register'); setError(null); }}
          className={`flex-1 py-2 text-xs font-medium rounded-control transition-colors ${
            mode === 'register'
              ? 'bg-base-surface text-ink-primary shadow-subtle border border-base-border font-semibold'
              : 'text-ink-secondary hover:text-ink-primary'
          }`}
        >
          Create New Profile
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 p-3 bg-base-surface border border-red-300 dark:border-red-900/50 rounded-control flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Card Form */}
      <div className="bg-base-surface border border-base-border rounded-card p-6 shadow-card">
        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="signin-id" className="block text-xs font-medium text-ink-primary mb-1">
                Email Address or Phone Number
              </label>
              <input
                id="signin-id"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="name@example.in or 9876543210"
                className="w-full px-3.5 py-2.5 bg-base-muted/40 border border-base-border rounded-control text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent focus:bg-base-surface transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="signin-pwd" className="block text-xs font-medium text-ink-primary">
                  Account Password
                </label>
                <button
                  type="button"
                  onClick={() => { setIsForgotModalOpen(true); setForgotSuccess(null); }}
                  className="text-xs text-ink-muted hover:text-accent underline underline-offset-2"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="signin-pwd"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2.5 bg-base-muted/40 border border-base-border rounded-control text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent focus:bg-base-surface transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-accent text-accent-text hover:bg-accent-hover font-medium text-sm rounded-control transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
            </button>

            {/* Quick Demo Accounts */}
            <div className="pt-4 border-t border-base-border space-y-2">
              <span className="block text-[11px] text-ink-muted text-center">
                Demo Accounts for Testing:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={fillCustomerDemo}
                  className="text-left p-2 bg-base-muted/60 hover:bg-base-muted rounded-control border border-base-border text-xs text-ink-secondary hover:text-ink-primary transition-colors"
                >
                  <span className="font-semibold block text-[11px] text-accent">Customer</span>
                  <span>Aditi Sharma</span>
                </button>

                <button
                  type="button"
                  onClick={fillRepairmanDemo}
                  className="text-left p-2 bg-base-muted/60 hover:bg-base-muted rounded-control border border-base-border text-xs text-ink-secondary hover:text-ink-primary transition-colors"
                >
                  <span className="font-semibold block text-[11px] text-accent">Repair Specialist</span>
                  <span>Rajesh Electronics</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Account Role Selector */}
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-2">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegRole('customer')}
                  className={`p-3 rounded-control border text-left transition-colors ${
                    regRole === 'customer'
                      ? 'border-accent bg-accent-subtle/50 text-ink-primary font-semibold'
                      : 'border-base-border bg-base-surface text-ink-secondary hover:border-accent/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <UserIcon className="w-4 h-4 text-accent" />
                    <span className="text-xs">Device Owner</span>
                  </div>
                  <span className="text-[11px] text-ink-muted font-normal block leading-tight">
                    I want to fix or evaluate my device
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegRole('repairman')}
                  className={`p-3 rounded-control border text-left transition-colors ${
                    regRole === 'repairman'
                      ? 'border-accent bg-accent-subtle/50 text-ink-primary font-semibold'
                      : 'border-base-border bg-base-surface text-ink-secondary hover:border-accent/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className="w-4 h-4 text-accent" />
                    <span className="text-xs">Repair Specialist</span>
                  </div>
                  <span className="text-[11px] text-ink-muted font-normal block leading-tight">
                    I run a shop and want to quote prices
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-name" className="block text-xs font-medium text-ink-primary mb-1">
                Full Legal Name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="e.g. Rohan Verma"
                className="w-full px-3.5 py-2 bg-base-muted/40 border border-base-border rounded-control text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent focus:bg-base-surface transition-colors"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-medium text-ink-primary mb-1">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="name@example.in"
                className="w-full px-3.5 py-2 bg-base-muted/40 border border-base-border rounded-control text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent focus:bg-base-surface transition-colors"
              />
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-xs font-medium text-ink-primary mb-1">
                Mobile Number
              </label>
              <input
                id="reg-phone"
                type="tel"
                required
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full px-3.5 py-2 bg-base-muted/40 border border-base-border rounded-control text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent focus:bg-base-surface transition-colors"
              />
            </div>

            {/* Additional Workshop Details if Repairman */}
            {regRole === 'repairman' && (
              <div className="p-3.5 bg-base-muted/40 border border-base-border rounded-control space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                  <Building2 className="w-4 h-4" />
                  <span>Workshop & Shop Details</span>
                </div>

                <div>
                  <label htmlFor="shop-name" className="block text-[11px] font-medium text-ink-primary mb-1">
                    Shop / Workshop Name
                  </label>
                  <input
                    id="shop-name"
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Verma Hardware & Logic Lab"
                    className="w-full px-3 py-1.5 bg-base-surface border border-base-border rounded-control text-xs text-ink-primary focus:border-accent"
                  />
                </div>

                <div>
                  <label htmlFor="shop-address" className="block text-[11px] font-medium text-ink-primary mb-1">
                    Physical Shop Address
                  </label>
                  <input
                    id="shop-address"
                    type="text"
                    required
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    placeholder="e.g. Shop 12, 100ft Road, HAL 2nd Stage"
                    className="w-full px-3 py-1.5 bg-base-surface border border-base-border rounded-control text-xs text-ink-primary focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="shop-city" className="block text-[11px] font-medium text-ink-primary mb-1">
                      City
                    </label>
                    <input
                      id="shop-city"
                      type="text"
                      required
                      value={shopCity}
                      onChange={(e) => setShopCity(e.target.value)}
                      placeholder="e.g. Bengaluru"
                      className="w-full px-3 py-1.5 bg-base-surface border border-base-border rounded-control text-xs text-ink-primary focus:border-accent"
                    />
                  </div>

                  <div>
                    <label htmlFor="shop-pin" className="block text-[11px] font-medium text-ink-primary mb-1">
                      PIN Code
                    </label>
                    <input
                      id="shop-pin"
                      type="text"
                      required
                      maxLength={6}
                      value={shopPin}
                      onChange={(e) => setShopPin(e.target.value)}
                      placeholder="e.g. 560038"
                      className="w-full px-3 py-1.5 bg-base-surface border border-base-border rounded-control text-xs text-ink-primary focus:border-accent"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="reg-pwd" className="block text-xs font-medium text-ink-primary mb-1">
                Create Password
              </label>
              <input
                id="reg-pwd"
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2 bg-base-muted/40 border border-base-border rounded-control text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent focus:bg-base-surface transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-accent text-accent-text hover:bg-accent-hover font-medium text-sm rounded-control transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering...' : regRole === 'repairman' ? 'Register Repair Workshop' : 'Register Customer Profile'}</span>
            </button>
          </form>
        )}

        <div className="mt-4 pt-3 border-t border-base-border text-center">
          <p className="text-[11px] text-ink-muted leading-tight">
            By proceeding, you agree to our{' '}
            <Link to="/terms" className="text-ink-secondary hover:text-accent underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-ink-secondary hover:text-accent underline">
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="bg-base-surface border border-base-border rounded-card p-6 max-w-sm w-full shadow-card">
            <h3 className="font-heading text-lg font-semibold text-ink-primary mb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-accent" />
              <span>Reset Password</span>
            </h3>
            <p className="text-xs text-ink-secondary mb-4 leading-relaxed">
              Enter your registered email address or mobile number. We will send a secure verification token to reset your credentials.
            </p>

            {forgotSuccess ? (
              <div className="p-3 bg-base-muted border border-base-border rounded-control text-xs text-ink-primary mb-4 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>{forgotSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="text"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Registered email or phone"
                  className="w-full px-3 py-2 bg-base-muted/50 border border-base-border rounded-control text-sm text-ink-primary focus:border-accent focus:bg-base-surface transition-colors"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-accent text-accent-text hover:bg-accent-hover text-xs font-medium rounded-control transition-colors"
                >
                  Send Recovery Link
                </button>
              </form>
            )}

            <div className="mt-4 pt-2 border-t border-base-border text-right">
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="text-xs text-ink-secondary hover:text-ink-primary underline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
