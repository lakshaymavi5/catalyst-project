import React, { createContext, useContext, useState, useEffect } from 'react';
import { FlowState } from '../types/index.js';
import { useAuth } from './AuthContext.js';

export interface FallbackSafetyNet {
  message: string;
  phone: string;
  centreName: string;
  onRetry: () => void;
}

interface RepairFlowContextType {
  state: FlowState;
  updateState: (updates: Partial<FlowState>) => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetFlow: () => void;
  safetyNet: FallbackSafetyNet | null;
  setSafetyNet: (net: FallbackSafetyNet | null) => void;
  canAccessStep: (step: number) => boolean;
}

const INITIAL_STATE: FlowState = {
  currentStep: 1,
  highestCompletedStep: 0,
  photoUrl: '',
  photoOriginalName: '',
  deviceType: 'smartphone',
  brand: 'Apple',
  productName: 'iPhone 15 Pro',
  modelNumber: 'A3106',
  serialNumber: 'F2LNQ1P0M9',
  faults: ['screen_crack'],
  budget: 20000,
  pinCode: '560038',
  city: 'Bengaluru',
  state: 'Karnataka',
  serviceCentre: null,
  estimateData: null,
  selectedOption: 'repair_original',
  replacementRecommendations: null,
  selectedReplacement: null,
  finalBill: null,
  paymentOption: null,
  paymentStatus: null,
  paymentTransactionId: null,
  selfRepairChosen: false,
};

const RepairFlowContext = createContext<RepairFlowContextType | undefined>(undefined);

export const RepairFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [state, setState] = useState<FlowState>(INITIAL_STATE);
  const [safetyNet, setSafetyNet] = useState<FallbackSafetyNet | null>(null);

  // Sync authentication with step route guards
  useEffect(() => {
    if (!isAuthLoading) {
      if (isAuthenticated) {
        // If user logs in while at step 1, advance to step 2 if not yet advanced
        setState(prev => {
          if (prev.currentStep === 1) {
            return {
              ...prev,
              currentStep: 2,
              highestCompletedStep: Math.max(prev.highestCompletedStep, 1)
            };
          }
          return prev;
        });
      } else {
        // If unauthenticated, force to step 1
        setState(prev => ({
          ...prev,
          currentStep: 1
        }));
      }
    }
  }, [isAuthenticated, isAuthLoading]);

  const canAccessStep = (targetStep: number): boolean => {
    if (targetStep === 1) return true;
    if (!isAuthenticated) return false;
    // User can access any step up to highestCompletedStep + 1
    return targetStep <= state.highestCompletedStep + 1;
  };

  const updateState = (updates: Partial<FlowState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (step: number) => {
    if (canAccessStep(step)) {
      setSafetyNet(null);
      setState(prev => ({ ...prev, currentStep: step }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const nextStep = () => {
    const next = state.currentStep + 1;
    setSafetyNet(null);
    setState(prev => ({
      ...prev,
      currentStep: next,
      highestCompletedStep: Math.max(prev.highestCompletedStep, prev.currentStep)
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    if (state.currentStep > 1) {
      setSafetyNet(null);
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const resetFlow = () => {
    setSafetyNet(null);
    setState({
      ...INITIAL_STATE,
      currentStep: isAuthenticated ? 2 : 1,
      highestCompletedStep: isAuthenticated ? 1 : 0
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <RepairFlowContext.Provider
      value={{
        state,
        updateState,
        goToStep,
        nextStep,
        prevStep,
        resetFlow,
        safetyNet,
        setSafetyNet,
        canAccessStep
      }}
    >
      {children}
    </RepairFlowContext.Provider>
  );
};

export function useRepairFlow() {
  const context = useContext(RepairFlowContext);
  if (!context) {
    throw new Error('useRepairFlow must be used within a RepairFlowProvider');
  }
  return context;
}
