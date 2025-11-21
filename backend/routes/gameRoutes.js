import express from "express";
import { getAllGames } from "../controllers/gameController.js";

const router = express.Router();

router.get("/", getAllGames);           // List all games
// router.delete("/:id", deleteGame);      // Delete a game

export default router;
