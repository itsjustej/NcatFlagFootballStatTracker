import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/games", label: "Game History" },
  { to: "/stats", label: "Stats" },
  { to: "/teams", label: "Teams" },
  { to: "/settings", label: "Settings" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const roleLabel = user?.role === "admin" ? "Admin" : "Worker";

  return (
    <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 min-w-0" onClick={() => setOpen(false)}>
          <span className="text-xl sm:text-2xl shrink-0">🏈</span>
          <h1 className="text-lg sm:text-2xl font-bold text-white truncate">
            Flag<span className="text-blue-400">Tracker</span>
          </h1>
        </Link>

        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`text-sm font-medium transition whitespace-nowrap ${
                location.pathname === to || (to !== "/" && location.pathname.startsWith(to))
                  ? "text-blue-400"
                  : "text-white hover:text-blue-400"
              }`}
            >
              {label}
            </Link>
          ))}
          {user && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-slate-600 text-slate-400">
              {roleLabel}
            </span>
          )}
        </nav>

        <button
          type="button"
          className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-700 bg-slate-900 px-4 py-3 pb-safe">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`px-3 py-3 rounded-lg text-base font-medium min-h-[44px] flex items-center ${
                  location.pathname === to || (to !== "/" && location.pathname.startsWith(to))
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-white hover:bg-slate-800"
                }`}
              >
                {label}
              </Link>
            ))}
            {user && (
              <div className="flex items-center justify-between px-3 py-3 mt-2 border-t border-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Signed in as {roleLabel}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm text-red-400 font-medium min-h-[44px] px-2"
                >
                  Log out
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
