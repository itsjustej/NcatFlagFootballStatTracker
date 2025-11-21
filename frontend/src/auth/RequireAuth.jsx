import { Navigate, Outlet } from "react-router-dom";

export default function RequireAuth() {
  const isLoggedIn = localStorage.getItem("authToken");

  return isLoggedIn ? <Outlet /> : <Navigate to="/login" />;
}
