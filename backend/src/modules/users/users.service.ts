import { prisma } from "../../db/prisma";
import { hashPassword } from "../../utils/hash";

export async function listUsersByCompany(companyId: string) {
  return prisma.user.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
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
  data: { role?: "ADMIN" | "MEMBER" | "GUEST"; name?: string; email?: string; password?: string };
}) {
  const user = await prisma.user.findFirst({
    where: { id: params.userId, companyId: params.companyId },
  });
  if (!user) throw Object.assign(new Error("El usuario no existe o no pertenece a tu empresa"), { statusCode: 404 });

  if (params.data.email) {
    const existing = await prisma.user.findFirst({
      where: { email: params.data.email.toLowerCase(), id: { not: params.userId } },
    });
    if (existing) throw Object.assign(new Error("Ese email ya está registrado en el sistema"), { statusCode: 409 });
  }

  const updateData: Record<string, unknown> = {};
  if (params.data.role != null) updateData.role = params.data.role;
  if (params.data.name != null) updateData.name = params.data.name;
  if (params.data.email != null) updateData.email = params.data.email.toLowerCase();
  if (params.data.password) updateData.passwordHash = await hashPassword(params.data.password);

  return prisma.user.update({
    where: { id: params.userId },
    data: updateData,
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
