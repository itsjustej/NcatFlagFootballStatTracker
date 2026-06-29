import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const success = login(username);

    if (!success) {
      setError('Unknown username. Use "admin" or "worker".');
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900 px-4 py-8">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 sm:p-8 w-full max-w-md shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center">
          StatTracker Login
        </h1>
        <p className="text-slate-400 text-sm text-center mb-6">
          Enter your username to continue
        </p>

        {error && (
          <div className="bg-red-600/20 text-red-300 px-4 py-3 rounded-lg mb-4 border border-red-600/40 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 transition py-3 rounded-lg text-white font-semibold text-base min-h-[44px]"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
