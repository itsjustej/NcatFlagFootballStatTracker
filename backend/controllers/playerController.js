import db from "../db.js";

/* ---------------------------------------------
   GET /api/players
   Optional: ?teamId=1
----------------------------------------------*/
export const getPlayers = async (req, res) => {
  try {
    const teamId = req.query.teamId;

    let query = "SELECT * FROM Players";
    let params = [];

    if (teamId) {
      query += " WHERE TeamID = ?";
      params.push(teamId);
    }

    const [rows] = await db.query(query, params);
    res.json(rows);

  } catch (err) {
    console.error("Error fetching players:", err);
    res.status(500).json({ error: "Failed to retrieve players" });
  }
};

/* ---------------------------------------------
   POST /api/players
----------------------------------------------*/
export const createPlayer = async (req, res) => {
  try {
    const { PlayerName, TeamID } = req.body;

    if (!PlayerName || !TeamID) {
      return res.status(400).json({ error: "PlayerName and TeamID required" });
    }

    const [result] = await db.query(
      "INSERT INTO Players (PlayerName, TeamID) VALUES (?, ?)",
      [PlayerName, TeamID]
    );

    res.json({
      PlayerID: result.insertId,
      PlayerName,
      TeamID
    });

  } catch (err) {
    console.error("Error creating player:", err);
    res.status(500).json({ error: "Failed to create player" });
  }
};

/* ---------------------------------------------
   PATCH /api/players/:id
----------------------------------------------*/
export const updatePlayer = async (req, res) => {
  try {
    const playerId = req.params.id;
    const { PlayerName, TeamID } = req.body;

    const [result] = await db.query(
      "UPDATE Players SET PlayerName = ?, TeamID = ? WHERE PlayerID = ?",
      [PlayerName, TeamID, playerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json({ message: "Player updated successfully" });

  } catch (err) {
    console.error("Error updating player:", err);
    res.status(500).json({ error: "Failed to update player" });
  }
};

/* ---------------------------------------------
   DELETE /api/players/:id
----------------------------------------------*/
export const deletePlayer = async (req, res) => {
  try {
    const playerId = req.params.id;

    const [result] = await db.query(
      "DELETE FROM Players WHERE PlayerID = ?",
      [playerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json({ message: "Player deleted successfully" });

  } catch (err) {
    console.error("Error deleting player:", err);
    res.status(500).json({ error: "Failed to delete player" });
  }
};

/* ---------------------------------------------
   GET /api/players/stats/:teamId
   Returns per-game averages for all players on a team
----------------------------------------------*/
// ============================================================
// GET /api/players/stats/:teamId
// Returns per-game averages for all players on a team
// ============================================================
export const getPlayerStatsByTeam = async (req, res) => {
  const { teamId } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT
        Players.PlayerID,
        Players.PlayerName,

        -- Per-game averages
        AVG(GameStats.Points) AS ppg,
        AVG(GameStats.Rebounds) AS rpg,
        AVG(GameStats.Assists) AS apg,
        AVG(GameStats.Steals) AS spg,
        AVG(GameStats.Blocks) AS bpg,
        AVG(GameStats.Turnovers) AS tov,

        -- Shooting %
        (SUM(GameStats.FGM) / NULLIF(SUM(GameStats.FGA), 0)) AS fgPct,
        (SUM(GameStats.ThreePM) / NULLIF(SUM(GameStats.ThreePA), 0)) AS threePct,
        (SUM(GameStats.FTM) / NULLIF(SUM(GameStats.FTA), 0)) AS ftPct

      FROM Players
      LEFT JOIN GameStats ON Players.PlayerID = GameStats.PlayerID
      WHERE Players.TeamID = ?
      GROUP BY Players.PlayerID, Players.PlayerName
      `,
      [teamId]
    );

    // Convert all fields to numbers (MySQL returns strings for AVG/SUM)
    const formatted = rows.map(r => ({
      PlayerID: r.PlayerID,
      PlayerName: r.PlayerName,

      // Per-game (floats)
      ppg: Number(r.ppg || 0),
      rpg: Number(r.rpg || 0),
      apg: Number(r.apg || 0),
      spg: Number(r.spg || 0),
      bpg: Number(r.bpg || 0),
      tov: Number(r.tov || 0),

      // Shooting percentages (floats between 0 and 1)
      fgPct: Number(r.fgPct || 0),
      threePct: Number(r.threePct || 0),
      ftPct: Number(r.ftPct || 0)
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching player stats:", err);
    res.status(500).json({
      error: "Failed to retrieve player stats",
      details: err.message,
    });
  }
};
;
