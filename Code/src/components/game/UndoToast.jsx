import { Undo2 } from 'lucide-react';

export default function UndoToast({ message, onUndo, onDismiss }) {
  if (!message) return null;

  return (
    <div className="absolute bottom-20 md:bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-toast-in">
      <div className="flex items-start gap-3 pl-4 pr-2 py-3 rounded-xl bg-slate-800 border border-slate-600 shadow-2xl shadow-black/40 pointer-events-auto w-full max-w-xl">
        <p className="text-sm text-slate-200 font-medium flex-1 min-w-0 leading-snug break-words">
          {message}
        </p>
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <button
            type="button"
            onClick={onUndo}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-colors whitespace-nowrap"
          >
            <Undo2 size={12} />
            Undo
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
