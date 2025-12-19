import "dotenv/config";
import express, { Request, Response } from "express";
import { AgeVerificationStatus } from "vrc-ts";
import cooldownManager from "./cooldownManager";
import { handleVRChatError } from "./errorHandler";
import vrchatClient from "./vrchatClient";

const app = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 3010;

// Allowed user agents
const ALLOWED_USER_AGENTS = [
  "UnityPlayer/2022.3.22f1-DWR (UnityWebRequest/1.0, libcurl/8.5.0-DEV)",
  "UnityPlayer/2022.3.22f1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)",
];

// Allowed Unity versions
const ALLOWED_UNITY_VERSIONS = ["2022.3.22f1-DWR", "2022.3.22f1"];

// Allowed "calledfrom" values
const ALLOWED_CALLED_FROM = ["loveworld", "maxieworld"];

// Validation middleware - check user agent, Unity version, and calledfrom
// Health endpoint is exempt from validation
app.use((req: Request, res: Response, next) => {
  // Skip validation for health endpoint
  if (req.path === "/health") {
    next();
    return;
  }

  const userAgent = req.get("user-agent");
  const unityVersion = req.get("x-unity-version");
  const calledFrom = req.query.calledfrom || req.get("x-called-from");

  // Check if user-agent is valid
  if (!userAgent || !ALLOWED_USER_AGENTS.includes(userAgent)) {
    res.status(404).json({
      error: "Not found",
    });
    return;
  }

  // Check if x-unity-version is valid
  if (!unityVersion || !ALLOWED_UNITY_VERSIONS.includes(unityVersion)) {
    res.status(404).json({
      error: "Not found",
    });
    return;
  }

  // Check if calledfrom is valid (can be query parameter or header)
  if (!calledFrom || typeof calledFrom !== "string" || !ALLOWED_CALLED_FROM.includes(calledFrom)) {
    res.status(404).json({
      error: "Not found",
    });
    return;
  }

  next();
});

// Request logging middleware
app.use((req: Request, _res: Response, next) => {
  const timestamp = new Date().toISOString();
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";

  console.log("\n=== Incoming Request ===");
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Method: ${req.method}`);
  console.log(`Path: ${req.path}`);
  console.log(`Full URL: ${req.protocol}://${req.get("host")}${req.originalUrl}`);
  console.log(`Client IP: ${clientIp}`);
  console.log("Headers:");
  Object.entries(req.headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  if (req.query && Object.keys(req.query).length > 0) {
    console.log("Query Parameters:");
    Object.entries(req.query).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }
  // Log calledfrom if present (from query or header)
  const calledFrom = req.query.calledfrom || req.get("x-called-from");
  if (calledFrom) {
    console.log(`Called From: ${calledFrom}`);
  }
  if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
    console.log("Body:");
    console.log(`  ${JSON.stringify(req.body, null, 2)}`);
  }
  console.log("======================\n");

  next();
});

// Middleware
app.use(express.json());

// Health check endpoint
app.get("/health", (_req: Request, res: Response): void => {
  const isReady = vrchatClient.isReady();

  if (!isReady) {
    const error = vrchatClient.getInitializationError();
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error ? error.message : "VRChat client not initialized",
      vrchatClientReady: false,
    });
    return;
  }

  const currentUser = vrchatClient.getCurrentUser();
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    vrchatClientReady: true,
    authenticatedUser: currentUser ? currentUser.displayName : null,
  });
});

// Check adult status endpoint
app.get("/checkAdultStatus", async (req: Request, res: Response): Promise<void> => {
  try {
    const displayName = req.query.username; // Query param still called "username" for API compatibility

    if (!displayName || typeof displayName !== "string") {
      res.status(400).json({
        error: "Username query parameter is required and must be a string",
      });
      return;
    }

    // Wait for cooldown period to ensure we don't send too many requests
    await cooldownManager.waitForCooldown();

    // Get the VRChat API client
    const api = vrchatClient.getApi();

    // Step 1: Search for users by display name (searchAllUsers searches by displayName)
    const searchResults = await api.userApi.searchAllUsers({
      search: displayName,
      n: 100, // Get more results to find exact displayName match
      fuzzy: false,
    });

    if (searchResults.length === 0) {
      res.status(404).json({
        error: "User not found",
      });
      return;
    }

    // Step 2: Find the user with exact displayName match
    let matchedUser = null;
    for (const searchResult of searchResults) {
      // Check if displayName matches exactly (case-sensitive)
      if (searchResult.displayName === displayName) {
        // Get full user details to access ageVerificationStatus
        const fullUser = await api.userApi.getUserById({ userId: searchResult.id });
        matchedUser = fullUser;
        break;
      }
    }

    if (!matchedUser) {
      res.status(404).json({
        error: "User not found with exact displayName match",
      });
      return;
    }

    // Step 3: Check age verification status
    const isAgeVerified = matchedUser.ageVerificationStatus === AgeVerificationStatus.Verified_18_Plus;

    // Step 4: Return the response in the requested format
    res.status(200).json({
      "age-verified": isAgeVerified ? "true" : "false",
      username: matchedUser.displayName,
    });
  } catch (error) {
    const { statusCode, response } = handleVRChatError(error);
    res.status(statusCode).json(response);
  }
});

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

// Initialize VRChat client and start server
async function startServer(): Promise<void> {
  try {
    console.log("Initializing VRChat client...");
    await vrchatClient.initialize();
    console.log("VRChat client initialized successfully");

    // Start Express server
    const server = app.listen(PORT, (): void => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
      console.log(`Adult status check available at http://localhost:${PORT}/checkAdultStatus?username=DISPLAYNAME`);
    });

    // Handle server errors
    server.on("error", (error: Error & { code?: string }) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Please choose a different port.`);
      } else {
        console.error("Server error:", error);
      }
      process.exit(1);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM signal received: closing HTTP server");
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT signal received: closing HTTP server");
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Failed to initialize VRChat client:", error);
    const { statusCode, response } = handleVRChatError(error);
    console.error(`Error [${statusCode}]:`, response.error);
    if (response.errorType) {
      console.error(`Error Type: ${response.errorType}`);
    }
    process.exit(1);
  }
}

startServer();
