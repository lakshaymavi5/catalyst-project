import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, MapPin, Phone, Clock, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import { useRepairFlow } from '../../context/RepairFlowContext.js';
import { Skeleton } from '../common/Skeleton.js';
import { ServiceCentre } from '../../types/index.js';

const QUICK_PINS = [
  { pin: '560038', city: 'Bengaluru' },
  { pin: '400021', city: 'Mumbai' },
  { pin: '110001', city: 'Delhi' },
  { pin: '500081', city: 'Hyderabad' },
  { pin: '600002', city: 'Chennai' },
  { pin: '411005', city: 'Pune' }
];

export const Step4BudgetLocation: React.FC = () => {
  const { state, updateState, nextStep, prevStep } = useRepairFlow();

  const [budget, setBudget] = useState<number | string>(state.budget || 20000);
  const [pinCode, setPinCode] = useState<string>(state.pinCode || '560038');
  const [city, setCity] = useState<string>(state.city || 'Bengaluru');
  const [stateName, setStateName] = useState<string>(state.state || 'Karnataka');
  const [serviceCentre, setServiceCentre] = useState<ServiceCentre | null>(state.serviceCentre);

  const [isValidatingPin, setIsValidatingPin] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const validatePinCode = async (pinToValidate: string) => {
    if (!/^\d{6}$/.test(pinToValidate)) {
      setPinError('PIN code must be exactly 6 numeric digits.');
      setServiceCentre(null);
      return;
    }

    setIsValidatingPin(true);
    setPinError(null);

    try {
      const res = await fetch(`/api/catalog/validate-pin/${pinToValidate}`);
      const json = await res.json();

      if (!res.ok) {
        setPinError(json.message || 'PIN code is outside our direct service boundary.');
        setServiceCentre(null);
      } else {
        setCity(json.data.city);
        setStateName(json.data.state);
        setServiceCentre(json.data.serviceCentre);
      }
    } catch (err) {
      setPinError('Network check failed. Please verify internet connectivity.');
    } finally {
      setIsValidatingPin(false);
    }
  };

  // Run validation on initial load if pin code exists
  useEffect(() => {
    if (pinCode && pinCode.length === 6) {
      validatePinCode(pinCode);
    }
  }, []);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPinCode(clean);
    if (clean.length === 6) {
      validatePinCode(clean);
    } else {
      setServiceCentre(null);
      setPinError(null);
    }
  };

  const handleQuickPin = (pin: string) => {
    setPinCode(pin);
    validatePinCode(pin);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetError(null);

    const numBudget = Number(budget);
    if (isNaN(numBudget) || numBudget <= 0) {
      setBudgetError('Please enter a valid positive budget amount in INR.');
      return;
    }

    if (!pinCode || pinCode.length !== 6) {
      setPinError('Please enter a valid 6-digit postal PIN code.');
      return;
    }

    if (!serviceCentre) {
      setPinError('Please enter a serviceable PIN code to establish your designated service centre.');
      return;
    }

    updateState({
      budget: numBudget,
      pinCode,
      city,
      state: stateName,
      serviceCentre
    });

    nextStep();
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink-primary mb-2">
          Budget Threshold & Service Location
        </h2>
        <p className="text-sm text-ink-secondary leading-relaxed">
          Set your financial tolerance for this device. We compare original parts and component alternatives against this figure, and route your quote to the nearest certified bench.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Budget */}
        <div className="bg-base-surface border border-base-border rounded-card p-6 shadow-card">
          <label htmlFor="budget-input" className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
            Maximum Repair Budget (INR)
          </label>
          <p className="text-xs text-ink-muted mb-3 leading-relaxed">
            The ceiling amount you are prepared to invest before opting for device replacement.
          </p>

          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-base font-semibold text-ink-muted">
              ₹
            </span>
            <input
              id="budget-input"
              type="number"
              min="500"
              step="500"
              required
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 20000"
              className="w-full pl-8 pr-4 py-2.5 bg-base-muted/40 border border-base-border rounded-control text-base font-medium text-ink-primary focus:border-accent focus:bg-base-surface transition-colors"
            />
          </div>

          {budgetError && (
            <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{budgetError}</span>
            </p>
          )}

          {/* Budget Presets */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[11px] text-ink-muted">Common budgets:</span>
            {[10000, 15000, 20000, 30000, 50000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setBudget(val)}
                className="text-xs px-2.5 py-1 bg-base-muted hover:bg-base-border rounded-control text-ink-secondary hover:text-ink-primary border border-base-border transition-colors"
              >
                ₹{val.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>

        {/* Card 2: Postal PIN Code & Service Centre Resolution */}
        <div className="bg-base-surface border border-base-border rounded-card p-6 shadow-card space-y-4">
          <div>
            <label htmlFor="pin-input" className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1">
              Postal PIN Code
            </label>
            <p className="text-xs text-ink-muted mb-2">
              Enter the 6-digit postal code of your home or office address in India.
            </p>

            <div className="relative max-w-xs">
              <input
                id="pin-input"
                type="text"
                required
                maxLength={6}
                value={pinCode}
                onChange={handlePinChange}
                placeholder="e.g. 560038"
                className="w-full px-3.5 py-2.5 bg-base-muted/40 border border-base-border rounded-control text-sm font-mono tracking-widest text-ink-primary focus:border-accent focus:bg-base-surface transition-colors"
              />
            </div>

            {/* Quick PIN Presets */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="text-[11px] text-ink-muted">Quick test hubs:</span>
              {QUICK_PINS.map(item => (
                <button
                  key={item.pin}
                  type="button"
                  onClick={() => handleQuickPin(item.pin)}
                  className="text-xs px-2 py-0.5 bg-base-muted hover:bg-base-border rounded-control text-ink-secondary border border-base-border transition-colors"
                >
                  {item.city} ({item.pin})
                </button>
              ))}
            </div>
          </div>

          {/* Validation Skeleton */}
          {isValidatingPin && (
            <div className="p-4 bg-base-muted/40 border border-base-border rounded-control space-y-2">
              <Skeleton height="16px" width="60%" />
              <Skeleton height="12px" width="90%" />
              <Skeleton height="12px" width="40%" />
            </div>
          )}

          {/* Error Message */}
          {pinError && !isValidatingPin && (
            <div
              role="alert"
              className="p-3.5 bg-base-surface border border-amber-300 dark:border-amber-900/60 rounded-control text-xs text-amber-900 dark:text-amber-200 leading-relaxed"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <span>{pinError}</span>
              </div>
            </div>
          )}

          {/* Service Centre Card */}
          {serviceCentre && !isValidatingPin && (
            <div className="p-4 bg-base-muted/30 border border-base-border rounded-control">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Serviceable Postal Coverage Confirmed</span>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-control bg-base-muted flex items-center justify-center text-accent shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="font-heading text-sm font-semibold text-ink-primary">
                    {serviceCentre.name}
                  </h4>
                  <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
                    <MapPin className="w-3 h-3 inline mr-1 text-ink-muted" />
                    {serviceCentre.address}, {city}, {stateName} {pinCode}
                  </p>
                  <p className="text-xs text-ink-secondary mt-1">
                    <Phone className="w-3 h-3 inline mr-1 text-accent" />
                    Direct Desk: <a href={`tel:${serviceCentre.phone}`} className="text-accent hover:underline font-mono">{serviceCentre.phone}</a>
                  </p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    <Clock className="w-3 h-3 inline mr-1 text-ink-muted" />
                    {serviceCentre.operating_hours}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-base-border">
          <button
            type="button"
            onClick={prevStep}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-ink-secondary hover:text-ink-primary bg-base-muted rounded-control border border-base-border transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Device Specs</span>
          </button>

          <button
            type="submit"
            disabled={!serviceCentre || isValidatingPin}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-medium bg-accent text-accent-text hover:bg-accent-hover rounded-control disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span>Generate Bench Estimate</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
