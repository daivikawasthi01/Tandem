# PairDev: Tech Stack Decisions

Every choice below has the same shape:

- **Pick**: what I'm using
- **Why**: the actual reason
- **Instead**: what I considered
- **Switch if**: what would make me change my mind

Two rules I followed:
1. Boring and popular beats new and clever, unless the new thing solves a real problem I have.
2. If a tool doesn't solve a problem I currently have, I'm not adding it yet.

---

## At a glance

| Area | Pick |
|---|---|
| Runtime | Node.js (current LTS) |
| Language | TypeScript, strict mode |
| Package manager | pnpm |
| Repo layout | pnpm workspaces (Turborepo later, if needed) |
| Frontend | React + Vite |
| Editor | Monaco (lazy-loaded) |
| Server state | TanStack Query |
| Styling | Tailwind CSS |
| API | Express 5 |
| Validation | Zod |
| Database | PostgreSQL |
| ORM | Prisma |
| Realtime | Yjs + Hocuspocus |
| Queue / cache | Redis + BullMQ |
| Code sandbox | Judge0 |
| Auth | Argon2 + short-lived JWT + refresh token, in httpOnly cookies |
| Logging / metrics / errors | pino, prom-client + Grafana, Sentry |
| Testing | Vitest, Supertest, Playwright, k6 |
| Lint / format | ESLint + Prettier |
| Containers | Docker + docker-compose |
| CI/CD | GitHub Actions |
| Hosting | Vercel (frontend), Fly.io (API + realtime + worker) |

---

## 1. Foundations

### Node.js (LTS)
- **Why**
  - Same language on frontend and backend, so shared types and one thing to learn
  - Great fit for many idle WebSocket connections (event-driven I/O)
  - Most fresher-friendly jobs use it
- **Instead**: Go, Python, Bun, Deno
  - Go handles connections more efficiently but I'd be learning a new language *and* a hard problem at once
  - Bun/Deno are fine, but library compatibility surprises cost time, and Yjs/Hocuspocus are tested on Node
- **Switch if**: load tests show the realtime process can't hold the target connections even after tuning
- **Detail**: pin the version in `.nvmrc` and `engines` so local, CI and production match

### TypeScript (strict)
- **Why**
  - The frontend and backend share types, so they can't disagree about data shapes
  - Catches a whole class of bugs before running
  - Job posts ask for it almost everywhere
- **Instead**: plain JavaScript (faster to start, worse to maintain)
- **Detail**: `strict: true` from day one. Turning it on later is painful.

### pnpm (vs npm, yarn, bun)
- **Why**
  - Strict `node_modules`: you can only import what you declared. npm lets you accidentally use packages you never installed (called phantom dependencies), and that breaks later in production.
  - Faster installs and less disk use, since packages are stored once and linked
  - Workspaces are first-class, which I need for the monorepo
  - Newer pnpm versions don't run dependency install scripts by default, which is a real supply-chain safety win
- **Instead**
  - npm: works fine and is the default, but slower and looser
  - Yarn: no strong reason to pick it today
  - Bun: fast, but I don't want the package manager to be another thing that can surprise me
- **Switch if**: a tool I need doesn't play well with pnpm's strictness (rare, fixable with config)
- **Details**
  - Commit `pnpm-lock.yaml`
  - CI uses `pnpm install --frozen-lockfile` so builds are reproducible
  - Set `packageManager` in `package.json` and use Corepack so everyone gets the same pnpm version

### Monorepo with pnpm workspaces
- **Why**
  - `packages/shared` holds Zod schemas and types used by both web and api
  - One repo, one PR, one CI for a change that touches both sides
- **Instead**: separate repos (types drift, painful cross-repo changes)
- **Turborepo / Nx**: not yet. Add Turborepo when builds get slow enough that caching helps. Right now it's a config file with no payoff.

### Local tooling
- **`tsx`** to run TypeScript in dev with reload. No build step while coding.
- **`tsup` (esbuild)** to build the API for production. Fast and simple.
- **Env validation with Zod** at startup. The app refuses to boot if a variable is missing, instead of failing at 2 a.m.

