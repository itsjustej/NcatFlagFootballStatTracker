import express from "express";
import {
  initGameStats,
  updateGameStats,
  createStatIfMissing
} from "../controllers/gameStatsController.js";

const router = express.Router();

router.post("/init", initGameStats);               // create blank stats for all players
router.post("/update", updateGameStats);           // update a player’s stats
router.post("/create-if-missing", createStatIfMissing); // if a player subs in late

export default router;
