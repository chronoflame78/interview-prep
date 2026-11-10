import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { touchPlan } from "@/lib/plans";
import { notFound, requireOwnedPlan } from "@/lib/plans-api";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

/** Removes the item from the plan. The question itself is untouched. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: planId, itemId } = await params;
  const owned = await requireOwnedPlan(planId);
  if (owned instanceof NextResponse) return owned;

  const item = await prisma.studyPlanItem.findFirst({
    where: { id: itemId, planId },
    select: { id: true },
  });
  if (!item) return notFound();

  await prisma.$transaction([
    prisma.studyPlanItem.delete({ where: { id: itemId } }),
    touchPlan(prisma, planId),
  ]);

  return NextResponse.json({ success: true });
}
