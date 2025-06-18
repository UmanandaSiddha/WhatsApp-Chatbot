import { MessageRoleEnum } from "../types/enum";

export const systemWithCheck = {
    role: MessageRoleEnum.SYSTEM,
    content: `
        You are a helpful assistant. 
        Before you answer, decide whether you need past chat context to answer correctly.
        If you need context, *just* reply exactly: 
            { "needsContext": true }
        Otherwise, reply exactly:
            { "needsContext": false, "answer": "…your answer here…" }`
};