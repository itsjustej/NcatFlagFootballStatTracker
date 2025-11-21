import db from "../db.js";

/* -----------------------------------------------------------
   GET /api/games/:id/boxscore
   Returns full box score for both teams in a clean structure:
   {
     teamA: { name, color, players: [...] },
     teamB: { name, color, players: [...] },
     finalScore: { A: xx, B: xx }
   }
----------------------------------------------------------- */
export const getBoxScore = async (req, res) => {
  try {
    const { id } = req.params;

    /* 1) Fetch basic game + team info */
    const [gameRows] = await db.query(
      `
      SELECT 
        g.GameID,
        g.HomeTeamID,
        g.AwayTeamID,
        th.TeamName AS HomeTeamName,
        th.TeamColor AS HomeTeamColor,
        ta.TeamName AS AwayTeamName,
        ta.TeamColor AS AwayTeamColor
      FROM Games g
      JOIN Teams th ON g.HomeTeamID = th.TeamID
      JOIN Teams ta ON g.AwayTeamID = ta.TeamID
      WHERE g.GameID = ?
      `,
      [id]
    );

    if (!gameRows.length) {
      return res.status(404).json({ error: "Game not found" });
    }

    const game = gameRows[0];

    /* 2) Fetch player stats for both teams */
    const [playerStats] = await db.query(
      `
      SELECT 
        p.PlayerID,
        p.PlayerName,
        p.TeamID,
        gs.Points,
        gs.Rebounds,
        gs.Assists,
        gs.Steals,
        gs.Blocks,
        gs.Turnovers,
        gs.Fouls
      FROM Players p
      LEFT JOIN GameStats gs 
      ON p.PlayerID = gs.PlayerID AND gs.GameID = ?
      WHERE p.TeamID IN (?, ?)
      ORDER BY p.TeamID, p.PlayerName
      `,
      [id, game.HomeTeamID, game.AwayTeamID]
    );

    /* 3) Split into Team A / Team B */
    const teamAPlayers = playerStats
      .filter((p) => p.TeamID === game.HomeTeamID)
      .map((p) => ({
        name: p.PlayerName,
        number: p.PlayerID, // your UI uses "number"—playerID fits
        points: p.Points || 0,
        rebounds: p.Rebounds || 0,
        assists: p.Assists || 0,
        steals: p.Steals || 0,
        blocks: p.Blocks || 0,
        fouls: p.Fouls || 0
      }));

    const teamBPlayers = playerStats
      .filter((p) => p.TeamID === game.AwayTeamID)
      .map((p) => ({
        name: p.PlayerName,
        number: p.PlayerID,
        points: p.Points || 0,
        rebounds: p.Rebounds || 0,
        assists: p.Assists || 0,
        steals: p.Steals || 0,
        blocks: p.Blocks || 0,
        fouls: p.Fouls || 0
      }));

    /* 4) Compute final score totals */
    const finalScoreA = teamAPlayers.reduce((sum, p) => sum + p.points, 0);
    const finalScoreB = teamBPlayers.reduce((sum, p) => sum + p.points, 0);

    /* 5) Final response */
    res.json({
      teamA: {
        name: game.HomeTeamName,
        color: game.HomeTeamColor,
        players: teamAPlayers
      },
      teamB: {
        name: game.AwayTeamName,
        color: game.AwayTeamColor,
        players: teamBPlayers
      },
      finalScore: {
        A: finalScoreA,
        B: finalScoreB
      }
    });
  } catch (err) {
    console.error("Error loading box score:", err);
    res.status(500).json({ error: "Failed to load box score" });
  }
};
