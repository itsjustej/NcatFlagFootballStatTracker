import express from "express";
import {
  getPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPlayerStatsByTeam
} from "../controllers/playerController.js";

const router = express.Router();

/**
 * GET /api/players
 * Optional: /api/players?teamId=1
 * Returns all players or players on one team
 */
router.get("/", getPlayers);

/**
 * GET /api/players/stats/:teamId
 * Returns per-game averages for every player on a team
 */
router.get("/stats/:teamId", getPlayerStatsByTeam);

/**
 * POST /api/players
 * Creates a new player
 */
router.post("/", createPlayer);

/**
 * PATCH /api/players/:id
 * Edits player name, team, jersey, etc.
 */
router.patch("/:id", updatePlayer);

/**
 * DELETE /api/players/:id
 * Removes a player
 */
router.delete("/:id", deletePlayer);

export default router;
