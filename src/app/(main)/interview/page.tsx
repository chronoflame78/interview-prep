import Link from "next/link";
import { Plus, Mic } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listInterviewSessions } from "@/lib/interview/session";
import type { InterviewConfig } from "@/lib/interview/types";

export default async function InterviewListPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sessions = await listInterviewSessions(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mock Interview</h1>
          <p className="text-muted-foreground text-sm">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/interview/new" className={cn(buttonVariants(), "gap-2")}>
          <Plus className="h-4 w-4" />
          Start new session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-card rounded-lg border p-10 text-center">
          <Mic className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            No sessions yet. Start your first mock interview.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const cfg = s.config as unknown as InterviewConfig;
            const isActive = s.status === "ACTIVE";
            const href = isActive
              ? `/interview/${s.id}`
              : `/interview/${s.id}/summary`;
            return (
              <li key={s.id}>
                <Link
                  href={href}
                  className="bg-card hover:bg-accent flex items-center justify-between rounded-lg border px-4 py-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {s.status}
                      </Badge>
                      <span className="text-sm font-medium">
                        {cfg.selectionMode === "random" ? "Random" : "Picked"} ·{" "}
                        {cfg.questionIds.length} question
                        {cfg.questionIds.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {new Date(s.startedAt).toLocaleString()} · {s._count.turns}{" "}
                      turn{s._count.turns !== 1 ? "s" : ""} · {cfg.ai.provider}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {isActive ? "Resume →" : "View →"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
