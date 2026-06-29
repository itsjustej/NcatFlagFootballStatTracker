const STEPS = [
  { id: 'carrier', label: 'Ball carrier', short: '1' },
  { id: 'spot',    label: 'Spot ball',    short: '2' },
  { id: 'play',    label: 'Play type',    short: '3' },
  { id: 'result',  label: 'Result',       short: '4' },
];

export function getPlayStepIndex(gs, convStep) {
  if (!gs) return 0;

  if (gs.playPhase === 'conversion') {
    if (convStep === 'outcome') return 0;
    if (convStep === 'points') return 1;
    if (convStep === 'passer') return 2;
    return 3;
  }

  if (!gs.selectedOffender) return 0;

  const inResult =
    gs.playPhase === 'pass-receiver' ||
    gs.playPhase === 'pass-result' ||
    gs.playPhase === 'advance-down' ||
    gs.playPhase === 'conversion';

  if (inResult) return 3;
  if (gs.newSpot == null) return 1;
  if (gs.playPhase === 'play-type' && !gs.playType) return 2;
  return 3;
}

const CONV_STEPS = [
  { id: 'result',   label: 'Good?',    short: '1' },
  { id: 'points',   label: 'Points',   short: '2' },
  { id: 'passer',   label: 'Passer',   short: '3' },
  { id: 'receiver', label: 'Catch',    short: '4' },
];

export default function PlayStepBar({ gs, convStep, pulseStep }) {
  const isConversion = gs?.playPhase === 'conversion';
  const steps = isConversion ? CONV_STEPS : STEPS;
  const active = getPlayStepIndex(gs, convStep);

  return (
    <div className="px-4 py-2.5 border-b border-slate-700/60 bg-slate-900/80">
      <div className="flex items-center gap-1">
        {steps.map((step, i) => {
          const done    = i < active;
          const current = i === active;
          const pulse   = pulseStep === i;

          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              <div
                className={`flex items-center gap-1.5 min-w-0 flex-1 rounded-lg px-2 py-1 transition-all duration-300 ${
                  current ? 'bg-slate-700/60' : ''
                } ${pulse ? 'step-pulse' : ''}`}
              >
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-colors duration-300 ${
                    done
                      ? 'bg-emerald-600 text-white'
                      : current
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-500'
                  }`}
                >
                  {done ? '✓' : step.short}
                </span>
                <span
                  className={`text-[10px] font-semibold truncate hidden sm:inline transition-colors duration-300 ${
                    current ? 'text-white' : done ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-px w-2 sm:w-4 flex-shrink-0 mx-0.5 transition-colors duration-300 ${
                    done ? 'bg-emerald-600/60' : 'bg-slate-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
