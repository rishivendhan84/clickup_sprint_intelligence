import { Router } from "express";
import {
  listSprints,
  getSprintSummary,
  getSprintTasks,
  getSprintMembers,
  getMemberDetail,
  getWBSBreakdown,
  invalidateCache,
} from "../controllers/sprintController.js";

const router = Router();

// Sprint list
router.get("/sprints", listSprints);

// Sprint-level analytics
router.get("/sprint/:sprintId/summary", getSprintSummary);
router.get("/sprint/:sprintId/tasks", getSprintTasks);
router.get("/sprint/:sprintId/members", getSprintMembers);
router.get("/sprint/:sprintId/wbs", getWBSBreakdown);

// Member drill-down
router.get("/sprint/:sprintId/member/:memberName", getMemberDetail);

// Cache management
router.post("/cache/invalidate", invalidateCache);

export default router;
