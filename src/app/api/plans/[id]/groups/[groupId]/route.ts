import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { touchPlan } from "@/lib/plans";
import { jsonError, notFound, readJson, requireOwnedPlan } from "@/lib/plans-api";
import { groupSchema } from "@/lib/validations/plan";

type Ctx = { params: Promise<{ id: string; groupId: string }> };

async function findGroup(planId: string, groupId: string) {
  return prisma.studyPlanGroup.findFirst({ where: { id: groupId, planId } });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id: planId, groupId } = await params;
  const owned = await requireOwnedPlan(planId);
  if (owned instanceof NextResponse) return owned;
  if (!(await findGroup(planId, groupId))) return notFound();

  const parsed = groupSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);

  await prisma.$transaction([
    prisma.studyPlanGroup.update({
      where: { id: groupId },
      data: { name: parsed.data.name },
    }),
    touchPlan(prisma, planId),
  ]);

  return NextResponse.json({ id: groupId });
}

/**
 * `?items=move` (default) appends the group's items to the end of Ungrouped in
 * their existing order; `?items=remove` drops them from the plan. Either way
 * the remaining groups are re-numbered densely.
 */
export async function DELETE(req: Request, { params }: Ctx) {
  const { id: planId, groupId } = await params;
  const owned = await requireOwnedPlan(planId);
  if (owned instanceof NextResponse) return owned;
  if (!(await findGroup(planId, groupId))) return notFound();

  const mode = new URL(req.url).searchParams.get("items") ?? "move";
  if (mode !== "move" && mode !== "remove") {
    return jsonError("items must be 'move' or 'remove'", 400);
  }

  await prisma.$transaction(async (tx) => {
    if (mode === "move") {
      const [items, ungroupedMax] = await Promise.all([
        tx.studyPlanItem.findMany({
          where: { planId, groupId },
          orderBy: { position: "asc" },
          select: { id: true },
        }),
        tx.studyPlanItem.aggregate({
          where: { planId, groupId: null },
          _max: { position: true },
        }),
      ]);
      const start = (ungroupedMax._max.position ?? -1) + 1;
      for (const [i, item] of items.entries()) {
        await tx.studyPlanItem.update({
          where: { id: item.id },
          data: { groupId: null, position: start + i },
        });
      }
    } else {
      await tx.studyPlanItem.deleteMany({ where: { planId, groupId } });
    }

    await tx.studyPlanGroup.delete({ where: { id: groupId } });

    const remaining = await tx.studyPlanGroup.findMany({
      where: { planId },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });
    for (const [position, g] of remaining.entries()) {
      if (g.position !== position) {
        await tx.studyPlanGroup.update({ where: { id: g.id }, data: { position } });
      }
    }

    await touchPlan(tx, planId);
  });

  return NextResponse.json({ success: true });
}
