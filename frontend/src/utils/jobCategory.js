export default function jobCategory(job) {
  if (job?.industry_detail?.name) return job.industry_detail.name;
  if (job?.category_mode === "mixed") return "Punime të ndryshme";
  if (job?.category_mode === "unsure") return "Nuk jam i sigurt";
  const p = job?.profession_detail;
  return p?.industry_detail?.name ? `${p.industry_detail.name} / ${p.name}` : p?.name || "Pa kategori";
}
