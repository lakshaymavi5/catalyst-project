import React, { useState, useEffect } from 'react';
import { Download, Phone, MapPin, Clock, RotateCcw, Building2, CheckCircle } from 'lucide-react';
import { useRepairFlow } from '../../context/RepairFlowContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Skeleton } from '../common/Skeleton.js';
import { SafetyNetFallback } from '../common/SafetyNetFallback.js';
import { generateBillPdf } from '../../utils/pdfGenerator.js';
import { FinalBillData } from '../../types/index.js';

export const Step7FinalBill: React.FC = () => {
  const { state, updateState, resetFlow, nextStep } = useRepairFlow();
  const { token } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(!state.finalBill);
  const [error, setError] = useState<string | null>(null);
  const [billData, setBillData] = useState<FinalBillData | null>(state.finalBill);

  const fetchFinalBill = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bill/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          optionType: state.selectedOption || 'repair_original',
          deviceType: state.deviceType,
          brand: state.brand,
          productName: state.productName,
          modelNumber: state.modelNumber,
          serialNumber: state.serialNumber,
          faults: state.faults,
          budget: Number(state.budget),
          pinCode: state.pinCode,
          photoUrl: state.photoUrl,
          replacementDetails: state.selectedReplacement,
          acceptedBid: state.acceptedBid
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Unable to generate final tax bill.');
      }

      setBillData(json.data);
      updateState({ finalBill: json.data });
    } catch (err: any) {
      setError(err.message || 'Billing service encountered an issue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!state.finalBill) {
      fetchFinalBill();
    }
  }, []);

  const handleDownloadPdf = () => {
    if (billData) {
      generateBillPdf(billData);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <Skeleton height="32px" width="50%" />
        <Skeleton height="16px" width="80%" />
        <div className="border border-base-border rounded-card p-6 bg-base-surface space-y-4">
          <Skeleton height="28px" width="100%" />
          <Skeleton height="150px" width="100%" />
          <Skeleton height="40px" width="100%" />
        </div>
      </div>
    );
  }

  if (error || !billData) {
    return (
      <div className="max-w-2xl mx-auto py-6">
        <SafetyNetFallback
          message={error || 'Billing generation service timed out.'}
          phone={state.serviceCentre?.phone || '+91 80 4932 7700'}
          centreName={state.serviceCentre?.name || 'Indiranagar Central Service Hub'}
          onRetry={fetchFinalBill}
        />
        <div className="pt-4 flex justify-between">
          <button
            type="button"
            onClick={resetFlow}
            className="px-4 py-2 text-xs font-medium text-ink-secondary hover:text-ink-primary bg-base-muted rounded-control border border-base-border"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  const { invoiceNumber, invoiceDate, customer, device, serviceCentre, bill } = billData;

  return (
    <div className="max-w-3xl mx-auto py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent mb-1">
            <CheckCircle className="w-4 h-4" />
            <span>Official Diagnostics Quote & Bill Generated</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink-primary">
            Final Itemised Bill
          </h2>
          <p className="text-xs text-ink-muted mt-1">
            Invoice: <span className="font-mono text-ink-primary">{invoiceNumber}</span> • Issued: {new Date(invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-text hover:bg-accent-hover text-xs font-medium rounded-control shadow-subtle transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Official PDF</span>
          </button>

          <button
            type="button"
            onClick={resetFlow}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-base-muted hover:bg-base-border text-ink-secondary hover:text-ink-primary text-xs font-medium rounded-control border border-base-border transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Over</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Bill Surface Card */}
        <div className="bg-base-surface border border-base-border rounded-card p-6 shadow-card">
          {/* Two-Column Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-base-border text-xs">
            <div>
              <span className="font-semibold text-ink-primary uppercase tracking-wider block mb-1.5">
                Customer Profile
              </span>
              <p className="font-medium text-ink-primary text-sm">{customer.name}</p>
              <p className="text-ink-secondary">{customer.phone}</p>
              <p className="text-ink-secondary">{customer.email}</p>
            </div>

            <div>
              <span className="font-semibold text-ink-primary uppercase tracking-wider block mb-1.5">
                Hardware Bench Details
              </span>
              <p className="font-medium text-ink-primary text-sm">{device.brand} {device.productName}</p>
              <p className="text-ink-secondary">Model: {device.modelNumber}</p>
              <p className="text-ink-secondary">Serial / IMEI: {device.serialNumber}</p>
            </div>
          </div>

          {/* Itemised Table */}
          <div className="py-6 border-b border-base-border">
            <h4 className="font-heading text-sm font-semibold text-ink-primary mb-3">
              Itemised Cost Breakdown
            </h4>

            <div className="space-y-2.5 text-xs">
              {bill.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start py-1 text-ink-secondary">
                  <div className="pr-4">
                    <span className="font-medium text-ink-primary block">{item.description}</span>
                    <span className="text-[11px] text-ink-muted capitalize">Category: {item.category} • Qty: {item.quantity}</span>
                  </div>
                  <span className="font-mono text-ink-primary whitespace-nowrap">
                    ₹{item.total.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal & GST Calculation Breakdown */}
          <div className="pt-4 space-y-2 text-xs text-ink-secondary">
            <div className="flex justify-between items-center">
              <span>Taxable Subtotal:</span>
              <span className="font-mono text-ink-primary">₹{bill.subtotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-ink-muted">
              <span>Central GST (CGST @ 9%):</span>
              <span className="font-mono">₹{bill.cgstAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-ink-muted">
              <span>State GST (SGST @ 9%):</span>
              <span className="font-mono">₹{bill.sgstAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-ink-secondary">
              <span>Total GST (18%):</span>
              <span className="font-mono text-ink-primary">₹{bill.totalGstAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-base-border text-base font-bold text-ink-primary">
              <span className="font-heading">Grand Total (INR):</span>
              <span className="font-heading text-xl text-accent">₹{bill.grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Designated Service Centre Card */}
        <div className="p-6 bg-base-surface border border-base-border rounded-card shadow-card">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent mb-2">
            <Building2 className="w-4 h-4" />
            <span>Designated Authorised Service Centre</span>
          </div>

          <h3 className="font-heading text-lg font-semibold text-ink-primary mb-1">
            {serviceCentre.name}
          </h3>

          <div className="space-y-1.5 text-xs text-ink-secondary mt-3">
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
              <span>{serviceCentre.address}, {serviceCentre.city}, {serviceCentre.state} {serviceCentre.pin_code}</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-accent shrink-0" />
              <span>Direct Hotline: <a href={`tel:${serviceCentre.phone}`} className="text-accent hover:underline font-mono font-medium">{serviceCentre.phone}</a></span>
            </p>
            <p className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-ink-muted shrink-0" />
              <span>Operating Hours: {serviceCentre.operating_hours}</span>
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-base-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Show this invoice code ({invoiceNumber}) upon physical device drop-off or courier handover.
            </p>

            <a
              href={`tel:${serviceCentre.phone.replace(/\s+/g, '')}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-base-muted hover:bg-base-border text-ink-primary text-xs font-medium rounded-control border border-base-border transition-colors whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5 text-accent" />
              <span>Call Service Desk</span>
            </a>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <button
            type="button"
            onClick={resetFlow}
            className="text-xs text-ink-muted hover:text-ink-primary underline underline-offset-4"
          >
            Finished? Start over and evaluate another device
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-text hover:bg-accent-hover text-sm font-semibold rounded-control shadow-subtle transition-colors"
          >
            Choose How to Pay
          </button>
        </div>
      </div>
    </div>
  );
};
