import { possessionColor } from '../../constants/teamColors';



function PlayerChip({ player, selected, accentColor, onClick }) {

  return (

    <button

      type="button"

      onClick={onClick}

      className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl border transition-all duration-150 active:scale-95 cursor-pointer hover:border-white/20"

      style={{

        width:       72,

        height:      60,

        background:  selected ? accentColor : 'rgba(255,255,255,0.05)',

        borderColor: selected ? accentColor : 'rgba(255,255,255,0.12)',

        boxShadow:   selected ? `0 0 16px ${accentColor}55` : 'none',

      }}

    >

      <span

        className="text-[10px] font-semibold leading-none mb-1"

        style={{ color: selected ? 'rgba(255,255,255,0.65)' : accentColor }}

      >

        #{player.number ?? '—'}

      </span>

      <span className="text-[12px] font-bold text-white leading-tight text-center px-1">

        {player.name.split(' ')[0]}

      </span>

    </button>

  );

}



function Section({ title, children, className = '' }) {

  return (

    <div className={`flex flex-col gap-2 phase-enter ${className}`}>

      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</p>

      {children}

    </div>

  );

}



const PLAY_TYPES = [

  { t: 'pass',    label: 'Pass',    bg: '#004B87' },

  { t: 'rush',    label: 'Rush',    bg: '#16a34a' },

  { t: 'penalty', label: 'Penalty', bg: '#ea580c' },

  { t: 'punt',    label: 'Punt',    bg: '#64748b' },

];



