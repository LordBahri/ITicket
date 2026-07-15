import { Router } from "express";
import { listLicenses, getLicense, createLicense, updateLicense } from "../controllers/license.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const licenseRouter = Router();

licenseRouter.use(authenticate, authorize("ADMIN"));

licenseRouter.get("/", asyncHandler(listLicenses));
licenseRouter.get("/:id", asyncHandler(getLicense));
licenseRouter.post("/", asyncHandler(createLicense));
licenseRouter.patch("/:id", asyncHandler(updateLicense));
