import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, MapPin, Clock, Tag, AlertCircle, CheckCircle, ArrowLeft, RefreshCw, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Skeleton } from '../components/common/Skeleton.js';
import { OpenTicket, RepairBid } from '../types/index.js';

export const RepairmanDashboard: React.FC = () => {
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState<'tickets' | 'myBids'>('tickets');
  const [tickets, setTickets] = useState<OpenTicket[]>([]);
  const [myBids, setMyBids] = useState<Array<RepairBid & { ticket?: OpenTicket }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Bid submission modal state
  const [selectedTicket, setSelectedTicket] = useState<OpenTicket | null>(null);
  const [bidPrice, setBidPrice] = useState<number | string>('');
  const [turnaroundDays, setTurnaroundDays] = useState<number>(1);
  const [warrantyDays, setWarrantyDays] = useState<number>(90);
  const [repairApproach, setRepairApproach] = useState<string>('');
  const [isSubmittingBid, setIsSubmittingBid] = useState<boolean>(false);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);
  const [bidError, setBidError] = useState<string | null>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = categoryFilter !== 'all' ? `/api/bids/tickets?deviceType=${categoryFilter}` : '/api/bids/tickets';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to fetch tickets.');
      setTickets(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading tickets.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyBids = async () => {
    try {
      const res = await fetch('/api/bids/my-bids', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok) {
        setMyBids(json.data || []);
      }
    } catch (err) {
      // Ignore
    }
  };

  useEffect(() => {
    if (token) {
      fetchTickets();
      fetchMyBids();
    }
  }, [token, categoryFilter]);

  const handleOpenBidModal = (ticket: OpenTicket) => {
    setSelectedTicket(ticket);
    setBidPrice(Math.round(ticket.budget_inr * 0.75)); // reasonable starting recommendation
    setTurnaroundDays(1);
    setWarrantyDays(90);
    setRepairApproach(`Direct replacement with certified OEM-grade components. Tested on diagnostic bench with 90-day shop warranty.`);
    setBidSuccess(null);
    setBidError(null);
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setIsSubmittingBid(true);
    setBidError(null);

    try {
      const res = await fetch('/api/bids/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          bidPrice: Number(bidPrice),
          turnaroundDays,
          warrantyDays,
          repairApproach
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to submit quote.');

      setBidSuccess(`Your quote of ₹${Number(bidPrice).toLocaleString('en-IN')} was dispatched to the customer!`);
      fetchTickets();
      fetchMyBids();

      setTimeout(() => {
        setSelectedTicket(null);
        setBidSuccess(null);
      }, 2000);
    } catch (err: any) {
      setBidError(err.message || 'Could not submit quote.');
    } finally {
      setIsSubmittingBid(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header and Workshop Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-base-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent mb-1">
            <Wrench className="w-4 h-4" />
            <span>Repair Specialist Portal & Dispatch Feed</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-ink-primary">
            {user?.shopName || 'Workshop Dispatch Board'}
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            <MapPin className="w-3.5 h-3.5 inline mr-1" />
            {user?.shopAddress || 'Local Workbench'}, {user?.shopCity || 'Bengaluru'} ({user?.shopPin || '560038'})
            {user?.shopPhone && ` • Phone: ${user.shopPhone}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-base-muted hover:bg-base-border text-ink-secondary hover:text-ink-primary text-xs font-medium rounded-control border border-base-border transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Switch to Customer Flow</span>
          </Link>

          <button
            type="button"
            onClick={() => { fetchTickets(); fetchMyBids(); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-base-surface hover:bg-base-muted text-ink-primary text-xs font-medium rounded-control border border-base-border transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-accent" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-base-border mb-6">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`pb-3 text-xs font-medium transition-colors border-b-2 -mb-[2px] ${
              activeTab === 'tickets'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-ink-secondary hover:text-ink-primary'
            }`}
          >
            Open Diagnostic Requests ({tickets.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('myBids')}
            className={`pb-3 text-xs font-medium transition-colors border-b-2 -mb-[2px] ${
              activeTab === 'myBids'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-ink-secondary hover:text-ink-primary'
            }`}
          >
            My Submitted Offers ({myBids.length})
          </button>
        </div>

        {activeTab === 'tickets' && (
          <div className="flex items-center gap-2 pb-2">
            <Filter className="w-3.5 h-3.5 text-ink-muted" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-base-surface border border-base-border rounded-control px-2.5 py-1 text-ink-primary focus:border-accent"
            >
              <option value="all">All Device Categories</option>
              <option value="smartphone">Smartphones Only</option>
              <option value="laptop">Laptops Only</option>
              <option value="tablet">Tablets Only</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton height="100px" width="100%" />
          <Skeleton height="100px" width="100%" />
          <Skeleton height="100px" width="100%" />
        </div>
      ) : activeTab === 'tickets' ? (
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-base-surface border border-red-300 rounded-control text-xs text-red-700">
              {error}
            </div>
          )}

          {tickets.length === 0 ? (
            <div className="p-12 text-center bg-base-surface border border-base-border rounded-card">
              <p className="text-sm font-heading text-ink-primary mb-1">
                No open customer tickets matching this filter.
              </p>
              <p className="text-xs text-ink-muted">
                New diagnostic requests will appear here as soon as customers specify their device symptoms.
              </p>
            </div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                className="p-5 bg-base-surface border border-base-border rounded-card shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-base-border/80"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-base font-semibold text-ink-primary">
                      {t.brand} {t.product_name}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 bg-base-muted rounded-control border border-base-border uppercase text-ink-secondary">
                      {t.device_type}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      Model: {t.model_number}
                    </span>
                  </div>

                  {/* Fault list */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {t.fault_types.map((f) => (
                      <span
                        key={f}
                        className="text-xs px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50 rounded-control"
                      >
                        {f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-ink-secondary pt-1">
                    <span>
                      <MapPin className="w-3.5 h-3.5 inline mr-1 text-ink-muted" />
                      PIN: <span className="font-mono">{t.pin_code}</span> ({t.city || 'Bengaluru'})
                    </span>
                    <span>
                      <Tag className="w-3.5 h-3.5 inline mr-1 text-accent" />
                      Customer Budget: <span className="font-semibold text-ink-primary">₹{t.budget_inr.toLocaleString('en-IN')}</span>
                    </span>
                    <span>
                      <Clock className="w-3.5 h-3.5 inline mr-1 text-ink-muted" />
                      Reported {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-base-border">
                  <div className="text-left md:text-right">
                    <span className="text-xs text-ink-muted block">Existing Shop Quotes</span>
                    <span className="text-sm font-semibold text-ink-primary">
                      {t.bidCount || 0} Offers
                    </span>
                    {t.lowestBid && (
                      <span className="text-xs text-accent block">
                        Lowest: ₹{t.lowestBid.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenBidModal(t)}
                    className="px-4 py-2 bg-accent text-accent-text hover:bg-accent-hover text-xs font-medium rounded-control shadow-subtle transition-colors whitespace-nowrap"
                  >
                    Submit Repair Offer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* My Submitted Bids Tab */
        <div className="space-y-4">
          {myBids.length === 0 ? (
            <div className="p-12 text-center bg-base-surface border border-base-border rounded-card">
              <p className="text-sm font-heading text-ink-primary mb-1">
                You haven't submitted any repair quotes yet.
              </p>
              <p className="text-xs text-ink-muted">
                Review open customer tickets in the first tab and make competitive offers to earn repair orders.
              </p>
            </div>
          ) : (
            myBids.map((b) => (
              <div
                key={b.id}
                className="p-5 bg-base-surface border border-base-border rounded-card shadow-card space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-base-border">
                  <div>
                    <span className="text-xs text-ink-muted">Ticket ID: {b.ticket_id}</span>
                    <h3 className="font-heading text-base font-semibold text-ink-primary">
                      {b.ticket ? `${b.ticket.brand} ${b.ticket.product_name}` : 'Customer Device'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-ink-muted block">Your Quoted Price</span>
                      <span className="font-heading text-lg font-bold text-accent">
                        ₹{b.bid_price.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-control border ${
                        b.status === 'accepted'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : b.status === 'declined'
                          ? 'bg-neutral-100 text-neutral-600 border-neutral-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {b.status === 'accepted' ? 'Accepted by Customer' : b.status === 'declined' ? 'Declined' : 'Pending Customer Review'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-ink-secondary leading-relaxed">
                  <p className="font-medium text-ink-primary mb-0.5">Your Repair Methodology:</p>
                  <p>{b.repair_approach}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted pt-2 border-t border-base-border">
                  <span>Turnaround: {b.turnaround_days} day(s)</span>
                  <span>Shop Warranty: {b.warranty_days} days</span>
                  <span>Submitted: {new Date(b.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Quote Submission Modal */}
      {selectedTicket && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="bg-base-surface border border-base-border rounded-card p-6 max-w-lg w-full shadow-card">
            <h3 className="font-heading text-lg font-semibold text-ink-primary mb-1">
              Submit Repair Offer
            </h3>
            <p className="text-xs text-ink-secondary mb-4">
              Offering quote for {selectedTicket.brand} {selectedTicket.product_name} (Customer Budget: ₹{selectedTicket.budget_inr.toLocaleString('en-IN')})
            </p>

            {bidSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-control text-xs flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{bidSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitBid} className="space-y-4">
                {bidError && (
                  <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-control text-xs flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{bidError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="bid-price" className="block text-xs font-semibold text-ink-primary mb-1">
                    Offered Total Price (INR, inclusive of labour)
                  </label>
                  <input
                    id="bid-price"
                    type="number"
                    min="500"
                    step="100"
                    required
                    value={bidPrice}
                    onChange={(e) => setBidPrice(e.target.value)}
                    placeholder="e.g. 11500"
                    className="w-full px-3 py-2 bg-base-muted/40 border border-base-border rounded-control text-sm font-semibold text-ink-primary focus:border-accent"
                  />
                  <p className="text-[11px] text-ink-muted mt-1">
                    Official OEM factory rate is ~₹17,900. Competitive local rates win customer trust.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="turnaround" className="block text-xs font-medium text-ink-primary mb-1">
                      Turnaround (Days)
                    </label>
                    <input
                      id="turnaround"
                      type="number"
                      min="1"
                      max="14"
                      required
                      value={turnaroundDays}
                      onChange={(e) => setTurnaroundDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-base-muted/40 border border-base-border rounded-control text-xs text-ink-primary focus:border-accent"
                    />
                  </div>

                  <div>
                    <label htmlFor="warranty" className="block text-xs font-medium text-ink-primary mb-1">
                      Shop Warranty (Days)
                    </label>
                    <input
                      id="warranty"
                      type="number"
                      min="30"
                      step="30"
                      required
                      value={warrantyDays}
                      onChange={(e) => setWarrantyDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-base-muted/40 border border-base-border rounded-control text-xs text-ink-primary focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="approach" className="block text-xs font-medium text-ink-primary mb-1">
                    Repair Methodology & Technical Explanation
                  </label>
                  <textarea
                    id="approach"
                    rows={3}
                    required
                    value={repairApproach}
                    onChange={(e) => setRepairApproach(e.target.value)}
                    placeholder="Describe how your shop fixes this fault (e.g. component micro-soldering, Tier-1 OEM panel lamination, etc.)"
                    className="w-full px-3 py-2 bg-base-muted/40 border border-base-border rounded-control text-xs text-ink-primary focus:border-accent leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-3.5 py-2 text-xs font-medium text-ink-secondary hover:text-ink-primary"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingBid}
                    className="px-5 py-2 bg-accent text-accent-text hover:bg-accent-hover text-xs font-medium rounded-control transition-colors"
                  >
                    {isSubmittingBid ? 'Submitting...' : 'Dispatch Quote to Customer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
