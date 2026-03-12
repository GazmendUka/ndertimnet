// src/routes/CompanyRoutes.jsx

import { Route } from "react-router-dom";

import PrivateRoute from "../components/PrivateRoute";
import Layout from "../components/layout/Layout";
import OnboardingGuard from "./OnboardingGuard";

import CompanyDashboard from "../pages/company/CompanyDashboard";
import CompanyProfile from "../pages/profile/CompanyProfile";
import MyLeads from "../pages/company/MyLeads";
import LeadDetailsPage from "../pages/leads/LeadDetailsPage";
import OfferEdit from "../pages/company/OfferEdit";
import OfferDetails from "../pages/company/OfferDetails";

export default function CompanyRoutes() {
  return (
    <Route element={<OnboardingGuard />}>
      <Route element={<PrivateRoute roles={["company"]} />}>
        <Route element={<Layout />}>
          <Route path="/dashboard/company" element={<CompanyDashboard />} />
          <Route path="/profile/company" element={<CompanyProfile />} />
          <Route path="/company/jobrequests/:jobId/offer/edit" element={<OfferEdit />} />
          <Route path="/leads/mine" element={<MyLeads />} />
          <Route path="/leads/:id" element={<LeadDetailsPage />} />
          <Route path="/company/offers/:id" element={<OfferDetails />} />
        </Route>
      </Route>
    </Route>
  );
}