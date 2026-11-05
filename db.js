// dotenv loads variables from .env; mongoose connects to MongoDB
import { config } from "dotenv";
import mongoose from "mongoose";

config(); 

// Connect to MongoDB using the given URI (defaults to the URI environment variable)
export const databaseconnect = async (uri = process.env.URI) => {
  try {

    // Stop if no URI is available
    if (!uri) {
      throw new Error("Database URI is not defined");
    }

    // Open the connection
    await mongoose.connect(uri, {}); 
    console.log("Database connected");
  } catch (error) {

    // Errors are logged, not thrown, so the app keeps running
    console.error("Error connecting to database:", error);
  }
};

// Close the MongoDB connection
export const databasedisconnect = async () => {
  try {
    await mongoose.connection.close(); 
    console.log("Database disconnected");
  } catch (error) {
    console.error("Error disconnecting from database:", error);
  }
};
