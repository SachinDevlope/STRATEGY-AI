# Strategy-AI

AI career toolkit built on Next.js 15 (App Router):

- **Resume builder:** a step-by-step wizard turns your answers into a one-page,
  ATS-friendly A4 PDF. You can tailor it to a job description and get a
  keyword match report.
- **Resume analyzer:** upload a PDF resume (or paste text) with a job
  description. You get a match score, skill gaps, likely interview questions,
  a day-wise prep plan and concrete resume fixes.
- **Auth:** Google sign-in or email + password (Auth.js v5).

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 15, React 19, TypeScript, Tailwind CSS 3 |
| Auth | Auth.js (NextAuth v5), JWT sessions, MongoDB adapter |
| Database | MongoDB Atlas (`mongodb` driver) |
| AI | Groq (`groq-sdk`), JSON-schema output validated with Zod |
| File storage | Vercel Blob (private) for uploaded resumes |
| PDF | `@react-pdf/renderer` to generate, `unpdf` to read text |
| Tests | Vitest |
| Hosting | Vercel |

## Setup

```bash
npm install
cp .env.local.example .env.local
npx auth secret          # writes AUTH_SECRET into .env.local
npm run dev              # http://localhost:3000
```

### Environment variables

| Name | Required | What it is |
| --- | --- | --- |
| `AUTH_SECRET` | yes | Signs session JWTs. Generate with `npx auth secret`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | yes | Google OAuth client (see below). |
| `MONGODB_URI` | yes | Atlas connection string; the database name goes at the end of the path. |
| `GROQ_API_KEY` | yes | All AI generation. Get one at console.groq.com. |
| `GROQ_MODEL` | no | Override the model (default `openai/gpt-oss-120b`). |
| `BLOB_READ_WRITE_TOKEN` | yes | Vercel Blob store token for resume uploads (`vercel env pull`). |
| `AUTH_URL` | no | Production already pins this to `https://strategy-ai-lac.vercel.app` (see `auth.config.ts`). Set it only for a custom domain. |

Set the same variables in Vercel → Project → Settings → Environment Variables.

### Google OAuth

1. Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application).
2. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://strategy-ai-lac.vercel.app/api/auth/callback/google`
3. Copy the client ID and secret into `.env.local`.

Google sign-in only works on registered hosts, so it does not work on Vercel
preview URLs. Email + password sign-in does.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (Next.js + TypeScript rules) |
| `npm test` | Unit tests (Vitest) |

## How it works

### Sign-in
- `middleware.ts` protects `/dashboard/*` by checking the JWT. It uses only
  `auth.config.ts`, because it runs on the Edge and can't use MongoDB.
- `auth.ts` adds the MongoDB adapter and the email/password provider.
- Users live in `auth_users`. The Auth.js collections are prefixed with `auth_`
  so they don't clash with an older `users` collection in the same database.

### Resume analyzer
1. The browser asks `/api/resume/upload` for a short-lived Blob token, which
   only allows writing to `resume-uploads/<userId>/`.
2. The browser uploads the PDF straight to Blob, so large files never pass
   through a function.
3. The server action `analyzeUploadAction`:
   - checks ownership, size and type
   - extracts the text with `unpdf`
   - asks Groq for a report (`lib/interview-report.ts`); if parts are missing,
     it asks once more to fix them
   - saves the report in `resume_analyses`
4. Results are shown at `/dashboard/resume/analyze/[id]`. The original PDF is
   served through `/api/resume/analysis/[id]/file` after a session check.

Pasted text follows the same path without the upload. Job descriptions are
saved in `job_descriptions` so you can reuse them.

### Resume builder
- The wizard autosaves to `resume_drafts`.
- `generateResumeAction` asks Groq for a schema-checked resume and stores it in
  `resumes`. With a job description, it also returns matched and missing
  keywords.
- `/api/resume/[id]/pdf` renders the A4 PDF when it's requested.

## Security

- Every database query and Blob path is scoped to the signed-in user's id.
  Another user's id returns 404.
- Uploaded files are private Blobs and are only served after a session check.
- Signing in with Google to an account that has an unverified password removes
  that password and ends any open password sessions. This stops someone from
  registering your email first and keeping access.
- Login, signup and AI generation are rate-limited (`lib/rate-limit.ts`,
  `rate_limits` collection with a TTL index).
- Users only see error messages written for them (`lib/errors.ts`); internal
  errors are logged on the server.

## Project structure

```
app/                     routes, layouts, server actions
  api/auth/              Auth.js handlers
  api/resume/            upload token, resume PDF, uploaded-file download
  dashboard/             protected pages (shared navbar/footer in layout.tsx)
  login/, signup/        auth pages + server actions
components/              landing sections and UI (wizard, analyzer, loaders)
lib/
  ai.ts                  Groq client + schema-validated generation
  interview-report.ts    analysis prompt, repair round, plan cleanup
  analysis.ts            analysis schema and upload limits
  resume.ts              wizard questions and resume schema
  *-store.ts             MongoDB access per collection
  users.ts, session.ts   accounts and current-user helpers
  blob.ts                private Blob helpers
  rate-limit.ts          MongoDB fixed-window rate limiter
  pdf/                   resume PDF template + text extraction
  content.ts             landing-page copy
tests/                   Vitest unit tests
```

## Notes

- Stats and testimonials in `lib/content.ts` are placeholder copy. Replace them
  before launch.
- The logo marquee loads icons from `cdn.simpleicons.org`.
