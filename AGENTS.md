<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Architecture

Full-stack interview-prep app. Admins seed default questions; users add private questions, customize defaults non-destructively, and share their personalized sets. Live: https://leonguyen-interview-prep.vercel.app

## Stack
- **Next.js 16** (App Router, Server Components, React 19) — see the warning above about the modified Next.js.
- **PostgreSQL + Prisma 7** — Prisma client is generated into `src/generated/prisma` (not the default `@prisma/client` location). Import the client from there.
- **NextAuth v5** — credentials (bcrypt) + Google OAuth, JWT sessions. Config in `src/auth.ts`, `src/auth.config.ts`; route guards in `src/middleware.ts`.
- **shadcn/ui + Tailwind v4**, **TipTap** editor, **Zod v4 + react-hook-form**, **SWR**.

## Key domain concepts
- **Multilingual content**: every question/answer has three variants — English (`question`/`answer`), Vietnamese (`questionVn`/`answerVn`), Custom (`questionCus`/`answerCus`).
- **Override system** (`UserQuestionOverride`): a user edits or hides an admin default *per-user and reversibly*, without mutating the original `Question`. Effective question = original merged with the user's override.
- **Domains** scope content into separate areas; each `User` has an `activeDomain`. `Topic` → `SubTopic` → `Question` (linked via join tables `QuestionTopic`/`QuestionSubTopic`). `QuestionRelation` links related questions.
- **Mock Interview** (`InterviewSession`, `InterviewTurn` with `DB_QUESTION`/`AI_FOLLOWUP` turn types, JSON `evaluation`/`decision`; uses Microsoft Speech SDK) — built but **currently hidden in the UI** (commit "hide mock interview menu").
- Roles: `USER` / `ADMIN`. Profile sharing via `User.shareSlug` → `/share/[slug]`.

## Layout
- `src/app` route groups: `(auth)` login/register, `(main)` app pages (`questions`, `topics`, `profile`, `admin`, `interview`), `share/[slug]`, `domain-select`, and REST endpoints under `api/`.
- `src/components`: `ui` (shadcn primitives), `layout`, `auth`, `questions`, `topics`, `editor`, `providers`.
- `src/lib` (prisma client, utils, Zod validations under `validations/`), `src/types`.
- `prisma/schema.prisma` is the source of truth for the data model; `prisma/seed.ts` seeds defaults.
