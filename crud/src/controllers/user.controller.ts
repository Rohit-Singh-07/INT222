import { Request, Response } from "express";
import User, { IUser } from "../models/user.model";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Zod validation schemas
const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.email({ message: "Invalid email address" }),
  password: z.string().min(6),
  role: z.enum(["user", "admin"]).optional()
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["user", "admin"]).optional()
});


// Create User
export const createUser = async (req: Request, res: Response) => {
  const data = createUserSchema.parse(req.body);

  const existing = await User.findOne({ email: data.email });
  if (existing) return res.status(409).json({ message: "Email already exists" });

  const user = await User.create(data);
  const userObj = user.toObject();
  delete userObj.password; // don't return password
  res.status(201).json(userObj);
};

// Get all users with pagination
export const getUsers = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const users = await User.find({ isDeleted: false })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .select("-password"); // exclude passwords

  const total = await User.countDocuments({ isDeleted: false });
  res.status(200).json({ total, page, limit, users });
};

// Get user by ID
export const getUser = async (req: Request, res: Response) => {
  const user = await User.findOne({ _id: req.params.id, isDeleted: false }).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json(user);
};

// Update User
export const updateUser = async (req: Request, res: Response) => {
  const data = updateUserSchema.parse(req.body);

  // If password is being updated, hash it
  if (data.password) {
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(data.password, salt);
  }

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    data,
    { new: true }
  ).select("-password");

  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json(user);
};

// Soft Delete User
export const deleteUser = async (req: Request, res: Response) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json({ message: "User deleted successfully" });
};
