import ErrorHandler from "../utils/errorHandler";
import catchAsyncErrors from "../middleware/catchAsyncErrors";
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { UserRequest } from "../middleware/auth.middleware";
import User from "../models/user.model";
import { UserRoleEnum } from "../types/enum";
import sendToken from "../utils/user.token";
import { CLIENT_URL } from "../index";
import { sendText } from "../services/whatsapp.service";

// User Registration
export const registerUser = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { firstName, lastName, password, phoneNumber } = req.body;
    if (!firstName || !lastName || !phoneNumber || !password) return next(new ErrorHandler("Please enter Name, PhoneNumber and Password", 400));

    const userExists = await User.findOne({ phoneNumber });
    if (userExists) return next(new ErrorHandler("Phone number already exists", 409));

    const user = await User.create({
        firstName,
        lastName,
        phoneNumber,
        password,
        role: phoneNumber === process.env.ADMIN_PHONE ? UserRoleEnum.ADMIN : UserRoleEnum.USER,
    });
    if (!user) return next(new ErrorHandler("Error Registering User, Try Again Later", 500));

    const otp = user.getOneTimePassword();
    await user.save({ validateBeforeSave: false });

    try {
        await sendText({ to: `+91${user.phoneNumber}`, body: `Welcome to WhatsApp Integration. \nYour OTP is ${otp}` });
    } catch (error) {
        console.log("Failed to send text")
    }

    console.log(`OTP for ${user.phoneNumber} is ${otp}`);

    sendToken(user, 201, res);
});

// Request Verification
export const requestVerification = catchAsyncErrors(async (req: UserRequest, res: Response, next: NextFunction): Promise<void> => {
    const { user } = req;
    if (!user) return next(new ErrorHandler("User not found", 404));
    if (user.isVerified) return next(new ErrorHandler("User is already verified", 400));

    const otp = user.getOneTimePassword();
    await user.save({ validateBeforeSave: false });

    try {
        console.log(`OTP for ${user.phoneNumber} is ${otp}`);

        res.status(200).json({
            success: true,
            message: `OTP sent to ${user.phoneNumber} successfully`,
        });
    } catch (error: any) {
        user.oneTimePassword = undefined;
        user.oneTimeExpire = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new ErrorHandler(error.message, 500));
    }
});

// Verify User
export const verifyUser = catchAsyncErrors(async (req: UserRequest, res: Response, next: NextFunction): Promise<void> => {
    const { otp } = req.body;
    if (!otp) return next(new ErrorHandler("Please enter OTP", 400));
    const { user } = req;
    if (!user) return next(new ErrorHandler("User not found", 404));

    const oneTimePassword = crypto
        .createHash("sha256")
        .update(otp.toString())
        .digest("hex");

    const otpUser = await User.findOne({
        _id: user._id,
        oneTimePassword,
        oneTimeExpire: { $gt: Date.now() },
    });
    if (!otpUser) return next(new ErrorHandler("Email Veification OTP has Expired", 400));

    otpUser.isVerified = true;
    otpUser.oneTimePassword = undefined;
    otpUser.oneTimeExpire = undefined;
    await otpUser.save();

    sendToken(otpUser, 200, res);
});

// User Login
export const loginUser = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) return next(new ErrorHandler("Please enter Phone Number and Password", 400));

    const user = await User.findOne({ phoneNumber }).select("+password");
    if (!user) return next(new ErrorHandler("Invalid Credentials", 401));

    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid Credentials", 401));
    }

    sendToken(user, 200, res);
});

// User Logout
export const logoutUser = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.cookie("user_token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        message: "Logged Out Successfully",
    });
});

// Forgot Password
export const forgotPassword = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return next(new ErrorHandler("Please enter Phone Number", 400));

    const user = await User.findOne({ phoneNumber });
    if (!user) return next(new ErrorHandler("User not Found", 404));

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    try {
        const resetUrl = `${CLIENT_URL}/reset-password/${resetToken}`;
        console.log(`Reset Password URL for ${user.phoneNumber} is ${resetUrl}`);

        res.status(200).json({
            success: true,
            message: `WhatsApp message sent to ${user.phoneNumber} successfully`,
        });
    } catch (error: any) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new ErrorHandler(error.message, 500));
    }
});

// Reset Password
export const resetPassword = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { token } = req.params;
    if (!token) return next(new ErrorHandler("Broken Link", 500));

    const resetPasswordToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const user = await User.findOne({
        _id: req.body.user,
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) return next(new ErrorHandler("Reset Password Token is Invalid or has Expired", 400));

    const { newPassword, confirmPassword } = req.body;
    if (!newPassword || !confirmPassword) return next(new ErrorHandler("All fields are required", 404));
    if (newPassword !== confirmPassword) return next(new ErrorHandler("Password does not match", 400));

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendToken(user, 200, res);
});

export const setPassword = catchAsyncErrors(async (req: UserRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = await User.findById(req.user?._id).select("+password");
    if (!user) return next(new ErrorHandler("User not Found", 404));
    if (!user.googleId) return next(new ErrorHandler("Password Already Saved", 400));

    const { newPassword, confirmPassword } = req.body;
    if (!newPassword || !confirmPassword) return next(new ErrorHandler("All fields are required", 404));
    if (newPassword !== confirmPassword) return next(new ErrorHandler("Password does not match", 400));

    user.password = newPassword;
    await user.save();

    sendToken(user, 200, res);
});

// Get User Details
export const getUserDetails = catchAsyncErrors(async (req: UserRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = await User.findById(req.user?._id).lean();

    res.status(200).json({
        success: true,
        user,
    });
});

// Update User Password
export const updatePassword = catchAsyncErrors(async (req: UserRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = await User.findById(req.user?._id).select("+password");
    if (!user) return next(new ErrorHandler("User not found", 404));

    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !newPassword || !confirmPassword) return next(new ErrorHandler("All fields are required", 404));
    if (newPassword !== confirmPassword) return next(new ErrorHandler("Password does not match", 400));
    const isPasswordMatched = await user.comparePassword(oldPassword);
    if (!isPasswordMatched) return next(new ErrorHandler("Password is incorrect", 400));

    user.password = newPassword;
    await user.save();

    sendToken(user, 200, res);
});

// Update User Profile
export const updateProfile = catchAsyncErrors(async (req: UserRequest, res: Response, next: NextFunction): Promise<void> => {
    const userExists = req.user;
    if (!userExists) return next(new ErrorHandler("User not found", 404));

    const { firstName, lastName, phoneNumber } = req.body;

    const user = await User.findByIdAndUpdate(
        userExists._id,
        {
            firstName,
            lastName,
            phoneNumber,
            isVerified: false,
        },
        { new: true, runValidators: true, useFindAndModify: false }
    );

    res.status(200).json({
        success: true,
        user,
    });
});
