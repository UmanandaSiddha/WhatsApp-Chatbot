import express, { CookieOptions } from "express";
import qs, { ParsedQs } from "qs";
import axios from "axios";
import catchAsyncErrors from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/errorHandler";
import { CLIENT_URL } from "../index";
import User from "../models/user.model";
import { UserRoleEnum } from "../types/enum";

const router = express.Router();

const getGoogleAuthToken = async (code: string | ParsedQs | string[] | ParsedQs[]) => {
    const url = "https://oauth2.googleapis.com/token";

    const values = {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
        redirect_uri: process.env.REDIRECT_URL as string,
        grant_type: "authorization_code",
    };

    try {
        const res = await axios.post(
            url,
            qs.stringify(values),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );
        return res.data;
    } catch (error: any) {
        console.error("AUth Token: ", error.message);
        throw new Error(error.message);
    }
}

const getGoogleUser = async (id_token: string, access_token: string) => {
    try {
        const res = await axios.get(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
            {
                headers: {
                    Authorization: `Bearer ${id_token}`,
                },
            }
        );
        return res.data;
    } catch (error: any) {
        console.error("Google User: ", error.message);
        throw new Error(error.message);
    }
}

router.route("/api/google/oauth").get(catchAsyncErrors(async (req, res) => {
    const { code } = req.query;
    if (!code) {
        throw new ErrorHandler("No code provided", 400);
    }

    // Ensure code is always a string
    const codeStr = Array.isArray(code) ? code[0] : code as string;
    const { id_token, access_token } = await getGoogleAuthToken(codeStr);
    const googleUser = await getGoogleUser(id_token, access_token);

    if (!googleUser.phoneNumber) {
        throw new ErrorHandler("Google authentication failed: No phone number received", 400);
    }

    const options: CookieOptions = {
        expires: new Date(Date.now() + parseInt(process.env.COOKIE_EXPIRE as string) * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: true,            
        sameSite: 'strict',       
    };

    let user = await User.findOne({ phoneNumber: googleUser.phoneNumber });

    if (user) {
        if (user.googleId !== googleUser.id) {
            user.googleId = googleUser.id;
            await user.save();
        }
    } else {
        // Fixing the missing firstName, lastName issue
        const fullName = googleUser.name?.split(" ") || ["", ""];
        const firstName = fullName[0] || "Unknown";
        const lastName = fullName.slice(1).join(" ") || "Unknown";

        user = await User.create({
            profile: {
                firstName,
                lastName,
                phone: googleUser.phoneNumber,
                googleId: googleUser.id,
                role: googleUser.phoneNumber === process.env.ADMIN_PHONE ? UserRoleEnum.ADMIN : UserRoleEnum.USER,
                isVerified: googleUser.verified_email || false,
            },
        });
    }

    const token = user.generateJWTToken();
    res.cookie("user_token", token, options);

    return res.redirect(CLIENT_URL);
}));

export default router;