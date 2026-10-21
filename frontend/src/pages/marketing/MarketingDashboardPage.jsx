import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, Plus } from "lucide-react";
import api from "../../api/axios";
import MarketingCampaignCard from "../../components/marketing/MarketingCampaignCard";

export default function MarketingDashboardPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const load = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("marketing/campaigns/", { params: { page }, signal });
      if (!signal?.aborted) setData(response.data);
    } catch {
      if (!signal?.aborted) setError("Fushatat nuk mund të ngarkohen. Provoni përsëri.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const withdraw = async (id) => {
    setBusyId(id);
    setError("");
    try {
      await api.post(`marketing/campaigns/${id}/withdraw/`);
      setConfirmId(null);
      await load();
    } catch {
      setError("Fushata nuk mund të tërhiqet. Provoni përsëri.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="premium-container py-8 md:py-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <Megaphone aria-hidden="true" className="mb-3 text-[#ef7d22]" />
          <h1 className="text-3xl font-semibold text-gray-900">Marketingu</h1>
          <p className="mt-3 leading-7 text-gray-600">
            Prezantoni biznesin tuaj në Hero, në ballinën e faqes dhe të aplikacionit.
            Çdo fushatë shqyrtohet nga administratori para publikimit.
            Periudha e shfaqjes fillon vetëm pas miratimit, sipas datave të caktuara nga administratori.
          </p>
        </div>
        <Link to="/company/marketing/create" className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white">
          <Plus size={16} />Krijo fushatë
        </Link>
      </div>
      {error && <div role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-red-800">
        {error} <button type="button" onClick={() => load()} className="ml-2 min-h-[44px] underline">Provo përsëri</button>
      </div>}
      <h2 className="mb-4 mt-8 text-xl font-semibold">Fushatat tuaja{data ? ` (${data.count})` : ""}</h2>
      {loading ? <p role="status">Duke ngarkuar fushatat…</p> : !error && data?.results?.length === 0 ? (
        <p className="rounded-2xl border bg-white p-6 text-gray-600">Nuk keni ende fushata. Krijoni fushatën tuaj të parë për shqyrtim.</p>
      ) : <div className="space-y-5">{data?.results?.map((campaign) => (
        <div key={campaign.id}>
          <MarketingCampaignCard campaign={campaign} />
          {campaign.status !== "withdrawn" && campaign.status !== "expired" && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {confirmId === campaign.id ? <>
                <p>Të tërhiqet fushata? Ajo nuk do të shfaqet më.</p>
                <button type="button" disabled={busyId !== null} onClick={() => withdraw(campaign.id)} className="min-h-[44px] text-red-700 underline">Po, tërhiqe</button>
                <button type="button" disabled={busyId !== null} onClick={() => setConfirmId(null)} className="min-h-[44px] underline">Anulo</button>
              </> : <button type="button" onClick={() => setConfirmId(campaign.id)} className="min-h-[44px] text-sm text-gray-600 underline">Tërhiq fushatën</button>}
            </div>
          )}
        </div>
      ))}</div>}
      {data && (data.next || data.previous) && <nav aria-label="Faqet e fushatave" className="mt-6 flex items-center gap-5">
        <button type="button" disabled={loading || !data.previous} onClick={() => setPage((p) => p - 1)} className="min-h-[44px] disabled:opacity-40">Para</button>
        <span>Faqja {page}</span>
        <button type="button" disabled={loading || !data.next} onClick={() => setPage((p) => p + 1)} className="min-h-[44px] disabled:opacity-40">Tjetra</button>
      </nav>}
    </div>
  );
}
