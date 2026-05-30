import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getInterviewSession } from "@/lib/interview/session";
import { InterviewRoom } from "@/components/interview/interview-room";

export default async function InterviewSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { sessionId } = await params;
  const data = await getInterviewSession(sessionId, session.user.id);
  if (!data) notFound();

  if (data.status !== "ACTIVE") {
    redirect(`/interview/${sessionId}/summary`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <InterviewRoom initial={data} />
    </div>
  );
}
