// src/routes/PublicRoutes.jsx

import { Route } from "react-router-dom";
import AboutPage from "../pages/about";
import ContactPage from "../pages/ContactPage";
import PublicLayout from "../components/layout/PublicLayout";

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

import RenovimKuzhine from "../pages/seo/services/RenovimKuzhine"; 
import Elektricist from "../pages/seo/services/Elektricist";        
import RenovimBanjo from "../pages/seo/services/RenovimBanjo";       

import Ndertime from "../pages/seo/services/Ndertime";
import Renovime from "../pages/seo/services/Renovime";
import Fasada from "../pages/seo/services/Fasada";
import Cati from "../pages/seo/services/Cati";
import Pllakashtrues from "../pages/seo/services/Pllakashtrues";
import Dysheme from "../pages/seo/services/Dysheme";
import Lyerje from "../pages/seo/services/Lyerje";

export default function PublicRoutes() {
  return (
    <>
      {/* PUBLIC LAYOUT */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<AuthRedirect />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />

        <Route path="/ndertim/prishtine" element={<NdertimPrishtine />} />
        <Route path="/ndertim/tirane" element={<NdertimTirane />} />
        <Route path="/ndertim/prizren" element={<NdertimPrizren />} />
        <Route path="/ndertim/mitrovice" element={<NdertimMitrovice />} />
        <Route path="/ndertim/durres" element={<NdertimDurres />} />
        <Route path="/ndertim/vlore" element={<NdertimVlore />} />

        <Route path="/renovim-kuzhine" element={<RenovimKuzhine />} />   
        <Route path="/elektricist" element={<Elektricist />} />
        <Route path="/renovim-banjo" element={<RenovimBanjo />} />

        <Route path="/ndertime" element={<Ndertime />} />
        <Route path="/renovime" element={<Renovime />} />
        <Route path="/fasada" element={<Fasada />} />
        <Route path="/cati" element={<Cati />} />
        <Route path="/pllakashtrues" element={<Pllakashtrues />} />
        <Route path="/dysheme" element={<Dysheme />} />
        <Route path="/lyerje" element={<Lyerje />} />
      </Route>

      {/* RESTEN */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route path="/register" element={<RegisterChoice />} />
      <Route path="/register/company" element={<RegisterCompany />} />
      <Route path="/register/customer" element={<RegisterCustomer />} />
      <Route path="/register/success" element={<RegisterSuccess />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
    </>
  );
}