export default function OtBallDialog({
  homeName,
  awayName,
  allowEnd,
  onChoose,
  onEnd,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-xl"
        role="dialog"
        aria-labelledby="ot-ball-title"
      >
        <h2 id="ot-ball-title" className="text-xl font-bold text-white mb-2">
          Whose ball?
        </h2>
        <p className="text-slate-300 text-sm mb-5">
          That team starts at the 20, attacking the end zone on the right.
        </p>
        <div className="flex flex-col gap-2 mb-4">
          <button
            type="button"
            onClick={() => onChoose('home')}
            className="px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold"
          >
            {homeName}
          </button>
          <button
            type="button"
            onClick={() => onChoose('away')}
            className="px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold"
          >
            {awayName}
          </button>
          {allowEnd && (
            <button
              type="button"
              onClick={onEnd}
              className="px-4 py-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold"
            >
              End game
            </button>
          )}
        </div>
        {!allowEnd && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
