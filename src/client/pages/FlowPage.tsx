import React from 'react';
import { useRepairFlow } from '../context/RepairFlowContext.js';
import { Stepper } from '../components/layout/Stepper.js';
import { Step1Login } from '../components/steps/Step1Login.js';
import { Step2PhotoUpload } from '../components/steps/Step2PhotoUpload.js';
import { Step3ProductDetails } from '../components/steps/Step3ProductDetails.js';
import { Step4BudgetLocation } from '../components/steps/Step4BudgetLocation.js';
import { Step5Estimate } from '../components/steps/Step5Estimate.js';
import { Step6Replacements } from '../components/steps/Step6Replacements.js';
import { Step7FinalBill } from '../components/steps/Step7FinalBill.js';
import { Step8Payment } from '../components/steps/Step8Payment.js';

export const FlowPage: React.FC = () => {
  const { state } = useRepairFlow();

  const renderCurrentStep = () => {
    switch (state.currentStep) {
      case 1:
        return <Step1Login />;
      case 2:
        return <Step2PhotoUpload />;
      case 3:
        return <Step3ProductDetails />;
      case 4:
        return <Step4BudgetLocation />;
      case 5:
        return <Step5Estimate />;
      case 6:
        return <Step6Replacements />;
      case 7:
        return <Step7FinalBill />;
      case 8:
        return <Step8Payment />;
      default:
        return <Step1Login />;
    }
  };

  return (
    <div>
      {/* 8-Step Horizontal Stepper Navigation */}
      <Stepper />

      {/* Main Flow Content Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6" id="main-content">
        {renderCurrentStep()}
      </main>
    </div>
  );
};
