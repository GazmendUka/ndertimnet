// frontend/src/pages/jobrequests/JobRequestEdit.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import JobRequestForm from "../../components/jobrequests/JobRequestForm";

export default function JobRequestEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { access, isCustomer } = useAuth();

  const [job, setJob] = useState(null);
  const [professions, setProfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

    // ----------------------------------------------------
    // Fetch job + professions
    // ----------------------------------------------------
    useEffect(() => {
        if (!access || !isCustomer) return;

        async function fetchData() {
            try {
            const [jobResponse, profResponse] = await Promise.all([
                api.get(`/jobrequests/${id}/`),
                api.get("/taxonomy/professions/"),
            ]);

            const jobData = jobResponse.data;

            // ✅ Gör edit-vänlig version
            const editJobData = {
              ...jobData,
              profession: jobData.profession_detail?.id || "",
            };

            setJob(editJobData);
            setProfessions(profResponse.data.results || profResponse.data);

            // 🔒 Optional frontend guard
            if (
                jobData.offers_count > 0 ||
                jobData.winner_offer ||
                !jobData.is_active
            ) {
                setError("Kjo kërkesë nuk mund të përditësohet.");
            }

            } catch (err) {
            setError("Nuk u gjet kërkesa ose nuk lejohet.");
            } finally {
            setLoading(false);
            }
        }

        fetchData();
    }, [id, access, isCustomer]);

  // ----------------------------------------------------
  // Submit PATCH
  // ----------------------------------------------------
  const handleUpdate = async (payload) => {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      await api.patch(`/jobrequests/${id}/`, payload);

      // Redirect tillbaka till mina annonser
      navigate(`/jobrequests/${id}`);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Ndryshimi dështoi. Kontrolloni kushtet (48 orë / oferta).";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------
  // Render
  // ----------------------------------------------------
  if (loading) {
    return <div className="p-6">Duke ngarkuar...</div>;
  }

  if (error && !job) {
    return (
      <div className="p-6 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        Përditëso kërkesën
      </h1>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <JobRequestForm
        mode="edit"
        initialData={job}
        professions={professions}
        onSubmit={handleUpdate}
        loading={saving}
      />
    </div>
  );
}