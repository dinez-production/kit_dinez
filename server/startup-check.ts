/**
 * Startup health check to ensure database connectivity
 * This prevents the common DATABASE_URL issues during remixing
 */
import { db as getDb } from "./db";
import { connectToMongoDB } from "./mongodb";

export async function performStartupCheck(): Promise<boolean> {
  try {
    console.log("🔍 Performing startup health check...");
    
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL environment variable is not set");
      return false;
    }
    
    // Test PostgreSQL connectivity by querying users table
    const db = getDb();
    await db.user.findMany({ take: 1 });
    console.log("✅ PostgreSQL connection successful");
    
    // Test MongoDB connectivity (optional for development)
    try {
      await connectToMongoDB();
      console.log("✅ MongoDB Atlas connection successful");
    } catch (mongoError) {
      console.log("⚠️ MongoDB Atlas connection failed (continuing with PostgreSQL only)");
      console.log("💡 Tip: Add Replit's IP (0.0.0.0/0 for development) to your MongoDB Atlas IP whitelist");
    }
    console.log("✅ Startup health check passed");
    return true;
    
  } catch (error) {
    console.error("❌ Startup health check failed:", error);
    console.error("💡 Tip: Make sure PostgreSQL database is provisioned and DATABASE_URL is set");
    return false;
  }
}