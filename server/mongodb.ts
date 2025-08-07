import mongoose from 'mongoose';

let isConnected = false;

export async function connectToMongoDB() {
  if (isConnected) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be set. Did you forget to add the MongoDB secret?");
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('✅ MongoDB Atlas connection successful');
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error);
    console.error('💡 This is likely due to IP whitelist restrictions. Add 0.0.0.0/0 to your MongoDB Atlas IP access list for development.');
    throw error;
  }
}

export { mongoose };