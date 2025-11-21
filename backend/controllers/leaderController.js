import db from "../db.js";

export const getLeagueLeaders = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        Players.PlayerID,
        Players.PlayerName,
        Players.TeamID,

        -- Games played
        COUNT(GameStats.GameID) AS GamesPlayed,

        -- TOTALS
        SUM(GameStats.Points) AS TotalPoints,
        SUM(GameStats.Rebounds) AS TotalRebounds,
        SUM(GameStats.Assists) AS TotalAssists,
        SUM(GameStats.Steals) AS TotalSteals,
        SUM(GameStats.Blocks) AS TotalBlocks,
        SUM(GameStats.Turnovers) AS TotalTurnovers,

        -- PER-GAME AVERAGES
        AVG(GameStats.Points) AS PPG,
        AVG(GameStats.Rebounds) AS RPG,
        AVG(GameStats.Assists) AS APG,
        AVG(GameStats.Steals) AS SPG,
        AVG(GameStats.Blocks) AS BPG,
        AVG(GameStats.Turnovers) AS TOPG

      FROM Players
      LEFT JOIN GameStats ON Players.PlayerID = GameStats.PlayerID
      GROUP BY Players.PlayerID;
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error loading league leaders:", err);
    res.status(500).json({ error: "Failed to load league leaders" });
  }
};
