import express from "express";
import taskController from "../controllers/taskController.js";

const router = express.Router();

router.get("/", taskController.listTasks);
router.post("/create", taskController.createTask);
router.post("/save", taskController.saveManualTask);
router.post("/breakdown", taskController.generateBreakdown);
router.post("/suggest-tags", taskController.suggestTagsForTask);
router.post("/plan-sprint", taskController.planSprint);
router.put("/:id/ai", taskController.updateTaskWithAI);
router.put("/:id", taskController.updateManualTask);
router.delete("/:id", taskController.deleteTask);

export default router;
