import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function MobileMoreSheet({ open, onClose, title, children }) {
  const touchStartY = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const handleTouchStart = (event) => {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event) => {
    if (touchStartY.current === null) return;

    const endY = event.changedTouches[0]?.clientY ?? touchStartY.current;
    if (endY - touchStartY.current > 55) onClose();
    touchStartY.current = null;
  };

  return (
    <div
      className={`fixed inset-0 z-[70] ${open ? "visible pointer-events-auto" : "invisible pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Mbyll menynë"
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[28px] bg-white px-5 pt-3 shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#12251b]">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Mbyll"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-700 active:scale-95"
          >
            <X size={21} />
          </button>
        </div>

        <div className="grid gap-2">{children}</div>
      </section>
    </div>
  );
}
