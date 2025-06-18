import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/user.model";
import StatusCodes from "http-status-codes";
import catchAsyncErrors from "./catchAsyncErrors";
import ErrorHandler from "../utils/errorHandler";
import { IUser } from "../types/types";

export interface UserRequest extends Request {
    user?: IUser;
}

export const isAuthenticatedUser = catchAsyncErrors(async (req: UserRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies["user_token"] as string | undefined;
    if (!token) {
        throw new ErrorHandler("Unauthorized access", StatusCodes.FORBIDDEN);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { id: string };
    const user = await User.findById(decoded.id);
    if (!user) {
        throw new ErrorHandler("User not found", StatusCodes.NOT_FOUND)
    }

    req.user = user;
    next();
});

export const isUserVerified = catchAsyncErrors(async (req: UserRequest, res: Response, next: NextFunction) => {
    if (!req.user?.isVerified) {
        return next(new ErrorHandler("Please verify your email to access this resource", StatusCodes.UNAUTHORIZED));
    }
    next();
});

export const authorizeRoles = (...roles: string[]) => {
    return (req: UserRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new ErrorHandler(`Role: ${req.user?.role} is not allowed to access this resource`, StatusCodes.UNAUTHORIZED));
        }
        next();
    };
};