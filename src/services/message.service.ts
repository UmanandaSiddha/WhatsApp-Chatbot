import History from "../models/history.model";

export async function loadContext(phoneNumber: string, limit = 10) {
    return History
        .find({ phoneNumber })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
}