import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const generateTokens = (userId) => {
     const accessToken = jwt.sign({userId}, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "15m"
     });
     const refreshToken = jwt.sign({userId}, process.env.REFRESH_TOKEN_SECRET, {
          expiresIn: "7d"
     });
     return ({accessToken,refreshToken})
};

const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(`refresh_token:${userId}`, refreshToken,"EX", 7 * 24 * 60 * 60); //7 days
};

const setCookies = (res, accessToken, refreshToken) => {
     res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 15 * 60 * 1000
     });
     res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 1000
     });
};

export const signup = async (req,res) => {
   try  {
     const {email, password, username} = req.body;
     if (!email || !password || !username) {
          return res.status(400).json({ message: "All fields are required" });
     }

     const userExists = await User.findOne({email});

     if(userExists){
          return res.status(400).json({message: "User already exists"});
     }
     const user = await User.create({ username, email, password });

     //authenticate
     const {accessToken, refreshToken} = generateTokens(user._id);
     await storeRefreshToken(user._id, refreshToken);

     setCookies(res, accessToken, refreshToken);

     res.status(201).json({user:{
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
     }, message: "User created successfully"});

   } catch (error) {
        console.log("Error in signup controller",error);
        res.status(500).json({message: "Internal server error"});
   }
};

export const login = async (req,res) => {
    try {
          const {email, password} = req.body;
          const user = await User.findOne({email});
          if(user && (await user.comparePassword(password))){
               const {accessToken, refreshToken} = generateTokens(user._id);

               await storeRefreshToken(user._id, refreshToken);
               setCookies(res, accessToken, refreshToken);

               res.status(200).json({user:{
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role
               }, message: "Login successful"});          
          }
          else{
               res.status(401).json({message: "Invalid email or password"});
          }
    } catch (error) {
         console.log("Error in login controller",error.message);
         res.status(500).json({message: "Internal server error"});
    }
};

export const logout = async (req,res) => {
    try {
          const refreshToken = req.cookies.refreshToken;
          if(refreshToken){
               const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
               await redis.del(`refresh_token:${decoded.userId}`);              
          }
          res.clearCookie("accessToken");
          res.clearCookie("refreshToken");
          res.status(200).json({message: "Logout successful"});
    } catch (error) {
         console.log("Error in logout controller",error);
         res.status(500).json({message: "Internal server error"});
    }
};

export const refreshToken = async (req,res) => {
    try {
     const refreshToken = req.cookies.refreshToken;

     if(!refreshToken){
          return res.status(401).json({message: "Unauthorized"});
     }

     const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
     const storeRefreshToken = await redis.get(`refresh_token:${decoded.userId}`);

     if(storeRefreshToken !== refreshToken){
          return res.status(401).json({message: "Invalid refresh token"});
     }

     const accessToken = jwt.sign({userId: decoded.userId}, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "15m"
     });
     res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 15 * 60 * 1000
     });
     res.status(200).json({message: "Token refreshed successfully"});
    } catch (error) {
         console.log("Error in refresh token controller",error);
         res.status(500).json({message: "Internal server error"});
    } 
};


