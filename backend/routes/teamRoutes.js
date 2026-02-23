import express from "express";
import {
  getAllTeams,
  createTeam,
  deleteTeam,
  updateTeam,
  getTeamStats
} from "../controllers/teamController.js";

const router = express.Router();

router.get("/", getAllTeams);
router.get("/stats/:teamId", getTeamStats);
router.post("/", createTeam);
router.patch("/:id", updateTeam);
router.delete("/:id", deleteTeam);

export default router;
