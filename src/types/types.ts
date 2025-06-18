import mongoose, { Document } from "mongoose";
import { MessageRoleEnum, UserRoleEnum } from "./enum";

export interface IUser extends Document {
    _id: mongoose.Schema.Types.ObjectId;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    role: typeof UserRoleEnum[keyof typeof UserRoleEnum];
    password?: string;
    isVerified: boolean;
    googleId?: string;
    oneTimePassword?: string;
    oneTimeExpire?: Date;
    resetPasswordToken?: string;
    resetPasswordExpire?: Date;
    createdAt: Date;
    updatedAt: Date;

    generateJWTToken(): string;
    comparePassword(enteredPassword: string): Promise<boolean>;
    getResetPasswordToken(): string;
    getOneTimePassword(): string;
}

export interface IHistory extends Document {
    _id: mongoose.Schema.Types.ObjectId;
    phoneNumber: string;
    role: typeof MessageRoleEnum[keyof typeof MessageRoleEnum];
    message: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}