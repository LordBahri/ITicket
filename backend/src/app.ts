import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { ticketRouter } from "./routes/ticket.routes";
import { categoryRouter } from "./routes/category.routes";
import { priorityRouter } from "./routes/priority.routes";
import { companyRouter } from "./routes/company.routes";
import { userRouter } from "./routes/user.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { knowledgeArticleRouter } from "./routes/knowledgeArticle.routes";
import { integrationRouter } from "./routes/integration.routes";
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
app.use("/api/priorities", priorityRouter);
app.use("/api/companies", companyRouter);
app.use("/api/users", userRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/knowledge", knowledgeArticleRouter);
app.use("/api/integrations", integrationRouter);

app.use(errorHandler);
