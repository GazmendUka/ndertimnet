// src/routes/CustomerRoutes

import { Routes, Route } from "react-router-dom";

import PrivateRoute from "../components/PrivateRoute";
import Layout from "../components/layout/Layout";
import OnboardingGuard from "./OnboardingGuard";

import CustomerDashboard from "../pages/customer/CustomerDashboard";
import CustomerProfile from "../pages/profile/CustomerProfile";
import JobRequestCreate from "../pages/jobrequests/JobRequestCreate";
import JobRequestEdit from "../pages/jobrequests/JobRequestEdit";
import CustomerOfferDetailsPage from "../pages/customer/CustomerOfferDetailsPage";
import JobRequestList from "../pages/jobrequests/JobRequestList";

export default function CustomerRoutes() {
  return (
    <Routes>
      <Route element={<PrivateRoute roles={["customer"]} />}>
        <Route element={<OnboardingGuard />}>
          <Route element={<Layout />}>

            <Route index element={<CustomerDashboard />} />
            <Route path="profile" element={<CustomerProfile />} />

            <Route path="jobrequests" element={<JobRequestList />} />
            <Route path="jobrequests/create" element={<JobRequestCreate />} />
            <Route path="jobrequests/:id/edit" element={<JobRequestEdit />} />


            <Route path="offers/:id" element={<CustomerOfferDetailsPage />} />

          </Route>
        </Route>
      </Route>
    </Routes>
  );
}