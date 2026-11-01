import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRepairFlow } from '../../context/RepairFlowContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Skeleton } from '../common/Skeleton.js';
import { ReplacementOption, ReplacementRecommendationResult } from '../../types/index.js';

export const Step6Replacements: React.FC = () => {
  const { state, updateState, nextStep, prevStep } = useRepairFlow();
  const { token } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(!state.replacementRecommendations);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReplacementRecommendationResult | null>(state.replacementRecommendations);
  const [selectedReplacementId, setSelectedReplacementId] = useState<string>(
    state.selectedReplacement?.id || ''
  );

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);

    const repairSubtotal = state.estimateData
      ? (state.selectedOption === 'repair_cheaper'
          ? state.estimateData.cheaperAlternative.totalCost
          : state.estimateData.originalRepair.subtotal)
      : 15000;

    try {
      const res = await fetch('/api/replacements/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deviceType: state.deviceType,
          budget: Number(state.budget),
          faults: state.faults,
          repairSubtotal
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Unable to retrieve replacement recommendations.');
      }

      setData(json.data);
      updateState({ replacementRecommendations: json.data });

      if (!selectedReplacementId && json.data.recommendedId) {
        setSelectedReplacementId(json.data.recommendedId);
        const match = json.data.options.find((o: ReplacementOption) => o.id === json.data.recommendedId);
        if (match) {
          updateState({
            selectedReplacement: match,
            selectedOption: 'replacement'
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load replacement catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!state.replacementRecommendations) {
      fetchRecommendations();
    } else if (state.replacementRecommendations && !selectedReplacementId) {
      setSelectedReplacementId(state.replacementRecommendations.recommendedId);
    }
  }, []);

  const handleSelect = (option: ReplacementOption) => {
    setSelectedReplacementId(option.id);
    updateState({
      selectedReplacement: option,
      selectedOption: 'replacement'
    });
  };

  const handleProceedToBill = () => {
    if (!selectedReplacementId && data?.options[0]) {
      handleSelect(data.options[0]);
    }
    nextStep();
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <Skeleton height="32px" width="50%" />
        <Skeleton height="16px" width="80%" />
        <div className="border border-base-border rounded-card p-6 bg-base-surface space-y-4">
          <Skeleton height="20px" width="100%" />
          <Skeleton height="60px" width="100%" />
          <Skeleton height="60px" width="100%" />
          <Skeleton height="60px" width="100%" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center space-y-4">
        <div className="p-4 bg-base-surface border border-base-border rounded-card text-xs text-ink-secondary">
          <AlertCircle className="w-6 h-6 text-accent mx-auto mb-2" />
          <p>{error || 'Catalog offline. Please retry or return to repair estimates.'}</p>
        </div>
        <button
          type="button"
          onClick={fetchRecommendations}
          className="px-4 py-2 bg-accent text-accent-text text-xs rounded-control"
        >
          Retry Loading Catalog
        </button>
      </div>
    );
  }

  const userBudget = Number(state.budget);

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink-primary mb-2">
          Replacement Device Comparison
        </h2>
        <p className="text-sm text-ink-secondary leading-relaxed">
          Compare three certified options matching your hardware profile. We evaluate whether your planned budget yields higher long-term value through replacement rather than component micro-repair.
        </p>
      </div>

      {/* Dynamic Recommendation Callout (Item 6 & 11: No colored left-border stripes, solid clean surface) */}
      <div className="mb-6 p-5 bg-base-surface border border-accent/40 rounded-card shadow-card">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-control bg-accent text-accent-text flex items-center justify-center shrink-0 mt-0.5">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Algorithm Recommendation
              </span>
              <span className="text-[11px] text-ink-muted">
                Calculated against ₹{userBudget.toLocaleString('en-IN')} target
              </span>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              {data.recommendationReason}
            </p>
          </div>
        </div>
      </div>

      {/* Structured Comparison Table (Item 6: NOT three feature cards in a row! An authentic tabular spec layout) */}
      <div className="bg-base-surface border border-base-border rounded-card overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-base-muted/60 border-b border-base-border text-ink-primary font-semibold">
                <th className="py-3.5 px-4 font-heading text-xs tracking-wider">Device & Condition</th>
                <th className="py-3.5 px-4 font-heading text-xs tracking-wider">Price (INR)</th>
                <th className="py-3.5 px-4 font-heading text-xs tracking-wider">Hardware Key Difference</th>
                <th className="py-3.5 px-4 font-heading text-xs tracking-wider">Target Profile</th>
                <th className="py-3.5 px-4 font-heading text-xs tracking-wider text-right">Selection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-border">
              {data.options.map((opt) => {
                const isSelected = selectedReplacementId === opt.id;
                const isRecommended = opt.isRecommended;

                return (
                  <tr
                    key={opt.id}
                    onClick={() => handleSelect(opt)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-accent-subtle/40'
                        : 'hover:bg-base-muted/30'
                    }`}
                  >
                    {/* Device & Condition */}
                    <td className="py-4 px-4 align-top">
                      <div className="font-semibold text-ink-primary text-sm mb-1">
                        {opt.name}
                      </div>
                      <span className="inline-block px-2 py-0.5 bg-base-muted text-ink-muted border border-base-border rounded-control text-[11px]">
                        {opt.condition}
                      </span>
                      {isRecommended && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-accent font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Recommended choice</span>
                        </div>
                      )}
                    </td>

                    {/* Price */}
                    <td className="py-4 px-4 align-top whitespace-nowrap">
                      <div className="font-heading text-base font-bold text-ink-primary">
                        ₹{opt.price.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[11px] text-ink-muted block">
                        {opt.price <= userBudget ? 'Within budget' : `+ ₹${(opt.price - userBudget).toLocaleString('en-IN')} over`}
                      </span>
                    </td>

                    {/* Key Difference */}
                    <td className="py-4 px-4 align-top text-ink-secondary leading-relaxed max-w-xs">
                      {opt.key_difference}
                    </td>

                    {/* Target Profile ("Best For") */}
                    <td className="py-4 px-4 align-top">
                      <span className="inline-block px-2.5 py-1 bg-base-muted/80 text-ink-primary border border-base-border rounded-control text-[11px] font-medium">
                        {opt.best_for}
                      </span>
                    </td>

                    {/* Selection Radio Control */}
                    <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(opt);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-control border transition-colors ${
                          isSelected
                            ? 'bg-accent text-accent-text border-accent'
                            : 'bg-base-surface text-ink-secondary border-base-border hover:border-accent hover:text-ink-primary'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Choose'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alternative Action: Keep Repair Instead */}
      <div className="mt-6 p-4 bg-base-surface border border-base-border rounded-control flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="text-ink-secondary">
          Prefer to repair your current {state.brand} {state.productName} instead?
        </span>
        <button
          type="button"
          onClick={() => {
            updateState({
              selectedOption: state.selectedOption === 'repair_cheaper' ? 'repair_cheaper' : 'repair_original',
              currentStep: 7,
              highestCompletedStep: Math.max(state.highestCompletedStep, 6)
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="text-accent hover:underline font-medium"
        >
          Return to Repair Quotation
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-base-border">
        <button
          type="button"
          onClick={prevStep}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-ink-secondary hover:text-ink-primary bg-base-muted rounded-control border border-base-border transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Estimate</span>
        </button>

        <button
          type="button"
          onClick={handleProceedToBill}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-medium bg-accent text-accent-text hover:bg-accent-hover rounded-control transition-colors"
        >
          <span>Generate Itemised Final Bill</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
