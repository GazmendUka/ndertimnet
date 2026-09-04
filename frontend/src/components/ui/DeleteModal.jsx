import { X } from "lucide-react";

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = "Fshij kërkesën",
  description = "A jeni i sigurt që dëshironi ta fshini këtë?\nKy veprim nuk mund të kthehet.",
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">

      {/* MODAL */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl animate-in fade-in zoom-in sm:p-6">

        {/* CLOSE */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Mbyll"
        >
          <X size={18} />
        </button>

        {/* CONTENT */}
        <h2 id="delete-modal-title" className="mb-2 pr-10 text-lg font-semibold text-gray-900">
          {title}
        </h2>

        <p className="text-sm text-gray-600 whitespace-pre-line mb-6">
          {description}
        </p>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2">

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-h-[44px] rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Anulo
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Duke fshirë..." : "Fshij"}
          </button>

        </div>
      </div>
    </div>
  );
}
