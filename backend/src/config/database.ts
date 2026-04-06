import mongoose from 'mongoose';

//mongo connection
export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-cosmos';
  
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');
    
    //handle connection
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    //retry for more than 5 sec
    setTimeout(connectDatabase, 5000);
  }
};