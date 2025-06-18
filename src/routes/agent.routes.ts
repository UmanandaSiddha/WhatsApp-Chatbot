import express from "express";
import { getResponse } from "../controllers/agent.controller";

const router = express.Router();

router.route("/response").post(getResponse);

export default router;