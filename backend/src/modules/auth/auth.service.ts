import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { hashPassword, verifyPassword } from "../../utils/hash";

const jwtSecret: Secret = env.JWT_SECRET;
const jwtOpts: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as unknown as SignOptions["expiresIn"] };

export async function registerCompany(input: {
  companyName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}) {
  const passwordHash = await hashPassword(input.adminPassword);

  const result = await prisma.company.create({
    data: {
      name: input.companyName,
      users: {
        create: {
          name: input.adminName,
          email: input.adminEmail.toLowerCase(),
          passwordHash,
          role: "ADMIN",
        },
      },
    },
    include: { users: true },
  });

  const admin = result.users[0];
  const token = jwt.sign(
    { id: admin.id, companyId: result.id, role: "ADMIN", email: admin.email },
    jwtSecret,
    jwtOpts,
  );
  return {
    token,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      companyId: result.id,
    },
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw Object.assign(new Error("Email o contraseña incorrectos"), { statusCode: 401 });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw Object.assign(new Error("Email o contraseña incorrectos"), { statusCode: 401 });

  const token = jwt.sign(
    { id: user.id, companyId: user.companyId, role: user.role, email: user.email },
    jwtSecret,
    jwtOpts,
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, avatarUrl: true, role: true, companyId: true, createdAt: true },
  });
  if (!user) return null;
  return user;
}