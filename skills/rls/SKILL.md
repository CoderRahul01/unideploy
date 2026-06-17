---
name: rls
description: Audit Supabase RLS policies. Load when user asks about RLS, Supabase security, or after rls_scan finds issues.
---

# Supabase RLS Audit

## Run
rls_scan({ repoPath: "." })

## CVE-2025-48757 pattern
Vibe tools generate wrong or missing RLS. Result: anyone dumps tables via direct REST call with just the anon key.

## Manual verification test
curl -X GET 'https://{ref}.supabase.co/rest/v1/{table}?select=*' -H "apikey: {anon_key}" -H "Authorization: Bearer {anon_key}"
If it returns data without a session — RLS is broken.

## Fix
ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON public.{table} FOR ALL USING (auth.uid() = user_id);

## service_role rule
service_role bypasses ALL RLS. Server-only. Never in frontend bundles.

Apply fixes using edit/write after identifying issues.
