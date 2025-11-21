import db from "../db.js";

export const getAllGames = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        Games.GameID,
        Games.GameDate,
        Games.Season,
        Games.HomeTeamID,
        Games.AwayTeamID,
        TH.TeamName AS HomeTeamName,
        TA.TeamName AS AwayTeamName,
        TH.TeamColor AS HomeTeamColor,
        TA.TeamColor AS AwayTeamColor,
        (
          SELECT SUM(Points)
          FROM GameStats
          WHERE GameStats.GameID = Games.GameID
          AND GameStats.PlayerID IN (
            SELECT PlayerID FROM Players WHERE TeamID = Games.HomeTeamID
          )
        ) AS HomeScore,
        (
          SELECT SUM(Points)
          FROM GameStats
          WHERE GameStats.GameID = Games.GameID
          AND GameStats.PlayerID IN (
            SELECT PlayerID FROM Players WHERE TeamID = Games.AwayTeamID
          )
        ) AS AwayScore
      FROM Games
      JOIN Teams TH ON Games.HomeTeamID = TH.TeamID
      JOIN Teams TA ON Games.AwayTeamID = TA.TeamID
      ORDER BY Games.GameDate DESC;
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching games:", err);
    res.status(500).json({ error: "Failed to fetch games" });
  }
};
