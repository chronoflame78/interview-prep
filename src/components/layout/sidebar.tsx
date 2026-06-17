"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, useCallback } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronRight, FolderOpen, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { TopicIcon } from "./topic-icon";
import { applyOrder, useTopicOrder } from "@/lib/topic-order";
import type { TopicWithSubTopics } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTopicId = searchParams.get("topicId");
  const activeSubTopicId = searchParams.get("subTopicId");

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Auto-expand the active topic
    const initial = new Set<string>();
    if (activeTopicId) initial.add(activeTopicId);
    return initial;
  });

  const toggleExpand = useCallback((topicId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }, []);

  const { data: topics, isLoading } = useSWR<TopicWithSubTopics[]>(
    "/api/topics",
    fetcher
  );

  // Apply the viewer's personal topic/sub-topic ordering (shared with the
  // topic config page via localStorage); falls back to the API's order.
  const order = useTopicOrder();
  const orderedTopics = topics ? applyOrder(topics, order.topics) : topics;

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Topics</h3>
          <Link
            href="/topics"
            className="hover:bg-accent inline-flex h-6 w-6 items-center justify-center rounded-md"
          >
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Link
          href="/questions"
          className={cn(
            "text-muted-foreground hover:text-foreground hover:bg-accent flex items-center rounded-md px-2 py-1.5 text-sm transition-colors",
            pathname === "/questions" &&
              !activeTopicId &&
              "bg-accent text-foreground font-medium"
          )}
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          All Questions
        </Link>

        {orderedTopics?.map((topic) => {
          const isExpanded = expanded.has(topic.id);
          const isActive = activeTopicId === topic.id && !activeSubTopicId;
          const subTopics = applyOrder(
            topic.subTopics,
            order.subs[topic.id] ?? []
          );
          const hasSubTopics = subTopics.length > 0;

          return (
            <div key={topic.id}>
              <div className="flex items-center">
                {hasSubTopics ? (
                  <button
                    type="button"
                    onClick={(e) => toggleExpand(topic.id, e)}
                    className="hover:bg-accent flex h-5 w-5 shrink-0 items-center justify-center rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : (
                  <span className="w-5" />
                )}
                <Link
                  href={`/questions?topicId=${topic.id}`}
                  className={cn(
                    "text-muted-foreground hover:text-foreground hover:bg-accent flex flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-sm transition-colors",
                    isActive && "bg-accent text-foreground font-medium"
                  )}
                >
                  <TopicIcon name={topic.name} className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{topic.name}</span>
                  {!topic.isDefault && (
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">
                      mine
                    </span>
                  )}
                </Link>
              </div>

              {hasSubTopics && isExpanded && (
                <div className="ml-5 space-y-0.5 pt-0.5">
                  {subTopics.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/questions?topicId=${topic.id}&subTopicId=${sub.id}`}
                      className={cn(
                        "text-muted-foreground hover:text-foreground hover:bg-accent block rounded-md px-2 py-1 text-xs transition-colors",
                        activeSubTopicId === sub.id &&
                          "bg-accent text-foreground font-medium"
                      )}
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function Sidebar() {
  return (
    <Suspense
      fallback={
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      }
    >
      <SidebarContent />
    </Suspense>
  );
}
