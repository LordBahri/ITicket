import { app } from "./app";
import { env } from "./config/env";
import { startEmailIngestion } from "./services/emailIngestion.service";

app.listen(env.port, () => {
  console.log(`ITicket API en écoute sur le port ${env.port}`);
  startEmailIngestion();
});
