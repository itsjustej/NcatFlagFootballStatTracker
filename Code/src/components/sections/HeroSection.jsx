import React from "react";

export default function HeroSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 pt-10 sm:pt-16 pb-6 text-center">
      <div className="mb-4">
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-3 text-balance">
          Flag Football Stats
          <span className="text-blue-400"> Simplified</span>
        </h2>
        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto px-2">
          Track real-time play by play, manage rosters, and analyze performance with precision.
          Built for coaches and scorekeepers.
        </p>
      </div>
    </section>
  );
}