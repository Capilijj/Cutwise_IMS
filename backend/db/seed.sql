-- CutWise IMS sample seed data for local Docker Postgres

insert into branches (id, name, type, address, city) values
  ('BR-001', 'Main Office – Antipolo', 'Main Office', 'Antipolo, Rizal', 'Antipolo'),
  ('BR-002', 'Philippine Hernational Footwear Center', 'Warehouse', 'Marikina City', 'Marikina'),
  ('BR-003', 'OTTO Shoes – SM Marikina', 'Branch', 'SM Marikina', 'Marikina'),
  ('BR-004', 'OTTO Shoes – SM Fairview', 'Branch', 'SM Fairview, QC', 'Quezon City'),
  ('BR-005', 'OTTO Shoes – SM Manila', 'Branch', 'SM Manila', 'Manila')
on conflict (id) do nothing;

insert into suppliers (id, name, contact, phone, email, address, category, status, rating) values
  ('SUP-001', 'Marikina Tannery Corp.', 'Rodel Santos', '0917-123-4567', 'rodel@marikina-tan.ph', '88 Tanner St, Marikina', 'Raw Leather', 'Active', 5),
  ('SUP-002', 'LGS Leather Philippines', 'Liza Gomez', '0918-234-5678', 'liza@lgsleather.com.ph', '12 Leather Ave, Marikina', 'Bovine Leather', 'Active', 4),
  ('SUP-003', 'Euro Hides Manila', 'Marco del Rosario', '0919-345-6789', 'mdr@eurohides.ph', '34 Import Blvd, Pasay', 'Premium Hides', 'Active', 5),
  ('SUP-004', 'SynFab Traders Inc.', 'Aries Cruz', '0920-456-7890', 'aries@synfab.ph', '67 Industrial Rd, Caloocan', 'Synthetic', 'Active', 3),
  ('SUP-005', 'Bataan Tanning Corp.', 'Nelia Reyes', '0921-567-8901', 'nelia@bataan-tan.ph', 'Bataan Export Zone', 'Raw Leather', 'Inactive', 3)
on conflict (id) do nothing;

insert into inventory (id, name, type, size, qty, remaining, price_per_pc, supplier_id, supplier, date_in, status, branch_id) values
  ('INV-001', 'Full Grain Cowhide', 'Cowhide', '24×36 in', 48, 38, 120.00, 'SUP-001', 'Marikina Tannery Corp.', '2026-04-10', 'Available', 'BR-001'),
  ('INV-002', 'Top Grain Leather', 'Bovine', '20×30 in', 30, 7, 95.00, 'SUP-002', 'LGS Leather Philippines', '2026-04-12', 'Low Stock', 'BR-001'),
  ('INV-003', 'Italian Goatskin', 'Goatskin', '18×24 in', 20, 20, 210.00, 'SUP-003', 'Euro Hides Manila', '2026-04-15', 'Available', 'BR-001'),
  ('INV-004', 'Suede Leather', 'Suede', '22×28 in', 35, 14, 80.00, 'SUP-001', 'Marikina Tannery Corp.', '2026-04-18', 'Available', 'BR-001'),
  ('INV-005', 'Nappa Leather', 'Lambskin', '16×22 in', 15, 4, 180.00, 'SUP-003', 'Euro Hides Manila', '2026-04-20', 'Low Stock', 'BR-001'),
  ('INV-006', 'Patent Leather', 'Synthetic', '24×36 in', 25, 25, 65.00, 'SUP-004', 'SynFab Traders Inc.', '2026-04-22', 'Available', 'BR-001'),
  ('INV-007', 'PU Leather', 'Synthetic', '30×40 in', 40, 0, 45.00, 'SUP-004', 'SynFab Traders Inc.', '2026-03-30', 'Out of Stock', 'BR-001'),
  ('INV-008', 'Crocodile Embossed', 'Embossed', '18×24 in', 12, 9, 350.00, 'SUP-003', 'Euro Hides Manila', '2026-04-25', 'Available', 'BR-001')
on conflict (id) do nothing;

