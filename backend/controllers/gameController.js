import db from "../db.js";

/**
 * POST /api/games
 * Create a new game. Body: { homeTeamId, awayTeamId, settings? }
 * Returns { GameID, GameDate, teamA, teamB, settings } for the tracker.
 */
export const createGame = async (req, res) => {
  try {
    const { homeTeamId, awayTeamId, settings } = req.body;

    if (!homeTeamId || !awayTeamId) {
      return res.status(400).json({ error: "homeTeamId and awayTeamId are required" });
    }

    const season = "2024-25"; // or derive from current date
    const gameDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const [result] = await db.query(
      `INSERT INTO Games (GameDate, Season, HomeTeamID, AwayTeamID)
       VALUES (?, ?, ?, ?)`,
      [gameDate, season, homeTeamId, awayTeamId]
    );

    const gameId = result.insertId;

    // Fetch both teams with players for the response
    const [teams] = await db.query(
      `SELECT TeamID, TeamName, TeamColor,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT('PlayerID', PlayerID, 'PlayerName', PlayerName))
               FROM Players WHERE Players.TeamID = Teams.TeamID) AS Players
       FROM Teams
       WHERE TeamID IN (?, ?)`,
      [homeTeamId, awayTeamId]
    );

    const teamA = teams.find((t) => Number(t.TeamID) === Number(homeTeamId));
    const teamB = teams.find((t) => Number(t.TeamID) === Number(awayTeamId));

    const parsePlayers = (p) =>
      Array.isArray(p) ? p : typeof p === "string" ? JSON.parse(p || "[]") : [];
    if (teamA) teamA.Players = parsePlayers(teamA.Players);
    if (teamB) teamB.Players = parsePlayers(teamB.Players);

    // Create blank GameStats rows for all players in the game so box score / updates work
    const playerIds = [
      ...(teamA?.Players || []).map((p) => p.PlayerID),
      ...(teamB?.Players || []).map((p) => p.PlayerID)
    ].filter(Boolean);

    if (playerIds.length > 0) {
      const values = playerIds.map((id) => [gameId, id]);
      await db.query(
        `INSERT INTO GameStats (GameID, PlayerID) VALUES ?`,
        [values]
      );
    }

    res.status(201).json({
      GameID: gameId,
      GameDate: gameDate,
      teamA: teamA || null,
      teamB: teamB || null,
      settings: settings || {}
    });
  } catch (err) {
    console.error("Error creating game:", err);
    res.status(500).json({ error: "Failed to create game" });
  }
};

/**
 * DELETE /api/games/:id
 * Deletes a game and its GameStats rows.
 */
export const deleteGame = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM GameStats WHERE GameID = ?", [id]);

    const [result] = await db.query("DELETE FROM Games WHERE GameID = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Game not found" });
    }

    res.json({ message: "Game deleted", GameID: id });
  } catch (err) {
    console.error("Error deleting game:", err);
    res.status(500).json({ error: "Failed to delete game" });
  }
};

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
