import { GoogleGenAI } from "@google/genai";

export const getGeminiResponse = async (text: string) => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: text
        });
        const result = response?.candidates && response.candidates[0]?.content?.parts && response.candidates[0].content.parts[0]?.text
            ? response.candidates[0].content.parts[0].text as string
            : "";
        return result;
    } catch (error: any) {
        console.error("Error fetching response from Gemini:", error.message);
        throw error;
    }
}