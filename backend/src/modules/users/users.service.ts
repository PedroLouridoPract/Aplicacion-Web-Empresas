import { prisma } from "../../db/prisma";
import { hashPassword } from "../../utils/hash";

export async function listUsersByCompany(companyId: string) {
  return prisma.user.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function createUser(params: {
  companyId: string;
  data: { name: string; email: string; password: string; role: "ADMIN" | "MEMBER" | "GUEST" };
}) {
  const existing = await prisma.user.findUnique({
    where: { email: params.data.email.toLowerCase() },
  });
  if (existing) throw Object.assign(new Error("Ese email ya esta registrado en el sistema"), { statusCode: 409 });

  const passwordHash = await hashPassword(params.data.password);
  return prisma.user.create({
    data: {
      companyId: params.companyId,
      name: params.data.name,
      email: params.data.email.toLowerCase(),
      passwordHash,
      role: params.data.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      createdAt: true,
    },
  });
}

export async function updateUser(params: {
  companyId: string;
  userId: string;
  data: { role?: "ADMIN" | "MEMBER" | "GUEST"; name?: string };
}) {
  const user = await prisma.user.findFirst({
    where: { id: params.userId, companyId: params.companyId },
  });
  if (!user) throw Object.assign(new Error("El usuario no existe o no pertenece a tu empresa"), { statusCode: 404 });

  return prisma.user.update({
    where: { id: params.userId },
    data: {
      ...(params.data.role != null && { role: params.data.role }),
      ...(params.data.name != null && { name: params.data.name }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      createdAt: true,
    },
  });
}
