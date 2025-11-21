import db from "../db.js";

export const getPlayerStatsByTeam = async (req, res) => {
  const { teamId } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT 
        p.PlayerID,
        p.PlayerName,
        p.TeamID,

        COUNT(gs.GameID) AS GamesPlayed,
        AVG(gs.Points) AS PPG,
        AVG(gs.Rebounds) AS RPG,
        AVG(gs.Assists) AS APG,
        AVG(gs.Steals) AS SPG,
        AVG(gs.Blocks) AS BPG,
        AVG(gs.Turnovers) AS TOPG,
        AVG(gs.Fouls) AS FPG,
        AVG(gs.PlusMinus) AS PlusMinusPG,

        AVG(gs.FGM) AS FGM,
        AVG(gs.FGA) AS FGA,
        AVG(gs.ThreePM) AS ThreePM,
        AVG(gs.ThreePA) AS ThreePA,
        AVG(gs.FTM) AS FTM,
        AVG(gs.FTA) AS FTA

      FROM Players p
      LEFT JOIN GameStats gs ON p.PlayerID = gs.PlayerID
      WHERE p.TeamID = ?
      GROUP BY p.PlayerID;
      `,
      [teamId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching player stats:", err);
    res.status(500).json({ error: "Failed to retrieve player stats" });
  }
};
