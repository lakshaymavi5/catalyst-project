import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, Wrench, Clock, Check, AlertTriangle, Building2, Phone, CheckCircle2 } from 'lucide-react';
import { useRepairFlow } from '../../context/RepairFlowContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Skeleton } from '../common/Skeleton.js';
import { SafetyNetFallback } from '../common/SafetyNetFallback.js';
import { EstimateData, RepairBid } from '../../types/index.js';

export const Step5Estimate: React.FC = () => {
  const { state, updateState, nextStep, prevStep } = useRepairFlow();
  const { token } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(!state.estimateData);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<EstimateData | null>(state.estimateData);
  const [selectedPlan, setSelectedPlan] = useState<'repair_original' | 'repair_cheaper' | 'repair_marketplace_bid'>(
    (state.selectedOption as any) || 'repair_original'
  );

  // Community Marketplace Bids from local repairmen
  const [marketBids, setMarketBids] = useState<RepairBid[]>(state.marketBids || []);
  const [isBidsLoading, setIsBidsLoading] = useState<boolean>(false);
  const [ticketId, setTicketId] = useState<string>(state.ticketId || 'req_sample_01');

  const fetchEstimateAndBids = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Calculate standard benchmark estimate
      const res = await fetch('/api/estimate/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deviceType: state.deviceType,
          brand: state.brand,
          faults: state.faults,
          budget: Number(state.budget)
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to calculate bench estimate.');
      }

      setEstimate(json.data);
      updateState({ estimateData: json.data });

      // 2. Publish/sync customer ticket to marketplace so nearby shops can see it
      setIsBidsLoading(true);
      const pubRes = await fetch('/api/bids/publish-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ticketId: state.ticketId || 'req_sample_01',
          deviceType: state.deviceType,
          brand: state.brand,
          productName: state.productName,
          modelNumber: state.modelNumber,
          serialNumber: state.serialNumber,
          faults: state.faults,
          budget: Number(state.budget),
          pinCode: state.pinCode,
          city: state.city,
          photoUrl: state.photoUrl
        })
      });

      const pubData = await pubRes.json();
      const currentTicketId = pubData?.data?.id || 'req_sample_01';
      setTicketId(currentTicketId);
      updateState({ ticketId: currentTicketId });

      // 3. Fetch community quotes for this ticket
      const bidsRes = await fetch(`/api/bids/ticket/${currentTicketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const bidsData = await bidsRes.json();
      if (bidsRes.ok && bidsData.data?.bids) {
        setMarketBids(bidsData.data.bids);
        updateState({ marketBids: bidsData.data.bids });
      }
    } catch (err: any) {
      setError(err.message || 'Diagnostic calculation could not complete.');
    } finally {
      setIsLoading(false);
      setIsBidsLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimateAndBids();
  }, []);

  const handleSelectPlan = (plan: 'repair_original' | 'repair_cheaper') => {
    setSelectedPlan(plan);
    updateState({ selectedOption: plan, acceptedBid: null });
  };

  const handleAcceptMarketplaceBid = async (bid: RepairBid) => {
    try {
      await fetch('/api/bids/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ticketId,
          bidId: bid.id
        })
      });

      setSelectedPlan('repair_marketplace_bid');
      updateState({
        selectedOption: 'repair_marketplace_bid',
        acceptedBid: bid,
        currentStep: 7,
        highestCompletedStep: Math.max(state.highestCompletedStep, 6)
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      // Fallback local update
      setSelectedPlan('repair_marketplace_bid');
      updateState({
        selectedOption: 'repair_marketplace_bid',
        acceptedBid: bid,
        currentStep: 7,
        highestCompletedStep: Math.max(state.highestCompletedStep, 6)
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleProceedToReplacements = () => {
    updateState({ selectedOption: selectedPlan });
    nextStep();
  };

  const handleDirectBill = () => {
    updateState({
      selectedOption: selectedPlan,
      currentStep: 7,
      highestCompletedStep: Math.max(state.highestCompletedStep, 6)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton height="32px" width="50%" />
          <Skeleton height="16px" width="80%" />
        </div>
        <div className="p-6 bg-base-surface border border-base-border rounded-card space-y-4">
          <Skeleton height="24px" width="40%" />
          <Skeleton height="18px" width="100%" />
          <Skeleton height="18px" width="90%" />
          <Skeleton height="40px" width="30%" />
        </div>
        <div className="p-6 bg-base-surface border border-base-border rounded-card space-y-4">
          <Skeleton height="24px" width="40%" />
          <Skeleton height="18px" width="100%" />
        </div>
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="max-w-2xl mx-auto py-6">
        <SafetyNetFallback
          message={error || 'We could not reach the pricing calculation service.'}
          phone={state.serviceCentre?.phone || '+91 80 4932 7700'}
          centreName={state.serviceCentre?.name || 'Indiranagar Central Service Hub'}
          onRetry={fetchEstimateAndBids}
        />
        <div className="pt-4">
          <button
            type="button"
            onClick={prevStep}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-ink-secondary hover:text-ink-primary bg-base-muted rounded-control border border-base-border"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Budget & Area</span>
          </button>
        </div>
      </div>
    );
  }

  const { originalRepair, cheaperAlternative, breakdown, disclaimer } = estimate;
  const userBudget = Number(state.budget);

  return (
    <div className="max-w-3xl mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink-primary mb-2">
          Bench Diagnostic Estimates & Local Shop Quotes
        </h2>
        <p className="text-sm text-ink-secondary leading-relaxed">
          Compare authentic OEM factory pricing against bids submitted by verified local repair workshops in your area. Select the repair pathway that best matches your budget and timeline.
        </p>
      </div>

      <div className="space-y-6">
        {/* Option 1: Original OEM Repair */}
        <div
          onClick={() => handleSelectPlan('repair_original')}
          className={`p-6 rounded-card border cursor-pointer transition-all ${
            selectedPlan === 'repair_original'
              ? 'bg-base-surface border-accent shadow-card ring-1 ring-accent'
              : 'bg-base-surface border-base-border hover:border-base-border/80'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-control bg-accent/10 flex items-center justify-center text-accent">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-ink-primary">
                  Official Factory OEM Repair
                </h3>
                <span className="text-xs text-ink-muted">
                  Authorised facility parts with 100% manufacturer specification compliance
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="font-heading text-2xl font-bold text-ink-primary">
                ₹{originalRepair.subtotal.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-ink-muted block">+ 18% GST itemised at billing</span>
            </div>
          </div>

          {/* Budget Assessment Pill */}
          <div className="mb-4">
            {originalRepair.fitsBudget ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-control text-xs font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>Within your budget of ₹{userBudget.toLocaleString('en-IN')} (₹{originalRepair.budgetDifference.toLocaleString('en-IN')} buffer)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-control text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Exceeds your budget by ₹{Math.abs(originalRepair.budgetDifference).toLocaleString('en-IN')}</span>
              </span>
            )}
          </div>

          {/* Breakdown List */}
          <div className="border-t border-base-border pt-3 space-y-2 text-xs">
            {breakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-ink-secondary py-1">
                <span>{item.faultLabel} (OEM Component)</span>
                <span className="font-mono text-ink-primary">₹{item.originalPartCost.toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-ink-secondary py-1">
              <span>Precision Bench Assembly & Calibration Labour</span>
              <span className="font-mono text-ink-primary">₹{originalRepair.labourTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-base-border text-xs text-ink-muted">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>Estimated Turnaround: {originalRepair.estimatedTurnaroundDays} to {originalRepair.estimatedTurnaroundDays + 1} working days</span>
          </div>
        </div>

        {/* Option 2: Cheaper Alternative */}
        <div
          onClick={() => handleSelectPlan('repair_cheaper')}
          className={`p-6 rounded-card border cursor-pointer transition-all ${
            selectedPlan === 'repair_cheaper'
              ? 'bg-base-surface border-accent shadow-card ring-1 ring-accent'
              : 'bg-base-surface border-base-border hover:border-base-border/80'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-control bg-base-muted flex items-center justify-center text-accent">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-ink-primary">
                  Certified Component-Level Alternative
                </h3>
                <span className="text-xs text-ink-muted">
                  Tier-1 precision rework preserving core logic while lowering expenditure
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="font-heading text-2xl font-bold text-accent">
                ₹{cheaperAlternative.totalCost.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium block">
                Saves ₹{cheaperAlternative.savingsAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Trade-off Explanation Note (Item 9: no em dashes) */}
          <div className="p-3.5 bg-base-muted/50 rounded-control border border-base-border mb-4">
            <h4 className="text-xs font-semibold text-ink-primary mb-1">
              Plain-Language Technical Trade-off Note:
            </h4>
            <p className="text-xs text-ink-secondary leading-relaxed">
              {cheaperAlternative.tradeoffExplanation}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>Estimated Turnaround: {originalRepair.estimatedTurnaroundDays + 1} working days</span>
          </div>
        </div>

        {/* Option 3: Local Workshop & Repairman Quotes (Marketplace Price Comparison) */}
        <div className="p-6 bg-base-surface border border-accent/40 rounded-card shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-base-border">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent" />
                <h3 className="font-heading text-lg font-semibold text-ink-primary">
                  Local Workshop Offers & Repairman Quotes
                </h3>
              </div>
              <p className="text-xs text-ink-secondary mt-0.5">
                Nearby independent repair shops in PIN {state.pinCode} quoting on your damaged device.
              </p>
            </div>

            <span className="text-xs font-medium px-2.5 py-1 bg-accent-subtle text-accent rounded-control border border-accent/20 self-start sm:self-auto">
              {marketBids.length} Active Local Bids
            </span>
          </div>

          {isBidsLoading ? (
            <div className="space-y-3">
              <Skeleton height="80px" width="100%" />
              <Skeleton height="80px" width="100%" />
            </div>
          ) : marketBids.length === 0 ? (
            <div className="p-4 bg-base-muted/40 rounded-control text-xs text-ink-secondary text-center">
              <p>Your repair request has been dispatched to local workshops in PIN {state.pinCode}.</p>
              <p className="text-[11px] text-ink-muted mt-1">
                Technicians usually submit quotes within minutes. You can also select the factory repair above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {marketBids.map((bid) => {
                const savings = originalRepair.subtotal - bid.bid_price;
                const isSelected = state.acceptedBid?.id === bid.id;

                return (
                  <div
                    key={bid.id}
                    className={`p-4 rounded-control border transition-all ${
                      isSelected
                        ? 'border-accent bg-accent-subtle/30 ring-1 ring-accent'
                        : 'border-base-border bg-base-muted/20 hover:border-accent/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-heading text-sm font-semibold text-ink-primary">
                            {bid.shop_name}
                          </span>
                          <span className="text-[11px] text-ink-muted">
                            ({bid.repairman_name})
                          </span>
                        </div>

                        <p className="text-xs text-ink-muted">
                          {bid.shop_address}, {bid.shop_city} ({bid.shop_pin})
                        </p>

                        <p className="text-xs text-ink-secondary leading-relaxed pt-1">
                          {bid.repair_approach}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted pt-1">
                          <span>
                            <Clock className="w-3.5 h-3.5 inline mr-1 text-accent" />
                            Turnaround: {bid.turnaround_days} day(s)
                          </span>
                          <span>
                            Warranty: {bid.warranty_days} days
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end justify-between shrink-0 gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-base-border">
                        <div className="text-left sm:text-right">
                          <span className="font-heading text-xl font-bold text-ink-primary block">
                            ₹{bid.bid_price.toLocaleString('en-IN')}
                          </span>
                          {savings > 0 && (
                            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium block">
                              Saves ₹{savings.toLocaleString('en-IN')} vs factory OEM
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${bid.shop_phone.replace(/\s+/g, '')}`}
                            className="p-2 bg-base-surface hover:bg-base-muted text-ink-primary text-xs rounded-control border border-base-border transition-colors"
                            title={`Call ${bid.shop_name}`}
                          >
                            <Phone className="w-3.5 h-3.5 text-accent" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleAcceptMarketplaceBid(bid)}
                            className="px-3.5 py-1.5 bg-accent text-accent-text hover:bg-accent-hover text-xs font-medium rounded-control shadow-subtle transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isSelected ? 'Accepted' : 'Accept Shop Quote'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-4 bg-base-muted/30 border border-base-border rounded-control text-xs text-ink-muted leading-relaxed">
          <p className="font-medium text-ink-secondary mb-0.5">Physical Bench Diagnostic Notice:</p>
          <p>{disclaimer}</p>
        </div>

        {/* Decision Actions */}
        <div className="p-5 bg-base-surface border border-base-border rounded-card flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-heading text-sm font-semibold text-ink-primary">
              Not confident repairing an older device?
            </h4>
            <p className="text-xs text-ink-secondary">
              Compare certified replacement models to examine whether a refreshed device provides higher long-term utility.
            </p>
          </div>

          <button
            type="button"
            onClick={handleProceedToReplacements}
            className="w-full sm:w-auto px-4 py-2.5 bg-base-muted hover:bg-base-border text-ink-primary text-xs font-medium rounded-control border border-base-border transition-colors whitespace-nowrap"
          >
            Compare 3 Replacement Options
          </button>
        </div>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-base-border">
          <button
            type="button"
            onClick={prevStep}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-ink-secondary hover:text-ink-primary bg-base-muted rounded-control border border-base-border transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Budget</span>
          </button>

          <button
            type="button"
            onClick={handleDirectBill}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-medium bg-accent text-accent-text hover:bg-accent-hover rounded-control transition-colors"
          >
            <span>Proceed with Selected Option</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
