/**
 * Startup health check to ensure database connectivity
 * This prevents the common DATABASE_URL issues during remixing
 */
import { db as getDb } from "./db";

export async function performStartupCheck(): Promise<boolean> {
  try {
    console.log("🔍 Performing startup health check...");
    
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL environment variable is not set");
      return false;
    }
    
    // Test database connectivity by querying users table
    const db = getDb();
    await db.user.findMany({ take: 1 });
    
    console.log("✅ Database connection successful");
    console.log("✅ Startup health check passed");
    return true;
    
  } catch (error) {
    console.error("❌ Startup health check failed:", error);
    console.error("💡 Tip: Make sure PostgreSQL database is provisioned and DATABASE_URL is set");
    return false;
  }
}