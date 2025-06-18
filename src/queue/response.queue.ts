import { Job, Queue, Worker } from "bullmq";
import { jobOptions, redisConnection, ResponseQueueName } from "../config/queue";
import { getGeminiResponse } from "../services/gemini.service";
import { sendText } from "../services/whatsapp.service";
import History from "../models/history.model";
import { MessageRoleEnum } from "../types/enum";
import { systemWithCheck } from "../utils/prompt";
import { addSendToQueue } from "./send.queue";
import { loadContext } from "../services/message.service";

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
    const { from, text: latestText } = job.data;
    await History.create({
        phoneNumber: from,
        role: MessageRoleEnum.USER,
        message: latestText
    });

    const checkPrompt = [
        {
            role: MessageRoleEnum.SYSTEM,
            content: systemWithCheck.content,
        },
        {
            role: MessageRoleEnum.USER,
            content: latestText,
        },
    ];

    let checkResp: {
        needsChatContext: boolean;
        needsCompanyContext: boolean;
        answer?: string;
    };
    try {
        const raw = await getGeminiResponse(JSON.stringify({ messages: checkPrompt }));
        checkResp = JSON.parse(raw);
    } catch {
        checkResp = {
            needsChatContext: true,
            needsCompanyContext: true,
        };
    }

    const { needsChatContext, needsCompanyContext, answer } = checkResp;

    if (!needsChatContext && !needsCompanyContext && answer) {
        console.log(answer);
        await addSendToQueue({ to: from, text: answer });
        return;
    }

    const messages: { role: string; content: string }[] = [
        {
            role: MessageRoleEnum.SYSTEM,
            content: "You are Shivaji Corp's WhatsApp assistant.",
        },
    ];

    if (needsChatContext) {
        const history = await loadContext(from, 10);
        history
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .forEach((m) => {
                messages.push({
                    role: m.role,
                    content: `${m.message} ${m?.metadata ? JSON.parse(m.metadata as any) : ""}`,
                });
            });
    }

    if (needsCompanyContext) {
        messages.push({
            role: MessageRoleEnum.SYSTEM,
            content: `
                Shivaji Corp is a leading SaaS innovator on a mission to accelerate digital transformation for businesses of all sizes. 
                We specialize in:
                • Scalable Cloud Platforms: Multi-tenant applications that grow with your user base.  
                • AI-Powered Automations: From personalized customer journeys to intelligent analytics dashboards.  
                • End-to-End Security: ISO-certified data protection, GDPR & HIPAA compliance.  
                • Seamless Integrations: Prebuilt connectors for CRMs, ERPs, payment gateways, and collaboration tools.  

                Our core values are innovation, reliability, and customer success. 
                1. Innovation: We continuously evolve our road-map with the latest in AI/ML and low-code frameworks.  
                2. Reliability: 99.9% uptime SLA, 24/7 global support, and proactive monitoring.  
                3. Customer Success: Dedicated onboarding teams, extensive docs, and training to ensure rapid ROI.  

                Whether you're a startup or an enterprise, Shivaji Corp delivers turnkey SaaS solutions designed to maximize agility, reduce TCO, and propel your business forward.
                `.trim(),
        });
    }

    messages.push({
        role: MessageRoleEnum.USER,
        content: latestText,
    });

    const finalAnswer = await getGeminiResponse(JSON.stringify({ messages }));

    console.log(finalAnswer);

    await addSendToQueue({ to: from, text: finalAnswer });
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