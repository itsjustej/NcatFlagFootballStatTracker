import db from "../db.js";

/* -----------------------------------------------------------
   POST /api/game-stats/init
   Create blank stat rows for all players at game start
----------------------------------------------------------- */
export const initGameStats = async (req, res) => {
  try {
    const { gameID, playerIDs } = req.body;

    if (!gameID || !playerIDs || playerIDs.length === 0) {
      return res.status(400).json({ error: "Missing gameID or players" });
    }

    const values = playerIDs.map(id => [gameID, id]);

    await db.query(
      `INSERT INTO GameStats (GameID, PlayerID)
       VALUES ?`,
      [values]
    );

    res.json({ message: "Game stats initialized" });
  } catch (err) {
    console.error("Failed to initialize stats:", err);
    res.status(500).json({ error: "Failed to initialize game stats" });
  }
};


/* -----------------------------------------------------------
   POST /api/game-stats/update
   Update stats during game
----------------------------------------------------------- */
export const updateGameStats = async (req, res) => {
  try {
    const { gameID, playerID, action, points } = req.body;

    const fieldMap = {
      // Scoring + shooting splits
      "2PT_MAKE": { points: points || 2, fgm: 1, fga: 1 },
      "2PT_MISS": { fga: 1 },
      "3PT_MAKE": { points: points || 3, fgm: 1, fga: 1, threePm: 1, threePa: 1 },
      "3PT_MISS": { fga: 1, threePa: 1 },
      "FT_MAKE": { points: points || 1, ftm: 1, fta: 1 },
      "FT_MISS": { fta: 1 },

      // Other counting stats
      "ASSIST": { field: "Assists", add: 1 },
      "REBOUND": { field: "Rebounds", add: 1 },
      "STEAL": { field: "Steals", add: 1 },
      "BLOCK": { field: "Blocks", add: 1 },
      "TURNOVER": { field: "Turnovers", add: 1 },
      "FOUL": { field: "Fouls", add: 1 }
    };

    const update = fieldMap[action];
    if (!update) return res.json({ message: "No stat change" });

    // Build dynamic SQL for multiple fields at once
    const sets = [];
    const params = [];

    if (update.points) {
      sets.push("Points = Points + ?");
      params.push(update.points);
    }
    if (update.fgm) {
      sets.push("FGM = FGM + ?");
      params.push(update.fgm);
    }
    if (update.fga) {
      sets.push("FGA = FGA + ?");
      params.push(update.fga);
    }
    if (update.threePm) {
      sets.push("ThreePM = ThreePM + ?");
      params.push(update.threePm);
    }
    if (update.threePa) {
      sets.push("ThreePA = ThreePA + ?");
      params.push(update.threePa);
    }
    if (update.ftm) {
      sets.push("FTM = FTM + ?");
      params.push(update.ftm);
    }
    if (update.fta) {
      sets.push("FTA = FTA + ?");
      params.push(update.fta);
    }
    if (update.field) {
      sets.push(`${update.field} = ${update.field} + ?`);
      params.push(update.add);
    }

    if (sets.length === 0) {
      return res.json({ message: "No stat change" });
    }

    const sql = `
      UPDATE GameStats 
      SET ${sets.join(", ")}
      WHERE GameID = ? AND PlayerID = ?
    `;
    params.push(gameID, playerID);

    await db.query(sql, params);

    res.json({ message: "Stat updated" });
  } catch (err) {
    console.error("Failed updating stat:", err);
    res.status(500).json({ error: "Failed updating stat" });
  }
};


/* -----------------------------------------------------------
   POST /api/game-stats/create-if-missing
   Create stat row if player enters game late
----------------------------------------------------------- */
export const createStatIfMissing = async (req, res) => {
  try {
    const { gameID, playerID } = req.body;

    const [existing] = await db.query(
      `SELECT * FROM GameStats WHERE GameID = ? AND PlayerID = ?`,
      [gameID, playerID]
    );

    if (existing.length === 0) {
      await db.query(
        `INSERT INTO GameStats (GameID, PlayerID)
         VALUES (?, ?)`,
        [gameID, playerID]
      );
    }

    res.json({ message: "Checked or created" });
  } catch (err) {
    console.error("Failed creating stat row:", err);
    res.status(500).json({ error: "Failed to check/create stat row" });
  }
};
