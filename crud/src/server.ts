import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import app from "./app";

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}

// Connect to DB
const connectDB = async () => {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(MONGO_URI, {
      autoIndex: false,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error("MongoDB connection error:", (err as Error).message);
    process.exit(1);
  }
};

// Start Server
const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful Shutdown
  const shutdown = async () => {
    console.log("\n🔻 Shutting down gracefully...");
    try {
      server.close(() => console.log("HTTP server closed"));
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Promise Rejection:", reason);
    shutdown();
  });
};

startServer();
