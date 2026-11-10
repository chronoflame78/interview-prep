"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DifficultyBadge } from "@/components/questions/difficulty-badge";
import { DIFFICULTIES } from "@/lib/constants";
import { pickTitle } from "@/lib/language";
import { useDisplayLanguage } from "@/lib/use-display-language";
import { cn } from "@/lib/utils";
import type { QuestionWithRelations, TopicWithSubTopics } from "@/types";

const PAGE = 200;
const ALL = "all";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
  });

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const difficultyLabel = (d: string) => d.charAt(0) + d.slice(1).toLowerCase();

export interface PickerTarget {
  /** Section key: group id, or "ungrouped". */
  key: string;
  name: string;
}

interface QuestionPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: PickerTarget[];
  initialTarget: string;
  /** questionId → name of the section it is already in. */
  inPlan: Map<string, string>;
  /** Resolve true to close. Ids are passed in picker display order. */
  onAdd: (questionIds: string[], targetKey: string) => Promise<boolean>;
}

export function QuestionPicker(props: QuestionPickerProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add questions</DialogTitle>
        </DialogHeader>
        {props.open && <PickerBody {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({ targets, initialTarget, inPlan, onAdd }: QuestionPickerProps) {
  const lang = useDisplayLanguage();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [topicId, setTopicId] = useState(ALL);
  const [subTopicId, setSubTopicId] = useState(ALL);
  const [difficulty, setDifficulty] = useState(ALL);
  const [target, setTarget] = useState(initialTarget);
  // Insertion-ordered; re-sorted into display order on submit.
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: topics } = useSWR<TopicWithSubTopics[]>("/api/topics", fetcher);
  const subTopics = topics?.find((t) => t.id === topicId)?.subTopics ?? [];

  const query = new URLSearchParams({ limit: String(PAGE + 1) });
  if (search) query.set("search", search);
  if (topicId !== ALL) query.set("topicId", topicId);
  if (subTopicId !== ALL) query.set("subTopicId", subTopicId);
  if (difficulty !== ALL) query.set("difficulty", difficulty);

  const { data, error, isLoading } = useSWR<QuestionWithRelations[]>(
    `/api/questions?${query.toString()}`,
    fetcher,
    { keepPreviousData: true }
  );
  const truncated = (data?.length ?? 0) > PAGE;
  const rows = useMemo(() => (data ?? []).slice(0, PAGE), [data]);

  const topicItems: Record<string, string> = {
    [ALL]: "All topics",
    ...Object.fromEntries((topics ?? []).map((t) => [t.id, t.name])),
  };
  const subTopicItems: Record<string, string> = {
    [ALL]: "All sub-topics",
    ...Object.fromEntries(subTopics.map((s) => [s.id, s.name])),
  };
  const difficultyItems: Record<string, string> = {
    [ALL]: "All levels",
    ...Object.fromEntries(DIFFICULTIES.map((d) => [d, difficultyLabel(d)])),
  };
  const targetItems = Object.fromEntries(targets.map((t) => [t.key, t.name]));

  function toggle(id: string, on: boolean) {
    setSelected((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  async function handleAdd() {
    // Picker display order for rows currently listed, then any selected rows
    // that a later filter change hid, in the order they were ticked.
    const order = new Map(rows.map((q, i) => [q.id, i]));
    const ids = [...selected].sort(
      (a, b) =>
        (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) ||
        selected.indexOf(a) - selected.indexOf(b)
    );
    setPending(true);
    const ok = await onAdd(ids, target);
    setPending(false);
    if (ok) setSelected([]);
  }

  return (
    <>
      <div className="space-y-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search questions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            items={topicItems}
            value={topicId}
            onValueChange={(v) => {
              setTopicId(v ?? ALL);
              setSubTopicId(ALL);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Topic" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(topicItems).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            items={subTopicItems}
            value={subTopicId}
            onValueChange={(v) => setSubTopicId(v ?? ALL)}
            disabled={topicId === ALL || subTopics.length === 0}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sub-topic" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(subTopicItems).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            items={difficultyItems}
            value={difficulty}
            onValueChange={(v) => setDifficulty(v ?? ALL)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(difficultyItems).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="-mx-4 min-h-[200px] flex-1 overflow-y-auto border-y px-4 py-2">
        {isLoading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-destructive py-8 text-center text-sm">
            Failed to load questions.
          </p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No questions found
          </p>
        ) : (
          <ul className="space-y-1">
            {rows.map((q) => {
              const already = inPlan.get(q.id);
              const checked = !!already || selected.includes(q.id);
              return (
                <li key={q.id}>
                  <label
                    className={cn(
                      "hover:bg-accent flex cursor-pointer items-start gap-3 rounded-md p-2",
                      already && "cursor-default opacity-60 hover:bg-transparent"
                    )}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={checked}
                      disabled={!!already}
                      onCheckedChange={(v) => toggle(q.id, !!v)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm">
                        {stripHtml(pickTitle(q, lang))}
                      </span>
                      {already && (
                        <span className="text-muted-foreground text-xs">
                          In: {already}
                        </span>
                      )}
                    </span>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {truncated && (
          <p className="text-muted-foreground py-2 text-center text-xs">
            Showing first {PAGE} — refine your search to find more.
          </p>
        )}
      </div>

      <DialogFooter className="items-center gap-2 sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Add to</span>
          <Select items={targetItems} value={target} onValueChange={(v) => v && setTarget(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targets.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button disabled={selected.length === 0 || pending} onClick={handleAdd}>
          Add {selected.length || ""} question{selected.length === 1 ? "" : "s"}
        </Button>
      </DialogFooter>
    </>
  );
}
