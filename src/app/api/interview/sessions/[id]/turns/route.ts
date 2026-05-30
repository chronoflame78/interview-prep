import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { submitAnswer } from "@/lib/interview/session";
import { submitAnswerSchema } from "@/lib/validations/interview";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = submitAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const result = await submitAnswer(
      id,
      session.user.id,
      parsed.data.turnId,
      parsed.data.answerText
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
