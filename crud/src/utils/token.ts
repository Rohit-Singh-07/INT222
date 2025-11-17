// utils/token.ts
import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET: string = process.env.JWT_SECRET as string;
const REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET as string;

// Must be string | number for jwt.sign()
const ACCESS_EXPIRES: string | number = process.env.JWT_EXPIRES_IN || "1h";
const REFRESH_EXPIRES: string | number = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export const generateAccessToken = (payload: object): string => {
  return jwt.sign(
    payload,
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES } as SignOptions
  );
};

export const generateRefreshToken = (payload: object): string => {
  return jwt.sign(
    payload,
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES } as SignOptions
  );
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET);
};

/** Hash a token for safe DB storage */
export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/** Returns expiry date (Date) for refresh token based on REFRESH_EXPIRES */
export const getRefreshTokenExpiry = (): Date => {
  const val = REFRESH_EXPIRES.toString();
  const num = parseInt(val, 10);

  if (val.endsWith("d")) {
    return new Date(Date.now() + num * 24 * 60 * 60 * 1000);
  }
  if (val.endsWith("h")) {
    return new Date(Date.now() + num * 60 * 60 * 1000);
  }

  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};
