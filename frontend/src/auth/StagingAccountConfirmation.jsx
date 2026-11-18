import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "./AuthContext";
import { readGuestProject } from "../utils/guestProject";

export default function StagingAccountConfirmation() {
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirm = async () => {
    if (busy || !user) return;
    setBusy(true); setError("");
    try {
      await api.post("accounts/test/confirm-account/");
      await refreshMe();
      navigate(user.role === "customer" && readGuestProject() ? "/nis-projektin" : "/", { replace: true });
    } catch (e) {
      setError(e.response?.data?.detail || "Konfirmimi nuk u krye. Provoni përsëri.");
    } finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-slate-50 px-4 py-16">
    <section className="mx-auto max-w-md space-y-5 rounded-xl border bg-white p-6">
      <p className="rounded-lg bg-amber-100 p-3 font-semibold">Vetëm test · Apple Sandbox</p>
      <h1 className="text-2xl font-semibold">Konfirmoni llogarinë testuese</h1>
      <p>Kjo llogari përdoret vetëm për testim. Asnjë email verifikimi nuk dërgohet. Llogaria juaj në ndertimnet.com mbetet e veçantë.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {user ? <>
        <p>Konfirmoni llogarinë me të cilën jeni kyçur.</p>
        <button disabled={busy} onClick={confirm} className="min-h-[48px] w-full rounded-lg bg-emerald-800 px-4 py-3 text-white disabled:opacity-50">{busy ? "Duke konfirmuar…" : "Konfirmo llogarinë testuese"}</button>
      </> : <>
        <p>Kyçuni me emailin dhe fjalëkalimin që zgjodhët gjatë regjistrimit në këtë test.</p>
        <button onClick={() => navigate("/login")} className="min-h-[48px] w-full rounded-lg bg-emerald-800 px-4 py-3 text-white">Shko te kyçja</button>
      </>}
    </section>
  </main>;
}
