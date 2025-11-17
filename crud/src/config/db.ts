import mongoose from "mongoose";

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("MONGO_URI is missing");
    process.exit(1);
  }

  try {
    // Avoid deprecation warnings
    mongoose.set("strictQuery", true);

    const conn = await mongoose.connect(mongoUri, {
      autoIndex: false,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
};
