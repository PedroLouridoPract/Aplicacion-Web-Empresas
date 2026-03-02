import { Router } from "express";
import * as ctrl from "./auth.controller";
import { authRequired } from "../../middleware/auth";

export const authRoutes = Router();

authRoutes.post("/register-company", ctrl.registerCompany);
authRoutes.post("/login", ctrl.login);
authRoutes.get("/me", authRequired, ctrl.me);