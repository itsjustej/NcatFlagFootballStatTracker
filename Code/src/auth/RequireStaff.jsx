import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/** Blocks social users from tracker pages. Workers can open these too. */
export default function RequireStaff() {
  const { canTrackGames, canFillPlayers } = useAuth();
  const { pathname } = useLocation();
  const fillingPlayers = /^\/games\/[^/]+\/credits$/.test(pathname);
  const allowed = fillingPlayers ? canFillPlayers : canTrackGames;
  return allowed ? <Outlet /> : <Navigate to="/stats" replace />;
}
