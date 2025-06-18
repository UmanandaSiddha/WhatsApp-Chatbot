import mongoose, { Schema } from "mongoose";
import { MessageRoleEnum } from "../types/enum";
import { IHistory } from "../types/types";

const HistorySchema: Schema<IHistory> = new mongoose.Schema(
    {
        phoneNumber: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: Object.values(MessageRoleEnum),
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

const History = mongoose.model<IHistory>("History", HistorySchema);
export default History;