import { GoogleGenAI } from "@google/genai";

export const getGeminiResponse = async (text: string) => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Respond within 60 words to this text: ${text}`,
        });
        return response;
    } catch (error: any) {
        console.error("Error fetching response from Gemini:", error.message);
        throw error;
    }
}