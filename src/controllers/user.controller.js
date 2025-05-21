import { asyncHandler } from "../utils/asyncHandler.js";
import{ApiError} from "../utils/Api.Error.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists : email and userName
  // check for images, check for avtar and coverImage
  // upload images on cloudinary , avtar
  // create user object
  // create entry in DB
  // remove password and refreshToken from response
  // check if user is creation 
  //return response
  


  const {userName,email,password,fullName} = req.body;
  console.log("useName:",userName,"email:",email,"password:",password,"fullName:",fullName)
 if ([userName,email,password,fullName].some((field)=>field?.trim() === "")) {
    throw new ApiError(400,"All fields are required")
 }
const existingUser = await User.findOne({
  $or:[
    {email},
    {userName}
  ]
})
if(existingUser){
  throw new ApiError(409,"User with this email or userName already exists")
}

const avtarLocalPath = req.files?.avtar[0]?.path
const coverImageLocalPath = req.files?.coverImage[0]?.path

if (!avtarLocalPath) {
  throw new ApiError(400,"Avtar is required")

}
if (!coverImageLocalPath){
  throw new ApiError(400,"CoverImage is required")
}
const avtarUrl = await uploadOnCloudinary(avtarLocalPath)
if (!avtarUrl){
  throw new ApiError(400,"Failed to upload avtar")
}
const coverImageUrl = await uploadOnCloudinary(coverImageLocalPath)
if (!coverImageUrl){
  throw new ApiError(400,"Failed to upload coverImage")
}
const user = await User.create({
  userName,
  email,
  avtar:avtarUrl.url,
  coverImage:coverImageUrl.url,
  password,
  fullName
})
const createdUser = await User.findById(user._id).select("-password -refreshToken")
if (!createdUser){
  throw new ApiError(500,"Failed to create user")
}
 return res.status(201).json(new ApiResponse(201,createdUser,"User created successfully"))

});

export { registerUser };
