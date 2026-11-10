import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVisibleQuestionMap, touchPlan } from "@/lib/plans";
import {
  getActiveDomainId,
  jsonError,
  notFound,
  readJson,
  requireOwnedPlan,
} from "@/lib/plans-api";
import { addItemsSchema, PLAN_MAX_QUESTIONS } from "@/lib/validations/plan";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Appends questions to a section (a group, or Ungrouped when groupId is null)
 * in request order. Questions already in the plan are skipped; any question
 * the user cannot see rejects the whole request.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id: planId } = await params;
  const owned = await requireOwnedPlan(planId);
  if (owned instanceof NextResponse) return owned;
  const { userId, plan } = owned;

  const parsed = addItemsSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);
  const { questionIds, groupId } = parsed.data;

  // The picker lists only the active domain, so adding is limited to plans
  // of that domain.
  if (!plan.domainId || plan.domainId !== (await getActiveDomainId(userId))) {
    return jsonError("This plan belongs to another domain", 400);
  }

  if (groupId) {
    const group = await prisma.studyPlanGroup.findFirst({
      where: { id: groupId, planId },
      select: { id: true },
    });
    if (!group) return notFound();
  }

  const visible = await getVisibleQuestionMap(userId, plan.domainId);
  if (questionIds.some((id) => !visible.has(id))) {
    return jsonError("Some questions are not available", 400);
  }

  const existing = await prisma.studyPlanItem.findMany({
    where: { planId },
    select: { questionId: true },
  });
  const inPlan = new Set(existing.map((i) => i.questionId));
  const skipped = questionIds.filter((id) => inPlan.has(id));
  const toAdd = questionIds.filter((id) => !inPlan.has(id));

  if (existing.length + toAdd.length > PLAN_MAX_QUESTIONS) {
    return jsonError(
      `A plan can hold at most ${PLAN_MAX_QUESTIONS} questions`,
      400
    );
  }

  if (toAdd.length > 0) {
    await prisma.$transaction(async (tx) => {
      const max = await tx.studyPlanItem.aggregate({
        where: { planId, groupId },
        _max: { position: true },
      });
      const start = (max._max.position ?? -1) + 1;
      await tx.studyPlanItem.createMany({
        data: toAdd.map((questionId, i) => ({
          planId,
          groupId,
          questionId,
          position: start + i,
        })),
        // A concurrent request may have added the same question.
        skipDuplicates: true,
      });
      await touchPlan(tx, planId);
    });
  }

  return NextResponse.json({ added: toAdd, skipped }, { status: 201 });
}
