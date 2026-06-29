import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { LeagueProvider } from "./context/LeagueContext.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <LeagueProvider>
        <App />
      </LeagueProvider>
    </AuthProvider>
  </BrowserRouter>
);