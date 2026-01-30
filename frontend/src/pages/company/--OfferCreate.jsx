// frontend/src/pages/company/OfferCreate.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

export default function OfferCreate() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { access } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [offerId, setOfferId] = useState(null);
  const [presentation, setPresentation] = useState("");

  // ------------------------------
  // INIT
  // ------------------------------
  useEffect(() => {
    if (!access) return;

    async function init() {
      try {
        setLoading(true);

        // 1) hämta default text
        const me = await api.get("accounts/me/");
        const defaultText =
          me.data?.company_profile?.default_offer_presentation || "";

        setPresentation(defaultText);

        // 2) kolla om draft redan finns
        const existing = await api.get(`offers/?job_request=${jobId}`);

        const list =
          existing.data.results ||
          existing.data.data ||
          existing.data ||
          [];

        if (list.length > 0) {
          setOfferId(list[0].id);
        } else {
          const res = await api.post("offers/", {
            job_request: jobId,
          });
          setOfferId(res.data.id);
        }

      } catch (err) {
        console.error(err);
        alert("Kunde inte initiera offert.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [jobId, access]);

  // ------------------------------
  // SAVE STEP 1
  // ------------------------------
  async function handleNext() {
    if (!presentation.trim()) {
      alert("Shkruani një prezantim të shkurtër.");
      return;
    }

    if (!offerId) {
      alert("Oferta nuk është gati ende.");
      return;
    }

    try {
      setSaving(true);

      // spara på offer
      await api.patch(`offers/${offerId}/`, {
        presentation_text: presentation,
      });

      // spara som default på company
      await api.patch("accounts/profile/company/", {
        default_offer_presentation: presentation,
      });

      navigate(`/company/offers/create/${jobId}?step=2`);

    } catch (err) {
      console.error(err);
      alert("Nuk mund të ruhet.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-10">
        🔄 Duke u përgatitur oferta...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-10 space-y-6">
      <h1 className="text-2xl font-bold">
        Hapi 1 – Prezantimi i kompanisë
      </h1>

      <p className="text-gray-600">
        Ky tekst do të përdoret në ofertë dhe
        ruhet për përdorim të ardhshëm.
      </p>

      <textarea
        rows={6}
        value={presentation}
        onChange={(e) => setPresentation(e.target.value)}
        className="w-full border rounded-lg p-4"
        placeholder="Prezantoni shkurt kompaninë tuaj..."
      />

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={saving}
          className="premium-btn btn-dark"
        >
          {saving ? "Duke ruajtur..." : "Vazhdo"}
        </button>
      </div>
    </div>
  );
}
