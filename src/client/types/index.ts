export type UserRole = 'customer' | 'repairman';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: UserRole;
  shopName?: string;
  shopAddress?: string;
  shopCity?: string;
  shopPin?: string;
  shopPhone?: string;
}

export interface RepairBid {
  id: string;
  ticket_id: string;
  repairman_id: string;
  repairman_name: string;
  shop_name: string;
  shop_address: string;
  shop_city: string;
  shop_pin: string;
  shop_phone: string;
  bid_price: number;
  parts_cost: number;
  labour_cost: number;
  turnaround_days: number;
  warranty_days: number;
  repair_approach: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface OpenTicket {
  id: string;
  user_id: string;
  customer_name?: string;
  customer_phone?: string;
  device_photo_url: string;
  device_type: string;
  brand: string;
  product_name: string;
  model_number: string;
  serial_number: string;
  fault_types: string[];
  budget_inr: number;
  pin_code: string;
  city?: string;
  service_centre_id: string;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  status: string;
  bidCount?: number;
  lowestBid?: number | null;
  created_at: string;
}

export interface ServiceCentre {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  phone: string;
  email: string;
  operating_hours: string;
  rating: number;
}

export interface EstimateBreakdownItem {
  faultType: string;
  faultLabel: string;
  originalPartCost: number;
  labourCost: number;
  turnaroundDays: number;
  cheaperAltName: string;
  cheaperAltCost: number;
  cheaperAltTradeoff: string;
}

export interface EstimateData {
  deviceType: string;
  brand: string;
  faults: string[];
  originalRepair: {
    partsTotal: number;
    labourTotal: number;
    subtotal: number;
    estimatedTurnaroundDays: number;
    fitsBudget: boolean;
    budgetDifference: number;
  };
  cheaperAlternative: {
    name: string;
    totalCost: number;
    savingsAmount: number;
    tradeoffExplanation: string;
    fitsBudget: boolean;
  };
  breakdown: EstimateBreakdownItem[];
  disclaimer: string;
}

export interface ReplacementOption {
  id: string;
  device_type: string;
  name: string;
  condition: string;
  price: number;
  key_difference: string;
  best_for: string;
  suitability_criteria: string;
  isRecommended?: boolean;
}

export interface ReplacementRecommendationResult {
  options: ReplacementOption[];
  recommendedId: string;
  recommendationReason: string;
  comparisonFactors: {
    repairCostRatio: number;
    isMultiFault: boolean;
    hasLiquidOrBoardDamage: boolean;
    budgetCoverage: 'under_budget' | 'matches_budget' | 'exceeds_budget';
  };
}

export interface BillItem {
  description: string;
  category: 'part' | 'labour' | 'diagnostic' | 'replacement';
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface BillBreakdown {
  items: BillItem[];
  subtotal: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  totalGstRate: number;
  totalGstAmount: number;
  grandTotal: number;
}

export interface FinalBillData {
  invoiceNumber: string;
  requestId: string;
  invoiceDate: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  device: {
    deviceType: string;
    brand: string;
    productName: string;
    modelNumber: string;
    serialNumber: string;
    photoUrl?: string;
  };
  serviceCentre: ServiceCentre;
  bill: BillBreakdown;
}

export interface FlowState {
  currentStep: number;
  highestCompletedStep: number;
  
  // Step 2 Data
  photoUrl: string;
  photoOriginalName: string;

  // Step 3 Data
  deviceType: string;
  brand: string;
  productName: string;
  modelNumber: string;
  serialNumber: string;
  faults: string[];

  // Step 4 Data
  budget: number | '';
  pinCode: string;
  city: string;
  state: string;
  serviceCentre: ServiceCentre | null;

  // Step 5 Data
  estimateData: EstimateData | null;
  selectedOption: 'repair_original' | 'repair_cheaper' | 'replacement' | 'repair_marketplace_bid' | null;
  ticketId?: string;
  marketBids?: RepairBid[];
  acceptedBid?: RepairBid | null;

  // Step 6 Data
  replacementRecommendations: ReplacementRecommendationResult | null;
  selectedReplacement: ReplacementOption | null;

  // Step 7 Data
  finalBill: FinalBillData | null;

  // Step 8 Data (Payment)
  paymentOption: 'online' | 'at_centre' | 'pay_later' | null;
  paymentStatus: 'pending' | 'processing' | 'paid' | 'confirmed_at_centre' | null;
  paymentTransactionId: string | null;
  selfRepairChosen: boolean;
}

export interface PaymentResult {
  transactionId: string;
  paidAmount: number;
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'at_centre' | 'pay_later';
  paidAt: string;
  status: 'success' | 'pending';
  receiptUrl?: string;
}
