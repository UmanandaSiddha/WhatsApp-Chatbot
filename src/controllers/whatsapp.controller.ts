import { Request, Response } from 'express';
import { sendText } from '../services/whatsapp.service';
import { getGeminiResponse } from '../services/gemini.service';
import { addResponseToQueue } from '../queue/response.queue';

export function verifyWebhook(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        res.status(200).send(challenge);
        return;
    }

    res.status(403).json({
        error: 'Verification failed. Invalid token or mode.',
    });
}

export async function receiveWebhook(req: Request, res: Response): Promise<void> {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
            for (const change of entry.changes) {
                const messages = change.value.messages;
                if (!messages) continue;

                for (const msg of messages) {
                    const from = msg.from;
                    const text = msg.text?.body ?? '';
                    await addResponseToQueue({ from, text });
                }
            }
        }
        res.sendStatus(200);
        return;
    }

    res.sendStatus(404);
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
    const { to, body } = req.body;

    if (!to || !body) {
        res.status(400).json({ error: 'Missing "to" or "body" in request body.' });
        return;
    }

    try {
        await sendText({ to, body });
        res.json({ success: true });
    } catch (err: any) {
        console.error('Error sending message:', err.message);
        res.status(500).json({ error: err.message });
    }
}