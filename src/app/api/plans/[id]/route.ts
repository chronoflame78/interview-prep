import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlanForUser } from "@/lib/plans";
import {
  getActiveDomainId,
  jsonError,
  readJson,
  requireOwnedPlan,
} from "@/lib/plans-api";
import { planUpdateSchema } from "@/lib/validations/plan";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const owned = await requireOwnedPlan(id);
  if (owned instanceof NextResponse) return owned;

  const plan = await getPlanForUser(
    owned.userId,
    id,
    await getActiveDomainId(owned.userId)
  );
  return NextResponse.json(plan);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const owned = await requireOwnedPlan(id);
  if (owned instanceof NextResponse) return owned;

  const parsed = planUpdateSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);

  const { name, description } = parsed.data;
  await prisma.studyPlan.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
    },
  });

  return NextResponse.json({ id });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const owned = await requireOwnedPlan(id);
  if (owned instanceof NextResponse) return owned;

  // Groups and items cascade; questions, overrides and stars are untouched.
  await prisma.studyPlan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
