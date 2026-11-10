import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlansForUser } from "@/lib/plans";
import {
  getActiveDomainId,
  jsonError,
  readJson,
  requireUserId,
} from "@/lib/plans-api";
import { planSchema } from "@/lib/validations/plan";

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const plans = await getPlansForUser(userId, await getActiveDomainId(userId));
  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const parsed = planSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);

  const domainId = await getActiveDomainId(userId);
  if (!domainId) return jsonError("Select a domain first", 400);

  const plan = await prisma.studyPlan.create({
    data: {
      userId,
      domainId,
      name: parsed.data.name,
      description: parsed.data.description || null,
    },
    select: { id: true },
  });

  return NextResponse.json(plan, { status: 201 });
}
