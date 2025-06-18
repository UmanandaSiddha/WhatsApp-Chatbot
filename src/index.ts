import app from "./app";
import connectDatabase from "./config/database";
import dotenv from "dotenv";
import { createServer } from "http";
import { Redis } from "ioredis";

// Handling Uncaught Exception
process.on("uncaughtException", (err) => {
    console.log(`Error: ${err}`);
    console.log(`Shutting down the server due to Uncaught Exception`);
    
    process.exit(1);
});

dotenv.config();

const PORT = process.env.PORT || 4000;
export const redis = new Redis();

connectDatabase();

export const CLIENT_URL = process.env.NODE_ENV === "production" ? "https://some.com" : "http://localhost:5173";
export const SERVER_URL = process.env.NODE_ENV === "production" ? "https://api.some.com" : "http://localhost:7070";

const httpServer = createServer(app);

app.get("/", (req, res) => {
    res.status(200).json({
        message: "Server Working 4.0!"
    })
});

const server = httpServer.listen( PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Unhandled Promise Rejection
process.on("unhandledRejection", (err: any) => {
    console.log(`Error: ${err.message}`);
    console.log(`Shutting down the server due to Unhandled Promise Rejection`);

    server.close(() => {
        process.exit(1);
    });
});