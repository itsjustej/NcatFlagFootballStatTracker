import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar";

// Auth
import LoginPage from "./pages/LoginPage";
import RequireAuth from "./auth/RequireAuth";

// Pages
import HomePage from "./pages/HomePage";
import StartGamePage from "./pages/StartGamePage";
import GamePage from "./pages/GamePage";
import TeamsPage from "./pages/TeamsPage";
import SettingsPage from "./pages/SettingsPage";
import StatsPage from "./pages/StatsPage";
import GameHistoryPage from "./pages/GameHistoryPage";
import GameViewPage from "./pages/GameViewPage";

export default function App() {
  const location = useLocation();

  // Hide navbar ONLY on the stat tracking screen
  const hideNavbar = location.pathname === "/game";

  return (
    <>
      {!hideNavbar && <Navbar />}

      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/start-game" element={<StartGamePage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/games" element={<GameHistoryPage />} />

          {/* FIXED ROUTE */}
          <Route path="/games/:id" element={<GameViewPage />} />
        </Route>
      </Routes>
    </>
  );
}
