"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Edit, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DifficultyBadge } from "./difficulty-badge";
import type { QuestionWithRelations } from "@/types";

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

interface QuestionCardProps {
  question: QuestionWithRelations;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

export function QuestionCard({
  question,
  onDelete,
  readOnly,
}: QuestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const plainText = stripHtml(question.question);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={question.difficulty} />
              {question.hasOverride && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Pencil className="h-3 w-3" />
                  Customized
                </Badge>
              )}
              {!question.isDefault && (
                <Badge variant="outline" className="text-xs">
                  Private
                </Badge>
              )}
            </div>
            <p className="text-sm leading-relaxed">
              {expanded ? (
                <span
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: question.question }}
                />
              ) : (
                plainText.length > 200
                  ? plainText.slice(0, 200) + "..."
                  : plainText
              )}
            </p>
          </div>
          {!readOnly && (
            <div className="flex shrink-0 gap-1">
              <Link
                href={`/questions/${question.id}/edit`}
                className="hover:bg-accent inline-flex h-8 w-8 items-center justify-center rounded-md"
              >
                <Edit className="h-4 w-4" />
              </Link>
              {(!question.isDefault || question.hasOverride) && onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-8 w-8"
                  onClick={() => onDelete(question.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      {expanded && question.answer && (
        <CardContent className="pt-0">
          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
              Answer
            </p>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: question.answer }}
            />
          </div>
        </CardContent>
      )}

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {question.topics.map((t) => (
              <Badge key={t.topic.id} variant="secondary" className="text-xs">
                {t.topic.name}
              </Badge>
            ))}
            {question.subTopics.map((s) => (
              <Badge
                key={s.subTopic.id}
                variant="outline"
                className="text-xs"
              >
                {s.subTopic.name}
              </Badge>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground ml-2 shrink-0"
          >
            {expanded ? (
              <>
                <ChevronUp className="mr-1 h-3 w-3" /> Less
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-3 w-3" /> More
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
