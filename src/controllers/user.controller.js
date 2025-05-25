import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/Api.Error.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import logger from "../utils/logger.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        
        return { accessToken, refreshToken };
    } catch (error) {
        logger.error('Error generating tokens:', error.message);
        throw new ApiError(500, "Failed to generate access and refresh token");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { userName, email, password, fullName } = req.body;
    
    if ([userName, email, password, fullName].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({
        $or: [{ email }, { userName }]
    });
    
    if (existingUser) {
        throw new ApiError(409, "User with this email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

    if (!avatar) {
        throw new ApiError(400, "Failed to upload avatar");
    }

    const user = await User.create({
        userName: userName.toLowerCase(),
        email,
        fullName,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Failed to create user");
    }

    logger.success('User registered successfully', { userId: createdUser._id, email: createdUser.email });
    
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});

// Login Controller

const loginUser = asyncHandler(async (req, res) => {
    const { email, userName, password } = req.body;
    
    if (!userName && !email) {
        throw new ApiError(400, "Username or email is required");
    }
    
    const user = await User.findOne({
        $or: [{ email }, { userName }]
    });

    if (!user) {
        logger.warn('Login attempt failed - User not found', { email, userName });
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    
    if (!isPasswordValid) {
        logger.warn('Login attempt failed - Invalid password', { userId: user._id });
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    logger.success('User logged in successfully', { userId: user._id });
    
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        );
});

// Logout Controller

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    logger.info('User logged out', { userId: req.user._id });

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// Refresh Access Token Controller

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true
        };

        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id);
        
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed successfully"));
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword,newPassword, confirmPassword}=req.body
 const user = await User.findById(req.user._id)
 
if(newPassword !== confirmPassword){
    throw new ApiError(400,"New password and confirm password do not match")
}
const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    
if(!isPasswordCorrect){
    throw new ApiError(401,"Invalid old password")
}

user.password = newPassword
await user.save({validateBeforeSave:false})

logger.success('Password changed successfully', { userId: req.user._id });

return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
})
// get current user

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200)
  .json(new ApiResponse(200,req.user,"Current user fetched successfully"))
})

// update account details
const  updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName,email}=req.body
    if(!fullName || !email){
        throw new ApiError(400,"Full name or email is required")
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullName,
                email:email
            }
        },{
            new:true
        }

    ).select("-password")

    logger.success('Account details updated successfully', { userId: req.user._id });

    return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"));
})

// update avatar
const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Failed to upload avatar")
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar:avatar.url
            }
        },{
            new:true
        }
    ).select("-password")
    
    logger.success('Avatar updated successfully', { userId: req.user._id });

    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"));
})

// update cover image
const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image is required")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400,"Failed to upload cover image")
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },{
            new:true
        }
    ).select("-password")
    
    logger.success('Cover image updated successfully', { userId: req.user._id });

    return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"));
})


export { registerUser, loginUser, logoutUser, refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateAvatar,updateCoverImage };
