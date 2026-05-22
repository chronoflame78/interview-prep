"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { QuestionCard } from "./question-card";
import type { QuestionWithRelations } from "@/types";

interface QuestionListProps {
  questions: QuestionWithRelations[];
  readOnly?: boolean;
}

export function QuestionList({ questions, readOnly }: QuestionListProps) {
  const router = useRouter();

  async function handleDelete(id: string) {
    const question = questions.find((q) => q.id === id);
    if (!question) return;

    const endpoint = question.isDefault && question.hasOverride
      ? `/api/questions/${id}/override`
      : `/api/questions/${id}`;

    const action = question.isDefault && question.hasOverride
      ? "Reset to default?"
      : "Delete this question?";

    if (!confirm(action)) return;

    const res = await fetch(endpoint, { method: "DELETE" });
    if (res.ok) {
      toast.success(
        question.isDefault ? "Override removed" : "Question deleted"
      );
      router.refresh();
    } else {
      toast.error("Something went wrong");
    }
  }

  if (questions.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <p className="text-lg">No questions found</p>
        <p className="text-sm">
          Try adjusting your filters or add a new question.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((q) => (
        <QuestionCard
          key={q.id}
          question={q}
          onDelete={handleDelete}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}
