"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TopicWithSubTopics } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TopicSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  type: "topic" | "subtopic";
  /** For subtopic selectors: restrict options to subtopics of these topics. */
  topicIds?: string[];
}

export function TopicSelector({
  selectedIds,
  onChange,
  type,
  topicIds,
}: TopicSelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: topics } = useSWR<TopicWithSubTopics[]>("/api/topics", fetcher);

  // Options shown in the dropdown. For subtopics, restrict to the selected
  // topics so users only see subtopics that belong to the chosen topic(s).
  const items =
    type === "topic"
      ? topics?.map((t) => ({ id: t.id, name: t.name })) ?? []
      : topics
          ?.filter((t) => !topicIds || topicIds.includes(t.id))
          .flatMap((t) => t.subTopics.map((s) => ({ id: s.id, name: s.name }))) ?? [];

  // Full list (unfiltered) used only to resolve names for selected badges,
  // so already-selected subtopics still render correctly.
  const allItems =
    type === "topic"
      ? items
      : topics?.flatMap((t) =>
          t.subTopics.map((s) => ({ id: s.id, name: s.name }))
        ) ?? [];

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-10 w-full items-center justify-between rounded-md border px-4 py-2 text-sm"
          onClick={() => setOpen(!open)}
        >
          {selectedIds.length > 0
            ? `${selectedIds.length} selected`
            : `Select ${type === "topic" ? "topics" : "sub-topics"}...`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder={`Search ${type === "topic" ? "topics" : "sub-topics"}...`}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem key={item.id} value={item.name} onSelect={() => toggle(item.id)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.includes(item.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {item.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map((id) => {
            const item = allItems.find((i) => i.id === id);
            return (
              <Badge key={id} variant="secondary" className="gap-1">
                {item?.name ?? id}
                <button type="button" onClick={() => toggle(id)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
