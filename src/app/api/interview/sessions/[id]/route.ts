import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  endInterviewSession,
  getInterviewSession,
} from "@/lib/interview/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await getInterviewSession(id, session.user.id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  if (action !== "end" && action !== "abandon") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    await endInterviewSession(
      id,
      session.user.id,
      action === "end" ? "COMPLETED" : "ABANDONED"
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
