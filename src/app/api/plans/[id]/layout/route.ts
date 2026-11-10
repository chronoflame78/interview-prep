import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isLayoutCurrent, layoutToPositions, touchPlan } from "@/lib/plans";
import { jsonError, readJson, requireOwnedPlan } from "@/lib/plans-api";
import { planLayoutSchema } from "@/lib/validations/plan";

type Ctx = { params: Promise<{ id: string }> };

/**
 * The single write path for ordering: group order, item order within a
 * section, and moves between sections. The body must describe exactly the
 * plan's current groups and items; anything else is a stale client → 409.
 */
export async function PUT(req: Request, { params }: Ctx) {
  const { id: planId } = await params;
  const owned = await requireOwnedPlan(planId);
  if (owned instanceof NextResponse) return owned;

  const parsed = planLayoutSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);
  const layout = parsed.data;

  const [groups, items] = await Promise.all([
    prisma.studyPlanGroup.findMany({ where: { planId }, select: { id: true } }),
    prisma.studyPlanItem.findMany({ where: { planId }, select: { id: true } }),
  ]);

  if (
    !isLayoutCurrent(
      layout,
      groups.map((g) => g.id),
      items.map((i) => i.id)
    )
  ) {
    return jsonError("Plan changed, reloading", 409);
  }

  const positions = layoutToPositions(layout);
  await prisma.$transaction([
    ...positions.groups.map((g) =>
      prisma.studyPlanGroup.update({
        where: { id: g.id },
        data: { position: g.position },
      })
    ),
    ...positions.items.map((i) =>
      prisma.studyPlanItem.update({
        where: { id: i.id },
        data: { groupId: i.groupId, position: i.position },
      })
    ),
    touchPlan(prisma, planId),
  ]);

  return NextResponse.json({ success: true });
}
