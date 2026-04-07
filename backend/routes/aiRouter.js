import express from "express";
import { askBot } from "../controllers/aiController.js";

router.post("/ask", askBot);

export default router;
