import React from "react";

export default function HeroSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-20 md:py-32 text-center">
      <div className="mb-8">
        <h2 className="text-5xl md:text-6xl font-bold mb-4 text-balance">
          Basketball Stat Tracking
          <span className="text-orange-500"> Simplified</span>
        </h2>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
          Track real-time stats, manage teams, and analyze performance with precision.
          Built for coaches and scorekeepers.
        </p>
      </div>
    </section>
  );
}
