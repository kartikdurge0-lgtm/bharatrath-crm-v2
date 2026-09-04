import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Authentication
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import { supabase } from "./lib/supabase";

// Dashboard
import Dashboard from "./pages/Dashboard";

// Clients
import Clients from "./pages/Clients";
import AddClient from "./pages/AddClient";
import ClientDetails from "./pages/ClientDetails";
import EditClient from "./pages/EditClient";
import ArchivedClients from "./pages/ArchivedClients";

// Renewals
import Renewals from "./pages/Renewals";
import AddRenewal from "./pages/AddRenewal";
import RenewalDetails from "./pages/RenewalDetails";
import EditRenewal from "./pages/EditRenewal";

// Follow-ups
import FollowUps from "./pages/FollowUps";
import AddFollowUp from "./pages/AddFollowUp";
import FollowUpDetails from "./pages/FollowUpDetails";
import EditFollowUp from "./pages/EditFollowUp";

// Sales Persons
import SalesPersons from "./pages/SalesPersons";
import AddSalesPerson from "./pages/AddSalesPerson";

// Leads
import Leads from "./pages/Leads";
import AddLead from "./pages/AddLead";
import LeadDetails from "./pages/LeadDetails";
import EditLead from "./pages/EditLead";

// Services
import Services from "./pages/Services";
import AddService from "./pages/AddService";
import ServiceDetails from "./pages/ServiceDetails";
import EditService from "./pages/EditService";

// Quotations
import Quotations from "./pages/Quotations";
import AddQuotation from "./pages/AddQuotation";
import QuotationDetails from "./pages/QuotationDetails";
import EditQuotation from "./pages/EditQuotation";

// Invoices
import Invoices from "./pages/Invoices";
import AddInvoice from "./pages/AddInvoice";
import InvoiceDetails from "./pages/InvoiceDetails";
import EditInvoice from "./pages/EditInvoice";

// Payments
import Payments from "./pages/Payments";

// Reports
import Reports from "./pages/Reports";

// Settings
import Settings from "./pages/Settings";

function App() {
  console.log("Supabase client:", supabase);

  return (
    <BrowserRouter>
      <Routes>
        {/* =========================================
            AUTHENTICATION
        ========================================= */}

        <Route path="/login" element={<Login />} />

        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* =========================================
            PROTECTED CRM
        ========================================= */}

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            {/* =========================================
                DASHBOARD
            ========================================= */}

            <Route path="/" element={<Dashboard />} />

            {/* =========================================
                CLIENT MANAGEMENT
            ========================================= */}

            <Route path="/clients" element={<Clients />} />

            <Route path="/add-client" element={<AddClient />} />

            <Route path="/clients/:clientId" element={<ClientDetails />} />

            <Route path="/clients/:clientId/edit" element={<EditClient />} />

            <Route path="/archived-clients" element={<ArchivedClients />} />

            {/* =========================================
                RENEWALS
            ========================================= */}

            <Route path="/renewals" element={<Renewals />} />

            <Route path="/add-renewal" element={<AddRenewal />} />

            <Route path="/renewals/:renewalId" element={<RenewalDetails />} />

            <Route path="/renewals/:renewalId/edit" element={<EditRenewal />} />

            {/* =========================================
                FOLLOW-UPS
            ========================================= */}

            <Route path="/follow-ups" element={<FollowUps />} />

            <Route path="/add-follow-up" element={<AddFollowUp />} />

            <Route
              path="/follow-ups/:followUpId"
              element={<FollowUpDetails />}
            />

            <Route
              path="/follow-ups/:followUpId/edit"
              element={<EditFollowUp />}
            />

            {/* =========================================
                LEADS
            ========================================= */}

            <Route path="/leads" element={<Leads />} />

            <Route path="/add-lead" element={<AddLead />} />

            <Route path="/leads/:leadId" element={<LeadDetails />} />

            <Route path="/leads/:leadId/edit" element={<EditLead />} />

            {/* =========================================
                SALES PERSONS
            ========================================= */}

            <Route path="/sales-persons" element={<SalesPersons />} />

            <Route path="/add-sales-person" element={<AddSalesPerson />} />

            {/* =========================================
                SERVICES
            ========================================= */}

            <Route path="/services" element={<Services />} />

            <Route path="/add-service" element={<AddService />} />

            <Route path="/services/:serviceId" element={<ServiceDetails />} />

            <Route path="/services/:serviceId/edit" element={<EditService />} />

            {/* =========================================
                QUOTATIONS
            ========================================= */}

            <Route path="/quotations" element={<Quotations />} />

            <Route path="/add-quotation" element={<AddQuotation />} />

            <Route
              path="/quotations/:quotationId"
              element={<QuotationDetails />}
            />

            <Route
              path="/quotations/:quotationId/edit"
              element={<EditQuotation />}
            />

            {/* =========================================
                INVOICES
            ========================================= */}

            <Route path="/invoices" element={<Invoices />} />

            <Route path="/add-invoice" element={<AddInvoice />} />

            <Route path="/invoices/:invoiceId" element={<InvoiceDetails />} />

            <Route path="/invoices/:invoiceId/edit" element={<EditInvoice />} />

            {/* =========================================
                PAYMENTS
            ========================================= */}

            <Route path="/payments" element={<Payments />} />

            {/* =========================================
                REPORTS
            ========================================= */}

            <Route path="/reports" element={<Reports />} />

            {/* =========================================
                SETTINGS
            ========================================= */}

            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* =========================================
            FALLBACK
        ========================================= */}

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
