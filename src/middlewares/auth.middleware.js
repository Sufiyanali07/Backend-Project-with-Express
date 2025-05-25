import cookieParser from "cookie-parser";
import { ApiError } from "../utils/Api.Error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import logger from "../utils/logger.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // Get token from cookies or Authorization header
        const token = req.cookies?.accessToken || 
                    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') 
                        ? req.headers.authorization.split(' ')[1] 
                        : null);

        if (!token) {
            logger.warn('No access token provided');
            throw new ApiError(401, "Unauthorized - No token provided");
        }

        // Verify token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        // Find user and exclude sensitive data
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        
        if (!user) {
            logger.warn(`User not found for token: ${token.substring(0, 10)}...`);
            throw new ApiError(401, "Unauthorized - User not found");
        }

        // Attach user to request object
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            logger.warn('Token expired');
            throw new ApiError(401, "Token expired");
        } else if (error.name === 'JsonWebTokenError') {
            logger.warn('Invalid token');
            throw new ApiError(401, "Invalid token");
        }
        logger.error('Auth middleware error:', error.message);
        throw error;
    }
});
