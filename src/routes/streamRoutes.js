import express from "express";
import chatStreamController from "../controllers/chatStreamController.js";

const router = express.Router();

router.get("/chat-stream", chatStreamController.streamSupportChat);
router.post("/chat-stream", chatStreamController.streamSupportChat);
router.post(
  "/meeting-summary-stream",
  chatStreamController.streamMeetingSummary,
);

export default router;
