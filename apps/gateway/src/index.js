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
const rawOrigins = process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000,https://unideploy.in,https://www.unideploy.in";
const allowedOrigins = rawOrigins.split(",").map(o => o.trim());

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        console.warn(`[Gateway] Origin ${origin} not in whitelist: ${allowedOrigins.join(", ")}`);
        callback(null, true); // Fallback for dev, but log warning
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
});

const verifyToken = async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  if (!admin.apps.length) {
    return next(new Error("Authentication error: Firebase Admin SDK not initialised — check FIREBASE_SERVICE_ACCOUNT_JSON"));
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
  res.json({
    status: "online",
    service: "UniDeploy Gateway (Node.js)",
    branding: "UniDeploy"
  });
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
