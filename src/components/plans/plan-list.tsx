"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlanFormDialog } from "./plan-form-dialog";
import type { PlanSummary } from "@/types";

export function PlanList({ plans }: { plans: PlanSummary[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleCreate(values: { name: string; description: string | null }) {
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Something went wrong");
      return false;
    }
    toast.success("Plan created");
    router.push(`/plans/${data.id}`);
    return true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Plans</h1>
          <p className="text-muted-foreground text-sm">
            Pick questions, group them, and study them in your own order.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <ListChecks className="h-8 w-8" />
          <div>
            <p className="text-foreground text-lg">No study plans yet</p>
            <p className="text-sm">Create one to start organizing what to study.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New Plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Link key={p.id} href={`/plans/${p.id}`} className="group">
              <Card className="group-hover:border-foreground/30 h-full transition-colors">
                <CardHeader className="pb-2">
                  <h2 className="truncate font-semibold group-hover:underline">{p.name}</h2>
                  {p.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {p.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="text-muted-foreground flex items-center justify-between text-xs">
                  <span>
                    {p.questionCount} question{p.questionCount !== 1 ? "s" : ""} ·{" "}
                    {p.groupCount} group{p.groupCount !== 1 ? "s" : ""}
                  </span>
                  <span>Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <PlanFormDialog
        open={creating}
        onOpenChange={setCreating}
        title="New Study Plan"
        submitLabel="Create Plan"
        onSubmit={handleCreate}
      />
    </div>
  );
}
