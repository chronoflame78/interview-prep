"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import type { QuestionWithRelations } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function stripHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
}

interface RelatedQuestionSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  excludeId?: string;
}

export function RelatedQuestionSelector({
  selectedIds,
  onChange,
  excludeId,
}: RelatedQuestionSelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: questions } = useSWR<QuestionWithRelations[]>(
    "/api/questions?limit=500",
    fetcher
  );

  const items = useMemo(() => {
    if (!questions) return [];
    return questions
      .filter((q) => q.id !== excludeId)
      .map((q) => ({
        id: q.id,
        text: stripHtml(q.question),
        difficulty: q.difficulty,
      }));
  }, [questions, excludeId]);

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
            : "Select related questions..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent
          className="p-0"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <Command>
            <CommandInput placeholder="Search questions..." />
            <CommandList>
              <CommandEmpty>No questions found.</CommandEmpty>
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.text}
                    onSelect={() => toggle(item.id)}
                    className="items-start gap-2"
                  >
                    <Check
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0",
                        selectedIds.includes(item.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex-1 space-y-1">
                      <span className="line-clamp-2 text-sm">{item.text}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.difficulty}
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedIds.length > 0 && (
        <ul className="space-y-1">
          {selectedIds.map((id) => {
            const item = items.find((i) => i.id === id);
            return (
              <li
                key={id}
                className="bg-muted flex items-start justify-between gap-2 rounded-md p-2 text-sm"
              >
                <span className="line-clamp-2 flex-1">
                  {item?.text ?? id}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="hover:bg-background mt-0.5 rounded p-0.5"
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
