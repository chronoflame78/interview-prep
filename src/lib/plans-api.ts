// Shared guards for the /api/plans route handlers.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findOwnedPlan } from "@/lib/plans";

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export const notFound = () => jsonError("Not found", 404);

/** Signed-in user id, or a 401 response. */
export async function requireUserId(): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  return session.user.id;
}

/**
 * The caller's plan, or a 401/404 response. A plan owned by someone else is a
 * 404, not a 403, so plan ids are not discoverable.
 */
export async function requireOwnedPlan(planId: string) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;
  const plan = await findOwnedPlan(planId, userId);
  if (!plan) return notFound();
  return { userId, plan };
}

/** Read from the DB rather than the JWT, matching POST /api/questions. */
export async function getActiveDomainId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeDomainId: true },
  });
  return user?.activeDomainId ?? null;
}

/** Parse a JSON body, tolerating an empty or invalid one. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
