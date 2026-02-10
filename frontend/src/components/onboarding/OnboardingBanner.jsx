// frontend/src/components/onboarding/OnboardingBanner.jsx

import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function OnboardingBanner() {
  const { onboardingStep, isCompany } = useAuth();

  if (onboardingStep === 0 || onboardingStep === 3) return null;

  // -----------------------------
  // STEP 1 – VERIFY EMAIL
  // -----------------------------
  if (onboardingStep === 1) {
    return (
      <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="font-semibold">Verifiera din e-post</p>
            <p className="text-sm">
              Du måste verifiera din e-postadress innan du kan fortsätta använda
              tjänsten.
            </p>
          </div>

          <Link
            to="/verify-email"
            className="inline-flex items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Verifiera e-post
          </Link>
        </div>
      </div>
    );
  }

  // -----------------------------
  // STEP 2 – COMPLETE PROFILE
  // -----------------------------
  if (onboardingStep === 2) {
    const profilePath = isCompany
      ? "/profile/company"
      : "/profile/customer";

    return (
      <div className="bg-blue-100 border-b border-blue-300 text-blue-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="font-semibold">Slutför din profil</p>
            <p className="text-sm">
              Din profil är inte klar ännu. Slutför den för att få full tillgång
              till tjänsten.
            </p>

            <div className="mt-2 h-2 w-full bg-blue-200 rounded">
              <div className="h-2 w-[40%] bg-blue-600 rounded"></div>
            </div>
            <p className="mt-1 text-xs">40 % klart</p>
          </div>

          <Link
            to={profilePath}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Slutför profil
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
