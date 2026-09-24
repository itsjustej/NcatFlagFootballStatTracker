import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

/** Blocks social users from tracker/admin pages. */
export default function RequireStaff() {
  const { canTrackGames } = useAuth();
  return canTrackGames ? <Outlet /> : <Navigate to="/stats" replace />;
}
