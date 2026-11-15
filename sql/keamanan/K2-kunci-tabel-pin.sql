-- =====================================================================
-- KEAMANAN K2 — Kunci tabel inti dengan PIN admin  (PENTING, tanpa login email)
--
-- Masalah KRITIS saat ini:
--   Tabel orders, products, archives, tagar_batches terbuka untuk publik
--   (policy using (true)). Kunci Supabase (anon key) yang SAMA juga ada di
--   portal pelanggan (pelanggan/config.js), jadi SETIAP pelanggan / pengunjung
--   portal bisa membaca nama + nomor WhatsApp semua pelanggan, mengubah, bahkan
--   menghapus semua pesanan lewat console browser.
--
-- Perbaikan:
--   Tabel inti hanya bisa dibuka bila permintaan membawa PIN admin yang benar
--   (header x-admin-pin, dikirim otomatis oleh dashboard admin setelah PIN
--   dimasukkan sekali di perangkat — js/keamanan.js + config.js).
--   Portal pelanggan TIDAK terpengaruh: portal hanya memakai fungsi RPC
--   "security definer" dan tidak pernah membuka tabel ini secara langsung.
--
-- TIDAK ADA DATA YANG DIHAPUS / DIUBAH. Yang diganti hanya aturan akses.
-- Batalkan kapan saja dengan K2-ROLLBACK.sql.
--
-- SYARAT: K1-pin-admin-anti-bruteforce.sql sudah dijalankan.
--
-- CARA PAKAI (file ini dijalankan 2x, otomatis aman):
--   1. Deploy kode terbaru, buka dashboard admin, masukkan PIN admin di layar
--      "Buka Dashboard". (Ini membuktikan PIN sampai ke server dengan benar.)
--   2. Jalankan SELURUH file ini di Supabase SQL Editor.
--        - Jika muncul pesan "BELUM DIKUNCI ... buka dashboard admin": buka/refresh
--          dashboard admin sekali, lalu jalankan file ini LAGI.
--        - Jika muncul daftar policy "pin_admin_only" = selesai.
--   3. Refresh dashboard admin -> data harus tetap muncul.
--      Buka portal pelanggan -> harus tetap normal.
-- =====================================================================

-- 1) Fungsi pemeriksa PIN dari header
create table if not exists admin_pin_header_seen (
    id boolean primary key default true check (id),
    last_seen_at timestamptz
);
alter table admin_pin_header_seen enable row level security;   -- tanpa policy publik

create or replace function admin_pin_header()
returns text
language sql
stable
as $$
    select coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-admin-pin', '');
$$;

-- dipakai policy: true bila header membawa PIN admin yang benar
create or replace function admin_pin_header_ok()
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare v_pin text := admin_pin_header();
begin
    if v_pin = '' then return false; end if;
    return admin_verify_pin(v_pin);
end;
$$;

-- dipanggil dashboard admin saat dibuka: mencatat bahwa header PIN sampai ke server
create or replace function admin_pin_header_check()
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    if not admin_pin_header_ok() then return false; end if;
    insert into admin_pin_header_seen (id, last_seen_at) values (true, now())
    on conflict (id) do update set last_seen_at = now();
    return true;
end;
$$;

revoke all on function admin_pin_header(), admin_pin_header_ok() from public;
grant execute on function admin_pin_header(), admin_pin_header_ok(), admin_pin_header_check() to anon, authenticated;

-- 2) Kunci tabel (otomatis DIBATALKAN bila dashboard admin belum terbukti mengirim PIN)
do $$
declare
    t text;
    p record;
begin
    if position('pg_sleep' in pg_get_functiondef('admin_verify_pin(text)'::regprocedure)) = 0 then
        raise exception 'Jalankan dulu K1-pin-admin-anti-bruteforce.sql (supaya PIN tidak bisa ditebak lewat tabel). Tidak ada yang diubah.';
    end if;
    if not exists (select 1 from admin_pin_header_seen where last_seen_at > now() - interval '7 days') then
        raise notice 'BELUM DIKUNCI: fungsi sudah dibuat. Sekarang buka/refresh dashboard admin (masukkan PIN bila diminta), lalu jalankan file ini sekali lagi.';
        return;
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
            'create policy pin_admin_only on public.%I for all to anon, authenticated using ((select public.admin_pin_header_ok())) with check ((select public.admin_pin_header_ok()))', t);
        raise notice 'Tabel % sekarang hanya bisa dibuka dari dashboard admin', t;
    end loop;
end $$;

-- 3) Cek hasil
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and tablename in ('orders', 'products', 'archives', 'tagar_batches')
order by tablename;
