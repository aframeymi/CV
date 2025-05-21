import { config } from "dotenv";
import mongoose from "mongoose";

config(); // Load environment variables from .env

export const databaseconnect = async (uri = process.env.URI) => {
  try {
    if (!uri) {
      throw new Error("Database URI is not defined");
    }
    await mongoose.connect(uri, {}); 
    console.log("Database connected");
  } catch (error) {
    console.error("Error connecting to database:", error);
  }
};

export const databasedisconnect = async () => {
  try {
    await mongoose.connection.close(); 
    console.log("Database disconnected");
  } catch (error) {
    console.error("Error disconnecting from database:", error);
  }
};
