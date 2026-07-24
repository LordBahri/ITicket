import { Router } from "express";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get("/", asyncHandler(listNotifications));
notificationRouter.post("/read-all", asyncHandler(markAllNotificationsRead));
notificationRouter.post("/:id/read", asyncHandler(markNotificationRead));
