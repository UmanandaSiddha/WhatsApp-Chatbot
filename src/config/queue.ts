export const ResponseQueueName: string = "response-queue";
export const SendQueueName: string = "send-queue";

export const redisConnection: { host?: string; port?: number } = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
};

export const jobOptions: {
    removeOnComplete: boolean;
    attempts: number;
    backoff: {
        type: "exponential";
        delay: number;
    };
} = {
    removeOnComplete: true,
    attempts: 2,
    backoff: {
        type: "exponential",
        delay: 1000,
    },
};
