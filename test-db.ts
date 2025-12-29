import "dotenv/config";
import { connectToDatabase } from "./database/mongoose";

// async function testConnection() {
//   try {
//     console.log("Testing database connection...");
//     await connectToDatabase();
//     console.log("✅ Database connection successful!");
//   } catch (error) {
//     console.error("❌ Database connection failed:", error.message);
//     process.exit(1);
//   }
// }

testConnection();

async function testConnection() {
  try {
    console.log("Testing database connection...");
    await connectToDatabase();
    console.log("✅ Database connection successful!");
  } catch (error) {
    // Add parentheses around 'error'
    if (error instanceof Error) {
      // Check if 'error' is an instance of 'Error'
      console.error("❌ Database connection failed:", error.message);
    }
    process.exit(1);
  }
}

testConnection();
