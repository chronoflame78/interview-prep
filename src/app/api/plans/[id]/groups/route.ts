import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { touchPlan } from "@/lib/plans";
import { jsonError, readJson, requireOwnedPlan } from "@/lib/plans-api";
import { groupSchema, PLAN_MAX_GROUPS } from "@/lib/validations/plan";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id: planId } = await params;
  const owned = await requireOwnedPlan(planId);
  if (owned instanceof NextResponse) return owned;

  const parsed = groupSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);

  const agg = await prisma.studyPlanGroup.aggregate({
    where: { planId },
    _count: true,
    _max: { position: true },
  });
  if (agg._count >= PLAN_MAX_GROUPS) {
    return jsonError(`A plan can have at most ${PLAN_MAX_GROUPS} groups`, 400);
  }

  const [group] = await prisma.$transaction([
    prisma.studyPlanGroup.create({
      data: {
        planId,
        name: parsed.data.name,
        position: (agg._max.position ?? -1) + 1,
      },
      select: { id: true },
    }),
    touchPlan(prisma, planId),
  ]);

  return NextResponse.json(group, { status: 201 });
}
