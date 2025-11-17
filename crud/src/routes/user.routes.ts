import { Router } from "express";
import { auth, authorize } from "../middleware/auth";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  createUser,
} from "../controllers/user.controller";

const router = Router();

// Admin only
router.get("/", auth, authorize("admin"), getUsers);

// Admin only
router.post("/", auth, authorize("admin"), createUser);

// Admin + User (self access)
router.get("/:id", auth, getUser);

// Admin + User (self update)
router.patch("/:id", auth, updateUser);

// Soft Delete (admin only)
router.delete("/:id", auth, authorize("admin"), deleteUser);

export default router;
