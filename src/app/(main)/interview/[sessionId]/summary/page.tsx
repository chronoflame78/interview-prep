import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getInterviewSession } from "@/lib/interview/session";

export default async function InterviewSummaryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { sessionId } = await params;
  const data = await getInterviewSession(sessionId, session.user.id);
  if (!data) notFound();

  const evaluatedTurns = data.turns.filter((t) => t.evaluation);
  const dbTurnsAsked = data.turns.filter(
    (t) => t.type === "DB_QUESTION"
  ).length;
  const avgScore =
    evaluatedTurns.length > 0
      ? (
          evaluatedTurns.reduce(
            (sum, t) => sum + (t.evaluation?.score ?? 0),
            0
          ) / evaluatedTurns.length
        ).toFixed(1)
      : "—";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href="/interview"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="h-3 w-3" />
            All sessions
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Session summary</h1>
          <p className="text-muted-foreground text-sm">
            {new Date(data.startedAt).toLocaleString()} ·{" "}
            {data.endedAt
              ? `Ended ${new Date(data.endedAt).toLocaleString()}`
              : "Still active"}
          </p>
        </div>
        <Badge variant={data.status === "COMPLETED" ? "default" : "secondary"}>
          {data.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-xs uppercase">Avg score</p>
          <p className="text-2xl font-bold">{avgScore}/10</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-xs uppercase">Questions</p>
          <p className="text-2xl font-bold">
            {dbTurnsAsked} / {data.config.questionIds.length}
          </p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-xs uppercase">Total turns</p>
          <p className="text-2xl font-bold">{data.turns.length}</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-6">
        {data.turns.map((t) => (
          <div key={t.id} className="bg-card space-y-3 rounded-lg border p-5">
            <div className="flex items-center gap-2">
              <Badge
                variant={t.type === "AI_FOLLOWUP" ? "secondary" : "outline"}
              >
                {t.type === "AI_FOLLOWUP" ? "Follow-up" : "Question"}
              </Badge>
              {t.evaluation && (
                <Badge variant="default">
                  Score: {t.evaluation.score}/10
                </Badge>
              )}
            </div>

            <div>
              <p className="text-muted-foreground text-xs uppercase">
                Interviewer
              </p>
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: t.promptText }}
              />
            </div>

            {t.answerText && (
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Your answer
                </p>
                <div className="bg-muted whitespace-pre-wrap rounded-md p-3 text-sm">
                  {t.answerText}
                </div>
              </div>
            )}

            {t.evaluation && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {t.evaluation.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-green-700 dark:text-green-400">
                      Strengths
                    </p>
                    <ul className="list-disc pl-4 text-sm">
                      {t.evaluation.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {t.evaluation.gaps.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-red-700 dark:text-red-400">
                      Gaps
                    </p>
                    <ul className="list-disc pl-4 text-sm">
                      {t.evaluation.gaps.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {t.decision && (
              <p className="text-muted-foreground text-xs italic">
                Decision: {t.decision.kind} — {t.decision.reason}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Link href="/interview/new" className={cn(buttonVariants())}>
          Start another session
        </Link>
      </div>
    </div>
  );
}
