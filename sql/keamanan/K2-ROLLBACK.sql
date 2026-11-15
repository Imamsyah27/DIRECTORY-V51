-- =====================================================================
-- BATALKAN K2 — kembalikan akses tabel inti seperti semula (publik).
-- Pakai HANYA jika setelah K2 dashboard admin tidak bisa memuat data
-- dan Anda belum sempat memperbaiki login admin.
-- Tidak ada data yang dihapus.
-- =====================================================================
do $$
declare t text; p record;
begin
    foreach t in array array['orders', 'products', 'archives', 'tagar_batches'] loop
        if to_regclass('public.' || t) is null then continue; end if;
        for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
            execute format('drop policy %I on public.%I', p.policyname, t);
        end loop;
        execute format('create policy public_select on public.%I for select using (true)', t);
        execute format('create policy public_insert on public.%I for insert with check (true)', t);
        execute format('create policy public_update on public.%I for update using (true)', t);
        execute format('create policy public_delete on public.%I for delete using (true)', t);
    end loop;
end $$;
