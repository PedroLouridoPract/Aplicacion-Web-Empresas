import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { hashPassword, verifyPassword } from "../../utils/hash";

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
  return { company: { id: result.id, name: result.name }, admin: { id: admin.id, email: admin.email } };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });

  const token = jwt.sign(
    { id: user.id, companyId: user.companyId, role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return { token };
}