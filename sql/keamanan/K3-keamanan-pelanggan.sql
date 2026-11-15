-- =====================================================================
-- KEAMANAN K3 — Perkuat akun pelanggan  (OPSIONAL, AMAN, tanpa ubah data)
--
-- 1. Pastikan fungsi lama "lupa password mandiri" (customer_reset_password)
--    TIDAK bisa dipanggil publik. Fungsi itu mereset password hanya dengan
--    username + nomor WhatsApp -> akun bisa diambil alih orang lain.
--    (customer_portal_fixed.sql sudah mencabutnya; ini memastikan saja,
--    berguna bila dulu sempat menjalankan customer_portal.sql versi lama.)
-- 2. Link "lihat sebagai pelanggan" dari admin berlaku 1 jam (sebelumnya 8 jam).
-- 3. Ganti password oleh pelanggan: minimal 8 karakter, tidak boleh sama
--    dengan password lama atau username.
--
-- Tidak menghapus / mengubah data, akun, atau password yang sudah ada.
-- Aman dijalankan berulang kali.
-- =====================================================================

-- 1) cabut akses fungsi reset mandiri (jika fungsinya ada)
do $$
begin
    if to_regprocedure('public.customer_reset_password(text, text, text)') is not null then
        revoke execute on function public.customer_reset_password(text, text, text) from public, anon, authenticated;
        raise notice 'customer_reset_password: akses publik dicabut';
    else
        raise notice 'customer_reset_password: tidak ada (aman)';
    end if;
end $$;

-- 2) token "lihat sebagai pelanggan" 1 jam
do $$
begin
    if to_regclass('public.admin_view_tokens') is null then
        raise notice 'admin_view_tokens belum ada (admin-view.sql belum dijalankan), bagian 2 dilewati';
        return;
    end if;
    execute $f$
    create or replace function admin_view_open(p_pin text, p_customer_id bigint)
    returns uuid language plpgsql security definer set search_path = public, extensions as $b$
    declare v_token uuid;
    begin
        if not admin_verify_pin(p_pin) then raise exception 'PIN admin salah'; end if;
        if not exists (select 1 from customer_accounts where id = p_customer_id) then raise exception 'Akun pelanggan tidak ditemukan'; end if;
        delete from admin_view_tokens where expires_at < now();
        insert into admin_view_tokens (customer_id, expires_at) values (p_customer_id, now() + interval '1 hour')
        returning token into v_token;
        return v_token;
    end; $b$;
    $f$;
    -- token yang masih berlaku lebih dari 1 jam dipendekkan
    update admin_view_tokens set expires_at = now() + interval '1 hour' where expires_at > now() + interval '1 hour';
    raise notice 'admin_view_open: token berlaku 1 jam';
end $$;

-- 3) ganti password pelanggan lebih ketat
create or replace function customer_change_password(p_session_token uuid, p_old_password text, p_new_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_acc customer_accounts%rowtype;
begin
    select * into v_acc from customer_accounts
        where session_token = p_session_token and session_expires_at > now();

    if not found then
        raise exception 'Sesi login tidak valid atau sudah habis, silakan login ulang';
    end if;

    if v_acc.password_hash <> crypt(coalesce(p_old_password, ''), v_acc.password_hash) then
        perform pg_sleep(0.5);
        raise exception 'Password lama salah';
    end if;

    if p_new_password is null or length(p_new_password) < 8 then
        raise exception 'Password baru minimal 8 karakter';
    end if;

    if p_new_password = p_old_password or lower(p_new_password) = lower(v_acc.username) then
        raise exception 'Password baru tidak boleh sama dengan password lama atau username';
    end if;

    update customer_accounts
        set password_hash = crypt(p_new_password, gen_salt('bf'))
        where id = v_acc.id;
end;
$$;
grant execute on function customer_change_password(uuid, text, text) to anon, authenticated;
