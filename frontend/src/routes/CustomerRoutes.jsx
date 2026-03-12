// src/routes/CustomerRoutes.jsx

import { Route } from "react-router-dom";

import PrivateRoute from "../components/PrivateRoute";
import Layout from "../components/layout/Layout";
import OnboardingGuard from "./OnboardingGuard";

import CustomerDashboard from "../pages/customer/CustomerDashboard";
import CustomerProfile from "../pages/profile/CustomerProfile";
import JobRequestCreate from "../pages/jobrequests/JobRequestCreate";
import JobRequestEdit from "../pages/jobrequests/JobRequestEdit";
import CustomerOfferDetailsPage from "../pages/customer/CustomerOfferDetailsPage";

export default function CustomerRoutes() {
  return (
    <>
      <Route element={<OnboardingGuard />}>
        <Route element={<PrivateRoute roles={["customer"]} />}>
          <Route element={<Layout />}>

            <Route path="/dashboard/customer" element={<CustomerDashboard />} />

            <Route path="/profile/customer" element={<CustomerProfile />} />

            <Route path="/jobrequests/create" element={<JobRequestCreate />} />

            <Route
              path="/jobrequests/:id/edit"
              element={<JobRequestEdit />}
            />

            <Route
              path="/customer/offers/:id"
              element={<CustomerOfferDetailsPage />}
            />

          </Route>
        </Route>
      </Route>
    </>
  );
}