"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AArrowDown, AArrowUp, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "./question-card";
import type { QuestionWithRelations } from "@/types";

const WIDTH_STEPS = ["100%", "900px", "700px"] as const;
const FONT_STEPS = ["text-sm", "text-base", "text-lg"] as const;

interface QuestionListProps {
  questions: QuestionWithRelations[];
  readOnly?: boolean;
}

export function QuestionList({ questions, readOnly }: QuestionListProps) {
  const router = useRouter();
  const [widthIndex, setWidthIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);

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
    <div>
      <div className="mb-3 flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          onClick={() => setFontIndex((i) => Math.max(0, i - 1))}
          disabled={fontIndex === 0}
          title="Decrease font size"
        >
          <AArrowDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          onClick={() => setFontIndex((i) => Math.min(FONT_STEPS.length - 1, i + 1))}
          disabled={fontIndex === FONT_STEPS.length - 1}
          title="Increase font size"
        >
          <AArrowUp className="h-4 w-4" />
        </Button>

        <div className="bg-border mx-1 h-4 w-px" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          onClick={() => setWidthIndex((i) => Math.min(WIDTH_STEPS.length - 1, i + 1))}
          disabled={widthIndex === WIDTH_STEPS.length - 1}
          title="Narrow view"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          onClick={() => setWidthIndex((i) => Math.max(0, i - 1))}
          disabled={widthIndex === 0}
          title="Widen view"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mx-auto space-y-3" style={{ maxWidth: WIDTH_STEPS[widthIndex] }}>
        {questions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            onDelete={handleDelete}
            readOnly={readOnly}
            fontSize={FONT_STEPS[fontIndex]}
          />
        ))}
      </div>
    </div>
  );
}
