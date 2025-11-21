import { useState } from "react";
import { login } from "../auth/authService";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    const success = login(username, password);

    if (!success) {
      setError("Invalid username or password");
      return;
    }

    // Redirect to dashboard/home
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 w-full max-w-md shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          StatTracker Login
        </h1>

        {error && (
          <div className="bg-red-600/20 text-red-300 px-4 py-3 rounded mb-4 border border-red-600/40">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-sm text-slate-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder="Enter username"
              className="w-full px-3 py-2 rounded bg-slate-700 text-white border border-slate-600 placeholder:text-slate-500"
              autoFocus
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter password"
              className="w-full px-3 py-2 rounded bg-slate-700 text-white border border-slate-600 placeholder:text-slate-500"
              required
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 transition py-2 rounded text-white font-semibold"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
