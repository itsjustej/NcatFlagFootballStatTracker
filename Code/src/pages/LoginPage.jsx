import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const ROLES = [
  { id: "viewer", label: "Viewer", className: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800" },
  { id: "worker", label: "Worker", className: "bg-orange-600 hover:bg-orange-700 active:bg-orange-800" },
  { id: "admin", label: "Admin", className: "bg-purple-600 hover:bg-purple-700 active:bg-purple-800" },
];

export default function LoginPage() {
  const { login, isAuthenticated, isSocial } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [staffRole, setStaffRole] = useState(null);
  const [busy, setBusy] = useState(false);

  const homePath = isSocial ? "/stats" : "/";

  useEffect(() => {
    if (isAuthenticated) navigate(homePath, { replace: true });
  }, [isAuthenticated, navigate, homePath]);

  const handleViewer = async () => {
    setError("");
    setStaffRole(null);
    setBusy(true);
    const success = await login("social", "social");
    setBusy(false);
    if (!success) {
      setError("Could not open the stats view.");
      return;
    }
    navigate("/stats", { replace: true });
  };

  const handleStaff = async (e) => {
    e.preventDefault();
    const typed = username.trim().toLowerCase();
    if (typed !== staffRole) {
      setError(`Use the ${staffRole} username and password.`);
      return;
    }

    setBusy(true);
    const success = await login(username, password);
    setBusy(false);
    if (!success) {
      setError("That username or password is wrong.");
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900 px-4 py-8">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 sm:p-8 w-full max-w-xl shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 text-center">
          StatTracker Login
        </h1>

        {error && (
          <div className="bg-red-600/20 text-red-300 px-4 py-3 rounded-lg mb-4 border border-red-600/40 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ROLES.map((role) => {
            const selected = role.id !== "viewer" && staffRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                disabled={busy}
                onClick={() => {
                  setError("");
                  if (role.id === "viewer") {
                    handleViewer();
                    return;
                  }
                  setStaffRole(role.id);
                  setUsername("");
                  setPassword("");
                }}
                className={`w-full ${role.className} transition py-3 rounded-lg text-white font-semibold text-base min-h-[44px] shadow-md disabled:opacity-60 ${
                  selected ? "ring-2 ring-white ring-offset-2 ring-offset-slate-800" : ""
                }`}
              >
                {role.id === "viewer" && busy && !staffRole ? "Opening..." : role.label}
              </button>
            );
          })}
        </div>

        {staffRole && (
          <form onSubmit={handleStaff} className="space-y-5 mt-6">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                className="w-full px-3 py-3 rounded-lg bg-slate-700 text-white border border-slate-600 placeholder:text-slate-500 text-base"
                autoFocus
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="w-full px-3 py-3 rounded-lg bg-slate-700 text-white border border-slate-600 placeholder:text-slate-500 text-base"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className={`w-full transition py-3 rounded-lg text-white font-semibold text-base min-h-[44px] shadow-md disabled:opacity-60 ${
                staffRole === "admin"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              {busy ? "Signing in..." : `Sign in as ${staffRole}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
