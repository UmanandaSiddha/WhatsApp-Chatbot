import express from "express";
import { receiveWebhook, sendMessage, verifyWebhook } from "../controllers/whatsapp.controller";

const router = express.Router();

router.route("/webhook").get(verifyWebhook);
router.route("/webhook").post(receiveWebhook);
router.route("/send").post(sendMessage);

export default router;