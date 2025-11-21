import express from "express";
import { getLeagueLeaders } from "../controllers/leagueLeaderController.js";

const router = express.Router();

router.get("/", getLeagueLeaders);

export default router;
