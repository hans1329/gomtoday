# Core Intent

PROBLEM: Users struggle to keep a daily journal — GomToday turns the photos they already take into AI-written diary entries from a chosen perspective (camera, third party, "my own gaze").

FEATURES:
- Photo upload → AI-generated diary in a chosen perspective + emotion + length
- Personal & shared notebooks with friends, invitations, comments, likes
- Pencil-economy (writes cost "pencils"; admin-configurable products) with welcome bonus on first login

TARGET_USER: Korean-speaking smartphone users (PWA, KakaoTalk login) who want a low-effort, photo-driven journaling habit and optionally share notebooks with close friends.

# Stack Fingerprint

RUNTIME: Node (Vite dev) + TypeScript 5 on the client; Deno runtime for Supabase Edge Functions

FRONTEND: React 18 + Vite 5 + Tailwind CSS 3 + shadcn/ui (Radix) + TanStack Query + react-router-dom + Tiptap editor + vite-plugin-pwa

BACKEND: Supabase (Lovable Cloud) — Postgres + Auth + Storage + 3 Edge Functions (`analyze-photo`, `kakao-auth`, `optimize-images`)

DATABASE: Postgres · 16 public tables (diaries, photos, notebooks, notebook_members, diary_notebooks, diary_comments, diary_likes, friend_requests, invitations, inquiries, notifications, pencil_products, pencil_settings, perspectives, profiles, user_roles) · RLS in use, role checks via separate `user_roles` table

INFRA: Lovable hosting (preview + published `gomtoday.lovable.app`, custom domain `gom.today`) · Edge Functions auto-deployed · no separate CI configured in repo

AI_LAYER: Vision-LLM diary generation in `analyze-photo` edge function — sends base64 photos + a DB-stored perspective prompt template + emotion/length modifiers, expects JSON `{diary,title,emoji}` back

EXTERNAL_API: OpenAI Chat Completions (gpt-4o-mini, vision) · Kakao OAuth (token + user/me) · Supabase Storage for brand assets

AUTH: Supabase Auth · Custom Kakao OAuth flow via `kakao-auth` edge function + `/kakao-callback` route (magiclink session bridge) · banned-user check in `App.tsx`

SPECIAL: Photo bytes stored as base64 in `photos.metadata` and re-read by the edge function (instead of Storage URLs) · DB-driven prompt templates in `perspectives` table so admins can edit AI behavior without redeploy · "first login only" redirect to /profile gated by per-user `localStorage` flag

# Failure Log

## Failure 1

SYMPTOM: After login, users were trapped — every navigation kept bouncing them back to `/profile`. Took 3+ AI iterations: first attempt removed the redirect entirely, second made it conditional on `is_first_login` only in KakaoCallback, third still left a profile-completeness check on `/` that re-redirected.

CAUSE: Redirect logic was duplicated across three files (`Auth.tsx`, `KakaoCallback.tsx`, `Home.tsx`) and one of them silently re-evaluated "profile completeness" on every mount, overriding the other two.

FIX: Human had to explicitly say "keep first-login redirect, remove completeness check" twice. Final solution: a single `localStorage` flag `profile_redirected_${user.id}` set on first redirect, checked in all three locations; no completeness logic anywhere.

PREVENTION: First-login routing now has one source of truth (the localStorage flag). Any future "force user to page X" rule should be expressed as a one-shot flag, not a derived check.

## Failure 2

SYMPTOM: When the user picked a weather option in the diary UI, it rendered as a "?" icon instead of the chosen weather glyph.

