# Firebase setup for auth (prototype)

Follow these steps to enable login with Firebase and use the new backend routes in this Next.js app.

## 1) Create Firebase project and web app
- Go to https://console.firebase.google.com → Add project.
- Add a Web App (</>) and copy the client config (apiKey, authDomain, projectId, etc.).

## 2) Enable Authentication providers
- In Firebase Console → Authentication → Sign-in method:
  - Enable Email/Password (for MVP testing).
  - Go to Authentication → Settings → Authorized domains and ensure these are listed:
    - `localhost` (for local dev)
    - Your Vercel preview domain (e.g., `<project-name>-<hash>.vercel.app`)
    - Your production custom domain if configured

## 3) Admin SDK (Not used in MVP)
- For the hackathon MVP, we do NOT use the Firebase Admin SDK. Authentication is handled via a simple session cookie that stores the raw Firebase ID token. Do not add Admin service account keys.

## 4) Add client SDK config as public env vars (Vercel)
- From your web app config, set these as Environment Variables in Vercel:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (optional for now)
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` (optional for now)
  - `NEXT_PUBLIC_FIREBASE_APP_ID`

## 5) Firestore
- Create Firestore in Native mode.
- A `users` collection will be auto-created by the backend when a user first logs in. You can manually edit the `role` field later (values: `patient`, `doctor`, `pharmacyOwner`, `admin`).

## 6) How login works (simple session cookie)
- Client signs in with Firebase JS SDK → obtains `idToken`.
- Client calls `POST /api/auth/simple-session` with `{ idToken }`.
- Server stores the raw ID token in an HTTP-only `session` cookie (no verification, session-only, MVP-only).
- Authenticated requests can call `GET /api/auth/me` to read the user and role (server decodes token payload).
- To logout, call `DELETE /api/auth/simple-session` and also sign out the Firebase client.

## 7) Testing locally
- Create a `.env.local` (not committed) with the same variables or use Vercel CLI env pull.
- Start dev server: `npm run dev`.
- Use Email/Password sign-in on the client; then call the `/api/auth/simple-session` endpoint.

## 8) Assigning roles for prototype
- By default, first login creates a `users/{uid}` doc with role `patient`.
- To mark a user as `admin`, `doctor`, or `pharmacyOwner`, edit their doc in Firestore → `users/{uid}` → set `role` accordingly (bootstrap manually for MVP).

## 9) Endpoints (MVP)
- `POST /api/auth/simple-session` → body `{ idToken }` → sets session cookie.
- `DELETE /api/auth/simple-session` → clears session cookie.
- `GET /api/auth/me` → returns `{ uid, role, user, appUser }`.
- `GET /api/dashboard/stats` → role-aware counts for dashboard.

That’s it. If you want me to add a simple client login helper or a minimal login UI, say the word and I’ll scaffold it.
