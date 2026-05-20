-- CutWise IMS local PostgreSQL schema
-- This file creates the tables required by the web system.

-- Drop existing tables if present so the schema can be recreated cleanly.
drop table if exists report_inventory_snapshots cascade;
drop table if exists report_sales_snapshots cascade;
drop table if exists delivery_redeliveries cascade;
drop table if exists delivery_return_notifications cascade;
drop table if exists delivery_returns cascade;
drop table if exists delivery_pod_pdf cascade;
drop table if exists delivery_pod_attachments cascade;
drop table if exists delivery_pod_records cascade;
drop table if exists delivery_audit_log cascade;
drop table if exists delivery_status_history cascade;
drop table if exists deliveries cascade;
drop table if exists courier_perf_snapshots cascade;
drop table if exists couriers cascade;
drop table if exists failure_reason_codes cascade;
drop table if exists leather_cutting cascade;
drop table if exists sales cascade;
drop table if exists inventory_log cascade;
drop table if exists scrap_sales cascade;
drop table if exists scrap cascade;
drop table if exists inventory cascade;
drop table if exists employees cascade;
drop table if exists suppliers cascade;
drop table if exists branches cascade;

-- SECTION 0: SHARED / COMPANY TABLES

create table if not exists branches (
  id            text primary key,
  name          text not null,
  type          text default 'Branch',
  address       text,
  city          text,
  contact_name  text,
  contact_phone text,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

create table if not exists employees (
  id            text primary key,
  auth_user_id  uuid,
  full_name     text not null,
  email         text unique,
  role          text default 'Staff',
  department    text,
  branch_id     text references branches(id),
  is_active     boolean default true,
  created_at    timestamptz default now()
);

create table if not exists suppliers (
  id            text primary key,
  name          text not null,
  contact       text,
  phone         text,
  email         text,
  address       text,
  city          text,
  category      text,
  status        text default 'Active',
  rating        integer default 3,
  last_order    date,
  notes         text,
  created_at    timestamptz default now()
);

-- SECTION 1: SUBSYSTEM 1 — INVENTORY MANAGEMENT

create table if not exists inventory (
  id            text primary key,
  name          text not null,
  type          text,
  size          text,
  qty           integer default 0,
  remaining     integer default 0,
  price_per_pc  numeric(10,2),
  supplier_id   text references suppliers(id),
  supplier      text,
  date_in       date,
  status        text default 'Available',
  branch_id     text references branches(id),
  notes         text,
  created_by    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists scrap (
  id            text primary key,
  material      text not null,
  batch         text,
  source_inv_id text references inventory(id),
  weight_kg     numeric(8,2),
  price_per_kg  numeric(8,2),
  total_value   numeric(10,2),
  date_added    date,
  status        text default 'Available',
  branch_id     text references branches(id),
  created_by    text,
  created_at    timestamptz default now()
);

create table if not exists scrap_sales (
  id            text primary key,
  scrap_id      text references scrap(id),
  material      text,
  batch         text,
  kg_sold       numeric(8,2),
  price_kg      numeric(8,2),
  total         numeric(10,2),
  buyer         text,
  date          date,
  recorded_by   text,
  created_at    timestamptz default now()
);

create table if not exists inventory_log (
  id            bigserial primary key,
  inventory_id  text references inventory(id),
  action        text not null,
  qty_before    integer,
  qty_changed   integer,
  qty_after     integer,
  reference_id  text,
  reference_type text,
  notes         text,
  performed_by  text,
  performed_at  timestamptz default now()
);

-- SECTION 2: SUBSYSTEM 2 — SALES TRANSACTION & LEATHER CUTTING

create table if not exists sales (
  id                text primary key,
  customer          text not null,
  items             text not null,
  inventory_id      text references inventory(id),
  qty               integer not null,
  size              text,
  price             numeric(10,2),
  date              date,
  cut_used          text,
  remaining_cut     text,
  cut_used_area     numeric(10,2),
  remaining_area    numeric(10,2),
  remaining_to_scrap boolean default false,
  status            text default 'Finalized',
  voided_reason     text,
  branch_id         text references branches(id),
  created_by        text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table if not exists leather_cutting (
  id              bigserial primary key,
  sale_id         text references sales(id),
  inventory_id    text references inventory(id),
  original_size   text not null,
  original_area   numeric(10,2),
  cut_size        text not null,
  cut_area        numeric(10,2),
  remaining_size  text,
  remaining_area  numeric(10,2),
  remaining_pct   numeric(5,2),
  goes_to_scrap   boolean default false,
  scrap_id        text references scrap(id),
  performed_by    text,
  performed_at    timestamptz default now()
);

-- SECTION 3: DELIVERY SYSTEM

create table if not exists failure_reason_codes (
  id                  text primary key,
  category            text not null,
  label               text not null,
  description         text,
  applicable_to       text[],
  triggers_return     boolean default false,
  re_delivery_eligible boolean default true,
  is_active           boolean default true,
  created_at          timestamptz default now()
);

create table if not exists couriers (
  id                  text primary key,
  full_name           text not null,
  mobile              text not null,
  email               text,
  vehicle_type        text,
  license_number      text,
  coverage_area       text,
  availability_status text default 'Available',
  notes               text,
  is_active           boolean default true,
  user_id             uuid,
  branch_id           text references branches(id),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table if not exists courier_perf_snapshots (
  id                bigserial primary key,
  courier_id        text references couriers(id),
  year              integer not null,
  month             integer not null,
  total_assigned    integer default 0,
  total_delivered   integer default 0,
  total_cancelled   integer default 0,
  on_time_count     integer default 0,
  on_time_rate      numeric(5,2),
  avg_delivery_days numeric(5,2),
  computed_at       timestamptz default now(),
  unique (courier_id, year, month)
);

create table if not exists deliveries (
  id                    text primary key,
  sale_transaction_id   text not null references sales(id),
  customer_name         text not null,
  item_description      text not null,
  quantity              integer not null,
  delivery_address      text,
  courier_id            text references couriers(id),
  assigned_courier      text,
  scheduled_date        date,
  actual_delivery_date  date,
  delivery_type         text default 'Outbound',
  remarks               text,
  origin_branch_id      text references branches(id),
  destination_branch_id text references branches(id),
  current_status        text default 'Pending',
  is_active             boolean default true,
  created_by            text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create table if not exists delivery_status_history (
  id                      bigserial primary key,
  delivery_id             text not null references deliveries(id),
  old_status              text,
  new_status              text not null,
  failure_reason_code_id  text references failure_reason_codes(id),
  item_damaged            boolean default false,
  triggers_return         boolean default false,
  remark                  text,
  changed_by              text not null,
  changed_at              timestamptz default now()
);

create or replace rule no_update_dsh as
  on update to delivery_status_history do instead nothing;
create or replace rule no_delete_dsh as
  on delete to delivery_status_history do instead nothing;

create table if not exists delivery_audit_log (
  id            bigserial primary key,
  entity_type   text not null,
  entity_id     text not null,
  action_type   text,
  field_name    text,
  old_value     text,
  new_value     text,
  changed_by    text not null,
  changed_at    timestamptz default now()
);

create table if not exists delivery_pod_records (
  id                bigserial primary key,
  delivery_id       text not null references deliveries(id),
  recipient_name    text not null,
  pod_method        text not null,
  notes             text,
  recorded_by       text not null,
  submitted_at      timestamptz default now(),
  unique (delivery_id)
);

create table if not exists delivery_pod_attachments (
  id              bigserial primary key,
  pod_id          bigint references delivery_pod_records(id),
  attachment_type text not null,
  file_path       text,
  file_size_bytes integer,
  checksum        text,
  uploaded_at     timestamptz default now()
);

create table if not exists delivery_pod_pdf (
  id              bigserial primary key,
  delivery_id     text not null references deliveries(id),
  pod_id          bigint references delivery_pod_records(id),
  file_path       text not null,
  sha256_checksum text,
  generated_at    timestamptz default now(),
  unique (delivery_id)
);

create table if not exists delivery_returns (
  id                    bigserial primary key,
  delivery_id           text not null references deliveries(id),
  failure_reason_code_id text references failure_reason_codes(id),
  status                text default 'Initiated',
  inspection_outcome    text,
  inspection_locked     boolean default false,
  item_damaged          boolean default false,
  sub1_notified         boolean default false,
  sub1_acknowledged     boolean default false,
  initiated_by          text,
  initiated_at          timestamptz default now(),
  inspected_by          text,
  inspected_at          timestamptz,
  notes                 text
);

create table if not exists delivery_return_notifications (
  id              bigserial primary key,
  return_id       bigint references delivery_returns(id),
  notification_type text,
  sent_at         timestamptz default now(),
  acknowledged_at timestamptz,
  acknowledged_by text
);

create table if not exists delivery_redeliveries (
  id                          bigserial primary key,
  original_delivery_id        text not null references deliveries(id),
  return_id                   bigint references delivery_returns(id),
  replacement_sale_txn_id     text references sales(id),
  attempt_number              integer not null default 1,
  priority                    text default 'Normal',
  status                      text default 'Pending',
  courier_id                  text references couriers(id),
  scheduled_date              date,
  actual_delivery_date        date,
  failure_reason_code_id      text references failure_reason_codes(id),
  confirmed_by                text,
  confirmed_at                timestamptz,
  created_at                  timestamptz default now()
);

create table if not exists report_sales_snapshots (
  id                bigserial primary key,
  year              integer not null,
  month             integer not null,
  branch_id         text references branches(id),
  total_transactions integer default 0,
  total_qty_sold    integer default 0,
  total_revenue     numeric(12,2) default 0,
  total_scrap_revenue numeric(10,2) default 0,
  computed_at       timestamptz default now(),
  unique (year, month, branch_id)
);

create table if not exists report_inventory_snapshots (
  id                bigserial primary key,
  year              integer not null,
  month             integer not null,
  inventory_id      text references inventory(id),
  opening_qty       integer,
  closing_qty       integer,
  total_sold        integer,
  total_scrapped    numeric(8,2),
  computed_at       timestamptz default now(),
  unique (year, month, inventory_id)
);
