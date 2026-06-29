import React from "react";
import Navbar from "../components/layout/Navbar";
import HeroSection from "../components/sections/HeroSection";
import MainActions from "../components/sections/MainActions";
import SecondaryActions from "../components/sections/SecondaryActions";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <HeroSection />
      <MainActions />
      <SecondaryActions />
    </div>
  );
}
