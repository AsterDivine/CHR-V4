import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation.jsx';
import Home from './pages/Home.jsx';

import CHRDashboard from './pages/chr/CHRDashboard.jsx';
import ProcurementTable from './pages/chr/ProcurementTable.jsx';
import ProcurementForm from './pages/chr/ProcurementForm.jsx';
import ProcurementDetails from './pages/chr/ProcurementDetails.jsx';
import CHRBids from './pages/chr/CHRBids.jsx';
import SimpleFinancialMonitoring from './pages/chr/SimpleFinancialMonitoring.jsx';
import TransactionHistoryView from './pages/chr/TransactionHistoryView.jsx';

import BidderOpportunities from './pages/bidder/BidderOpportunities.jsx';
import BidderQuotationForm from './pages/bidder/BidderQuotationForm.jsx';
import BidderSubmittedQuotations from './pages/bidder/BidderSubmittedQuotations.jsx';

/**
 * Main Application Root Component
 * @returns {JSX.Element} React routing tree.
 */
export default function App() {
  return (
    <Navigation>
      <Routes>
        {/* Root Route: Landing Page / Prototype View Selector */}
        <Route path="/" element={<Home />} />

        {/* ================================================================= */}
        {/* CHR PERSONNEL MODULES (Core Functions)                            */}
        {/* ================================================================= */}
        {/* 1. CHR Dashboard */}
        <Route path="/chr/dashboard" element={<CHRDashboard />} />

        {/* 2. Procurement Records Table */}
        <Route path="/chr/procurements" element={<ProcurementTable />} />

        {/* 3. Create Procurement Form */}
        <Route path="/chr/procurements/new" element={<ProcurementForm />} />

        {/* Edit Procurement Form */}
        <Route path="/chr/procurements/:id/edit" element={<ProcurementForm />} />

        {/* 4. Procurement Details */}
        <Route path="/chr/procurements/:id" element={<ProcurementDetails />} />

        {/* 5. CHR Bids Evaluation Portal */}
        <Route path="/chr/bids" element={<CHRBids />} />

        {/* 6. Simple Financial Monitoring Ledger */}
        <Route path="/chr/financials" element={<SimpleFinancialMonitoring />} />

        {/* 7. Transaction History Audit Log */}
        <Route path="/chr/history" element={<TransactionHistoryView />} />

        {/* 1. Open Opportunities Catalog */}
        <Route path="/bidder/opportunities" element={<BidderOpportunities />} />

        {/* 2. Submit Quotation Form */}
        <Route path="/bidder/submit-bid" element={<BidderQuotationForm />} />

        {/* 3. My Submitted Quotations */}
        <Route path="/bidder/my-quotations" element={<BidderSubmittedQuotations />} />

        {/* Fallback for unknown paths: Redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Navigation>
  );
}
