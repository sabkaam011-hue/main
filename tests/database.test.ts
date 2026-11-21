/**
 * Runs the real migrations + seed against an in-process Postgres (PGlite) with
 * minimal stubs of Supabase's auth/storage schemas, then checks RLS isolation.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
let db: PGlite;
let userA: string, userB: string, appId: string;

async function as<T>(user: string, sql: string) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try {
    return await db.query<T>(sql);
  } finally {
    await db.exec("reset role;");
  }
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pg_trgm } });
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, phone text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
    grant usage on schema public to authenticated, anon;
  `);
  const dir = path.join(root, "supabase/migrations");
  for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(path.join(dir, f), "utf8"));
  await db.exec(readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
  // Supabase grants table privileges to `authenticated`; RLS then restricts rows.
  await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated; grant usage on all sequences in schema public to authenticated;`);
  await db.exec(`revoke update on public.profiles from authenticated; grant update (full_name, phone, state, preferred_locale, notify_email, notify_sms) on public.profiles to authenticated;`);
  await db.exec(`revoke update on public.notifications from authenticated; grant update (read_at) on public.notifications to authenticated;`);

  userA = (await db.query<{ id: string }>(`insert into auth.users (email, phone) values ('a@x.in', '919876543210') returning id`)).rows[0].id;
  userB = (await db.query<{ id: string }>(`insert into auth.users (email) values ('b@x.in') returning id`)).rows[0].id;
  appId = (
    await db.query<{ id: string }>(
      `insert into applications (user_id, service_id, fee_paise, applicant_name, applicant_phone, consent_at, status)
       select '${userA}', id, fee_paise, 'Asha Devi', '+919876543210', now(), 'payment_pending' from services where slug = 'apply-pan-card' returning id`,
    )
  ).rows[0].id;
});

describe("schema & seed", () => {
  it("seeds the demo catalogue idempotently", async () => {
    await db.exec(readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
    const r = await db.query<{ c: number; s: number; demo: number }>(
      `select (select count(*)::int from categories) c, (select count(*)::int from services) s, (select count(*)::int from services where verification_status = 'demo') demo`,
    );
    expect(r.rows[0].c).toBe(8);
    expect(r.rows[0].s).toBeGreaterThanOrEqual(50);
    expect(r.rows[0].demo).toBe(r.rows[0].s); // every seed record is marked demo
  });

  it("creates a profile with a normalised phone on signup", async () => {
    const r = await db.query<{ phone: string }>(`select phone from profiles where id = '${userA}'`);
    expect(r.rows[0].phone).toBe("+919876543210");
  });

  it("allows only one successful payment per application", async () => {
    await db.query(`insert into payments (application_id, user_id, order_id, amount_paise, status) values ('${appId}', '${userA}', 'O1', 9900, 'success')`);
    await expect(
      db.query(`insert into payments (application_id, user_id, order_id, amount_paise, status) values ('${appId}', '${userA}', 'O2', 9900, 'success')`),
    ).rejects.toThrow(/payments_one_success_per_app/);
  });

  it("rejects non-https official URLs", async () => {
    await expect(db.query(`update services set official_url = 'http://example.com' where slug = 'pm-kisan'`)).rejects.toThrow();
  });
});

describe("row level security", () => {
  it("users only see their own applications and payments", async () => {
    expect((await as<{ count: number }>(userB, `select count(*)::int as count from applications`)).rows[0].count).toBe(0);
    expect((await as<{ count: number }>(userA, `select count(*)::int as count from applications`)).rows[0].count).toBe(1);
    expect((await as<{ count: number }>(userB, `select count(*)::int as count from payments`)).rows[0].count).toBe(0);
  });

  it("users cannot create applications or payments directly (server-only, fee from DB)", async () => {
    await expect(as(userB, `insert into applications (user_id, service_id, fee_paise, applicant_name, applicant_phone, consent_at) select '${userB}', id, 1, 'Xx', '9999999999', now() from services limit 1`)).rejects.toThrow(/row-level security/);
    await expect(as(userA, `insert into payments (application_id, user_id, order_id, amount_paise, status) values ('${appId}', '${userA}', 'O3', 1, 'success')`)).rejects.toThrow(/row-level security/);
  });

  it("users cannot change their own application status", async () => {
    const r = await as(userA, `update applications set status = 'completed' where id = '${appId}'`);
    expect(r.affectedRows ?? 0).toBe(0);
  });

  it("users cannot escalate privileges or edit the catalogue", async () => {
    await expect(as(userB, `insert into admin_users (user_id, role) values ('${userB}', 'admin')`)).rejects.toThrow(/row-level security/);
    await expect(as(userB, `insert into services (slug, category_id, title) select 'hack', id, 'Hack' from categories limit 1`)).rejects.toThrow(/row-level security/);
  });

  it("hides unpublished services from the public but not from staff", async () => {
    await db.query(`update services set is_published = false where slug = 'digilocker'`);
    expect((await as<{ count: number }>(userB, `select count(*)::int as count from services where slug = 'digilocker'`)).rows[0].count).toBe(0);
    await db.query(`insert into admin_users (user_id, role) values ('${userB}', 'staff')`);
    expect((await as<{ count: number }>(userB, `select count(*)::int as count from services where slug = 'digilocker'`)).rows[0].count).toBe(1);
    expect((await as<{ count: number }>(userB, `select count(*)::int as count from applications`)).rows[0].count).toBe(1);
    await expect(as(userB, `insert into services (slug, category_id, title) select 'staff-x', id, 'Staff cannot' from categories limit 1`)).rejects.toThrow(/row-level security/);
    await db.query(`delete from admin_users where user_id = '${userB}'`);
  });

  it("documents can only be attached to own, paid applications under own folder", async () => {
    await expect(
      as(userA, `insert into documents (application_id, user_id, storage_path, file_name, mime_type, size_bytes) values ('${appId}', '${userA}', '${userA}/${appId}/x.pdf', 'x.pdf', 'application/pdf', 10)`),
    ).rejects.toThrow(/row-level security/); // still payment_pending
    await db.query(`update applications set status = 'payment_successful' where id = '${appId}'`);
    await as(userA, `insert into documents (application_id, user_id, storage_path, file_name, mime_type, size_bytes) values ('${appId}', '${userA}', '${userA}/${appId}/x.pdf', 'x.pdf', 'application/pdf', 10)`);
    await expect(
      as(userB, `insert into documents (application_id, user_id, storage_path, file_name, mime_type, size_bytes) values ('${appId}', '${userB}', '${userB}/${appId}/y.pdf', 'y.pdf', 'application/pdf', 10)`),
    ).rejects.toThrow(/row-level security/);
  });
});
