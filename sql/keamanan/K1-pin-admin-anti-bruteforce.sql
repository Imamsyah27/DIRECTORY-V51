-- =====================================================================
-- KEAMANAN K1 — PIN admin anti brute-force  (OPSIONAL, AMAN)
--
-- Masalah: fungsi admin_verify_pin() bisa dipanggil siapa saja (anon key
-- ada di browser) tanpa batas percobaan. PIN 6 digit = hanya 1 juta
-- kombinasi -> bisa ditebak otomatis.
--
-- Perbaikan:
--   * Setiap PIN SALAH ditahan ~0,8 detik dan diantrikan satu per satu
--     (advisory lock), jadi penebak otomatis maksimal ±1 tebakan/detik
--     dari seluruh dunia. PIN BENAR tidak diperlambat.
--   * PIN baru wajib minimal 8 karakter dan tidak boleh PIN default.
--
-- TIDAK menyentuh data apa pun. Hanya mengganti isi 2 fungsi.
-- Hash PIN yang tersimpan tetap sama -> PIN Anda sekarang tetap berlaku.
-- Aman dijalankan berulang kali.
-- =====================================================================

create extension if not exists pgcrypto;

create or replace function admin_verify_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_hash text;
begin
    select admin_pin_hash into v_hash from app_admin_settings where id = true;
    if v_hash is not null and v_hash = crypt(coalesce(p_pin, ''), v_hash) then
        return true;
    end if;
    -- salah: antrekan & tahan supaya tidak bisa ditebak massal
    perform pg_advisory_xact_lock(hashtext('admin_verify_pin_fail'));
    perform pg_sleep(0.8);
    return false;
end;
$$;

create or replace function admin_change_pin(p_old_pin text, p_new_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    if not admin_verify_pin(p_old_pin) then
        return false;
    end if;
    if p_new_pin is null or length(p_new_pin) < 8 then
        raise exception 'PIN baru minimal 8 karakter';
    end if;
    if p_new_pin in ('123456', '12345678', '00000000', '11111111', '87654321', 'password') then
        raise exception 'PIN baru terlalu mudah ditebak';
    end if;
    update app_admin_settings set admin_pin_hash = crypt(p_new_pin, gen_salt('bf')) where id = true;
    return true;
end;
$$;

grant execute on function admin_verify_pin(text), admin_change_pin(text, text) to anon, authenticated;
