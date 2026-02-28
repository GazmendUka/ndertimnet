// frontend/src/components/jobrequests/JobRequestForm.jsx

import React, { useEffect, useState } from "react";

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
  const [profession, setProfession] = useState("");

  const [error, setError] = useState(null);

  // Prefill on edit
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setBudget(initialData.budget || "");
      setProfession(initialData.profession || "");
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();

    setError(null);

    if (!title.trim()) {
      setError("Titulli është i detyrueshëm.");
      return;
    }

    const payload = {
      title,
      description,
      budget: budget === "" ? null : budget,
      profession,
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

      {/* Profession */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Profesioni
        </label>
        <select
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          disabled={loading}
        >
          <option value="">Zgjidh profesionin</option>
          {professions.map((p) => (
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