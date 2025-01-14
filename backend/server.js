import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.route.js";
import connectMongoDB from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 2000;

console.log(process.env.MONGO_URI);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.listen(PORT,() => {
    console.log(`Server is running on port ${PORT}`);
    connectMongoDB();
});