CAUSE: ? — based on chat history this looks like an icon-name mapping issue (selected value didn't match the lucide/emoji key used at render time), but I cannot fully verify the exact root cause from the current file snapshot.

FIX: Iterated on the icon mapping in `Home.tsx` until the selected weather rendered correctly.

PREVENTION: ? — no explicit guard added that I can see; a typed enum + exhaustive map would prevent recurrence.

# Decision Archaeology

## Decision 1

ORIGINAL_PLAN: Use Supabase's built-in OAuth providers for Kakao login.

REASON_TO_CHANGE: Supabase Auth doesn't ship a first-class Kakao provider for KR users; needed welcome-pencil bonus + first-login flagging at account-creation time.

FINAL_CHOICE: Custom `kakao-auth` edge function that exchanges the code, calls `kapi.kakao.com/v2/user/me`, then `auth.admin.createUser` + magiclink session bridge.

OUTCOME: Works and lets us atomically grant 10 welcome pencils + create a welcome notification. Trade-off: we now own token refresh, email-collision handling, and the synthetic `kakao_<id>@kakao.user` email scheme.

## Decision 2

ORIGINAL_PLAN: Store uploaded photos in Supabase Storage and pass URLs to the vision model.

REASON_TO_CHANGE: AI recommendation accepted — simpler pipeline + avoids signed-URL/CORS issues when OpenAI fetches the image.

FINAL_CHOICE: Persist base64 + mimeType inside `photos.metadata` (JSONB) and inline as `data:` URLs in the OpenAI request (`analyze-photo/index.ts`).

OUTCOME: Generation is reliable and self-contained, but row size is large, the 1000-row default query cap is closer than it should be, and bandwidth/storage costs scale poorly. Likely to be revisited.

# AI Delegation Map

| Domain | AI % | Human % | Notes |
|--------|------|---------|-------|
| DB Schema Design | 70 | 30 | AI proposed tables; human enforced separate `user_roles` table and RLS shape |
| React Components / shadcn UI | 85 | 15 | AI generated most pages; human directed layout tweaks (calendar "today" button, expand button) |
| Edge Functions (analyze-photo, kakao-auth) | 75 | 25 | AI wrote scaffolding; human iterated on prompt template + perspective/emotion/length variables |
| Auth & Routing (first-login flow) | 40 | 60 | Took multiple human corrections to converge |
| Security / RLS Policies | 60 | 40 | AI applied template policies; human caught role-table requirement |
| Design System (Tailwind tokens, PWA theme) | 65 | 35 | Human dictated brand color (#F97316), rounded-pill buttons, mobile dialog padding rules |
| Bug Triage (weather icon, redirect loop) | 50 | 50 | Human had to redirect AI when it fixed the wrong layer |

# Live Proof

DEPLOYED_URL: https://gom.today (also https://gomtoday.lovable.app)

GITHUB_URL: ?

API_ENDPOINTS: https://sqxoqvfcaekaxbpfguod.supabase.co/functions/v1/{analyze-photo,kakao-auth,optimize-images}

CONTRACT_ADDRESSES: ? — not a web3 project

OTHER_EVIDENCE: ? — no public user/usage metrics available to me

# Next Blocker

CURRENT_BLOCKER: technical — photo storage strategy. Base64-in-JSONB inflates row size, brushes against Supabase's 1000-row default query cap, and makes listing/feeds expensive. Until this is migrated, scaling diaries/photos per user is risky.

FIRST_AI_TASK: Migrate `photos` to Supabase Storage: write a one-off edge function that streams `metadata.base64` for each row into a `photos/{user_id}/{photo_id}.{ext}` object, replaces `metadata` with `{storage_path, mimeType, width, height}`, and updates `analyze-photo` to download via the service-role client and re-encode to base64 only at the OpenAI call boundary.

# Integrity Self-Check

PROMPT_VERSION: commit-brief/v1.3

VERIFIED_CLAIMS:
- Stack: `package.json` (React 18, Vite, Tailwind, shadcn/Radix, TanStack Query, Tiptap), `vite.config.ts` (vite-plugin-pwa, theme color #F97316, name "3rdMe")
- Edge functions exist: `supabase/functions/{analyze-photo,kakao-auth,optimize-images}/index.ts`
- AI flow details: `analyze-photo/index.ts` uses `gpt-4o-mini`, reads `perspectives` table prompt template, expects JSON `{diary,title,emoji}`, reads base64 from `photos.metadata`
- Kakao flow: `kakao-auth/index.ts` uses `auth.admin.createUser`, grants `WELCOME_PENCILS = 10`, inserts welcome notification, returns `is_first_login`
- DB tables: confirmed 16 public tables via `information_schema` query (diaries, photos, notebooks, …, user_roles)
- Routing & banned-user check: `src/App.tsx`
- First-login redirect bug history: summarized assistant turns describe edits to `Auth.tsx`, `KakaoCallback.tsx`, `Home.tsx` converging on a `localStorage` flag
- Deployed URLs: provided in project_urls context

UNVERIFIABLE_CLAIMS:
- Exact root cause of the weather "?" icon bug — I did not re-open the relevant `Home.tsx` lines this turn
- Actual RLS policy contents per table (only confirmed `user_roles` table exists, not each policy body)
- AI/Human % splits in the delegation map are estimates from chat history, not measurable
- GitHub repo URL, user counts, revenue, real-world adoption
- Whether the published version at gom.today is currently in sync with the code I see

DIVERGENCES: none observed — the user did not modify the template or steer answers.

CONFIDENCE_SCORE: 7
