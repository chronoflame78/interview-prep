"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LanguageTabs } from "./language-tabs";
import { TopicSelector } from "@/components/topics/topic-selector";
import { RelatedQuestionSelector } from "./related-question-selector";
import { DIFFICULTIES } from "@/lib/constants";
import type { Difficulty } from "@/generated/prisma/enums";
import type { QuestionWithRelations } from "@/types";

const TipTapEditor = dynamic(
  () =>
    import("@/components/editor/tiptap-editor").then((m) => m.TipTapEditor),
  { ssr: false, loading: () => <div className="bg-muted h-[160px] animate-pulse rounded-md" /> }
);

interface QuestionFormProps {
  question?: QuestionWithRelations;
  isOverride?: boolean;
  isAdmin?: boolean;
}

export function QuestionForm({
  question,
  isOverride,
  isAdmin,
}: QuestionFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnTo = searchParams.get("returnTo");
  const returnTo =
    rawReturnTo && rawReturnTo.startsWith("/") ? rawReturnTo : "/questions";
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    question: question?.question ?? "",
    questionVn: question?.questionVn ?? "",
    questionCus: question?.questionCus ?? "",
    answer: question?.answer ?? "",
    answerVn: question?.answerVn ?? "",
    answerCus: question?.answerCus ?? "",
    difficulty: question?.difficulty ?? ("MEDIUM" as Difficulty),
    topicIds: question?.topics.map((t) => t.topic.id) ?? [],
    subTopicIds: question?.subTopics.map((s) => s.subTopic.id) ?? [],
    relatedQuestionIds:
      question?.relatedTo.map((r) => r.toQuestion.id) ?? [],
    isDefault: question?.isDefault ?? false,
  });

  function update<K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K]
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function getFieldKey(langKey: string, field: "question" | "answer") {
    if (langKey === "en") return field;
    if (langKey === "vn") return `${field}Vn` as const;
    return `${field}Cus` as const;
  }

  async function handleSubmit() {
    if (!formData.question.trim() || formData.question === "<p></p>") {
      toast.error("Question content is required");
      return;
    }

    setSaving(true);

    try {
      let url: string;
      let method: string;

      if (isOverride && question) {
        url = `/api/questions/${question.id}/override`;
        method = "PUT";
      } else if (question && !isOverride) {
        url = `/api/questions/${question.id}`;
        method = "PUT";
      } else {
        url = "/api/questions";
        method = "POST";
      }

      const body = isOverride
        ? {
            question: formData.question,
            questionVn: formData.questionVn || null,
            questionCus: formData.questionCus || null,
            answer: formData.answer || null,
            answerVn: formData.answerVn || null,
            answerCus: formData.answerCus || null,
            difficulty: formData.difficulty,
          }
        : {
            ...formData,
            questionVn: formData.questionVn || null,
            questionCus: formData.questionCus || null,
            answer: formData.answer || null,
            answerVn: formData.answerVn || null,
            answerCus: formData.answerCus || null,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success(
        isOverride
          ? "Override saved"
          : question
            ? "Question updated"
            : "Question created"
      );
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetOverride() {
    if (!question || !confirm("Reset to the original default question?")) return;

    const res = await fetch(`/api/questions/${question.id}/override`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Override removed");
      router.push(returnTo);
      router.refresh();
    } else {
      toast.error("Failed to reset");
    }
  }

  return (
    <div className="space-y-6">
      <LanguageTabs>
        {(langKey) => (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Question ({langKey.toUpperCase()})</Label>
              <TipTapEditor
                content={formData[getFieldKey(langKey, "question")] ?? ""}
                onChange={(html) => update(getFieldKey(langKey, "question"), html)}
                placeholder="Enter the question..."
              />
            </div>
            <div className="space-y-2">
              <Label>Answer ({langKey.toUpperCase()})</Label>
              <TipTapEditor
                content={formData[getFieldKey(langKey, "answer")] ?? ""}
                onChange={(html) => update(getFieldKey(langKey, "answer"), html)}
                placeholder="Enter the answer..."
              />
            </div>
          </div>
        )}
      </LanguageTabs>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Select
            value={formData.difficulty}
            onValueChange={(v) => update("difficulty", v as Difficulty)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isAdmin && !isOverride && (
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => update("isDefault", e.target.checked)}
                className="rounded"
              />
              Make this a default question (visible to all users)
            </label>
          </div>
        )}
      </div>

      {!isOverride && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Topics</Label>
              <TopicSelector
                type="topic"
                selectedIds={formData.topicIds}
                onChange={(ids) => update("topicIds", ids)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sub-Topics</Label>
              <TopicSelector
                type="subtopic"
                selectedIds={formData.subTopicIds}
                onChange={(ids) => update("subTopicIds", ids)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Related Questions</Label>
            <RelatedQuestionSelector
              selectedIds={formData.relatedQuestionIds}
              onChange={(ids) => update("relatedQuestionIds", ids)}
              excludeId={question?.id}
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : question ? "Save Changes" : "Create Question"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(returnTo)}
          disabled={saving}
        >
          Cancel
        </Button>
        {isOverride && question?.hasOverride && (
          <Button
            variant="destructive"
            onClick={handleResetOverride}
            disabled={saving}
          >
            Reset to Default
          </Button>
        )}
      </div>
    </div>
  );
}
