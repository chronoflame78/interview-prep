"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mic, MicOff, Play, Square, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type {
  InterviewSessionDto,
  SubmitAnswerResult,
  TurnDto,
} from "@/lib/interview/types";
import { AzureSpeech } from "./azure-speech";

type RoomState =
  | "loading"
  | "idle"
  | "playing"
  | "listening"
  | "confirming"
  | "submitting"
  | "ended";

function stripHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
}

function currentOpenTurn(session: InterviewSessionDto): TurnDto | null {
  if (session.status !== "ACTIVE") return null;
  const last = session.turns[session.turns.length - 1];
  if (!last || last.answerText) return null;
  return last;
}

export function InterviewRoom({ initial }: { initial: InterviewSessionDto }) {
  const router = useRouter();
  const [session, setSession] = useState(initial);
  const [state, setState] = useState<RoomState>(
    initial.status === "ACTIVE" ? "loading" : "ended"
  );
  const [transcript, setTranscript] = useState("");
  const [editedTranscript, setEditedTranscript] = useState("");

  const speechRef = useRef<AzureSpeech | null>(null);
  const playedTurnIdsRef = useRef<Set<string>>(new Set());

  const openTurn = currentOpenTurn(session);
  const config = session.config;

  const initSpeech = useCallback(async () => {
    if (speechRef.current) return speechRef.current;
    try {
      const sp = await AzureSpeech.create();
      speechRef.current = sp;
      return sp;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not init speech service"
      );
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      speechRef.current?.dispose();
      speechRef.current = null;
    };
  }, []);

  const playPrompt = useCallback(
    async (turn: TurnDto) => {
      const sp = await initSpeech();
      if (!sp) return;
      setState("playing");
      try {
        await sp.speak(
          stripHtml(turn.promptText),
          config.voice.name,
          config.voice.rate,
          config.language
        );
        setState("idle");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "TTS failed");
        setState("idle");
      }
    },
    [initSpeech, config.voice.name, config.voice.rate, config.language]
  );

  useEffect(() => {
    if (!openTurn) return;
    if (playedTurnIdsRef.current.has(openTurn.id)) return;
    playedTurnIdsRef.current.add(openTurn.id);
    void playPrompt(openTurn);
  }, [openTurn, playPrompt]);

  const handleStartListening = useCallback(async () => {
    const sp = await initSpeech();
    if (!sp) return;
    setTranscript("");
    setState("listening");
    try {
      await sp.startListening(config.language, (text) => {
        setTranscript(text);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Microphone failed");
      setState("idle");
    }
  }, [initSpeech, config.language]);

  const handleStopListening = useCallback(async () => {
    const sp = speechRef.current;
    if (!sp) return;
    const final = await sp.stopListening();
    setEditedTranscript(final);
    setState("confirming");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!openTurn) return;
    const text = editedTranscript.trim();
    if (!text) {
      toast.error("Answer cannot be empty");
      return;
    }
    setState("submitting");
    try {
      const res = await fetch(
        `/api/interview/sessions/${session.id}/turns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ turnId: openTurn.id, answerText: text }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to submit answer");
        setState("confirming");
        return;
      }
      const result: SubmitAnswerResult = await res.json();

      setSession((prev) => {
        const updatedTurns = prev.turns.map((t) =>
          t.id === result.evaluatedTurn.id ? result.evaluatedTurn : t
        );
        if (result.nextTurn) updatedTurns.push(result.nextTurn);
        return {
          ...prev,
          status: result.sessionStatus,
          turns: updatedTurns,
        };
      });
      setTranscript("");
      setEditedTranscript("");
      setState(result.sessionStatus === "ACTIVE" ? "loading" : "ended");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
      setState("confirming");
    }
  }, [openTurn, editedTranscript, session.id]);

  const handleReplay = useCallback(() => {
    if (openTurn) void playPrompt(openTurn);
  }, [openTurn, playPrompt]);

  const handleAbandon = useCallback(async () => {
    if (!confirm("End this session?")) return;
    await fetch(`/api/interview/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "abandon" }),
    });
    router.push(`/interview/${session.id}/summary`);
  }, [session.id, router]);

  useEffect(() => {
    if (session.status === "ACTIVE") return;
    const timeout = setTimeout(() => {
      router.push(`/interview/${session.id}/summary`);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [session.status, session.id, router]);

  if (session.status !== "ACTIVE") {
    return (
      <div className="bg-card rounded-lg border p-10 text-center">
        <h2 className="text-lg font-semibold">Session ended</h2>
        <p className="text-muted-foreground text-sm">
          Redirecting to summary…
        </p>
      </div>
    );
  }

  if (!openTurn) {
    return (
      <div className="bg-card rounded-lg border p-10 text-center">
        <p className="text-muted-foreground text-sm">Preparing next turn…</p>
      </div>
    );
  }

  const turnCount = session.turns.length;
  const dbTurnsAsked = session.turns.filter(
    (t) => t.type === "DB_QUESTION"
  ).length;
  const totalQs = config.questionIds.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="default">{state.toUpperCase()}</Badge>
            <Badge variant="outline">
              Question {dbTurnsAsked} / {totalQs}
            </Badge>
            {openTurn.type === "AI_FOLLOWUP" && (
              <Badge variant="secondary">Follow-up</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            Turn {turnCount} · {config.ai.provider}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleAbandon}>
          <X className="mr-1 h-4 w-4" />
          End session
        </Button>
      </div>

      <div className="bg-card space-y-3 rounded-lg border p-6">
        <p className="text-muted-foreground text-xs uppercase">Interviewer</p>
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-base"
          dangerouslySetInnerHTML={{ __html: openTurn.promptText }}
        />
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReplay}
            disabled={state === "playing" || state === "listening"}
          >
            <Play className="mr-1 h-3.5 w-3.5" />
            Replay
          </Button>
        </div>
      </div>

      <Separator />

      <div className="bg-card space-y-3 rounded-lg border p-6">
        <p className="text-muted-foreground text-xs uppercase">Your answer</p>

        {state === "confirming" ? (
          <>
            <p className="text-muted-foreground text-xs">
              Review and edit before submitting. STT often mistranscribes
              technical terms.
            </p>
            <Textarea
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditedTranscript("");
                  setTranscript("");
                  setState("idle");
                }}
              >
                Re-record
              </Button>
              <Button onClick={handleSubmit}>
                <SkipForward className="mr-1 h-4 w-4" />
                Submit
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-muted min-h-[80px] rounded-md p-3 text-sm">
              {transcript || (
                <span className="text-muted-foreground">
                  {state === "listening"
                    ? "Listening…"
                    : "Click Start to record your answer."}
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {state === "listening" ? (
                <Button onClick={handleStopListening} variant="destructive">
                  <Square className="mr-1 h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={handleStartListening}
                  disabled={state === "playing" || state === "submitting"}
                >
                  {state === "playing" ? (
                    <>
                      <MicOff className="mr-1 h-4 w-4" />
                      Speaking…
                    </>
                  ) : state === "submitting" ? (
                    "Evaluating…"
                  ) : (
                    <>
                      <Mic className="mr-1 h-4 w-4" />
                      Start
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {session.turns.length > 1 && (
        <details className="space-y-2 text-sm">
          <summary className="text-muted-foreground cursor-pointer">
            Conversation so far ({session.turns.length - 1} prior turns)
          </summary>
          <div className="space-y-3 pt-3">
            {session.turns.slice(0, -1).map((t) => (
              <div key={t.id} className="space-y-1">
                <p className="text-muted-foreground text-xs">
                  {t.type === "AI_FOLLOWUP" ? "Follow-up" : "Question"}
                </p>
                <div
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: t.promptText }}
                />
                {t.answerText && (
                  <div className="bg-muted rounded p-2 text-sm">
                    {t.answerText}
                  </div>
                )}
                {t.evaluation && (
                  <p className="text-muted-foreground text-xs">
                    Score: {t.evaluation.score}/10
                  </p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
