// src/routes/CompanyRoutes.jsx

import { Routes, Route } from "react-router-dom";
import JobRequestList from "../pages/jobrequests/JobRequestList";
import PrivateRoute from "../components/PrivateRoute";
import Layout from "../components/layout/Layout";
import OnboardingGuard from "./OnboardingGuard";
import CompanyJobDetails from "../pages/jobrequests/CompanyJobDetails";
import CompanyDashboard from "../pages/company/CompanyDashboard";
import CompanyProfile from "../pages/profile/CompanyProfile";
import MyLeads from "../pages/company/MyLeads";
import LeadDetailsPage from "../pages/leads/LeadDetailsPage";
import OfferEdit from "../pages/company/OfferEdit";
import OfferDetails from "../pages/company/OfferDetails";

export default function CompanyRoutes() {
  return (
    <Routes>
      <Route element={<PrivateRoute roles={["company"]} />}>
        <Route element={<OnboardingGuard />}>
          <Route element={<Layout />}>

            <Route index element={<CompanyDashboard />} />
            <Route path="profile" element={<CompanyProfile />} />

            <Route path="leads/mine" element={<MyLeads />} />
            <Route path="leads/:id" element={<LeadDetailsPage />} />
            <Route path="jobrequests" element={<JobRequestList />} />
            <Route path="jobrequests/:jobId" element={<CompanyJobDetails />} />
            <Route path="jobrequests/:jobId/offer/edit" element={<OfferEdit />} />
            <Route path="offers/:id" element={<OfferDetails />} />

          </Route>
        </Route>
      </Route>
    </Routes>
  );
}