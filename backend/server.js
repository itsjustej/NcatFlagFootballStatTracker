import express from "express";
import cors from "cors";

import playerRoutes from "./routes/playerRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";   
import leagueLeaderRoutes from "./routes/leagueLeaderRoutes.js";
import gameStatsRoutes from "./routes/gameStatsRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/players", playerRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/games", gameRoutes);             
app.use("/api/league-leaders", leagueLeaderRoutes);
app.use("/api/game-stats", gameStatsRoutes);

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
