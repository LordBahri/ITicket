import { Router } from "express";
import {
  listThreads,
  startThreadWithUser,
  getMessages,
  sendMessage,
  markThreadRead,
} from "../controllers/chat.controller";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const chatRouter = Router();

chatRouter.use(authenticate);

chatRouter.get("/threads", asyncHandler(listThreads));
chatRouter.post("/threads/with/:userId", asyncHandler(startThreadWithUser));
chatRouter.get("/threads/:id/messages", asyncHandler(getMessages));
chatRouter.post("/threads/:id/messages", asyncHandler(sendMessage));
chatRouter.post("/threads/:id/read", asyncHandler(markThreadRead));
