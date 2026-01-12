const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (serviceAccountPath) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
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
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const verifyToken = async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    // For dev/mocking without firebase creds, maybe allow?
    // No, strict auth is better. But if Admin not init, we can't verify.
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
    console.error("[Gateway] Token verification failed:", error);
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
