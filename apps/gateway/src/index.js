const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (serviceAccountPath) {
  try {
    const absolutePath = path.resolve(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(require(absolutePath)),
    });
    console.log("[Gateway] Firebase Admin initialized");
  } catch (e) {
    console.error("[Gateway] Failed to init Firebase Admin:", e.message);
  }
} else {
  console.warn(
    "[Gateway] No Firebase Service Account found. Auth verification will fail.",
  );
}

const server = http.createServer(app);
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : "*";
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowed = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://unideploy.in",
        "https://www.unideploy.in"
      ];
      if (process.env.ALLOWED_ORIGINS) {
        allowed.push(...process.env.ALLOWED_ORIGINS.split(","));
      }

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowed.indexOf(origin) !== -1 || allowed.includes("*")) {
        callback(null, true);
      } else {
        // Optional: for dev, loosen up? No, strict is better for debugging.
        // callback(new Error('Not allowed by CORS'));
        // Fallback for now to prevent total breakage if config missing
        console.warn(`[Gateway] Origin ${origin} not explicitly allowed but proceeding for dev compatibility.`);
        callback(null, true);
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
});

const verifyToken = async (socket, next) => {
  const token = socket.handshake.auth.token;

  // Allow bypass for local development/mocking
  if (token === "mock-token") {
    console.warn("[Gateway] Using mock-token bypass for development");
    socket.user = { email: "local-dev@unideploy.in", uid: "mock-user-123" };
    return next();
  }

  if (!token) {
    if (!admin.apps.length) {
      console.warn("[Gateway] Auth skipped (No Admin SDK)");
      socket.user = { email: "mock@local" };
      return next();
    }
    return next(new Error("Authentication error: No token provided"));
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    socket.user = decodedToken;
    next();
  } catch (error) {
    console.error("[Gateway] Token verification failed:", error.message);
    next(new Error("Authentication error: Invalid token"));
  }
};

// Health Check
app.get("/", (req, res) => {
  res.json({ status: "online", service: "UniDeploy Gateway (Node.js)" });
});

// Internal Endpoint for Brain to push logs
app.post("/internal/logs", (req, res) => {
  const { deploymentId, log } = req.body;
  if (!deploymentId || !log) {
    return res.status(400).json({ error: "Missing deploymentId or log" });
  }

  // Broadcast to room
  io.to(`build_${deploymentId}`).emit("log", log);
  // console.log(`[Gateway] Log -> build_${deploymentId}: ${log.substring(0, 50)}...`);
  res.json({ status: "sent" });
});

io.use(verifyToken);

// Socket Connection
io.on("connection", (socket) => {
  console.log(
    `[Gateway] Client connected: ${socket.id} (User: ${socket.user?.email})`,
  );

  socket.on("subscribe_build", (deploymentId) => {
    socket.join(`build_${deploymentId}`);
    console.log(
      `[Gateway] ${socket.user?.email} subscribed to build_${deploymentId}`,
    );
    socket.emit(
      "log",
      `[System] Connected to build stream for ${deploymentId}`,
    );
  });

  socket.on("disconnect", () => {
    console.log(`[Gateway] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Gateway] Listening on port ${PORT}`);
});
