/**
 * MongoDB Migration: Add new fields to Message documents
 * This is an idempotent migration that adds missing fields in batches
 * 
 * Fields added:
 * - reactions: Json (for emoji reactions)
 * - threadId: ObjectId (for threaded replies) 
 * - mentions: Array of strings (for @mentions)
 * 
 * Run with: node migrations/mongodb/001_add_message_fields.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL;
const BATCH_SIZE = 1000;

if (!MONGODB_URL) {
  console.error('❌ MONGODB_URL environment variable is required');
  process.exit(1);
}

async function runMigration() {
  const client = new MongoClient(MONGODB_URL);
  
  try {
    await client.connect();
    console.log('🔌 Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('messages');
    
    // Check if migration has already run by looking for documents with new fields
    const sampleWithNewFields = await collection.findOne({
      $or: [
        { reactions: { $exists: true } },
        { threadId: { $exists: true } },
        { mentions: { $exists: true } }
      ]
    });
    
    // Find documents missing the new fields
    const totalDocs = await collection.countDocuments({
      $and: [
        { reactions: { $exists: false } },
        { threadId: { $exists: false } },
        { mentions: { $exists: false } }
      ]
    });
    
    if (totalDocs === 0) {
      console.log('✅ Migration already completed - all documents have required fields');
      return;
    }
    
    console.log(`📊 Found ${totalDocs} documents that need migration`);
    console.log(`🚀 Starting migration in batches of ${BATCH_SIZE}...`);
    
    let processed = 0;
    let batch = 0;
    
    while (processed < totalDocs) {
      batch++;
      console.log(`📦 Processing batch ${batch}...`);
      
      // Find documents missing fields (limit to batch size)
      const docsToUpdate = await collection.find({
        $and: [
          { reactions: { $exists: false } },
          { threadId: { $exists: false } },
          { mentions: { $exists: false } }
        ]
      }).limit(BATCH_SIZE).toArray();
      
      if (docsToUpdate.length === 0) {
        break;
      }
      
      // Prepare bulk operations
      const bulkOps = docsToUpdate.map(doc => ({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              reactions: null,
              threadId: null,
              mentions: [],
              updatedAt: new Date()
            }
          }
        }
      }));
      
      // Execute bulk update
      const result = await collection.bulkWrite(bulkOps);
      
      processed += result.modifiedCount;
      console.log(`✅ Batch ${batch} complete: ${result.modifiedCount} documents updated`);
      console.log(`📈 Progress: ${processed}/${totalDocs} (${Math.round(processed/totalDocs*100)}%)`);
      
      // Add small delay to avoid overwhelming the database
      if (batch % 10 === 0) {
        console.log('⏸️  Brief pause to avoid database overload...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`🎉 Migration completed successfully!`);
    console.log(`📊 Total documents processed: ${processed}`);
    
    // Verify migration
    const verifyCount = await collection.countDocuments({
      $and: [
        { reactions: { $exists: true } },
        { threadId: { $exists: true } },
        { mentions: { $exists: true } }
      ]
    });
    
    console.log(`✅ Verification: ${verifyCount} documents now have all required fields`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}