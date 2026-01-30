// src/pages/jobrequests/RoleBasedJobRequestDetail.jsx

import { useAuth } from "../../auth/AuthContext";
import CustomerJobDetails from "../customer/CustomerJobDetails";
import CompanyJobDetails from "../company/CompanyJobDetails";

export default function RoleBasedJobRequestDetail() {
  const { isCustomer, isCompany } = useAuth();

  if (isCustomer) return <CustomerJobDetails />;
  if (isCompany) return <CompanyJobDetails />;

  return (
    <div className="p-6 text-red-600 font-semibold">
      Akses i ndaluar. (Nuk keni qasje në këtë faqe)
    </div>
  );
}
