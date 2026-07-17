import http from "http";
import { app } from "./app";
import { env } from "./config/env";
import { attachSocketServer } from "./realtime/socket";
import { startEmailIngestion } from "./services/emailIngestion.service";
import { startLicenseReminder } from "./services/licenseReminder.service";
import { startNewsFeed } from "./services/newsFeed.service";

const httpServer = http.createServer(app);
attachSocketServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`ITicket API en écoute sur le port ${env.port}`);
  startEmailIngestion();
  startLicenseReminder();
  startNewsFeed();
});