---

## 2. Frontend

### React
- **Why**: most widely used, huge ecosystem, and Monaco and Yjs have solid bindings for it
- **Instead**: Vue, Svelte, Solid (all good, all smaller job markets)

### Vite (not Next.js)
- **Why**
  - The app sits behind a login, so SEO and server rendering give me nothing
  - Vite is a plain single-page app: simpler mental model, fast dev server, static output that is cheap to host
  - Next.js adds server components, caching rules and a hosting model I'd have to learn for no benefit here
- **Instead**: Next.js (good for public, SEO-heavy pages)
- **Switch if**: I add a public marketing site or shareable room previews that need SEO. Then that page can be Next.js or plain static HTML.

### Monaco Editor
- **Why**
  - It is the editor inside VS Code: syntax highlighting, familiar shortcuts, multi-language support
  - Solid Yjs binding (`y-monaco`)
  - Looks impressive in demos
- **Trade-off, being honest**: it's heavy (a few MB of JS). That works against my "editor usable in under 1.5 s" target.
- **Mitigation**: lazy-load it, load only the languages in use, and show the page shell instantly
- **Instead**: CodeMirror 6. It's much lighter and better on mobile, with `y-codemirror.next` for Yjs.
- **Switch if**: the join-time target can't be met. This is a real candidate, so I'm keeping the editor behind a thin wrapper component to make swapping cheap.

### TanStack Query
- **Why**
  - Handles caching, loading and error states, retries, and refetching
  - Removes a lot of hand-written `useEffect` + `useState` fetch code
- **Instead**: Redux (too much boilerplate for server data), plain `fetch` in effects (bug-prone)
- **Detail**: only for REST data. Live document state lives in Yjs, not here.

### Local UI state: `useState` / context, Zustand only if needed
- **Why**: most state is either server data (TanStack Query) or the document (Yjs). Very little is left for a state library.

### Tailwind CSS
- **Why**: fast to build with, consistent spacing and colors, no separate CSS files to keep in sync
- **Instead**: CSS modules (fine, more files), styled-components (runtime cost, fading in popularity)

### React Router
- **Why**: standard client-side routing for a Vite SPA

---

## 3. Backend

### Express 5
- **Why**
  - Most tutorials, most jobs, most answers on the internet. That matters while I'm learning.
  - Version 5 handles errors from async route handlers properly, which was Express's biggest annoyance
  - The API isn't the hot path. The realtime server is. So raw framework speed isn't my bottleneck.
- **Instead**: Fastify (faster, built-in schema validation, great choice), NestJS (heavy structure, more to learn)
- **Switch if**: API throughput becomes a real problem, or I want built-in schema-based validation. Because validation lives in Zod and services are plain functions, moving to Fastify would be mostly a routing change.

### Zod
- **Why**
  - One schema gives runtime validation *and* the TypeScript type
  - Schemas live in `packages/shared`, so the frontend validates forms with the exact same rules as the backend
- **Instead**: Joi, Yup, class-validator (no shared type inference, or tied to classes)

### PostgreSQL (not MongoDB)
- **Why**
  - The data is relational: users, rooms, members, messages, executions
  - Foreign keys, unique constraints and transactions protect data integrity for me
  - "Members of a room with role X" is a natural join, and awkward in a document store
  - SQL is asked for in most job posts, and it's a skill worth having
