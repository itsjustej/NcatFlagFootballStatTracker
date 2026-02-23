import db from "../db.js";

/**
 * -------------------------------------------------------
 * GET /api/teams
 * Returns all teams with their players
 * -------------------------------------------------------
 */
export const getAllTeams = async (req, res) => {
  try {
    const [teams] = await db.query(
      `
      SELECT 
        Teams.TeamID,
        Teams.TeamName,
        Teams.TeamColor,
        Teams.Wins,
        Teams.Losses,
        Teams.Ties,
        Teams.PointDifferential,
        Teams.WinPercentage,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'PlayerID', Players.PlayerID,
            'PlayerName', Players.PlayerName
          )
        ) AS Players
      FROM Teams
      LEFT JOIN Players ON Teams.TeamID = Players.TeamID
      GROUP BY Teams.TeamID;
      `
    );

    res.json(teams);
  } catch (err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ error: "Failed to retrieve teams" });
  }
};



/**
 * -------------------------------------------------------
 * POST /api/teams
 * Create a NEW team
 * Body example:
 * {
 *    "TeamName": "Lakers",
 *    "TeamColor": "Purple"
 * }
 * -------------------------------------------------------
 */
export const createTeam = async (req, res) => {
  try {
    const { TeamName, TeamColor } = req.body;

    if (!TeamName || !TeamColor) {
      return res.status(400).json({ error: "TeamName and TeamColor required" });
    }

    const [result] = await db.query(
      "INSERT INTO Teams (TeamName, TeamColor) VALUES (?, ?)",
      [TeamName, TeamColor]
    );

    res.json({
      TeamID: result.insertId,
      TeamName,
      TeamColor,
      Players: []
    });
  } catch (err) {
    console.error("Error creating team:", err);
    res.status(500).json({ error: "Failed to create team" });
  }
};



/**
 * -------------------------------------------------------
 * DELETE /api/teams/:id
 * Deletes a team AND its players
 * -------------------------------------------------------
 */
export const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete players on that team
    await db.query("DELETE FROM Players WHERE TeamID = ?", [id]);

    // Delete the team
    const [result] = await db.query("DELETE FROM Teams WHERE TeamID = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({ message: "Team deleted", TeamID: id });
  } catch (err) {
    console.error("Error deleting team:", err);
    res.status(500).json({ error: "Failed to delete team" });
  }
};

/**
 * -------------------------------------------------------
 * PATCH /api/teams/:id
 * Update a team's name or color
 * Body example:
 * {
 *    "TeamName": "New Name",
 *    "TeamColor": "Purple"
 * }
 * -------------------------------------------------------
 */
export const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { TeamName, TeamColor } = req.body;

    if (!TeamName && !TeamColor) {
      return res.status(400).json({
        error: "At least one of TeamName or TeamColor is required"
      });
    }

    let query = "UPDATE Teams SET ";
    const params = [];

    if (TeamName) {
      query += "TeamName = ?, ";
      params.push(TeamName);
    }
    if (TeamColor) {
      query += "TeamColor = ?, ";
      params.push(TeamColor);
    }

    // remove trailing comma
    query = query.slice(0, -2);

    query += " WHERE TeamID = ?";
    params.push(id);

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({
      message: "Team updated",
      TeamID: id,
      TeamName,
      TeamColor
    });
  } catch (err) {
    console.error("Error updating team:", err);
    res.status(500).json({ error: "Failed to update team" });
  }
};

/**
 * -------------------------------------------------------
 * GET /api/teams/stats/:teamId
 * Returns aggregated team stats from GameStats + Teams
 * -------------------------------------------------------
 */
export const getTeamStats = async (req, res) => {
  const { teamId } = req.params;

  try {
    // Basic team row (wins / losses etc.)
    const [teamRows] = await db.query(
      `
      SELECT 
        TeamID,
        TeamName,
        Wins,
        Losses,
        Ties
      FROM Teams
      WHERE TeamID = ?;
      `,
      [teamId]
    );

    if (teamRows.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }

    const team = teamRows[0];

    // Aggregate per-game stats from GameStats
    const [aggRows] = await db.query(
      `
      SELECT
        COUNT(DISTINCT gs.GameID)        AS games,
        SUM(gs.Points)                   AS totalPoints,
        SUM(gs.Rebounds)                 AS totalRebounds,
        SUM(gs.Assists)                  AS totalAssists,
        SUM(gs.Steals)                   AS totalSteals,
        SUM(gs.Blocks)                   AS totalBlocks,
        SUM(gs.Turnovers)                AS totalTurnovers,
        SUM(gs.FGM)                      AS totalFGM,
        SUM(gs.FGA)                      AS totalFGA,
        SUM(gs.ThreePM)                  AS totalThreePM,
        SUM(gs.ThreePA)                  AS totalThreePA,
        SUM(gs.FTM)                      AS totalFTM,
        SUM(gs.FTA)                      AS totalFTA
      FROM Players p
      JOIN GameStats gs ON p.PlayerID = gs.PlayerID
      WHERE p.TeamID = ?;
      `,
      [teamId]
    );

    const agg = aggRows[0] || {};
    const games = agg.games || 0;

    // Per-game averages
    const safePerGame = (total) => (games > 0 ? total / games : 0);

    const ppg = safePerGame(agg.totalPoints || 0);
    const rpg = safePerGame(agg.totalRebounds || 0);
    const apg = safePerGame(agg.totalAssists || 0);
    const spg = safePerGame(agg.totalSteals || 0);
    const bpg = safePerGame(agg.totalBlocks || 0);
    const tpg = safePerGame(agg.totalTurnovers || 0);

    const fgp =
      agg.totalFGA && agg.totalFGA > 0
        ? (agg.totalFGM / agg.totalFGA) * 100
        : 0;
    const threepp =
      agg.totalThreePA && agg.totalThreePA > 0
        ? (agg.totalThreePM / agg.totalThreePA) * 100
        : 0;
    const ftp =
      agg.totalFTA && agg.totalFTA > 0
        ? (agg.totalFTM / agg.totalFTA) * 100
        : 0;

    // Simple points-per-game trend for the line chart
    const [gameRows] = await db.query(
      `
      SELECT
        gs.GameID,
        SUM(gs.Points) AS teamPoints
      FROM Players p
      JOIN GameStats gs ON p.PlayerID = gs.PlayerID
      WHERE p.TeamID = ?
      GROUP BY gs.GameID
      ORDER BY gs.GameID;
      `,
      [teamId]
    );

    const pointsAcrossGames = gameRows.map((g) => g.teamPoints || 0);

    res.json({
      teamId: team.TeamID,
      teamName: team.TeamName,
      games,
      wins: team.Wins ?? 0,
      losses: team.Losses ?? 0,
      ties: team.Ties ?? 0,
      ppg,
      rpg,
      apg,
      spg,
      bpg,
      tpg,
      fgp,
      threepp,
      ftp,
      pointsAcrossGames
    });
  } catch (err) {
    console.error("Error fetching team stats:", err);
    res.status(500).json({ error: "Failed to retrieve team stats" });
  }
};

