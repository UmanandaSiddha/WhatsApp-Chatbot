import Anthropic from "@anthropic-ai/sdk";

export const getAnthropicResponse = async (text: string) => {
    try {
        const anthropic = new Anthropic();
        const msg = await anthropic.messages.create({
            model: "claude-opus-4-20250514",
            max_tokens: 1000,
            temperature: 1,
            system: "Respond only with short poems.",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text,
                        }
                    ]
                }
            ]
        });
        return msg;
    } catch (error: any) {
        console.error("Error fetching response from Anthropic:", error.message);
        throw error;
    }
}