import { Router } from "express";
import { env } from "../config/env";
import {
  listThreads,
  startThreadWithUser,
  getMessages,
  sendMessage,
  sendAttachment,
  downloadAttachment,
  markThreadRead,
} from "../controllers/chat.controller";
import { authenticate } from "../middleware/auth";
import { uploadChatFile } from "../middleware/chatUpload";
import { handleMulterUpload } from "../utils/handleMulterUpload";
import { asyncHandler } from "../utils/asyncHandler";

export const chatRouter = Router();

chatRouter.use(authenticate);

const handleChatFileUpload = handleMulterUpload(
  uploadChatFile.single("file"),
  `Fichier trop volumineux (${env.uploads.maxSizeMb} Mo maximum)`
);

chatRouter.get("/threads", asyncHandler(listThreads));
chatRouter.post("/threads/with/:userId", asyncHandler(startThreadWithUser));
chatRouter.get("/threads/:id/messages", asyncHandler(getMessages));
chatRouter.post("/threads/:id/messages", asyncHandler(sendMessage));
chatRouter.post("/threads/:id/attachment", handleChatFileUpload, asyncHandler(sendAttachment));
chatRouter.get("/threads/:id/messages/:messageId/attachment", asyncHandler(downloadAttachment));
chatRouter.post("/threads/:id/read", asyncHandler(markThreadRead));
