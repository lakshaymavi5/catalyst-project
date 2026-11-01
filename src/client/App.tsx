import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { RepairFlowProvider } from './context/RepairFlowContext.js';
import { Navbar } from './components/layout/Navbar.js';
import { Footer } from './components/layout/Footer.js';
import { FlowPage } from './pages/FlowPage.js';
import { TermsPage } from './pages/TermsPage.js';
import { PrivacyPage } from './pages/PrivacyPage.js';
import { RepairmanDashboard } from './pages/RepairmanDashboard.js';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RepairFlowProvider>
          <div className="flex flex-col min-h-screen bg-base-bg text-ink-primary">
            {/* Header / Navbar */}
            <Navbar />

            {/* Application Routing */}
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<FlowPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/dispatch" element={<RepairmanDashboard />} />
                <Route path="*" element={<FlowPage />} />
              </Routes>
            </div>

            {/* Footer */}
            <Footer />
          </div>
        </RepairFlowProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