export default function PlayControls({

  gs,

  convStep,

  convPts,

  convPasser,

  offensePlayers,

  onPlayType,

  onPassReceiverComplete,

  onPassComplete,

  onPassIncomplete,

  onPassInterception,

  onAdvanceDown,

  onConversionResult,

  onConversionPoint,

  onConversionPasser,

  onConversionReceiver,

  homeName,

  awayName,

  pulse = false,

}) {

  const isConversion = gs.playPhase === 'conversion';

  if (!isConversion && !gs.selectedOffender) return null;



  const offColor = possessionColor(gs.possession);

  const phaseKey = isConversion

    ? `conv-${convStep}-${convPts ?? ''}`

    : `${gs.playPhase}-${gs.playType ?? ''}`;



  return (

    <div className={`card-panel flex flex-col gap-4 ${pulse ? 'step-pulse' : ''}`} key={phaseKey}>

      {!isConversion && (gs.playPhase === 'play-type' ||

        gs.playPhase === 'pass-receiver' ||

        gs.playPhase === 'pass-result') && (

        <Section title="Play Type">

          <div className="hidden md:grid grid-cols-4 gap-2">

            {PLAY_TYPES.map(({ t, label, bg }) => (

              <button

                key={t}

                type="button"

                onClick={() => onPlayType(t)}

                className="py-3 rounded-xl font-bold text-sm text-white transition-all duration-150 active:scale-95 hover:brightness-110"

                style={{

                  background:  gs.playType === t ? bg : 'rgba(255,255,255,0.07)',

                  border:      `2px solid ${gs.playType === t ? bg : 'rgba(255,255,255,0.1)'}`,

                  boxShadow:   gs.playType === t ? `0 4px 16px ${bg}55` : 'none',

                }}

              >

                {label}

              </button>

            ))}

          </div>

          <p className="md:hidden text-[11px] text-slate-500 text-center">

            Use the play buttons at the bottom of the screen

          </p>

        </Section>

      )}



      {!isConversion && gs.playPhase === 'pass-receiver' && (

        <Section title="Select Receiver">

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">

            <button

              type="button"

              onClick={onPassIncomplete}

              className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl border-2 border-red-500/60 bg-red-600/20 text-red-400 font-black text-[11px] active:scale-95 transition-all"

              style={{ width: 72, height: 60 }}

            >

              INC

            </button>

            <button

              type="button"

              onClick={onPassInterception}

              disabled={!gs.selectedDefender}

              className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl border-2 border-orange-500/60 bg-orange-600/20 text-orange-400 font-black text-[11px] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"

              style={{ width: 72, height: 60 }}

            >

              INT

            </button>

            {offensePlayers

              .filter((p) => p.id !== gs.selectedOffender?.id)

              .map((p) => (

                <PlayerChip

                  key={p.id}

                  player={p}

                  selected={gs.selectedReceiver?.id === p.id}

                  accentColor={offColor}

                  onClick={() => onPassReceiverComplete(p)}

                />

              ))}

          </div>

        </Section>

      )}



      {!isConversion && gs.playPhase === 'pass-result' && (

        <Section title="Pass Result">

          <div className="grid grid-cols-3 gap-2">

            <button

              type="button"

              onClick={onPassComplete}

              className="py-3 rounded-xl font-bold text-sm text-white bg-emerald-600 border-2 border-emerald-500 hover:bg-emerald-700 active:scale-95 transition-all"

            >

              Complete

            </button>

            <button

              type="button"

              onClick={onPassIncomplete}

              className="py-3 rounded-xl font-bold text-sm text-white bg-red-600 border-2 border-red-500 hover:bg-red-700 active:scale-95 transition-all"

            >

              Incomplete

            </button>

            <button

              type="button"

              onClick={onPassInterception}

              disabled={!gs.selectedDefender}

              className="py-3 rounded-xl font-bold text-sm text-white bg-orange-600 border-2 border-orange-500 hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"

            >

              INT

            </button>

          </div>

          <p className="text-[11px] text-slate-500 text-center">

            {gs.selectedOffender?.name} → {gs.selectedReceiver?.name}

            {gs.selectedDefender && ` · DB: #${gs.selectedDefender.number}`}

          </p>

        </Section>

      )}



      {!isConversion && gs.playPhase === 'advance-down' && (() => {

        const penaltyTeam       = gs.penaltyTeam ?? gs.possession;

        const defenseWasFlagged = penaltyTeam !== gs.possession;

        const penaltyTeamName   = penaltyTeam === 'home' ? homeName : awayName;

        const question          = defenseWasFlagged ? 'Auto first down?' : 'Loss of down?';

        const yesLabel          = defenseWasFlagged ? 'Auto 1st Down' : 'Loss of Down';

        const noLabel           = defenseWasFlagged ? 'Just Yardage'  : 'Replay Down';

        return (

          <div className="rounded-xl border border-orange-500/30 bg-orange-900/15 p-4 flex flex-col gap-3 phase-enter">

            <div className="text-center">

              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">

                Penalty on {penaltyTeamName}

              </p>

              <p className="text-sm font-bold text-white">{question}</p>

            </div>

            <div className="grid grid-cols-2 gap-2">

              <button

                type="button"

                onClick={() => onAdvanceDown(true)}

                className="py-3 rounded-xl font-bold text-white text-sm bg-[#004B87] hover:bg-[#003a69] active:scale-95 transition-all"

              >

                {yesLabel}

              </button>

              <button

                type="button"

                onClick={() => onAdvanceDown(false)}

                className="py-3 rounded-xl font-bold text-slate-300 text-sm bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all"

              >

                {noLabel}

              </button>

            </div>

          </div>

        );

      })()}



      {isConversion && (

        <div className="flex flex-col gap-4 rounded-xl border border-emerald-500/30 bg-emerald-900/20 p-4 phase-enter">

          <div className="text-center">

            <p className="text-emerald-400 font-black text-xl tracking-wide">TOUCHDOWN!</p>

            <p className="text-slate-400 text-xs mt-0.5 uppercase tracking-wider">Extra Point Attempt</p>

          </div>



          {convStep === 'outcome' && (

            <Section title="Conversion result">

              <div className="grid grid-cols-2 gap-2">

                <button

                  type="button"

                  onClick={() => onConversionResult('good')}

                  className="py-3 rounded-xl font-bold text-sm text-white bg-emerald-600 border-2 border-emerald-500 hover:bg-emerald-700 active:scale-95 transition-all"

                >

                  Good

                </button>

                <button

                  type="button"

                  onClick={() => onConversionResult('nogood')}

                  className="py-3 rounded-xl font-bold text-sm text-white bg-red-600 border-2 border-red-500 hover:bg-red-700 active:scale-95 transition-all"

                >

                  No Good

                </button>

              </div>

            </Section>

          )}



          {convStep === 'points' && (

            <Section title="Point value">

              <div className="grid grid-cols-3 gap-2">

                {[1, 2, 3].map((pts) => {

                  const active = convPts === pts;

                  return (

                    <button

                      key={pts}

                      type="button"

                      onClick={() => onConversionPoint(pts)}

                      className="py-3 rounded-xl font-black text-sm text-white transition-all active:scale-95"

                      style={{

                        background: active ? '#16a34a' : 'rgba(255,255,255,0.07)',

                        border:     `2px solid ${active ? '#16a34a' : 'rgba(255,255,255,0.12)'}`,

                        boxShadow:  active ? '0 4px 16px #16a34a55' : 'none',

                      }}

                    >

                      {pts} pt{pts > 1 ? 's' : ''}

                    </button>

                  );

                })}

              </div>

            </Section>

          )}



          {convStep === 'passer' && (

            <Section title="Who threw it?">

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">

                {offensePlayers.map((p) => (

                  <PlayerChip

                    key={p.id}

                    player={p}

                    selected={convPasser?.id === p.id}

                    accentColor={offColor}

                    onClick={() => onConversionPasser(p)}

                  />

                ))}

              </div>

            </Section>

          )}



          {convStep === 'receiver' && (

            <Section title="Who caught it?">

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">

                {offensePlayers

                  .filter((p) => p.id !== convPasser?.id)

                  .map((p) => (

                    <PlayerChip

                      key={p.id}

                      player={p}

                      selected={false}

                      accentColor={offColor}

                      onClick={() => onConversionReceiver(p)}

                    />

                  ))}

              </div>

              {convPasser && (

                <p className="text-[11px] text-slate-500 text-center">

                  Passer: {convPasser.name.split(' ')[0]}

                </p>

              )}

            </Section>

          )}

        </div>

      )}



      {!isConversion && gs.playPhase === 'play-type' && !gs.newSpot && (

        <p className="text-[11px] text-blue-400/80 text-center font-medium animate-pulse">

          ↑ Tap the field to spot the ball

        </p>

      )}

    </div>

  );

}


