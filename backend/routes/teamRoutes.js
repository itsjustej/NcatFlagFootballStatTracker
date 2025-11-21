import express from "express";
import {
  getAllTeams,
  createTeam,
  deleteTeam,
  updateTeam
} from "../controllers/teamController.js";

const router = express.Router();

router.get("/", getAllTeams);
router.post("/", createTeam);
router.patch("/:id", updateTeam);
router.delete("/:id", deleteTeam);

export default router;
