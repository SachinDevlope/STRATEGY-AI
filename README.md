# Strategy-AI

Next.js 15 (App Router) rebuild of the Strategy-AI landing page, with Google
sign-in via Auth.js (NextAuth v5).

## Setup

```bash
npm install
cp .env.local.example .env.local
npx auth secret          # writes AUTH_SECRET into .env.local
npm run dev
```

Then fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `MONGODB_URI` in
`.env.local`.

### Database

MongoDB Atlas, via the Auth.js MongoDB adapter. Sessions stay JWT-based so the
Edge middleware can authorize without a database round trip, but users and
linked OAuth accounts are persisted.

The adapter's collections are namespaced (`auth_users`, `auth_accounts`,
`auth_sessions`, `auth_verification_tokens`) because the `Gen-Ai` database
already contains an unrelated `users` collection from an earlier app.

Application code should get a handle with `getDb()` from `lib/mongodb.ts`
rather than opening its own client — the module caches one connection pool
across hot reloads.

### Google OAuth credentials

1. Google Cloud Console → APIs & Services → Credentials.
2. Create an OAuth client ID, application type **Web application**.
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   (add the production URL too when you deploy).
4. Copy the client ID and secret into `.env.local`.

## Routes

| Path        | What it is                                            |
| ----------- | ----------------------------------------------------- |
| `/`         | Landing page                                          |
| `/login`    | Log in with Google                                    |
| `/signup`   | Sign up with Google                                   |
| `/dashboard`| Protected — `middleware.ts` redirects signed-out users |

## Structure

- `app/` — routes and layouts
- `components/` — page sections and UI pieces
- `lib/content.ts` — all landing-page copy (stats, companies, testimonials, features)
- `auth.config.ts` — Edge-safe Auth.js config (providers, pages, callbacks)
- `auth.ts` — the above plus the MongoDB adapter; Node.js runtime only
- `middleware.ts` — gates `/dashboard`; builds from `auth.config.ts`, never
  from `auth.ts`, because the MongoDB driver cannot run on the Edge
- `lib/mongodb.ts` — shared `MongoClient` promise and `getDb()`
- `tailwind.config.ts` — Material-style color tokens and type scale

`index.html` is the original static page, kept for reference. Delete it once
you're happy with the port.

## Notes

- Stats and testimonials in `lib/content.ts` are placeholder marketing copy.
  Replace with real figures before launch.
- The logo marquee loads brand marks from `cdn.simpleicons.org` with a favicon
  fallback. Self-host the SVGs if you want them offline.
