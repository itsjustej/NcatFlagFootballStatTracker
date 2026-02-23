import express from "express";
import { getAllGames, createGame, deleteGame } from "../controllers/gameController.js";
import { getBoxScore } from "../routes/gameController.js";

const router = express.Router();

router.get("/", getAllGames);
router.post("/", createGame);
router.get("/:id/boxscore", getBoxScore);
router.delete("/:id", deleteGame);

export default router;
