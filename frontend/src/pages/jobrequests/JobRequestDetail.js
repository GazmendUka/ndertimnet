// frontend/src/pages/jobrequests/JobRequestDetails.jsx

import React from "react";
import { useAuth } from "../../auth/AuthContext";
import CustomerJobDetails from "../customer/CustomerJobDetails";
import CompanyJobDetails from "../company/CompanyJobDetails";


export default function JobRequestDetails() {
  const { isCustomer, isCompany } = useAuth();

  if (isCustomer) return <CustomerJobDetails />;
  if (isCompany) return <CompanyJobDetails />;

  // If a user somehow is logged in but has no role:
  return (
    <div className="p-6 text-red-600 font-semibold">
      Akses i ndaluar. (Roli nuk u identifikua)
    </div>
  );
}
