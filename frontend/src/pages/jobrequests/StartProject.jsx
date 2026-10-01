import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { clearGuestProject, readGuestProject, saveGuestProject } from "../../utils/guestProject";
const empty = () => ({ id: crypto.randomUUID(), title: "", description: "", city: "", profession: "" });

export default function StartProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [project, setProject] = useState(() => readGuestProject() || empty());
  const [cities, setCities] = useState([]);
  const [professions, setProfessions] = useState([]);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(null);
  const [lookupError, setLookupError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setLookupError(false);
    Promise.all([api.get("locations/cities/", { skipAuth: true, timeout: 20000 }), api.get("taxonomy/professions/", { skipAuth: true, timeout: 20000 })])
      .then(([c, p]) => {
        const cities = c.data.results || c.data, professions = p.data.results || p.data;
        if (!Array.isArray(cities) || !Array.isArray(professions)) throw new Error("Invalid lookup response");
        if (active) { setCities(cities); setProfessions(professions); }
      })
      .catch(() => { if (active) setLookupError(true); });
    return () => { active = false; };
  }, [retry]);
  function change(e) {
    const next = { ...project, [e.target.name]: e.target.value };
    setProject(next);
    if (!saveGuestProject(next)) setError("Ruajtja në këtë shfletues nuk është e mundur. Mbajeni këtë faqe hapur.");
  }
  async function submit(e, saveCopy = false) {
    e.preventDefault();
    if (busy) return;
    if (saveCopy && !formRef.current?.reportValidity()) return;
    setError("");
    if (user?.role === "company") { setError("Ky hap kërkon një llogari klienti."); return; }
    const pending = saveCopy ? { ...project, id: crypto.randomUUID() } : project;
    if (!saveGuestProject(pending) && (!user || saveCopy)) { setError("Aktivizoni ruajtjen e shfletuesit për të mbajtur projektin gjatë regjistrimit."); return; }
    if (saveCopy) setProject(pending);
    if (!user) { navigate("/register/customer"); return; }
    setBusy(true);
    setConflict(null);
    try {
      const payload = {
        client_draft_id: pending.id, title: pending.title.trim(), description: pending.description.trim(),
        city: Number(pending.city), profession: Number(pending.profession),
      };
      const { data } = await api.post("jobrequests/drafts/import-guest/", payload, { timeout: 20000 });
      if (!Number.isInteger(data.id) || data.id < 1) throw new Error("Invalid draft response");
      // Do not erase the local draft on an incomplete/stale success response,
      // including a response from an older backend during deployment.
      if (data.title !== payload.title || data.description !== payload.description
          || data.city !== payload.city || data.profession !== payload.profession) {
        setConflict(data);
        setError("Drafti i ruajtur ka përmbajtje tjetër. Ndryshimet tuaja mbeten këtu.");
        return;
      }
      clearGuestProject();
      navigate(data.is_submitted && data.submitted_job
        ? `/customer/jobrequests/${data.submitted_job}`
        : `/customer/jobrequests/create?draft=${data.id}`);
    } catch (err) {
      const saved = err.response?.data?.draft;
      if (err.response?.status === 409 && err.response?.data?.code === "guest_draft_conflict"
          && Number.isInteger(saved?.id) && saved.id > 0) {
        setConflict(saved);
        setError("Drafti i ruajtur ka përmbajtje tjetër. Ndryshimet tuaja mbeten këtu.");
      } else {
        setError("Ruajtja nuk u konfirmua. Të dhënat mbeten këtu; provoni përsëri.");
      }
    }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-2xl p-5 sm:p-8">
    <Helmet><title>Filloni projektin | Ndertimnet</title><meta name="robots" content="noindex,follow" /></Helmet>
    <h1 className="text-3xl font-semibold">Na tregoni për projektin tuaj</h1>
    <p className="mt-3 text-gray-600">Filloni me nevojën tuaj. Më pas krijoni llogarinë dhe plotësoni të dhënat përpara dërgimit për shqyrtim.</p>
    <p className="mt-2 text-sm text-gray-500">Drafti ruhet në këtë skedë për deri në 24 orë. Mos shkruani të dhëna kontakti në përshkrim.</p>
    {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    {conflict && <div className="mt-4 rounded-lg border p-4 space-y-3">
      <p>Hapni versionin e ruajtur ose ruani ndryshimet si draft të ri. Kjo nuk publikon një kërkesë pune dhe nuk zëvendëson versionin e mëparshëm.</p>
      <Link className="block underline" to={conflict.is_submitted && Number.isInteger(conflict.submitted_job)
        ? `/customer/jobrequests/${conflict.submitted_job}`
        : `/customer/jobrequests/create?draft=${conflict.id}`}>Hap versionin e ruajtur</Link>
      <button type="button" disabled={busy} className="premium-btn btn-dark" onClick={e => submit(e, true)}>Ruaj ndryshimet si draft të ri</button>
    </div>}
    {lookupError && <p role="alert">Nuk u ngarkuan shërbimet. <button onClick={() => setRetry(v => v + 1)}>Provo përsëri</button></p>}
    <form ref={formRef} onSubmit={submit} className="mt-6 space-y-5">
      <fieldset disabled={busy} className="space-y-5">
      <label className="block">Titulli<input required minLength={5} maxLength={255} name="title" value={project.title} onChange={change} className="block border rounded-lg p-3 w-full" /></label>
      <label className="block">Përshkrimi<textarea required minLength={20} maxLength={10000} rows={6} name="description" value={project.description} onChange={change} className="block border rounded-lg p-3 w-full" /></label>
      <label className="block">Qyteti<select required name="city" value={project.city} onChange={change} className="block border rounded-lg p-3 w-full"><option value="">Zgjidhni qytetin</option>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="block">Shërbimi<select required name="profession" value={project.profession} onChange={change} className="block border rounded-lg p-3 w-full"><option value="">Zgjidhni shërbimin</option>{professions.map(p => <option key={p.id} value={p.id}>{p.industry_detail?.name ? `${p.industry_detail.name} / ` : ""}{p.name}</option>)}</select></label>
      <button disabled={busy} className="premium-btn btn-dark">{busy ? "Duke ruajtur…" : user ? "Ruaj dhe vazhdo projektin" : "Krijo llogari dhe vazhdo"}</button>
      {!user && <p>Keni llogari? <Link to="/login" className="underline">Hyni për të vazhduar</Link></p>}
      <button type="button" className="block text-sm underline" onClick={() => { clearGuestProject(); setProject(empty()); setConflict(null); setError(""); }}>Fshi draftin nga kjo skedë</button>
      </fieldset>
    </form>
  </main>;
}
