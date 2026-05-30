import { prisma } from "@/lib/prisma";
import { getAiProvider } from "@/lib/interview/ai";
import type {
  ConversationTurn,
  EvaluateAnswerOutput,
} from "@/lib/interview/ai/types";
import type { CreateSessionInput } from "@/lib/validations/interview";
import type {
  InterviewConfig,
  InterviewSessionDto,
  SubmitAnswerResult,
  TurnDto,
} from "@/lib/interview/types";
import type { Difficulty } from "@/generated/prisma/enums";

type DbTurn = {
  id: string;
  order: number;
  type: "DB_QUESTION" | "AI_FOLLOWUP";
  questionId: string | null;
  promptText: string;
  answerText: string | null;
  evaluation: unknown;
  decision: unknown;
  createdAt: Date;
};

function toTurnDto(t: DbTurn): TurnDto {
  return {
    id: t.id,
    order: t.order,
    type: t.type,
    questionId: t.questionId,
    promptText: t.promptText,
    answerText: t.answerText,
    evaluation: (t.evaluation as TurnDto["evaluation"]) ?? null,
    decision: (t.decision as TurnDto["decision"]) ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

function pickQuestionText(
  q: { question: string; questionVn: string | null },
  language: "en" | "vn"
): string {
  if (language === "vn" && q.questionVn) return q.questionVn;
  return q.question;
}

function pickAnswerText(
  q: { answer: string | null; answerVn: string | null },
  language: "en" | "vn"
): string | null {
  if (language === "vn" && q.answerVn) return q.answerVn;
  return q.answer;
}

async function resolveRandomQuestionIds(
  userId: string,
  filters: NonNullable<CreateSessionInput["filters"]>,
  domainId: string | null
): Promise<string[]> {
  const candidates = await prisma.question.findMany({
    where: {
      ...(domainId ? { domainId } : {}),
      OR: [
        { isDefault: true },
        { createdBy: userId, isDefault: false },
      ],
      ...(filters.difficulties?.length
        ? { difficulty: { in: filters.difficulties as Difficulty[] } }
        : {}),
      ...(filters.topicIds?.length
        ? { topics: { some: { topicId: { in: filters.topicIds } } } }
        : {}),
      ...(filters.subTopicIds?.length
        ? { subTopics: { some: { subTopicId: { in: filters.subTopicIds } } } }
        : {}),
    },
    select: { id: true },
  });

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, filters.count).map((q) => q.id);
}

export async function createInterviewSession(
  userId: string,
  input: CreateSessionInput,
  domainId: string | null
): Promise<InterviewSessionDto> {
  const questionIds =
    input.selectionMode === "random"
      ? await resolveRandomQuestionIds(userId, input.filters!, domainId)
      : input.questionIds!;

  if (questionIds.length === 0) {
    throw new Error("No questions matched the given filters/selection.");
  }

  const firstQuestionId = questionIds[0];
  const firstQuestion = await prisma.question.findUnique({
    where: { id: firstQuestionId },
    select: { question: true, questionVn: true },
  });
  if (!firstQuestion) throw new Error("First question not found");

  const override = await prisma.userQuestionOverride.findUnique({
    where: { userId_questionId: { userId, questionId: firstQuestionId } },
    select: { question: true, questionVn: true },
  });

  const promptText = pickQuestionText(
    {
      question: override?.question ?? firstQuestion.question,
      questionVn: override?.questionVn ?? firstQuestion.questionVn,
    },
    input.language
  );

  const config: InterviewConfig = {
    selectionMode: input.selectionMode,
    questionIds,
    filters: input.filters,
    followUps: input.followUps,
    voice: input.voice,
    ai: input.ai,
    language: input.language,
  };

  const session = await prisma.interviewSession.create({
    data: {
      userId,
      domainId,
      status: "ACTIVE",
      config,
      turns: {
        create: {
          order: 0,
          type: "DB_QUESTION",
          questionId: firstQuestionId,
          promptText,
        },
      },
    },
    include: { turns: { orderBy: { order: "asc" } } },
  });

  return {
    id: session.id,
    status: session.status,
    config,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    turns: session.turns.map(toTurnDto),
  };
}

export async function getInterviewSession(
  sessionId: string,
  userId: string
): Promise<InterviewSessionDto | null> {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { turns: { orderBy: { order: "asc" } } },
  });
  if (!session || session.userId !== userId) return null;

  return {
    id: session.id,
    status: session.status,
    config: session.config as unknown as InterviewConfig,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    turns: session.turns.map(toTurnDto),
  };
}

export async function listInterviewSessions(userId: string) {
  return prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      startedAt: true,
      endedAt: true,
      config: true,
      _count: { select: { turns: true } },
    },
  });
}

export async function endInterviewSession(
  sessionId: string,
  userId: string,
  status: "COMPLETED" | "ABANDONED" = "ABANDONED"
): Promise<void> {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, status: true },
  });
  if (!session || session.userId !== userId) throw new Error("Not found");
  if (session.status !== "ACTIVE") return;

  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: { status, endedAt: new Date() },
  });
}

function buildHistory(turns: DbTurn[]): ConversationTurn[] {
  const history: ConversationTurn[] = [];
  for (const t of turns) {
    history.push({ role: "interviewer", text: t.promptText });
    if (t.answerText) history.push({ role: "candidate", text: t.answerText });
  }
  return history;
}

