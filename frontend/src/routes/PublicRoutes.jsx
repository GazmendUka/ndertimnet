// src/routes/PublicRoutes.jsx

import { Route } from "react-router-dom";
import AboutPage from "../pages/about";


import Login from "../auth/Login";
import RegisterChoice from "../auth/RegisterChoice";
import RegisterCompany from "../auth/RegisterCompany";
import RegisterCustomer from "../auth/RegisterCustomer";
import RegisterSuccess from "../auth/RegisterSuccess";
import VerifyEmail from "../auth/VerifyEmail";
import AuthRedirect from "../auth/AuthRedirect";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import PublicOnlyRoute from "../auth/PublicOnlyRoute";


import NdertimPrishtine from "../pages/seo/NdertimPrishtine";
import NdertimTirane from "../pages/seo/NdertimTirane";
import NdertimPrizren from "../pages/seo/NdertimPrizren";
import NdertimMitrovice from "../pages/seo/NdertimMitrovice";
import NdertimDurres from "../pages/seo/NdertimDurres";
import NdertimVlore from "../pages/seo/NdertimVlore";

export default function PublicRoutes() {
  return (
    <>
      <Route path="/" element={<AuthRedirect />} />
      <Route path="/login" element={<PublicOnlyRoute> <Login /> </PublicOnlyRoute>} />
      <Route path="/register" element={<RegisterChoice />} />
      <Route path="/register/company" element={<RegisterCompany />} />
      <Route path="/register/customer" element={<RegisterCustomer />} />
      <Route path="/register/success" element={<RegisterSuccess />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/ndertim/prishtine" element={<NdertimPrishtine />} />
      <Route path="/ndertim/tirane" element={<NdertimTirane />} /> 
      <Route path="/ndertim/prizren" element={<NdertimPrizren />} /> 
      <Route path="/ndertim/mitrovice" element={<NdertimMitrovice />} /> 
      <Route path="/ndertim/durres" element={<NdertimDurres />} />  
      <Route path="/ndertim/vlore" element={<NdertimVlore />} /> 

    </>
  );
}