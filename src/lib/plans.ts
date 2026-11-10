// Study plans: a user's own ordered, grouped list of existing questions.
//
// A plan stores only ids and positions. Question content is always resolved
// through `getQuestionsForUser`, so visibility, override merging and stars
// behave exactly as on /questions. Items whose question is not currently
// visible are kept as placeholders (`question: null`) so they hold their slot.

import { prisma } from "@/lib/prisma";
import { getQuestionsForUser } from "@/lib/questions";
import type { Prisma } from "@/generated/prisma/client";
import type {
  PlanLayout,
  PlanSectionView,
  PlanSummary,
  PlanView,
  QuestionWithRelations,
} from "@/types";

export const UNGROUPED_NAME = "Ungrouped";

/** Every question the user can currently see in a domain, keyed by id. */
export async function getVisibleQuestionMap(
  userId: string,
  domainId: string | null
): Promise<Map<string, QuestionWithRelations>> {
  // getQuestionsForUser treats a null domain as "all domains"; a plan without
  // a domain must instead resolve to nothing.
  if (!domainId) return new Map();
  const questions = await getQuestionsForUser(
    userId,
    { limit: Number.MAX_SAFE_INTEGER },
    domainId
  );
  return new Map(questions.map((q) => [q.id, q]));
}

/** The plan if it exists and belongs to the user; otherwise null. */
export function findOwnedPlan(planId: string, userId: string) {
  return prisma.studyPlan.findFirst({ where: { id: planId, userId } });
}

export async function getPlansForUser(
  userId: string,
  activeDomainId: string | null
): Promise<PlanSummary[]> {
  if (!activeDomainId) return [];

  const [plans, visible] = await Promise.all([
    prisma.studyPlan.findMany({
      where: { userId, domainId: activeDomainId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { groups: true } },
        items: { select: { questionId: true } },
      },
    }),
    getVisibleQuestionMap(userId, activeDomainId),
  ]);

  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    questionCount: p.items.filter((i) => visible.has(i.questionId)).length,
    groupCount: p._count.groups,
    updatedAt: p.updatedAt,
  }));
}

export async function getPlanForUser(
  userId: string,
  planId: string,
  activeDomainId: string | null
): Promise<PlanView | null> {
  const plan = await prisma.studyPlan.findFirst({
    where: { id: planId, userId },
    include: {
      groups: { orderBy: { position: "asc" } },
      items: { orderBy: { position: "asc" } },
    },
  });
  if (!plan) return null;

  const visible = await getVisibleQuestionMap(userId, plan.domainId);

  const ungrouped: PlanSectionView = { id: null, name: UNGROUPED_NAME, items: [] };
  const byGroup = new Map<string, PlanSectionView>(
    plan.groups.map((g) => [g.id, { id: g.id, name: g.name, items: [] }])
  );

  for (const item of plan.items) {
    const section = item.groupId ? byGroup.get(item.groupId) : ungrouped;
    (section ?? ungrouped).items.push({
      id: item.id,
      questionId: item.questionId,
      question: visible.get(item.questionId) ?? null,
    });
  }

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    domainId: plan.domainId,
    isForeignDomain: plan.domainId !== activeDomainId,
    sections: [ungrouped, ...plan.groups.map((g) => byGroup.get(g.id)!)],
  };
}

/**
 * True when `layout` describes exactly the plan's current groups and items:
 * same group set, same item set, no id twice. Anything else means the client
 * worked from a stale copy (or is malformed) and must not overwrite the plan.
 */
export function isLayoutCurrent(
  layout: PlanLayout,
  groupIds: string[],
  itemIds: string[]
): boolean {
  const layoutGroupIds = layout.groups.map((g) => g.id);
  if (!sameSet(layoutGroupIds, groupIds)) return false;

  const layoutItemIds = [
    ...layout.ungrouped,
    ...layout.groups.flatMap((g) => g.itemIds),
  ];
  return sameSet(layoutItemIds, itemIds);
}

/** Same members and no duplicates in `a`. */
function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const seen = new Set(a);
  if (seen.size !== a.length) return false;
  return b.every((id) => seen.has(id));
}

/** Dense positions for every group and item described by `layout`. */
export function layoutToPositions(layout: PlanLayout) {
  const groups = layout.groups.map((g, position) => ({ id: g.id, position }));
  const items = [
    ...layout.ungrouped.map((id, position) => ({ id, groupId: null, position })),
    ...layout.groups.flatMap((g) =>
      g.itemIds.map((id, position) => ({ id, groupId: g.id as string | null, position }))
    ),
  ];
  return { groups, items };
}

/** Bump the plan's updatedAt so the plans list orders by latest edit. */
export function touchPlan(tx: Prisma.TransactionClient, planId: string) {
  return tx.studyPlan.update({
    where: { id: planId },
    data: { updatedAt: new Date() },
  });
}