function countFollowUpsForCurrentQuestion(turns: DbTurn[]): {
  currentQuestionId: string | null;
  followUpsUsed: number;
} {
  let currentQuestionId: string | null = null;
  let followUpsUsed = 0;
  for (const t of turns) {
    if (t.type === "DB_QUESTION") {
      currentQuestionId = t.questionId;
      followUpsUsed = 0;
    } else if (t.type === "AI_FOLLOWUP") {
      followUpsUsed += 1;
    }
  }
  return { currentQuestionId, followUpsUsed };
}

export async function submitAnswer(
  sessionId: string,
  userId: string,
  turnId: string,
  answerText: string
): Promise<SubmitAnswerResult> {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { turns: { orderBy: { order: "asc" } } },
  });

  if (!session || session.userId !== userId) {
    throw new Error("Session not found");
  }
  if (session.status !== "ACTIVE") {
    throw new Error("Session is not active");
  }

  const config = session.config as unknown as InterviewConfig;
  const turn = session.turns.find((t) => t.id === turnId);
  if (!turn) throw new Error("Turn not found");
  if (turn.answerText) throw new Error("Turn already answered");

  const lastTurn = session.turns[session.turns.length - 1];
  if (lastTurn.id !== turnId) {
    throw new Error("Can only answer the latest open turn");
  }

  const { currentQuestionId, followUpsUsed } =
    countFollowUpsForCurrentQuestion(session.turns);

  if (!currentQuestionId) {
    throw new Error("No active DB question to evaluate against");
  }

  const baseQuestion = await prisma.question.findUnique({
    where: { id: currentQuestionId },
    select: {
      question: true,
      questionVn: true,
      answer: true,
      answerVn: true,
      difficulty: true,
    },
  });
  if (!baseQuestion) throw new Error("Base question not found");

  const override = await prisma.userQuestionOverride.findUnique({
    where: { userId_questionId: { userId, questionId: currentQuestionId } },
    select: {
      question: true,
      questionVn: true,
      answer: true,
      answerVn: true,
      difficulty: true,
    },
  });

  const resolvedQuestion = {
    question: override?.question ?? baseQuestion.question,
    questionVn: override?.questionVn ?? baseQuestion.questionVn,
    answer: override?.answer ?? baseQuestion.answer,
    answerVn: override?.answerVn ?? baseQuestion.answerVn,
    difficulty: override?.difficulty ?? baseQuestion.difficulty,
  };

  const followUpsAllowed = config.followUps.enabled
    ? Math.max(0, config.followUps.maxPerQuestion - followUpsUsed)
    : 0;

  const ai = getAiProvider(config.ai.provider);

  const historyExcludingCurrent = buildHistory(
    session.turns.slice(0, -1) as DbTurn[]
  );

  const result: EvaluateAnswerOutput = await ai.evaluateAnswer({
    question: turn.promptText,
    expectedAnswer:
      turn.type === "DB_QUESTION"
        ? pickAnswerText(resolvedQuestion, config.language)
        : null,
    userAnswer: answerText,
    history: historyExcludingCurrent,
    followUpsRemaining: followUpsAllowed,
    difficulty: resolvedQuestion.difficulty,
    language: config.language,
  });

  let decision = result.decision;
  if (decision.kind === "followUp" && followUpsAllowed <= 0) {
    decision = {
      kind: "nextQuestion",
      reason: "Follow-ups exhausted; moving on.",
    };
  }

  const askedIds = new Set(
    session.turns
      .filter((t) => t.type === "DB_QUESTION" && t.questionId)
      .map((t) => t.questionId as string)
  );
  const nextDbId = config.questionIds.find((id) => !askedIds.has(id));

  if (decision.kind === "nextQuestion" && !nextDbId) {
    decision = {
      kind: "end",
      reason: "No more questions in the configured set.",
    };
  }

  const updatedTurn = await prisma.interviewTurn.update({
    where: { id: turnId },
    data: {
      answerText,
      evaluation: result.evaluation,
      decision,
    },
  });

  let nextTurn: TurnDto | null = null;
  let newStatus: InterviewSessionDto["status"] = "ACTIVE";

  if (decision.kind === "followUp") {
    const created = await prisma.interviewTurn.create({
      data: {
        sessionId,
        order: turn.order + 1,
        type: "AI_FOLLOWUP",
        promptText: decision.question,
      },
    });
    nextTurn = toTurnDto(created);
  } else if (decision.kind === "nextQuestion" && nextDbId) {
    const nextQ = await prisma.question.findUnique({
      where: { id: nextDbId },
      select: { question: true, questionVn: true },
    });
    const nextOverride = await prisma.userQuestionOverride.findUnique({
      where: { userId_questionId: { userId, questionId: nextDbId } },
      select: { question: true, questionVn: true },
    });
    if (!nextQ) throw new Error("Next question not found");

    const promptText = pickQuestionText(
      {
        question: nextOverride?.question ?? nextQ.question,
        questionVn: nextOverride?.questionVn ?? nextQ.questionVn,
      },
      config.language
    );

    const created = await prisma.interviewTurn.create({
      data: {
        sessionId,
        order: turn.order + 1,
        type: "DB_QUESTION",
        questionId: nextDbId,
        promptText,
      },
    });
    nextTurn = toTurnDto(created);
  } else {
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED", endedAt: new Date() },
    });
    newStatus = "COMPLETED";
  }

  return {
    evaluatedTurn: toTurnDto(updatedTurn),
    nextTurn,
    sessionStatus: newStatus,
  };
}
