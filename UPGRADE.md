# Free infrastructure upgrade

The active agent and purchase drafter now use deterministic rules, not Gemini. No model API key is required and no model request is made. This preserves monitoring and human approval but is not an LLM-agent demonstration; the rules provenance is recorded with each draft. Historical rows may still describe Gemini.

## Existing hosted database

Back up the database and inspect the migration before applying it. Apply `supabase/migrations/202609110001_security.sql` and then `supabase/migrations/202609110002_inventory_atomic.sql` after the three original schemas. Do not replay the initial seed migration against an existing deployment. The patch removes the known original allow-all policies without deleting business rows; review any custom policies separately. All application users currently share one manager workspace; this is not multitenant isolation.

Create an Auth user through the Supabase dashboard. Assign `app_metadata.ims_role = "manager"` using the admin API/SQL as an administrator (never user_metadata). Re-sign in after role changes. The UI now requires manager sign-in. Anonymous access is revoked, low_stock_products uses security-invoker semantics, and each Edge Function validates the real authenticated user before using privileged operations. Inventory scheduling accepts only a separate CRON_SECRET. Never put service-role or cron secrets in VITE variables.

Deploy the three functions after applying the migration. Purchase approvals use a row-locked database transaction; direct authenticated purchase-order writes are revoked. Manager accounts remain trusted to edit inventory and recommendations. Audit these permissions before adding untrusted staff roles.

## Local development

Install Docker and the Supabase CLI. From this directory:

```sh
supabase start
supabase db reset
supabase status
```

This starts the local Postgres/Auth/API services and applies the migrations. The reset command deletes **local** development data; never run it with `--linked`. Copy `.env.example` to `.env.local`, set VITE_SUPABASE_URL to `http://127.0.0.1:54321` and VITE_SUPABASE_ANON_KEY to the local anon key printed by `supabase status`. Create a local manager account through local Studio/Auth (or the admin API). Then:

```sh
supabase functions serve
# In another terminal:
docker compose up --build
```

Open http://localhost:5173. Compose packages the frontend; the Supabase CLI owns its separate Docker stack. This is a two-command local stack, not a standalone all-services Compose deployment. No cloud account is required. Docker and Supabase CLI startup have not been exercised in this workspace. Deno checks for the three handlers passed through the npm-distributed Deno executable.

## Free schedule and deployment

Keep the React build on the existing Vercel deployment and Supabase on its free plan. Set matching CRON_SECRET in Supabase function secrets and GitHub repository Actions secrets. Add SUPABASE_URL to GitHub Actions secrets. A randomly generated long secret should be used. The scheduled workflow sends only this scoped trigger credential, not a database service-role key. Run workflow_dispatch once to verify after deployment. Disable/remove the previous external scheduler manually: the supplied archive contained no deployed scheduler configuration.

The daily schedule is 03:30 UTC (09:00 IST); scheduling is best-effort. Public repositories can use standard GitHub-hosted runners free; private repositories must stay within included minutes and avoid enabling overage billing. Supabase/Vercel free quotas and eligibility still apply; no hosting account or plan was changed here. Paused projects will need resuming. Manual and scheduled runs now use the same database transaction and advisory lock, serializing the snapshot and task/alert/log writes. The legacy task title identifies existing restocks; arbitrary manager-created tasks outside this RPC are not serialized.

## Verify

```sh
npm ci
npm test
npm run build
```

Tests cover reorder quantity, pending demand, supplier selection, invalid input, prompt-like inert text and invalid agent triggers. Live RLS, SQL transaction, Edge Function and Docker checks require the local stack; unit tests do not establish those integration properties. No real customer data was accessed and no deployment was performed.

GitHub requires scheduled workflow files on the default branch and can disable schedules in inactive public repositories after 60 days. See [GitHub schedule reference](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) and [Supabase local migrations](https://supabase.com/docs/guides/local-development/database-migrations). CI lint currently covers the new domain modules and tests; the existing React code is compiled by Vite.

Local signups are disabled. To assign a manager role for an existing Auth user, run this in your local Studio SQL editor (replace the example email):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"ims_role":"manager"}'::jsonb
where email = 'your-manager@example.com';
```

Use the local Studio Auth page to create that password user first. This is an administrator operation, not something the frontend is allowed to do.

Database CI starts the local Supabase stack and runs `supabase test db`: seven pgTAP checks exercise repeated inventory execution, caller restrictions, RLS and direct purchase-write denial. These SQL tests were added but **not executed in this workspace** because Docker is unavailable. CI also runs Deno type checks for all three Edge Functions. Existing managers are trusted workspace administrators, not isolated tenants.
