// models/refreshToken.model.ts
import { Schema, model, Types } from "mongoose";

interface IRefreshToken {
  token: string; // hashed token
  user: Types.ObjectId;
  expiresAt: Date;
  createdAt?: Date;
  revoked?: boolean;
  replacedByToken?: string; // hashed token that replaced this one
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  token: { type: String, required: true, index: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }, // TTL
  revoked: { type: Boolean, default: false },
  replacedByToken: { type: String, default: null },
}, { timestamps: { createdAt: "createdAt" } });

// TTL will remove docs after expiresAt automatically if the mongo TTL index is set.
// Note: expireAfterSeconds: 0 means expire at expiresAt.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model<IRefreshToken>("RefreshToken", refreshTokenSchema);