- **Instead**: MongoDB (easy start, but I'd end up hand-rolling relationships)
- **Where Yjs data goes**: stored as a binary blob per room in Postgres (`bytea`). It's opaque to queries anyway, so a dedicated store doesn't help.

### Prisma (ORM)
- **Why**
  - Type-safe queries and generated types
  - Migrations built in
  - Very common in job posts
- **Instead**
  - Drizzle: closer to raw SQL, lighter, excellent. A strong alternative.
  - Raw SQL with `pg`: most control, most boilerplate
- **Switch if**: I hit queries Prisma can't express well, or want tighter SQL control
- **Detail**: I'll still write some queries by hand in SQL so I understand what the ORM is doing. Prisma is a convenience, not a substitute for knowing SQL.

### Authentication: Argon2 + short-lived JWT + refresh token
- **Password hashing**
  - Argon2id is the current recommended default and is resistant to GPU cracking
  - bcrypt is still acceptable if Argon2 causes install trouble
  - Hashing runs in the API service only, since it's CPU-heavy and would block the realtime server
- **Tokens**
  - Access token: short-lived (about 15 minutes)
  - Refresh token: longer-lived, stored hashed in the database so it can be revoked
  - Both in **httpOnly, Secure, SameSite cookies**. JavaScript can't read them, which blocks token theft via XSS.
- **WebSocket auth**: a one-time ticket from the API, consumed on connect, so the long-lived token never appears in a URL
- **Instead**
  - Plain server sessions in Redis: honestly simpler and easier to revoke. A valid alternative.
  - Auth libraries (Better Auth, Auth.js, Clerk): the right call in a real product. I'm hand-building it *once* to learn how it works.
- **Note**: this is the most security-sensitive code in the app. It gets the most tests.

---

## 4. Realtime

### Yjs (CRDT)
- **Why**
  - Concurrent edits merge automatically with no central "referee"
  - Works offline and merges on reconnect
  - Mature, widely used, with editor bindings
- **Instead**
  - Operational Transform (what Google Docs historically used): needs a central server ordering every operation, and is very hard to get right
  - Automerge: also a CRDT, but Yjs is faster and has more editor integrations
  - Hand-rolled sync: that's the naive phase, and it's meant to fail so I learn why

### Hocuspocus (not Socket.IO + y-websocket)
- **Why**
  - Purpose-built Yjs server: auth hook on connect, load/save hooks for persistence, presence, and a Redis extension for multiple instances
  - That's four things I'd otherwise wire up myself
- **Instead**
  - Socket.IO: better for generic events like chat, but I'd build all the Yjs plumbing by hand
  - `y-websocket`: minimal, with no auth or persistence hooks
  - Managed services (Liveblocks, PartyKit): great products, but they hide exactly what I want to learn
- **Switch if**: I need behavior Hocuspocus can't support, or it becomes unmaintained

### Redis + BullMQ
- **Why**
  - Redis covers four jobs: job queue, pub/sub between instances, rate-limit counters, and short-lived leases and tickets
  - BullMQ is the standard Node queue: retries, backoff, delays, dead-letter handling, and idempotent jobs
- **Instead**
  - Postgres-based queue (pg-boss): fewer moving parts, a genuinely good option at small scale
  - RabbitMQ / SQS: more than I need
- **Watch out**: BullMQ polls Redis constantly, so pay-per-command hosted Redis plans can get expensive. Use a standard Redis instance.

### Judge0 (code sandbox)
- **Why**: running untrusted code safely is a hard security problem. Judge0 already does isolation, time limits and memory limits across many languages.
- **Instead**
  - Own Docker-per-run sandbox: a big security risk to get wrong, and not the skill I'm showing off here
  - Firecracker microVMs: excellent isolation, way too much to operate
  - Piston: a lighter alternative worth a look
- **Detail**: no network access from the sandbox. Run it on separate infrastructure from the API.

---

## 5. Observability

| Need | Pick | Why |
|---|---|---|
| Logs | **pino** | Very fast, structured JSON, easy to attach `requestId` and `roomId` |
| Metrics | **prom-client → Prometheus → Grafana** | Open standard, free, and the histograms I need for p95/p99 |
| Errors | **Sentry** | Stack traces, grouping and alerts with almost no setup. Free tier is enough. |
| Uptime | **UptimeRobot or Better Stack** | Hits `/health` from outside, so I hear about outages first |
| Product analytics | **PostHog or a plain events table** | DAU/MAU are product questions, not infrastructure metrics |

- **Instead of Datadog / New Relic**: great, but paid. Grafana Cloud's free tier covers this project.
- **Later**: OpenTelemetry for distributed traces, once there's more than one service worth tracing across.

---

## 6. Testing

| Layer | Tool | Why |
|---|---|---|
| Unit | **Vitest** | Same config as Vite, fast, Jest-compatible API |
| API | **Supertest** | Calls the Express app in-process, no port needed |
| End to end | **Playwright** | Can drive *two browsers at once*, which is exactly what a collaboration test needs. Also supports going offline. |
| Load | **k6** | Scripted in JS, has WebSocket support, outputs p95 directly |

- **Instead**
  - Jest: fine, but slower and needs extra setup with modern TypeScript/ESM
  - Cypress: harder to run multi-user scenarios
- **Detail**: API tests hit a real Postgres and Redis (via docker-compose), not mocks. Mocks would hide the bugs I care about.

---

## 7. Code quality

- **ESLint + Prettier**
  - Why: standard, works in every editor and CI, and has the most rules and plugins
  - Instead: Biome is faster and a single tool. Worth a look, but the ecosystem is thinner.
- **Husky + lint-staged**: runs lint and format on staged files before commit, so bad code doesn't reach CI
- **Conventional-style commit messages** (`feat:`, `fix:`): readable history, with changelog generation possible later
- **Small PRs, even solo**: history stays reviewable, and it's a habit teams expect

---

## 8. Infrastructure and delivery

### Docker + docker-compose
- **Why**
  - `docker compose up` gives anyone Postgres, Redis and Judge0 locally with no manual setup
  - The same image runs in dev, CI and production
- **Detail**: multi-stage builds to keep images small, and run as a non-root user

### GitHub Actions
- **Why**: free for public repos, lives next to the code, and huge library of ready-made actions
- **Pipeline**
  1. Install with frozen lockfile
  2. Lint and type-check
  3. Unit and API tests
  4. Build
  5. Deploy on merge to `main`
- **Instead**: GitLab CI, CircleCI (no advantage for a GitHub project)

### Hosting
- **Frontend: Vercel**
  - Static SPA, global CDN, preview URL per PR
- **API, realtime and worker: Fly.io**
  - Long-lived WebSocket connections need always-on servers. Serverless platforms can't hold them.
  - Fly has had a Mumbai region, which matters for latency to users in India
  - Different apps can scale separately
- **Instead**
  - Render / Railway: simpler, but check whether they have a region close to India
  - AWS (EC2/ECS): the most flexible and the most to learn. A good later step once the app is stable.
  - Kubernetes: far more than 3 processes need
- **Database**: managed Postgres in the same region (Supabase or Neon free tiers are good starting points)
- **Reality check**: free tiers, regions and pricing change often. Confirm them before committing.

---

## 9. What I'm deliberately *not* using

| Skipped | Why |
|---|---|
| Microservices | Three processes (API, realtime, worker) is enough. More would add network calls and deployment pain with no payoff. |
| GraphQL | REST covers every need here. GraphQL adds a schema layer and caching complexity. |
| Redux | Server data is in TanStack Query and the document is in Yjs. Nothing left for it to hold. |
| Kubernetes | Overkill until there are many services and a team to run them. |
| Socket.IO | Hocuspocus already does what I need over plain WebSockets. |
| MongoDB | Relational data belongs in a relational database. |
| Next.js | No SEO need behind a login. |
| Turborepo / Nx | No slow builds yet. |
| A hand-built sandbox | Security risk with no learning upside compared to using Judge0. |

---

## 10. Where the choices are least certain

Being honest about these, because they're the likely places I'll be wrong:

1. **Monaco vs CodeMirror**: bundle size may break the join-time target
2. **Express vs Fastify**: fine now, but Fastify may fit better as the API grows
3. **Hand-rolled auth vs a library**: right for learning, wrong for a real product
4. **Hocuspocus scaling**: unproven past one instance until I load test it
5. **Fly.io**: region availability and free tiers change, so check before deploying

Each of these gets a line in `DECISIONS.md` when I revisit it, with what I measured.
