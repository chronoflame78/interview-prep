"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Edit, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DifficultyBadge } from "./difficulty-badge";
import { HighlightedHtml } from "@/components/ui/highlighted-html";
import type { QuestionWithRelations } from "@/types";

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

interface QuestionCardProps {
  question: QuestionWithRelations;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
  fontSize?: string;
}

export function QuestionCard({
  question,
  onDelete,
  readOnly,
  fontSize = "text-sm",
}: QuestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const plainText = stripHtml(question.question);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;
  const editHref = `/questions/${question.id}/edit?returnTo=${encodeURIComponent(currentUrl)}`;

  useEffect(() => {
    const anchorId = `q-${question.id}`;
    const focus = () => {
      setExpanded(true);
      requestAnimationFrame(() => {
        document
          .getElementById(anchorId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };
    if (window.location.hash === `#${anchorId}`) focus();

    const onHashChange = () => {
      if (window.location.hash === `#${anchorId}`) focus();
    };
    const onFocusEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id === question.id) focus();
    };
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("question:focus", onFocusEvent);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("question:focus", onFocusEvent);
    };
  }, [question.id]);

  return (
    <Card id={`q-${question.id}`} className="scroll-mt-20">
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
            <div className={`${fontSize} leading-relaxed`}>
              {expanded ? (
                <HighlightedHtml
                  html={question.question}
                  className="prose dark:prose-invert max-w-none"
                />
              ) : (
                plainText.length > 200
                  ? plainText.slice(0, 200) + "..."
                  : plainText
              )}
            </div>
          </div>
          {!readOnly && (
            <div className="flex shrink-0 gap-1">
              <Link
                href={editHref}
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
            <HighlightedHtml
              html={question.answer}
              className={`prose dark:prose-invert max-w-none ${fontSize}`}
            />
          </div>
        </CardContent>
      )}

      {expanded && question.relatedTo.length > 0 && (
        <CardContent className="pt-0">
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
            Related Questions
          </p>
          <ul className="space-y-1">
            {question.relatedTo.map((r) => (
              <li key={r.toQuestion.id}>
                <Link
                  href={`/questions#q-${r.toQuestion.id}`}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("question:focus", {
                        detail: { id: r.toQuestion.id },
                      })
                    );
                  }}
                  className="hover:bg-accent group flex items-start gap-2 rounded-md p-2 text-sm transition-colors"
                >
                  <DifficultyBadge
                    difficulty={r.toQuestion.difficulty}
                  />
                  <span className="line-clamp-2 flex-1 group-hover:underline">
                    {stripHtml(r.toQuestion.question)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
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
