import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, MessageCircle, ReceiptText, Send } from "lucide-react";
import { Capacitor } from "@capacitor/core";

import { useAuth } from "../auth/AuthContext";
import {
  deactivateCurrentPushDevice,
  getNotificationPreferences,
  registerCurrentPushDevice,
  updateNotificationPreferences,
} from "../services/notificationService";


const categoryRows = [
  { key: "chat_messages", label: "Mesazhet e reja", description: "Kur një klient ose kompani ju shkruan.", icon: MessageCircle },
  { key: "offer_updates", label: "Ofertat", description: "Oferta të reja dhe vendime për ofertat.", icon: Send },
  { key: "payment_updates", label: "Pagesat", description: "Kur një pagesë konfirmohet.", icon: ReceiptText },
];

export default function NotificationSettings() {
  const { access } = useAuth();
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!access) return;
    getNotificationPreferences()
      .then(({ data }) => setPreferences(data))
      .catch(() => setMessage("Cilësimet e njoftimeve nuk mund të ngarkoheshin."))
      .finally(() => setLoading(false));
  }, [access]);

  const toggleMain = async () => {
    if (!preferences || saving) return;
    setSaving("push_enabled");
    setMessage("");
    try {
      if (preferences.push_enabled && preferences.active_devices > 0) {
        await deactivateCurrentPushDevice().catch(() => undefined);
        const { data } = await updateNotificationPreferences({ push_enabled: false });
        setPreferences(data);
        setMessage("Njoftimet u çaktivizuan.");
      } else {
        const result = await registerCurrentPushDevice({ requestPermission: true });
        if (result.permission !== "granted") {
          setMessage("Leja për njoftime nuk u dha. Mund ta ndryshoni te cilësimet e telefonit.");
          return;
        }
        const { data } = await getNotificationPreferences();
        setPreferences(data);
        setMessage("Njoftimet u aktivizuan.");
      }
    } catch {
      setMessage("Njoftimet nuk mund të përditësoheshin. Kontrolloni lidhjen dhe provoni përsëri.");
    } finally {
      setSaving("");
    }
  };

  const toggleCategory = async (key) => {
    if (!preferences || saving) return;
    setSaving(key);
    setMessage("");
    try {
      const { data } = await updateNotificationPreferences({ [key]: !preferences[key] });
      setPreferences(data);
    } catch {
      setMessage("Ndryshimi nuk mund të ruhej.");
    } finally {
      setSaving("");
    }
  };

  if (loading) {
    return <div className="premium-container flex items-center gap-2 p-8 text-sm text-gray-600"><Loader2 className="animate-spin" size={18} /> Duke ngarkuar…</div>;
  }

  const enabled = Boolean(preferences?.push_enabled && preferences?.active_devices > 0);

  return (
    <div className="premium-container max-w-2xl">
      <section className="premium-section">
        <p className="text-label">Komunikimi</p>
        <h1 className="page-title mt-1">Njoftimet</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">Zgjidhni cilat përditësime dëshironi të merrni në telefon.</p>

        {!native && (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
            Njoftimet push aktivizohen nga aplikacioni Ndërtimnet në Android ose iPhone.
          </div>
        )}
        {message && <div role="status" className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">{message}</div>}

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                {enabled ? <Bell size={21} /> : <BellOff size={21} />}
              </span>
              <div>
                <h2 className="font-semibold text-gray-900">Njoftimet push</h2>
                <p className="mt-1 text-xs text-gray-500">{enabled ? "Aktive në këtë llogari" : "Jo aktive në këtë pajisje"}</p>
              </div>
            </div>
            <button type="button" onClick={toggleMain} disabled={!native || Boolean(saving)} aria-pressed={enabled} className={`relative h-8 w-14 rounded-full transition ${enabled ? "bg-emerald-600" : "bg-gray-300"} disabled:cursor-not-allowed disabled:opacity-50`}>
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${enabled ? "left-7" : "left-1"}`} />
              <span className="sr-only">Aktivizo ose çaktivizo njoftimet</span>
            </button>
          </div>
        </div>

        <div className="mt-4 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
          {categoryRows.map(({ key, label, description, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between gap-4 p-5">
              <div className="flex min-w-0 items-center gap-3">
                <Icon className="shrink-0 text-gray-500" size={20} />
                <div><h3 className="text-sm font-semibold text-gray-900">{label}</h3><p className="mt-1 text-xs leading-5 text-gray-500">{description}</p></div>
              </div>
              <button type="button" onClick={() => toggleCategory(key)} disabled={!preferences || Boolean(saving)} aria-pressed={Boolean(preferences?.[key])} className={`relative h-7 w-12 shrink-0 rounded-full transition ${preferences?.[key] ? "bg-emerald-600" : "bg-gray-300"} disabled:opacity-50`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${preferences?.[key] ? "left-6" : "left-1"}`} />
                <span className="sr-only">{label}</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
