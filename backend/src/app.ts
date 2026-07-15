import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { ticketRouter } from "./routes/ticket.routes";
import { categoryRouter } from "./routes/category.routes";
import { subCategoryRouter } from "./routes/subCategory.routes";
import { ticketTypeRouter } from "./routes/ticketType.routes";
import { priorityRouter } from "./routes/priority.routes";
import { companyRouter } from "./routes/company.routes";
import { serviceRouter } from "./routes/service.routes";
import { userRouter } from "./routes/user.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { knowledgeArticleRouter } from "./routes/knowledgeArticle.routes";
import { integrationRouter } from "./routes/integration.routes";
import { assetTypeRouter } from "./routes/assetType.routes";
import { assetRouter } from "./routes/asset.routes";
import { licenseRouter } from "./routes/license.routes";
import { processRouter } from "./routes/process.routes";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

function captureRawBody(req: express.Request, _res: express.Response, buf: Buffer) {
  (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
}

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ verify: captureRawBody }));
app.use(express.urlencoded({ extended: true, verify: captureRawBody }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/tickets", ticketRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/subcategories", subCategoryRouter);
app.use("/api/ticket-types", ticketTypeRouter);
app.use("/api/priorities", priorityRouter);
app.use("/api/companies", companyRouter);
app.use("/api/services", serviceRouter);
app.use("/api/users", userRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/knowledge", knowledgeArticleRouter);
app.use("/api/integrations", integrationRouter);
app.use("/api/asset-types", assetTypeRouter);
app.use("/api/assets", assetRouter);
app.use("/api/licenses", licenseRouter);
app.use("/api/processes", processRouter);

app.use(errorHandler);
