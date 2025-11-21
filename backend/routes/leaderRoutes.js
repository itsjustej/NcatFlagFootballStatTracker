import express from "express";
import { getLeagueLeaders } from "../controllers/leaderController.js";

const router = express.Router();

router.get("/", getLeagueLeaders);

export default router;
