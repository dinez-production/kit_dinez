# MongoDB 3.6+ Setup Guide for DINEZ App

This guide provides comprehensive instructions for setting up MongoDB 3.6+ with automatic configuration for local or online databases.

## ✨ Features

- **Automatic Environment Detection**: Automatically detects and connects to local, Atlas, or custom MongoDB instances
- **MongoDB 3.6+ Compatibility**: Optimized connection options for MongoDB 3.6 and higher
- **Fallback Support**: Graceful fallback from online to local databases for development
- **Version Validation**: Automatic MongoDB version checking with warnings for unsupported versions
- **Comprehensive Error Handling**: Detailed troubleshooting information for connection issues

## 🔧 Environment Configuration

### Option 1: MongoDB Atlas (Recommended for Production)

1. Create a MongoDB Atlas account at [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string from Atlas
4. Set the environment variable:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kit-canteen?retryWrites=true&w=majority
```

### Option 2: Local MongoDB (Development)

1. Install MongoDB locally:

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**macOS (with Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

**Windows:**
Download and install from [MongoDB Download Center](https://www.mongodb.com/try/download/community)

2. Set the environment variable (optional, defaults to localhost):
```bash
MONGODB_URI=mongodb://localhost:27017/kit-canteen
```

### Option 3: Custom MongoDB Instance

For custom MongoDB installations (remote servers, cloud providers, etc.):

```bash
MONGODB_URI=mongodb://username:password@host:port/database
```

## 📁 Project Configuration

### 1. Environment Variables Priority

The application uses the following priority order for MongoDB connection:

1. `MONGODB_URI` (highest priority)
2. `MONGODB_ATLAS_URI`
3. `MONGODB_LOCAL_URI`
4. Default: `mongodb://localhost:27017/kit-canteen` (fallback)

### 2. Copy Environment Template

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your specific configuration.

### 3. Database Structure

The application uses a **hybrid database architecture**:

- **PostgreSQL**: User authentication and session management
- **MongoDB**: Business data (menu items, orders, categories, notifications, etc.)

## 🚀 Automatic Features

### Environment Detection

The application automatically detects your MongoDB environment:

- **Atlas**: Detected by `mongodb+srv://` or `mongodb.net` in URI
- **Local**: Detected by `localhost` or `127.0.0.1` in URI  
- **Custom**: Any other MongoDB instance

### Connection Options

MongoDB 3.6+ compatible options are automatically applied:

```javascript
{
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // IPv4 only
  useNewUrlParser: true,
  useUnifiedTopology: true
}
```

For Atlas connections, additional options are added:
```javascript
{
  retryWrites: true,
  w: 'majority'
}
```

### Version Validation

The system automatically:
- Detects MongoDB version on connection
- Warns if version is below 3.6
- Provides compatibility information

## 🔍 Troubleshooting

### Connection Issues

**Local MongoDB:**
1. Ensure MongoDB service is running
2. Check if port 27017 is available
3. Verify MongoDB installation
4. Check firewall settings

**MongoDB Atlas:**
1. Verify connection string format
2. Check IP whitelist (add 0.0.0.0/0 for development)
3. Ensure database user has proper permissions
4. Confirm cluster is active and not paused

**Custom Instance:**
1. Test network connectivity
2. Verify authentication credentials
3. Check MongoDB server status
4. Confirm database exists

### Logs and Debugging

The application provides detailed connection logs:

```
🔌 Attempting to connect to atlas MongoDB...
✅ Connected to MongoDB Atlas cloud database
🌐 Environment: Production/Cloud
📊 MongoDB version: 8.0.12
```

### Common Error Solutions

**IP Whitelist Issues (Atlas):**
- Add your IP address to Atlas IP Access List
- For development: add 0.0.0.0/0 (not recommended for production)

**Authentication Failures:**
- Verify username/password in connection string
- Check database user permissions
- Ensure correct database name

**Local Connection Failures:**
- Start MongoDB service: `sudo systemctl start mongodb`
- Check MongoDB status: `sudo systemctl status mongodb`
- Verify port 27017 is not blocked

## 📊 Connection Status

The application provides connection information through the `getConnectionInfo()` function:

```javascript
{
  isConnected: boolean,
  connectionType: 'local' | 'atlas' | 'custom',
  mongooseReadyState: number,
  databaseName: string
}
```

## 🔄 Development Workflow

### Local Development

1. Install MongoDB locally or on a remote server
2. Start MongoDB service
3. Run the application - it will automatically connect to local MongoDB

### Production Deployment

1. Set up MongoDB Atlas cluster
2. Configure `MONGODB_URI` with Atlas connection string
3. Deploy application - it will automatically connect to Atlas

### Testing Different Environments

Switch between environments by changing environment variables:

```bash
# Test local
export MONGODB_URI=mongodb://localhost:27017/kit-canteen-test

# Test Atlas
export MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kit-canteen

# Test custom
export MONGODB_URI=mongodb://user:pass@custom-host:27017/kit-canteen
```

## 📋 Checklist

- [ ] MongoDB 3.6+ installed/accessible
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Application starts without errors
- [ ] Data operations working correctly

## 🔗 Additional Resources

- [MongoDB 3.6 Documentation](https://docs.mongodb.com/v3.6/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Mongoose Connection Guide](https://mongoosejs.com/docs/connections.html)
- [Environment Variables Best Practices](https://12factor.net/config)

## 📞 Support

If you encounter issues:

1. Check application logs for specific error messages
2. Verify environment variable configuration
3. Test MongoDB connection independently
4. Consult troubleshooting section above

The application provides detailed error messages and troubleshooting steps for common connection issues.