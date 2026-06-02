"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DIFFICULTIES } from "@/lib/constants";
import {
  AI_PROVIDERS,
  AZURE_VOICES_EN,
  AZURE_VOICES_VN,
  DEFAULT_VOICE_EN,
  DEFAULT_VOICE_VN,
} from "@/lib/interview/constants";
import type { Difficulty } from "@/generated/prisma/enums";
import type { TopicWithSubTopics, QuestionWithRelations } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SelectionMode = "random" | "picked";
type Language = "en" | "vn";
type Provider = "gemini" | "openai";

export function SessionConfigForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [selectionMode, setSelectionMode] = useState<SelectionMode>("random");
  const [language, setLanguage] = useState<Language>("en");
  const [provider, setProvider] = useState<Provider>("gemini");

  const [count, setCount] = useState(5);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [subTopicIds, setSubTopicIds] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);

  const [pickedIds, setPickedIds] = useState<string[]>([]);

  const [followUpsEnabled, setFollowUpsEnabled] = useState(true);
  const [maxFollowUps, setMaxFollowUps] = useState(2);

  const [voice, setVoice] = useState(DEFAULT_VOICE_EN);
  const [rate, setRate] = useState(1.0);

  const { data: topics } = useSWR<TopicWithSubTopics[]>("/api/topics", fetcher);
  const { data: allQuestions } = useSWR<QuestionWithRelations[]>(
    selectionMode === "picked" ? "/api/questions?limit=500" : null,
    fetcher
  );

  const voices = language === "vn" ? AZURE_VOICES_VN : AZURE_VOICES_EN;

  function toggleArr<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function handleLanguageChange(next: Language) {
    setLanguage(next);
    setVoice(next === "vn" ? DEFAULT_VOICE_VN : DEFAULT_VOICE_EN);
  }

  const availableSubTopics = useMemo(() => {
    if (!topics) return [];
    if (topicIds.length === 0) return topics.flatMap((t) => t.subTopics);
    return topics
      .filter((t) => topicIds.includes(t.id))
      .flatMap((t) => t.subTopics);
  }, [topics, topicIds]);

  async function handleStart() {
    setSubmitting(true);
    try {
      const payload =
        selectionMode === "random"
          ? {
              selectionMode,
              filters: {
                topicIds: topicIds.length ? topicIds : undefined,
                subTopicIds: subTopicIds.length ? subTopicIds : undefined,
                difficulties: difficulties.length ? difficulties : undefined,
                count,
              },
              followUps: { enabled: followUpsEnabled, maxPerQuestion: maxFollowUps },
              voice: { name: voice, rate },
              ai: { provider },
              language,
            }
          : {
              selectionMode,
              questionIds: pickedIds,
              followUps: { enabled: followUpsEnabled, maxPerQuestion: maxFollowUps },
              voice: { name: voice, rate },
              ai: { provider },
              language,
            };

      const res = await fetch("/api/interview/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to start session");
        return;
      }

      const session = await res.json();
      router.push(`/interview/${session.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  const canStart =
    !submitting &&
    (selectionMode === "random"
      ? count > 0
      : pickedIds.length > 0);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Label>Question selection</Label>
        <Tabs
          value={selectionMode}
          onValueChange={(v) => setSelectionMode(v as SelectionMode)}
        >
          <TabsList>
            <TabsTrigger value="random">Random</TabsTrigger>
            <TabsTrigger value="picked">Pick specific</TabsTrigger>
          </TabsList>

          <TabsContent value="random" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="count">Number of questions</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
                className="w-32"
              />
            </div>

            <div className="space-y-2">
              <Label>Difficulties (optional)</Label>
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <label
                    key={d}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={difficulties.includes(d)}
                      onCheckedChange={() =>
                        setDifficulties(toggleArr(difficulties, d))
                      }
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Topics (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {topics?.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setTopicIds(toggleArr(topicIds, t.id))}
                    className={
                      topicIds.includes(t.id)
                        ? "bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs"
                        : "bg-muted hover:bg-accent rounded-full px-3 py-1 text-xs"
                    }
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {availableSubTopics.length > 0 && (
              <div className="space-y-2">
                <Label>Sub-topics (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {availableSubTopics.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() =>
                        setSubTopicIds(toggleArr(subTopicIds, s.id))
                      }
                      className={
                        subTopicIds.includes(s.id)
                          ? "bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs"
                          : "bg-muted hover:bg-accent rounded-full px-3 py-1 text-xs"
                      }
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="picked" className="space-y-3 pt-4">
            <p className="text-muted-foreground text-sm">
              Selected: {pickedIds.length} question
              {pickedIds.length !== 1 ? "s" : ""}
            </p>
            <div className="max-h-96 space-y-1 overflow-y-auto rounded-md border p-2">
              {allQuestions?.map((q) => {
                const checked = pickedIds.includes(q.id);
                return (
                  <label
                    key={q.id}
                    className="hover:bg-accent flex cursor-pointer items-start gap-2 rounded p-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        setPickedIds(toggleArr(pickedIds, q.id))
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <div
                        className="line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: q.question }}
                      />
                      <Badge variant="outline" className="text-[10px]">
                        {q.difficulty}
                      </Badge>
                    </div>
                  </label>
                );
              })}
              {allQuestions && allQuestions.length === 0 && (
                <p className="text-muted-foreground p-4 text-center text-sm">
                  No questions available.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      <section className="space-y-3">
        <Label>Interview behavior</Label>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={followUpsEnabled}
              onCheckedChange={(v) => setFollowUpsEnabled(Boolean(v))}
            />
            Allow AI follow-up questions
          </label>

          {followUpsEnabled && (
            <div className="flex items-center gap-2">
              <Label htmlFor="maxFollowUps" className="text-sm">
                Max follow-ups per question:
              </Label>
              <Input
                id="maxFollowUps"
                type="number"
                min={0}
                max={5}
                value={maxFollowUps}
                onChange={(e) =>
                  setMaxFollowUps(
                    Math.max(0, Math.min(5, Number(e.target.value)))
                  )
                }
                className="w-20"
              />
            </div>
          )}
        </div>
      </section>

      <Separator />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Language</Label>
          <Select
            value={language}
            onValueChange={(v) => handleLanguageChange(v as Language)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="vn">Vietnamese</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>AI provider</Label>
          <Select
            value={provider}
            onValueChange={(v) => setProvider(v as Provider)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Interviewer voice</Label>
          <Select value={voice} onValueChange={(v) => v && setVoice(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {voices.map((v) => (
                <SelectItem key={v.name} value={v.name}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Speech rate ({rate.toFixed(2)}x)</Label>
          <Input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </div>
      </section>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={() => router.push("/interview")}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button onClick={handleStart} disabled={!canStart}>
          {submitting ? "Starting…" : "Start interview"}
        </Button>
      </div>
    </div>
  );
}
