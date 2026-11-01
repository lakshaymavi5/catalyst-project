import React, { useState } from 'react';
import {
  CreditCard,
  Smartphone,
  Store,
  Clock,
  Package,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Download,
  Phone,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { useRepairFlow } from '../../context/RepairFlowContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { generateBillPdf } from '../../utils/pdfGenerator.js';

type PaymentMode = 'online' | 'at_centre' | 'pay_later' | null;
type RepairMode = 'self' | 'service_centre' | null;

export const Step8Payment: React.FC = () => {
  const { state, updateState, resetFlow, prevStep } = useRepairFlow();
  const { token } = useAuth();

  const [repairMode, setRepairMode] = useState<RepairMode>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(null);
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const billData = state.finalBill;
  const grandTotal = billData?.bill.grandTotal ?? 0;
  const serviceCentre = state.serviceCentre || billData?.serviceCentre;

  const handleConfirmPayment = async () => {
    if (!paymentMode) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceNumber: billData?.invoiceNumber,
          requestId: billData?.requestId,
          paymentMode,
          repairMode,
          upiId: paymentMode === 'online' ? upiId : undefined,
          amount: grandTotal
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Payment confirmation failed.');

      setTransactionId(json.data?.transactionId || null);
      updateState({
        paymentOption: paymentMode,
        paymentStatus: paymentMode === 'pay_later' ? 'pending' : 'paid',
        paymentTransactionId: json.data?.transactionId || null,
        selfRepairChosen: repairMode === 'self'
      });
      setIsDone(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPdf = () => {
    if (billData) generateBillPdf(billData);
  };

  // -- Success screen --
  if (isDone) {
    return (
      <div className="max-w-2xl mx-auto py-10 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div>
          <h2 className="font-heading text-2xl font-semibold text-ink-primary mb-2">
            {paymentMode === 'pay_later' ? 'Booking Confirmed' : 'Payment Done'}
          </h2>
          <p className="text-sm text-ink-secondary max-w-md mx-auto">
            {paymentMode === 'online' && 'Your payment was processed successfully. Show the PDF at the service centre or courier your device.'}
            {paymentMode === 'at_centre' && 'Your slot is booked. Take your device to the service centre and show the bill. Pay there in cash or UPI.'}
            {paymentMode === 'pay_later' && 'Your repair order is saved. You can pay when the technician collects or repairs your device.'}
          </p>
          {transactionId && (
            <p className="text-xs font-mono text-ink-muted mt-2">Transaction ID: {transactionId}</p>
          )}
        </div>

        {repairMode === 'self' && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-card text-left text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold">You chose to repair it yourself.</p>
            <p>The spare part will be shipped to your address. Once it arrives, follow the repair guide included in the package.</p>
            <p className="text-amber-700 dark:text-amber-400">Note: Self-repair voids the manufacturer warranty. This shop warranty is still valid if the part is defective.</p>
          </div>
        )}

        {repairMode === 'service_centre' && serviceCentre && (
          <div className="p-4 bg-base-surface border border-base-border rounded-card text-left text-xs space-y-1.5">
            <p className="font-semibold text-ink-primary text-sm">{serviceCentre.name}</p>
            <p className="flex items-start gap-1.5 text-ink-secondary">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-accent" />
              {serviceCentre.address}, {serviceCentre.city}
            </p>
            <a
              href={`tel:${(serviceCentre.phone || '').replace(/\s+/g, '')}`}
              className="flex items-center gap-1.5 text-accent hover:underline font-medium"
            >
              <Phone className="w-3.5 h-3.5" />
              {serviceCentre.phone}
            </a>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-text hover:bg-accent-hover text-xs font-semibold rounded-control shadow-subtle transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Receipt PDF
          </button>
          <button
            type="button"
            onClick={resetFlow}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-base-muted hover:bg-base-border text-ink-secondary text-xs font-medium rounded-control border border-base-border transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Step 8 of 8</p>
        <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink-primary">
          Choose How to Pay and Get Your Device Fixed
        </h2>
        <p className="text-sm text-ink-secondary mt-1">
          Pick the way that works best for you. No hidden steps.
        </p>
      </div>

      {/* Bill Summary strip */}
      {billData && (
        <div className="p-4 bg-base-surface border border-base-border rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div>
            <span className="text-xs text-ink-muted block">Invoice</span>
            <span className="font-mono text-ink-primary font-medium">{billData.invoiceNumber}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-ink-muted block">Amount Due (incl. 18% GST)</span>
            <span className="font-heading text-xl font-bold text-accent">
              ₹{grandTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}

      {/* Section 1: Repair mode */}
      <section aria-labelledby="repair-mode-heading">
        <h3 id="repair-mode-heading" className="font-heading text-base font-semibold text-ink-primary mb-3">
          How do you want the device repaired?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Self repair option */}
          <button
            type="button"
            onClick={() => setRepairMode('self')}
            className={`p-4 rounded-card border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              repairMode === 'self'
                ? 'border-accent bg-accent/5'
                : 'border-base-border bg-base-surface hover:border-accent/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Package className={`w-5 h-5 ${repairMode === 'self' ? 'text-accent' : 'text-ink-muted'}`} />
              <span className="font-semibold text-sm text-ink-primary">Receive the Part, Fix It Yourself</span>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              We order the spare part and send it to your address. You do the repair at home using the included guide.
            </p>
            <p className="text-xs text-ink-muted mt-2">Good for: Tech-savvy users, minor replacements like batteries or covers.</p>
          </button>

          {/* Service centre option */}
          <button
            type="button"
            onClick={() => setRepairMode('service_centre')}
            className={`p-4 rounded-card border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              repairMode === 'service_centre'
                ? 'border-accent bg-accent/5'
                : 'border-base-border bg-base-surface hover:border-accent/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Store className={`w-5 h-5 ${repairMode === 'service_centre' ? 'text-accent' : 'text-ink-muted'}`} />
              <span className="font-semibold text-sm text-ink-primary">Take It to the Service Centre</span>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Drop your device at the nearest authorised centre. A trained technician will fix it and hand it back.
            </p>
            {serviceCentre && (
              <p className="text-xs text-accent mt-2 font-medium">{serviceCentre.name}, {serviceCentre.city}</p>
            )}
          </button>
        </div>
      </section>

      {/* Section 2: Payment mode — shown only after repair mode is chosen */}
      {repairMode && (
        <section aria-labelledby="payment-mode-heading" className="space-y-3">
          <h3 id="payment-mode-heading" className="font-heading text-base font-semibold text-ink-primary">
            How do you want to pay?
          </h3>

          <div className="space-y-2">
            {/* Pay online */}
            <button
              type="button"
              onClick={() => setPaymentMode('online')}
              className={`w-full p-4 rounded-card border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent flex items-start gap-3 ${
                paymentMode === 'online'
                  ? 'border-accent bg-accent/5'
                  : 'border-base-border bg-base-surface hover:border-accent/50'
              }`}
            >
              <CreditCard className={`w-5 h-5 mt-0.5 shrink-0 ${paymentMode === 'online' ? 'text-accent' : 'text-ink-muted'}`} />
              <div>
                <span className="font-semibold text-sm text-ink-primary block">Pay Online Now</span>
                <span className="text-xs text-ink-secondary">UPI, credit/debit card, or net banking. You will get a digital receipt to show at the centre.</span>
              </div>
              {paymentMode === 'online' && (
                <CheckCircle2 className="w-4 h-4 text-accent ml-auto shrink-0 mt-0.5" />
              )}
            </button>

            {/* Pay at centre */}
            <button
              type="button"
              onClick={() => setPaymentMode('at_centre')}
              className={`w-full p-4 rounded-card border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent flex items-start gap-3 ${
                paymentMode === 'at_centre'
                  ? 'border-accent bg-accent/5'
                  : 'border-base-border bg-base-surface hover:border-accent/50'
              }`}
            >
              <Smartphone className={`w-5 h-5 mt-0.5 shrink-0 ${paymentMode === 'at_centre' ? 'text-accent' : 'text-ink-muted'}`} />
              <div>
                <span className="font-semibold text-sm text-ink-primary block">Pay at the Centre (Cash or UPI)</span>
                <span className="text-xs text-ink-secondary">Book your slot now, then pay when you arrive at the service centre. Show the bill on your phone or print it.</span>
              </div>
              {paymentMode === 'at_centre' && (
                <CheckCircle2 className="w-4 h-4 text-accent ml-auto shrink-0 mt-0.5" />
              )}
            </button>

            {/* Pay at time of repair */}
            <button
              type="button"
              onClick={() => setPaymentMode('pay_later')}
              className={`w-full p-4 rounded-card border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent flex items-start gap-3 ${
                paymentMode === 'pay_later'
                  ? 'border-accent bg-accent/5'
                  : 'border-base-border bg-base-surface hover:border-accent/50'
              }`}
            >
              <Clock className={`w-5 h-5 mt-0.5 shrink-0 ${paymentMode === 'pay_later' ? 'text-accent' : 'text-ink-muted'}`} />
              <div>
                <span className="font-semibold text-sm text-ink-primary block">Pay When the Repair is Done</span>
                <span className="text-xs text-ink-secondary">The technician will collect your device and payment together. Pay in cash or UPI after the repair is complete.</span>
              </div>
              {paymentMode === 'pay_later' && (
                <CheckCircle2 className="w-4 h-4 text-accent ml-auto shrink-0 mt-0.5" />
              )}
            </button>
          </div>

          {/* UPI input shown when online is selected */}
          {paymentMode === 'online' && (
            <div className="p-4 bg-base-surface border border-base-border rounded-card space-y-3">
              <h4 className="text-sm font-semibold text-ink-primary">Enter Your UPI ID</h4>
              <p className="text-xs text-ink-secondary">
                We will send a payment request to your UPI app (PhonePe, GPay, Paytm, etc.). Confirm there to complete the payment.
              </p>
              <div>
                <label htmlFor="upi-id" className="block text-xs font-medium text-ink-primary mb-1">
                  UPI ID (for example: yourname@upi)
                </label>
                <input
                  id="upi-id"
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@okicici"
                  className="w-full px-3 py-2 bg-base-muted/40 border border-base-border rounded-control text-sm text-ink-primary focus:border-accent focus:outline-none"
                />
                <p className="text-[11px] text-ink-muted mt-1">
                  You can also pay by card or net banking after clicking Confirm below.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-control text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Confirm button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={prevStep}
              className="text-xs text-ink-muted hover:text-ink-primary underline underline-offset-4"
            >
              Back to bill
            </button>
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isProcessing || !paymentMode || (paymentMode === 'online' && !upiId.trim())}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-text hover:bg-accent-hover text-sm font-semibold rounded-control shadow-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : (
                <>
                  {paymentMode === 'online' ? 'Confirm and Pay' : paymentMode === 'at_centre' ? 'Book My Slot' : 'Confirm Booking'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
