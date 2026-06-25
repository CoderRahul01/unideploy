import "dotenv/config";
import { createServer } from "http";
import { config } from "./config.js";
import { createApp } from "./gateway/server.js";
import { attachWebSocketServer } from "./gateway/ws.js";

const app = createApp();
const server = createServer(app);

attachWebSocketServer(server);

server.listen(config.PORT, () => {
  console.log(`UniDeploy gateway running on port ${config.PORT} (${config.NODE_ENV})`);
  console.log(`  Frontend URL:  ${config.FRONTEND_URL}`);
});

// Graceful shutdown with drain timeout
process.on("SIGTERM", () => {
  console.log("SIGTERM received — draining connections...");
  server.close(() => process.exit(0));
  setTimeout(() => {
    console.error("Drain timeout exceeded — forcing exit");
    process.exit(1);
  }, 10_000);
});

process.on("SIGINT", () => {
  console.log("SIGINT received — shutting down...");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000);
});
