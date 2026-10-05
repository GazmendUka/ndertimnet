export function projectCategories(professions) {
  const categories = [...new Map(professions.filter(p => p.industry_detail?.id).map(p => [String(p.industry_detail.id), p.industry_detail])).values()];
  return categories.map(c => ({ ...c, description: c.description || professions.filter(p => p.industry_detail?.id === c.id).slice(0, 3).map(p => p.name).join(" · ") }));
}
export function categoryLabel(value, categories) {
  return value === "mixed" ? "Punime të ndryshme" : value === "unsure" ? "Nuk jam i sigurt" : categories.find(c => String(c.id) === String(value))?.name || "Zgjidhni kategorinë";
}
export default function CategoryPicker({ categories, value, onChange, disabled = false }) {
  const choices = [...categories.map(c => ({ value: String(c.id), name: c.name, description: c.description || "Zgjidhni këtë kategori për punën tuaj." })),
    { value: "mixed", name: "Punime të ndryshme", description: "Projekti përfshin disa lloje punimesh." },
    { value: "unsure", name: "Nuk jam i sigurt", description: "Përshkruani nevojën tuaj; nuk duhet të dini specialitetin." }];
  return <fieldset disabled={disabled}><legend className="font-semibold mb-2">Çfarë pune dëshironi të kryeni?</legend>
    <p className="text-sm text-gray-500 mb-4">Zgjidhni një kategori.</p>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{choices.map(c => <button key={c.value} type="button" aria-pressed={String(value) === c.value} onClick={() => onChange(c.value)} title={c.description} className={`min-h-[60px] rounded-2xl border px-3 py-3 text-center text-sm leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50 ${String(value) === c.value ? "border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700" : "border-gray-200 bg-white text-gray-700 hover:border-emerald-500 hover:bg-emerald-50"}`}><span className="block font-semibold">{c.name}</span></button>)}</div>
  </fieldset>;
}
