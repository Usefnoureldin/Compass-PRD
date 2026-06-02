-- Compass features: external_id stable key + extended status enum.
-- Enables CLI sync from external repos (e.g. hostbase-product) without
-- collisions on title/uuid rename. Widens status to match the vocabulary
-- already used in STATE.md narratives (BLOCKED, DEFERRED).

alter table compass.features
  add column if not exists external_id text;

-- Real UNIQUE constraint (not a partial index) so ON CONFLICT (external_id)
-- works from the sync CLI. Postgres allows multiple NULLs in a unique
-- column by default, so existing UI-created features with NULL
-- external_id remain valid.
alter table compass.features
  drop constraint if exists features_external_id_key;

alter table compass.features
  add constraint features_external_id_key unique (external_id);

alter table compass.features
  drop constraint if exists features_status_check;

alter table compass.features
  add constraint features_status_check
  check (status in ('drafting','planned','building','shipped','blocked','deferred'));
