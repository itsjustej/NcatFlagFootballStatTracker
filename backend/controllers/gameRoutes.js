import express from "express";
import {
  createGame,
  getGameById,
} from "../controllers/gameController.js";

const router = express.Router();

router.post("/", createGame);          // Create new game
router.get("/:id", getGameById);       // Get game + teams + box score (optional)

export default router;
