import express from "express";
import {
    forgotPassword, 
    getUserDetails, 
    loginUser,
    logoutUser,
    registerUser,
    requestVerification,
    resetPassword,
    setPassword,
    updatePassword,
    updateProfile,
    verifyUser
} from "../controllers/user.controller";
import { isAuthenticatedUser, isUserVerified } from "../middleware/auth.middleware";

const router = express.Router();

router.route("/register").post(registerUser);
router.route("/request/verification").get(isAuthenticatedUser, requestVerification);
router.route("/verify").put(isAuthenticatedUser, verifyUser);
router.route("/login").post(loginUser);
router.route("/logout").get(isAuthenticatedUser, logoutUser);
router.route("/password/forgot").post(forgotPassword);
router.route("/password/reset/:token").put(resetPassword);
router.route("/set/password").put(isAuthenticatedUser, isUserVerified, setPassword);
router.route("/me").get(isAuthenticatedUser, getUserDetails);
router.route("/password/update").put(isAuthenticatedUser, isUserVerified, updatePassword);
router.route("/me/update").put(isAuthenticatedUser, isUserVerified, updateProfile);

export default router;