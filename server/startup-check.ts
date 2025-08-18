/**
 * Startup health check to ensure database connectivity
 * This prevents the common DATABASE_URL issues during remixing
 */
import { db as getDb } from "./db";
import { connectToMongoDB } from "./mongodb";
import { mongoVersionCheck } from "./health-check";

export async function performStartupCheck(): Promise<boolean> {
  try {
    console.log("🔍 Performing startup health check...");
    
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL environment variable is not set");
      return false;
    }
    
    // Test PostgreSQL connectivity with a simple connection test
    const db = getDb();
    // Use $executeRaw to avoid cached plan issues
    await db.$executeRaw`SELECT 1`;
    console.log("✅ PostgreSQL connection successful");
    
    // Test MongoDB connectivity and version check
    try {
      await connectToMongoDB();
      console.log("✅ MongoDB connection successful");
      
      // Perform MongoDB version check
      await mongoVersionCheck();
    } catch (mongoError) {
      console.log("⚠️ MongoDB connection failed (continuing with PostgreSQL only)");
      console.log("💡 Tip: Check your MongoDB configuration and connection string");
      console.log("📋 Local MongoDB: Ensure service is running on port 27017");
      console.log("🌐 Atlas MongoDB: Verify IP whitelist includes 0.0.0.0/0 for development");
    }
    console.log("✅ Startup health check passed");
    return true;
    
  } catch (error) {
    console.error("❌ Startup health check failed:", error);
    console.error("💡 Tip: Make sure PostgreSQL database is provisioned and DATABASE_URL is set");
    return false;
  }
}