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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">

      {/* MODAL */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in">

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>

        {/* CONTENT */}
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h2>

        <p className="text-sm text-gray-600 whitespace-pre-line mb-6">
          {description}
        </p>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2">

          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Anulo
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Duke fshirë..." : "Fshij"}
          </button>

        </div>
      </div>
    </div>
  );
}