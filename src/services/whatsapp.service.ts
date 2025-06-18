import axios from 'axios';

interface TextMessage {
    to: string;
    body: string;
}

export async function sendText({ to, body }: TextMessage) {
    const url = `${process.env.WHATSAPP_API_URL}/${process.env.PHONE_NUMBER_ID}/messages`;
    try {
        await axios.post(url, {
            messaging_product: 'whatsapp',
            to: `+91${process.env.ADMIN_PHONE}`,
            type: 'text',
            text: { body },
        }, {
            headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });
    } catch (error: any) {
        throw new Error('Failed to send message');
    }
    return;
}
