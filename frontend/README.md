# RelocationHub — Frontend

Next.js 14 (App Router) frontend deployed on Vercel. Companion service: FastAPI backend on Railway.

## Stack

- **Framework**: Next.js 14 App Router (`/app` directory)
- **Styling**: Tailwind CSS v4 with dark mode (`dark:` classes, `class` strategy)
- **Auth**: Supabase (`@supabase/ssr`) — Google OAuth + email/password
- **State**: React `useState` / `useEffect` — no external state library

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.local.example` → `.env.local` and fill in the three variables:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page — marketing, process guide, pricing |
| `/login` | Sign in / sign up / forgot password (email + Google OAuth) |
| `/onboarding` | 5-step onboarding form → generates AI checklist |
| `/dashboard` | Main app — checklist, progress, documents, risk score, allowance tracker |
| `/documents` | Document manager — validate, delete, download document pack |
| `/tools/30-ruling` | Public 30% ruling eligibility calculator (no auth) |
| `/auth/callback` | Supabase OAuth redirect handler |
| `/auth/reset-password` | Password reset handler |

## Components

| File | Purpose |
|---|---|
| `NavAuthButton.tsx` | Auth-aware nav CTA — "Get started" or "My Dashboard →" |
| `RiskScoreWidget.tsx` | Relocation risk score (0–100, 4 dimensions) — paid only |
| `IndMonitorWidget.tsx` | IND appointment slot monitor — subscribe, status, self-report |
| `AllowanceTrackerWidget.tsx` | Relocation allowance tracker — set budget, log expenses, PDF export |
| `ResourcesWidget.tsx` | City-specific resource links (Pararius, ExpatGuide, Marktplaats, IKEA) |
| `EditProfileModal.tsx` | Profile editing modal with optional checklist regeneration |
| `AiConsentModal.tsx` | GDPR consent gate for AI document processing |
| `ValidationBadge.tsx` | Document validation result badge (pass/warn/fail) |
| `ThemeToggle.tsx` | Light/dark mode toggle |

## Key Constraints

- Every page that reads from Supabase needs `export const dynamic = 'force-dynamic'` to prevent build-time prerender errors
- Pages using `useSearchParams()` must wrap their content component in `<Suspense>` (see `documents/page.tsx`)
- All Supabase client calls use `@/lib/supabase` (`createClient()`)
- All backend calls use functions from `@/lib/api.ts` — never fetch the Railway URL directly in components
- Dark mode: use `dark:` Tailwind classes throughout; never inline styles for colours

## Env Vars

| Variable | Where set |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel |
| `NEXT_PUBLIC_API_URL` | Vercel (points to Railway backend, no trailing slash) |

Never put Railway / backend secrets in this project — they belong in Railway only.
