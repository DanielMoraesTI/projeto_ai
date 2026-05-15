import express from "express";
import meetingController from "../controllers/meetingController.js";

const router = express.Router();

router.get("/", meetingController.listMeetings);
router.get("/:id", meetingController.getMeetingById);
router.delete("/:id", meetingController.deleteMeeting);

export default router;
