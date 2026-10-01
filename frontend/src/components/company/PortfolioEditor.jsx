import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function PortfolioEditor() {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api.get("accounts/portfolio/", { timeout: 20000 }).then(r => {
      if (!Array.isArray(r.data)) throw new Error("Invalid portfolio response");
      if (active) { setProjects(r.data); setError(""); }
    })
      .catch(() => { if (active) setError("Projektet nuk u ngarkuan."); });
    return () => { active = false; };
  }, [retry]);
  async function add(e) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("image").size > 5 * 1024 * 1024) { setError("Fotografia mund të jetë deri në 5 MB."); return; }
    setBusy(true); setError("");
    try { const r = await api.post("accounts/portfolio/", data, { timeout: 60000 }); setProjects(p => [r.data, ...p]); form.reset(); }
    catch { setError("Projekti nuk u ruajt. Kontrolloni të dhënat, fotografinë dhe verifikimin e emailit."); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    if (busy) return;
    if (!window.confirm("Të fshihet ky projekt referues dhe fotografia?")) return;
    setBusy(true); setError("");
    try { await api.delete(`accounts/portfolio/${id}/`); setProjects(p => p.filter(v => v.id !== id)); }
    catch { setError("Fshirja nuk u krye. Provoni përsëri."); }
    finally { setBusy(false); }
  }
  return <section className="premium-card p-5 mt-8">
    <h2 className="text-xl font-semibold">Projektet referuese</h2>
    <p className="text-sm text-gray-600 mt-2">Deri në 12 projekte të kompanisë. Publikohen pas kontrollit dhe shënohen si referenca të vetë kompanisë, jo si punë të verifikuara nga Ndertimnet. Ngarkoni vetëm fotografi që keni të drejtë t’i ndani, pa persona ose të dhëna private.</p>
    {error && <p role="alert" className="text-red-700 mt-3">{error} <button onClick={() => setRetry(v => v + 1)} className="underline">Ringarko listën</button></p>}
    <div className="grid gap-4 sm:grid-cols-2 my-5">{projects.map(p => <article key={p.id} className="border rounded-xl p-3"><img src={p.image} alt={p.title} loading="lazy" className="h-40 w-full object-cover rounded" /><h3 className="font-semibold mt-2">{p.title}</h3><p className="text-sm">{p.approved ? "Publikuar" : "Në shqyrtim"}</p><button disabled={busy} onClick={() => remove(p.id)} className="text-red-700 underline mt-2">Fshi projektin</button></article>)}</div>
    <form onSubmit={add} className="space-y-3">
      <fieldset disabled={busy} className="space-y-3">
      <label className="block">Titulli<input name="title" required maxLength={150} className="premium-input" /></label>
      <label className="block">Puna e kryer<textarea name="description" required maxLength={3000} className="premium-input" rows={3} /></label>
      <label className="block">Përmasa / shtrirja e punës<input name="scope" maxLength={200} className="premium-input" /></label>
      <label className="block">Fotografia (JPG, PNG, WebP · 5 MB)<input name="image" type="file" required accept="image/jpeg,image/png,image/webp" className="block my-2 max-w-full" /></label>
      <button disabled={busy || projects.length >= 12} className="premium-btn btn-dark">{busy ? "Duke ruajtur…" : "Dërgo për shqyrtim"}</button>
      </fieldset>
    </form>
  </section>;
}
