import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config({ path: './.env' });

// Verify required environment variables
const requiredEnvVars = ['MONGO_URI', 'ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    logger.error('Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
}

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        logger.success(`Connected to MongoDB`);
    } catch (error) {
        logger.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Use port from environment or default to 8000
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

// Start the server
const startServer = async () => {
    try {
        // Connect to database first
        await connectDB();
        
        // Then start the server
        const server = app.listen(PORT, HOST, () => {
            logger.success(`Server running on http://${HOST}:${PORT}`);
        });

        // Handle server errors
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`Port ${PORT} is already in use`);
            } else {
                logger.error('Server error:', err.message);
            }
            process.exit(1);
        });

        // Handle process termination
        process.on('SIGINT', () => {
            logger.info('SIGINT received. Shutting down gracefully...');
            server.close(() => {
                mongoose.connection.close(false, () => {
                    logger.info('Server closed');
                    process.exit(0);
                });
            });
        });

    } catch (error) {
        logger.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

// Start the application
startServer();
