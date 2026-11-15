-- =====================================================================
-- KOIN — BAGIAN 25: CARI TAGAR PESANAN BOT (Order -> 🔎 Cari Tagar)
-- Jalankan SETELAH koin-usdt-23-bot-batch.sql. Aman diulang.
-- Admin memasukkan beberapa tagar -> sistem mencari semua pesanan Bot / Bulk yang memuat tagar itu:
-- siapa pemesannya, paket, status, dan batch-nya. Pencocokan tidak membedakan huruf besar/kecil dan tanda #.
-- =====================================================================
create or replace function bot_find_tags(p_pin text, p_tags text[])
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_norm text[]; v_size integer;
begin
    if not admin_verify_pin(p_pin) then raise exception 'PIN admin salah'; end if;
    select coalesce(array_agg(distinct lower(replace(trim(t), '#', ''))), '{}'::text[]) into v_norm
      from unnest(coalesce(p_tags, '{}'::text[])) as t where replace(trim(t), '#', '') <> '';
    if cardinality(v_norm) = 0 then return '[]'::jsonb; end if;
    if cardinality(v_norm) > 300 then raise exception 'Maksimal 300 tagar sekali cari'; end if;
    select batch_size into v_size from bot_batch_settings where id = 1;
    return coalesce((
        select jsonb_agg(jsonb_build_object(
                   'norm', x.norm, 'tagar', x.tagar, 'order_id', o.id, 'username', o.username, 'dashboard', x.dash, 'bulk', o.dashboard = 'BULK',
                   'status', o.status, 'dikirim', o.dikirim_at is not null, 'arsip', o.arsip, 'created_at', o.created_at, 'processed_at', o.processed_at,
                   'batch', q.batch, 'q_sent', q.sent_at is not null, 'whatsapp', ca.whatsapp) order by x.norm, o.created_at desc)
          from bot_orders o
          join customer_accounts ca on ca.id = o.customer_id
          cross join lateral (
              select lower(replace(trim(t.tag), '#', '')) as norm, t.tag as tagar, o.dashboard as dash from unnest(o.tagar_list) as t(tag) where o.dashboard <> 'BULK'
              union all select lower(replace(trim(t.tag), '#', '')), t.tag, 'BEM' from unnest(coalesce(o.tagar_bem, '{}'::text[])) as t(tag) where o.dashboard = 'BULK'
              union all select lower(replace(trim(t.tag), '#', '')), t.tag, 'SEM' from unnest(coalesce(o.tagar_sem, '{}'::text[])) as t(tag) where o.dashboard = 'BULK'
              union all select lower(replace(trim(t.tag), '#', '')), t.tag, 'LEM' from unnest(coalesce(o.tagar_lem, '{}'::text[])) as t(tag) where o.dashboard = 'BULK'
          ) x
          left join (select r.order_id, r.dashboard, lower(replace(trim(r.tagar), '#', '')) as norm, r.sent_at, ((r.rn - 1) / v_size) + 1 as batch
                       from (select q0.order_id, q0.dashboard, q0.tagar, q0.sent_at, row_number() over (partition by q0.dashboard order by q0.id) as rn
                               from bot_queue q0 join bot_orders o0 on o0.id = q0.order_id and not o0.arsip) r) q
                 on q.order_id = o.id and q.dashboard = x.dash and q.norm = x.norm
         where x.norm = any(v_norm)), '[]'::jsonb);
end; $$;

grant execute on function bot_find_tags(text, text[]) to anon, authenticated;
