import { app } from "./app";
import { env } from "./config/env";
import { startEmailIngestion } from "./services/emailIngestion.service";
import { startLicenseReminder } from "./services/licenseReminder.service";
import { startNewsFeed } from "./services/newsFeed.service";

app.listen(env.port, () => {
  console.log(`ITicket API en écoute sur le port ${env.port}`);
  startEmailIngestion();
  startLicenseReminder();
  startNewsFeed();
});
