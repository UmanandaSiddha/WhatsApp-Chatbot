import { Job, Queue, Worker } from "bullmq";
import { jobOptions, redisConnection, ResponseQueueName } from "../config/queue";
import { getGeminiResponse } from "../services/gemini.service";
import { sendText } from "../services/whatsapp.service";
import History from "../models/history.model";
import { MessageRoleEnum } from "../types/enum";

export const responseQueue = new Queue(ResponseQueueName, {
    connection: redisConnection,
    defaultJobOptions: jobOptions
});

interface ResponseData {
    [key: string]: any;
}

export const addResponseToQueue = async (data: ResponseData): Promise<void> => {
    await responseQueue.add("Response Queue", data, {
        removeOnComplete: true,
        removeOnFail: {
            count: 10,
        },
    });
};

const worker = new Worker<ResponseData>(ResponseQueueName, async (job: Job<ResponseData>) => {
    const { from, text } = job.data;
    await History.create({
        phoneNumber: from,
        role: MessageRoleEnum.USER,
        message: text
    });

    const response = await getGeminiResponse(text);
    const result = response?.candidates && response.candidates[0]?.content?.parts && response.candidates[0].content.parts[0]?.text
        ? response.candidates[0].content.parts[0].text as string
        : "We will connect to you later";
    console.log(result);

    
    // await sendText({ to: from, body: result });
}, { connection: redisConnection });

worker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
});

worker.on("failed", async (job: Job<ResponseData> | undefined, err: Error, prev?: string) => {
    if (!job) {
        console.log(`A job has failed but job details are missing.`);
        return;
    }

    console.log(`Job ${job.id} has failed with ${err.message}`);
});