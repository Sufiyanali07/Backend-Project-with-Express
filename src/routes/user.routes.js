import { Router } from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/user.controller.js";
import upload from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import logger from "../utils/logger.js";
import { refreshAccessToken } from "../controllers/user.controller.js";

const router = Router();

// Auth middleware to log all requests
router.use((req, res, next) => {
    // Log the route hit
    const start = Date.now();
    
    // Log when response is finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.route(
            req.method,
            req.originalUrl,
            res.statusCode,
            `(${duration}ms)`
        );
    });
    
    next();
});

// Register route
router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]),
    (req, res, next) => {
        logger.info('New user registration attempt', { 
            email: req.body.email,
            userName: req.body.userName 
        });
        next();
    },
    registerUser
);

// Login route
router.route("/login").post(
    (req, res, next) => {
        logger.info('Login attempt', { 
            email: req.body.email || req.body.userName,
            ip: req.ip 
        });
        next();
    },
    loginUser
);

// Logout route
router.route("/logout").post(
    verifyJWT,
    (req, res, next) => {
        logger.info('User logging out', { 
            userId: req.user?._id,
            userName: req.user?.userName 
        });
        next();
    },
    logoutUser
);

// Refresh Access Token route
router.route("/refreshAccessToken").post(
    verifyJWT,
    (req, res, next) => {
        logger.info('User refreshing access token', { 
            userId: req.user?._id,
            userName: req.user?.userName 
        });
        next();
    },
    refreshAccessToken
);

export default router;
