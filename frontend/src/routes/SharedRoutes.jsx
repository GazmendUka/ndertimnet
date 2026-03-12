// src/routes/SharedRoutes.jsx

import { Route } from "react-router-dom";

import PrivateRoute from "../components/PrivateRoute";
import Layout from "../components/layout/Layout";
import OnboardingGuard from "./OnboardingGuard";

import JobRequestList from "../pages/jobrequests/JobRequestList";
import RoleBasedJobRequestDetail from "../pages/jobrequests/RoleBasedJobRequestDetail";

export default function SharedRoutes() {
  return (
    <>
      <Route element={<OnboardingGuard />}>
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>

            <Route path="/jobrequests" element={<JobRequestList />} />

            <Route
              path="/jobrequests/:id"
              element={<RoleBasedJobRequestDetail />}
            />

          </Route>
        </Route>
      </Route>
    </>
  );
}