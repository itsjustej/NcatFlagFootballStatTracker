export default function HalftimeConfirmDialog({
  homeName,
  awayName,
  openingPossession,
  onConfirm,
  onCancel,
}) {
  const receivingTeam = openingPossession === 'home' ? awayName : homeName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-xl"
        role="dialog"
        aria-labelledby="halftime-title"
      >
        <h2 id="halftime-title" className="text-xl font-bold text-white mb-2">
          Start 2nd Half?
        </h2>
        <p className="text-slate-300 text-sm mb-4">
          This will reset the clock to 20:00 and apply halftime changes:
        </p>
        <ul className="text-sm text-slate-400 space-y-2 mb-6 list-disc list-inside">
          <li>
            <span className="text-white font-medium">{receivingTeam}</span> will start with the ball on offense
          </li>
          <li>Teams switch sides — end zones flip</li>
          <li>Current drive and play selection will be cleared</li>
        </ul>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold"
          >
            Start 2nd Half
          </button>
        </div>
      </div>
    </div>
  );
}
