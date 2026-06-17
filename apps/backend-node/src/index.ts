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
  console.log(`  Agent service: ${config.AGENT_SERVICE_URL}`);
  console.log(`  Frontend URL:  ${config.FRONTEND_URL}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
