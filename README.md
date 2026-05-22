# Interview Prep

A full-stack interview preparation web application where admins provide default question sets and users can add their own private questions, customize defaults, and share their personalized study materials.

## Features

- **Question Management** — Browse, create, edit, and organize interview questions with rich text (TipTap WYSIWYG editor)
- **Multilingual Support** — Each question supports English, Vietnamese, and Custom language tabs for both questions and answers
- **Override System** — Users can customize admin-provided default questions without modifying the originals; overrides are per-user and reversible
- **Topics & Sub-Topics** — Organize questions by topic and sub-topic; admins provide defaults, users can add their own
- **Difficulty Levels** — Tag questions as Easy, Medium, or Hard with color-coded badges
- **Filtering & Sorting** — Filter by topic, sub-topic, difficulty, and search text; sort by date or difficulty
- **Profile Sharing** — Generate a unique share link so others (logged-in users) can view your personalized question set
- **Authentication** — Email/password and Google OAuth sign-in via NextAuth v5
- **Dark/Light Mode** — Theme toggle with system preference detection
- **Admin Panel** — Manage default questions and topics visible to all users

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Components) |
| Database | PostgreSQL (Neon) |
| ORM | Prisma 7 |
| Auth | NextAuth v5 (JWT, Credentials + Google OAuth) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Rich Text | TipTap |
| Validation | Zod v4 + react-hook-form |
| Data Fetching | SWR |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (local or [Neon](https://neon.tech))

### Setup

1. **Clone and install dependencies**

   ```bash
   git clone https://github.com/chronoflame78/interview-prep.git
   cd interview-prep
   npm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in:

   ```env
   DATABASE_URL="postgresql://..."
   AUTH_SECRET="your-auth-secret"
   AUTH_GOOGLE_ID="your-google-client-id"
   AUTH_GOOGLE_SECRET="your-google-client-secret"
   ADMIN_EMAIL="admin@example.com"
   ADMIN_PASSWORD="your-admin-password"
   ```

3. **Set up the database**

   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (auth)/             # Login & register (centered layout)
│   ├── (main)/             # App pages (sidebar layout)
│   │   ├── questions/      # Question list, create, edit
│   │   ├── topics/         # Topic management
│   │   ├── profile/        # User profile settings
│   │   └── admin/          # Admin question & topic management
│   ├── share/[slug]/       # Shared profile view
│   └── api/                # REST API endpoints
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── layout/             # Header, sidebar, navigation
│   ├── auth/               # Auth forms, user menu
│   ├── questions/          # Question list, cards, forms, filters
│   ├── topics/             # Topic list, forms, selector
│   ├── editor/             # TipTap editor + toolbar
│   └── providers/          # Theme & session providers
├── lib/                    # Utilities, Prisma client, validation schemas
└── types/                  # TypeScript type definitions
prisma/
├── schema.prisma           # Database schema
└── seed.ts                 # Default data seeder
```

## License

MIT
