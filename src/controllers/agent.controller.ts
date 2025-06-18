import { NextFunction, Request, Response } from "express";
import catchAsyncErrors from "../middleware/catchAsyncErrors";
// import { getAnthropicResponse } from "../services/claud.service";
import ErrorHandler from "../utils/errorHandler";
import { getGeminiResponse } from "../services/gemini.service";

export const getResponse = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { text } = req.body;
    if (!text) {
        return next(new ErrorHandler("Text is required", 400));
    }
    const response = await getGeminiResponse(text);
    if (!response) {
        return next(new ErrorHandler("Failed to get response from Gemini", 500));
    }

    res.status(200).json({
        success: true,
        // data: response,
        text: response?.candidates && response.candidates[0]?.content?.parts && response.candidates[0].content.parts[0]?.text
            ? response.candidates[0].content.parts[0].text as string
            : ""
    });
});