insert into sales (id, customer, items, inventory_id, qty, size, price, date, cut_used, remaining_cut, status, branch_id) values
  ('SO-2026-041', 'Marikina Shoe Co.', 'Full Grain Cowhide', 'INV-001', 10, '24×36 in', 1200.00, '2026-04-28', '18×30 in', '6×36 in', 'Finalized', 'BR-001'),
  ('SO-2026-045', 'LCF Footwear', 'Top Grain Leather', 'INV-002', 5, '20×30 in', 475.00, '2026-04-29', '20×20 in', '20×10 in', 'Finalized', 'BR-001'),
  ('SO-2026-048', 'Prime Soles Inc.', 'Suede Leather', 'INV-004', 8, '22×28 in', 640.00, '2026-04-30', '20×25 in', '2×28 in', 'Finalized', 'BR-001'),
  ('SO-2026-051', 'Artisano Workshop', 'Italian Goatskin', 'INV-003', 3, '18×24 in', 630.00, '2026-05-01', '16×22 in', '2×24 in', 'Finalized', 'BR-001'),
  ('SO-2026-053', 'Sole Republic', 'Nappa Leather', 'INV-005', 6, '16×22 in', 1080.00, '2026-05-01', '14×20 in', '2×22 in', 'Finalized', 'BR-001'),
  ('SO-2026-060', 'Nueva Forma', 'Patent Leather', 'INV-006', 4, '24×36 in', 260.00, '2026-05-04', null, null, 'Draft', 'BR-001')
on conflict (id) do nothing;

insert into failure_reason_codes (id, category, label, description, applicable_to, triggers_return, re_delivery_eligible) values
  ('FRC-001', 'Delivery Failure', 'Address Not Found', 'Courier could not locate the delivery address', array['cancellation'], false, true),
  ('FRC-002', 'Delivery Failure', 'Customer Not Available', 'Customer was not present to receive the delivery', array['cancellation'], false, true),
  ('FRC-003', 'Delivery Failure', 'Vehicle Breakdown', 'Courier vehicle broke down during delivery', array['cancellation'], false, true),
  ('FRC-004', 'Delivery Failure', 'Weather Condition', 'Severe weather prevented delivery', array['cancellation'], false, true),
  ('FRC-005', 'Delivery Failure', 'Refused by Customer', 'Customer refused to accept the delivery', array['cancellation'], false, false),
  ('FRC-010', 'Item Condition', 'Item Damaged in Transit', 'Item was damaged while being transported', array['return','cancellation'], true, true),
  ('FRC-011', 'Item Condition', 'Wrong Item Delivered', 'Incorrect item was sent to customer', array['return'], true, true),
  ('FRC-012', 'Item Condition', 'Incomplete Order', 'Only part of the order was delivered', array['return'], false, true),
  ('FRC-013', 'Item Condition', 'Item Defective', 'Item had a manufacturing defect', array['return'], true, true),
  ('FRC-014', 'Item Condition', 'Contaminated Item', 'Item was contaminated or soiled', array['return'], true, false),
  ('FRC-020', 'Customer Initiated', 'Customer Changed Mind', 'Customer no longer wants the item', array['return'], false, false),
  ('FRC-021', 'Customer Initiated', 'Duplicate Order', 'Customer accidentally placed a duplicate order', array['return','cancellation'], false, false),
  ('FRC-033', 'Other', 'Other', 'Reason not listed above — notes required (min 10 chars)', array['cancellation','return'], false, true)
on conflict (id) do nothing;

insert into couriers (id, full_name, mobile, vehicle_type, coverage_area, availability_status, is_active, branch_id) values
  ('COU-001', 'Juan dela Cruz', '0917-001-0001', 'Motorcycle', 'Marikina, Pasig', 'Available', true, 'BR-001'),
  ('COU-002', 'Pedro Santos', '0917-001-0002', 'Van', 'Metro Manila', 'Available', true, 'BR-001'),
  ('COU-003', 'Maria Reyes', '0917-001-0003', 'Motorcycle', 'Quezon City, Caloocan', 'On Delivery', true, 'BR-001'),
  ('COU-004', 'Jose Villanueva', '0917-001-0004', 'Motorcycle', 'Manila, Taguig', 'Off Duty', true, 'BR-001')
on conflict (id) do nothing;
