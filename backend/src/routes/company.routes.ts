import { Router } from "express";
import { listCompanies, getCompany, createCompany, updateCompany, deleteCompany } from "../controllers/company.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const companyRouter = Router();

companyRouter.use(authenticate);

companyRouter.get("/", asyncHandler(listCompanies));
companyRouter.get("/:id", asyncHandler(getCompany));
companyRouter.post("/", authorize("ADMIN"), asyncHandler(createCompany));
companyRouter.patch("/:id", authorize("ADMIN"), asyncHandler(updateCompany));
companyRouter.delete("/:id", authorize("ADMIN"), asyncHandler(deleteCompany));
