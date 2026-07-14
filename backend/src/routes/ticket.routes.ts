import { Router } from "express";
import { createTicket, listTickets, getTicket, updateTicket } from "../controllers/ticket.controller";
import { addComment } from "../controllers/comment.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const ticketRouter = Router();

ticketRouter.use(authenticate);

ticketRouter.post("/", asyncHandler(createTicket));
ticketRouter.get("/", asyncHandler(listTickets));
ticketRouter.get("/:id", asyncHandler(getTicket));
ticketRouter.patch("/:id", authorize("AGENT", "ADMIN"), asyncHandler(updateTicket));
ticketRouter.post("/:id/comments", asyncHandler(addComment));
