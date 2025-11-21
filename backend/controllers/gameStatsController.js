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
      "2PT_MAKE": { field: "Points", add: points || 2 },
      "3PT_MAKE": { field: "Points", add: points || 3 },
      "FT_MAKE": { field: "Points", add: points || 1 },
      "ASSIST": { field: "Assists", add: 1 },
      "REBOUND": { field: "Rebounds", add: 1 },
      "STEAL": { field: "Steals", add: 1 },
      "BLOCK": { field: "Blocks", add: 1 },
      "TURNOVER": { field: "Turnovers", add: 1 },
      "FOUL": { field: "Fouls", add: 1 }
    };

    const update = fieldMap[action];
    if (!update) return res.json({ message: "No stat change" });

    await db.query(
      `UPDATE GameStats SET ${update.field} = ${update.field} + ?
       WHERE GameID = ? AND PlayerID = ?`,
      [update.add, gameID, playerID]
    );

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
