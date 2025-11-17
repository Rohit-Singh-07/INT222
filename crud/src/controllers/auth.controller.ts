// controllers/auth.controller.ts
import { Request, Response, NextFunction } from "express";
import User from "../models/user.model";
import RefreshToken from "../models/refreshToken.model";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from "../utils/token";
import { z } from "zod";

type JwtPayloadLike = { id: string; role?: string; iat?: number; exp?: number };

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["user", "admin"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  token: z.string().min(10),
});

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const exists = await User.findOne({ email: data.email });
    if (exists) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // User schema has pre-save hook to hash password
    const user = await User.create(data);

    const payload = { id: user._id.toString(), role: user.role };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // store hashed refresh token in DB
    const hashed = hashToken(refreshToken);
    const expiresAt = getRefreshTokenExpiry();

    await RefreshToken.create({
      token: hashed,
      user: user._id,
      expiresAt,
    });

    res.status(201).json({
      message: "Account created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid data" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await User.findOne({ email: data.email, isDeleted: false });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const payload = { id: user._id.toString(), role: user.role };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // persist hashed refresh token
    const hashed = hashToken(refreshToken);
    const expiresAt = getRefreshTokenExpiry();

    await RefreshToken.create({
      token: hashed,
      user: user._id,
      expiresAt,
    });

    res.status(200).json({
      message: "Logged in successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid data" });
  }
};

/**
 * Refresh endpoint - rotates refresh token:
 * - Accepts refresh token (string)
 * - Validates signature
 * - Finds hashed token in DB and ensure not revoked/expired
 * - Issues new access token + new refresh token
 * - Marks old refresh token as revoked and stores replacedByToken
 */
export const refresh = async (req: Request, res: Response) => {
  try {
    const { token } = refreshSchema.parse(req.body);

    // verify JWT signature first
    const decoded = verifyRefreshToken(token) as JwtPayloadLike;

    if (!decoded?.id) return res.status(401).json({ message: "Invalid token payload" });

    const hashed = hashToken(token);

    const stored = await RefreshToken.findOne({ token: hashed });
    if (!stored || stored.revoked) {
      // possible reuse attack
      return res.status(401).json({ message: "Refresh token revoked or not found" });
    }

    // optional: check stored.expiresAt > now (TTL index should handle)
    if (stored.expiresAt.getTime() <= Date.now()) {
      return res.status(401).json({ message: "Refresh token expired" });
    }

    // All good: rotate tokens
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newPayload = { id: user._id.toString(), role: user.role };
    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);
    const newHashed = hashToken(newRefreshToken);
    const newExpiresAt = getRefreshTokenExpiry();

    // mark old token as revoked and point to new token (for audit)
    stored.revoked = true;
    stored.replacedByToken = newHashed;
    await stored.save();

    // store the new refresh token
    await RefreshToken.create({
      token: newHashed,
      user: user._id,
      expiresAt: newExpiresAt,
    });

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err: any) {
    // jwt.verify throws on invalid signature/expired
    return res.status(401).json({ message: "Invalid refresh token", error: err?.message });
  }
};

/**
 * Logout:
 * - Accepts refresh token, marks it revoked (or deletes it)
 * - Optionally revoke all tokens for a user (logout everywhere)
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const token = (req.body && req.body.token) || req.headers["x-refresh-token"] || null;
    if (!token) {
      // Optional: you could revoke all user tokens if user is authenticated via access token
      return res.status(200).json({ message: "Logged out (no token provided)" });
    }

    const hashed = hashToken(token);
    const stored = await RefreshToken.findOne({ token: hashed });
    if (stored) {
      stored.revoked = true;
      await stored.save();
    }

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Logout failed" });
  }
};
