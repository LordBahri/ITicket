import { Router } from "express";
import { createTicket, listTickets, getTicket, updateTicket } from "../controllers/ticket.controller";
import { addComment } from "../controllers/comment.controller";
import { uploadAttachments, listAttachments, downloadAttachment } from "../controllers/attachment.controller";
import { authenticate, authorize } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { asyncHandler } from "../utils/asyncHandler";

export const ticketRouter = Router();

ticketRouter.use(authenticate);

ticketRouter.post("/", asyncHandler(createTicket));
ticketRouter.get("/", asyncHandler(listTickets));
ticketRouter.get("/:id", asyncHandler(getTicket));
ticketRouter.patch("/:id", authorize("AGENT", "ADMIN"), asyncHandler(updateTicket));
ticketRouter.post("/:id/comments", asyncHandler(addComment));
ticketRouter.get("/:id/attachments", asyncHandler(listAttachments));
ticketRouter.post("/:id/attachments", upload.array("files", 5), asyncHandler(uploadAttachments));
ticketRouter.get("/:id/attachments/:attachmentId/download", asyncHandler(downloadAttachment));
