import "dotenv/config";
import { connectToDatabase } from "./databse/mongoose";

async function testConnection() {
  try {
    console.log("Testing database connection...");
    await connectToDatabase();
    console.log("✅ Database connection successful!");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
}

testConnection();
