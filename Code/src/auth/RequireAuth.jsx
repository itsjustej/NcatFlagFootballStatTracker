import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth() {
  const { isAuthenticated, ready } = useAuth();
  if (!ready) {
    return (
      <div className="bg-slate-900 min-h-[100dvh] pt-8 px-6">
        <p className="text-slate-400 text-center animate-pulse">Loading...</p>
      </div>
    );
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
