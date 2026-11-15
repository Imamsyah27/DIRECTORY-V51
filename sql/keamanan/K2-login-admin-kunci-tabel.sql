-- =====================================================================
-- KEAMANAN K2 — Kunci tabel inti hanya untuk ADMIN yang login  (PENTING)
--
-- Masalah KRITIS saat ini:
--   Tabel orders, products, archives, tagar_batches memakai policy
--   "public_select / public_insert / public_update / public_delete"
--   = using (true). Artinya SIAPA SAJA yang membuka website (anon key
--   ada di config.js, terlihat di browser) bisa MEMBACA semua pesanan +
--   nomor WhatsApp pelanggan, MENGUBAH, bahkan MENGHAPUS SEMUA DATA
--   cukup dengan 1 perintah dari console browser.
--
-- Perbaikan:
--   Policy publik diganti: hanya akun admin (Supabase Auth) yang terdaftar
--   di tabel app_admins yang boleh membaca/menulis tabel tersebut.
--   Portal pelanggan TIDAK terpengaruh, karena portal hanya memakai
--   fungsi RPC "security definer" (bukan akses tabel langsung).
--
-- TIDAK ADA DATA YANG DIHAPUS / DIUBAH. Yang diganti hanya aturan akses.
-- Bisa dibatalkan kapan saja dengan K2-ROLLBACK.sql.
--
-- URUTAN WAJIB (supaya Anda tidak terkunci sendiri):
--   1. Deploy kode terbaru (sudah ada layar login admin: js/admin-auth.js).
--   2. Supabase Dashboard -> Authentication -> Users -> "Add user"
--      -> isi email + password admin -> centang "Auto Confirm User".
--   3. Supabase -> Authentication -> Sign In / Providers -> MATIKAN
--      "Allow new users to sign up" (supaya orang lain tidak bisa daftar).
--   4. Di config.js ubah:  const ADMIN_LOGIN_WAJIB = true;   lalu deploy.
--      Buka dashboard admin -> login dengan email tadi -> pastikan masuk.
--   5. GANTI email di baris "GANTI_EMAIL_ADMIN" di bawah, lalu jalankan
--      SELURUH file ini di Supabase SQL Editor.
-- =====================================================================

-- 1) Daftar admin
create table if not exists app_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    email text,
    created_at timestamptz default now()
);
alter table app_admins enable row level security;   -- tanpa policy: tidak bisa dibaca publik

create or replace function is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (select 1 from app_admins where user_id = auth.uid());
$$;
grant execute on function is_app_admin() to anon, authenticated;

-- 2) Daftarkan akun admin  >>> GANTI EMAIL DI BAWAH <<<
insert into app_admins (user_id, email)
select id, email from auth.users
where lower(email) = lower('GANTI_EMAIL_ADMIN@contoh.com')
on conflict (user_id) do nothing;

-- 3) Ganti policy publik -> khusus admin (dibatalkan otomatis bila belum ada admin)
do $$
declare
    t text;
    p record;
begin
    if not exists (select 1 from app_admins) then
        raise exception 'Belum ada admin terdaftar. Buat user di Authentication lalu ganti GANTI_EMAIL_ADMIN di file ini. (Tidak ada yang diubah.)';
    end if;

    foreach t in array array['orders', 'products', 'archives', 'tagar_batches'] loop
        if to_regclass('public.' || t) is null then
            raise notice 'Tabel % tidak ada, dilewati', t;
            continue;
        end if;
        execute format('alter table public.%I enable row level security', t);
        for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
            execute format('drop policy %I on public.%I', p.policyname, t);
        end loop;
        execute format(
            'create policy admin_only on public.%I for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin())', t);
        raise notice 'Tabel % sekarang khusus admin', t;
    end loop;
end $$;

-- 4) Cek hasil
select tablename, policyname, roles, cmd from pg_policies
where schemaname = 'public' and tablename in ('orders', 'products', 'archives', 'tagar_batches')
order by tablename;
