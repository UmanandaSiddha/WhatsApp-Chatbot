import { Job, Queue, Worker } from "bullmq";
import { jobOptions, SendQueueName, redisConnection } from "../config/queue";
import { sendText } from "../services/whatsapp.service";
import History from "../models/history.model";
import { MessageRoleEnum } from "../types/enum";

export const sendQueue = new Queue(SendQueueName, {
    connection: redisConnection,
    defaultJobOptions: jobOptions
});

interface SendData {
    [key: string]: any;
}

export const addSendToQueue = async (data: SendData): Promise<void> => {
    await sendQueue.add("Send Queue", data, {
        removeOnComplete: true,
        removeOnFail: {
            count: 10,
        },
    });
};

const worker = new Worker<SendData>(SendQueueName, async (job: Job<SendData>) => {
    const { to, text } = job.data;
    await History.create({
        phoneNumber: to,
        role: MessageRoleEnum.SYSTEM,
        message: text
    });
    await sendText({ to, body: text });
}, { connection: redisConnection });

worker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
});

worker.on("failed", async (job: Job<SendData> | undefined, err: Error, prev?: string) => {
    if (!job) {
        console.log(`A job has failed but job details are missing.`);
        return;
    }

    console.log(`Job ${job.id} has failed with ${err.message}`);
});