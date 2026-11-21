-- ═══════════════════════════════════════════════════════════════════════
-- Row Level Security
-- Principle: the browser (anon key) can only ever see/modify the signed-in
-- user's own rows. Money-related and workflow-critical writes (applications,
-- payments, webhooks, notifications) are performed only by trusted server code
-- with the service-role key, after explicit checks.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.services enable row level security;
alter table public.service_keywords enable row level security;
alter table public.saved_services enable row level security;
alter table public.faqs enable row level security;
alter table public.site_content enable row level security;
alter table public.applications enable row level security;
alter table public.application_status_history enable row level security;
alter table public.staff_assignments enable row level security;
alter table public.documents enable row level security;
alter table public.payments enable row level security;
alter table public.payment_webhooks enable row level security;   -- no policies: service role only
alter table public.notifications enable row level security;
alter table public.support_requests enable row level security;

-- profiles
create policy "profiles: own read" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "profiles: own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- admin_users: staff can see who is staff; only admins manage
create policy "admin_users: staff read" on public.admin_users for select using (public.is_staff());
create policy "admin_users: admin write" on public.admin_users for all using (public.is_admin()) with check (public.is_admin());

-- catalogue: public read of published content, admin write
create policy "categories: public read" on public.categories for select using (true);
create policy "categories: admin write" on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy "services: public read" on public.services for select using (is_published or public.is_staff());
create policy "services: admin write" on public.services for all using (public.is_admin()) with check (public.is_admin());

create policy "service_keywords: public read" on public.service_keywords for select using (true);
create policy "service_keywords: admin write" on public.service_keywords for all using (public.is_admin()) with check (public.is_admin());

create policy "faqs: public read" on public.faqs for select using (is_published or public.is_staff());
create policy "faqs: admin write" on public.faqs for all using (public.is_admin()) with check (public.is_admin());

create policy "site_content: public read" on public.site_content for select using (true);
create policy "site_content: admin write" on public.site_content for all using (public.is_admin()) with check (public.is_admin());

-- saved services: fully owned by user
create policy "saved: own all" on public.saved_services for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- applications: users read own; staff read/update all. Inserts happen server-side (service role) so
-- the fee is always taken from the services table, never from the client.
create policy "applications: own or staff read" on public.applications for select
  using (user_id = auth.uid() or public.is_staff());
create policy "applications: staff update" on public.applications for update
  using (public.is_staff()) with check (public.is_staff());

create policy "status_history: own or staff read" on public.application_status_history for select
  using (public.is_staff() or exists (
    select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid()
  ));
create policy "status_history: staff insert" on public.application_status_history for insert
  with check (public.is_staff());

create policy "staff_assignments: staff read" on public.staff_assignments for select using (public.is_staff());
create policy "staff_assignments: admin insert" on public.staff_assignments for insert with check (public.is_admin());

-- documents: owner can add/read/delete own docs on own applications; staff can read
create policy "documents: own or staff read" on public.documents for select
  using (user_id = auth.uid() or public.is_staff());
create policy "documents: own insert" on public.documents for insert
  with check (
    user_id = auth.uid()
    and split_part(storage_path, '/', 1) = auth.uid()::text
    and exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = auth.uid()
        and a.status in ('payment_successful', 'under_review', 'documents_required', 'in_progress')
    )
  );
create policy "documents: own delete" on public.documents for delete using (user_id = auth.uid());

-- payments: read-only for owner and staff. All writes via service role.
create policy "payments: own or staff read" on public.payments for select
  using (user_id = auth.uid() or public.is_staff());

-- notifications: owner reads and marks read
create policy "notifications: own read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications: own update" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- support requests: staff read/update. Inserts via server action (rate-limited, service role).
create policy "support: staff read" on public.support_requests for select using (public.is_staff());
create policy "support: staff update" on public.support_requests for update using (public.is_staff()) with check (public.is_staff());

-- Users must not be able to change columns other than status flags on notifications.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Users may only edit safe profile columns.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, state, preferred_locale, notify_email, notify_sms) on public.profiles to authenticated;
