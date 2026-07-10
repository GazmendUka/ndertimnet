// frontend/src/components/jobrequests/JobRequestForm.jsx

import React, { useEffect, useMemo, useState } from "react";

export default function JobRequestForm({
  mode = "create",
  initialData = null,
  professions = [],
  onSubmit,
  loading = false,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [industry, setIndustry] = useState("");
  const [profession, setProfession] = useState("");

  const [error, setError] = useState(null);
  const industries = useMemo(() => {
    const byId = new Map();

    professions.forEach((p) => {
      const item = p.industry_detail;
      if (item?.id && !byId.has(item.id)) {
        byId.set(item.id, item);
      }
    });

    return Array.from(byId.values());
  }, [professions]);

  const filteredProfessions = useMemo(() => {
    if (!industry) return [];
    return professions.filter(
      (p) => String(p.industry_detail?.id || "") === String(industry)
    );
  }, [industry, professions]);

  // Prefill on edit
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setBudget(initialData.budget ?? "");
      setProfession(
        initialData.profession
          ? String(initialData.profession)
          : ""
      );
    }
  }, [initialData]);

  useEffect(() => {
    if (!profession || !professions.length) return;

    const selected = professions.find((p) => String(p.id) === String(profession));
    if (selected?.industry_detail?.id) {
      setIndustry(String(selected.industry_detail.id));
    }
  }, [profession, professions]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (loading) return;
    setError(null);

    if (!title.trim()) {
      setError("Titulli është i detyrueshëm.");
      return;
    }

    if (!industry) {
      setError("Kategoria kryesore është e detyrueshme.");
      return;
    }

    if (!profession) {
      setError("Specialiteti është i detyrueshëm.");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      budget: budget === "" ? null : Number(budget),
      profession: Number(profession),
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Titulli
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          disabled={loading}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Përshkrimi
        </label>
        <textarea
          rows="4"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          disabled={loading}
        />
      </div>

      {/* Budget */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Buxheti (€)
        </label>
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          disabled={loading}
        />
      </div>

      {/* Industry */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Kategoria kryesore
        </label>
        <select
          value={industry}
          onChange={(e) => {
            setIndustry(e.target.value);
            setProfession("");
          }}
          className="w-full border rounded-lg px-3 py-2"
          disabled={loading}
        >
          <option value="">Zgjidh kategorinë</option>
          {industries.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {/* Profession */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Specialiteti
        </label>
        <select
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          disabled={loading || !industry}
        >
          <option value="">Zgjidh specialitetin</option>
          {filteredProfessions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        {loading
          ? "Duke ruajtur..."
          : mode === "edit"
          ? "Përditëso kërkesën"
          : "Krijo kërkesën"}
      </button>
    </form>
  );
}
