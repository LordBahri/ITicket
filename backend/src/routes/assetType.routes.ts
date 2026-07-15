import { Router } from "express";
import { listAssetTypes, createAssetType, updateAssetType } from "../controllers/assetType.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const assetTypeRouter = Router();

assetTypeRouter.use(authenticate, authorize("ADMIN"));

assetTypeRouter.get("/", asyncHandler(listAssetTypes));
assetTypeRouter.post("/", asyncHandler(createAssetType));
assetTypeRouter.patch("/:id", asyncHandler(updateAssetType));
