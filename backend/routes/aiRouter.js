import express from "express";
import { askBot } from "../controllers/aiController.js";

const router = express.Router();
router.post("/ask", askBot);

export default router;
