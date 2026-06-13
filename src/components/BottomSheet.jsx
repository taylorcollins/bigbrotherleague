import { X } from "lucide-react"

export default function BottomSheet({ isOpen, onClose, showClose = false, children }) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-2xl transition-transform duration-300 max-h-[85vh] flex flex-col ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Optional close button */}
        {showClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400">
            <X size={20} />
          </button>
        )}

        {children}
      </div>
    </>
  )
}
