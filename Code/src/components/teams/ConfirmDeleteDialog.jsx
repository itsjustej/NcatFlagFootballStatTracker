import React, { useState } from "react";
import { X } from "lucide-react";

export function ConfirmDeleteDialog({ onConfirm, onClose, label = "delete" }) {
  const [input, setInput] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 sm:p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Confirm Delete</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-300 mb-4">
          Type <span className="text-red-400 font-bold">delete</span> to confirm.
        </p>

        <input
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-white mb-4 text-base min-h-[44px]"
          placeholder="delete"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />

        <div className="flex gap-2">
          <button
            disabled={input !== "delete"}
            onClick={onConfirm}
            className="flex-1 py-3 min-h-[44px] bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 min-h-[44px] bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}