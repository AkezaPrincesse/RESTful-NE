-- Seed data for FEMS
-- Admin password: Admin@123 (bcrypt hash)
-- Inspector password: Inspector@123
-- User password: User@123

INSERT INTO users (id, first_name, last_name, email, password_hash, role, phone, department) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'System',
    'Admin',
    'admin@twzltd.com',
    '$2b$10$rQnKq0B2H6lNR9IwQGdCOOyVGF9X0YqUelXkx5PqwHQX5Wj0tCiHu',
    'admin',
    '+250788000001',
    'IT Administration'
),
(
    '22222222-2222-2222-2222-222222222222',
    'John',
    'Inspector',
    'inspector@twzltd.com',
    '$2b$10$k6A5mJE7CXt9ZPi2hLM8H.DKWr0oKQd3rJGO8Q4z7K5wMjD2wfZMi',
    'inspector',
    '+250788000002',
    'Safety & Compliance'
),
(
    '33333333-3333-3333-3333-333333333333',
    'Alice',
    'Viewer',
    'user@twzltd.com',
    '$2b$10$N0oLm5pUL3gB8KqJzWrj4OY3YNBg6sJj5cGKkKj7sXYsZPH5Ldngu',
    'user',
    '+250788000003',
    'Facilities'
);

-- Sample extinguishers
INSERT INTO extinguishers (serial_number, location, type, size, installation_date, expiry_date, status, next_inspection_date, registered_by) VALUES
('EXT-001-2024', 'Building A - Floor 1 - Lobby', 'CO2', '5 lbs', '2024-01-15', '2026-01-15', 'Active', '2026-06-15', '11111111-1111-1111-1111-111111111111'),
('EXT-002-2024', 'Building A - Floor 2 - Server Room', 'CO2', '9 lbs', '2024-02-20', '2026-02-20', 'Active', '2026-06-20', '11111111-1111-1111-1111-111111111111'),
('EXT-003-2024', 'Building B - Kitchen', 'Foam', '9 lbs', '2024-03-10', '2026-03-10', 'Active', '2026-07-10', '11111111-1111-1111-1111-111111111111'),
('EXT-004-2023', 'Warehouse - Section A', 'Dry Chemical', '12 lbs', '2023-06-01', '2025-06-01', 'Expired', '2025-12-01', '11111111-1111-1111-1111-111111111111'),
('EXT-005-2024', 'Parking Garage - Level 1', 'Water', '2.5 lbs', '2024-04-05', '2026-04-05', 'Active', '2026-07-05', '11111111-1111-1111-1111-111111111111'),
('EXT-006-2024', 'Building C - Conference Room', 'Dry Chemical', '5 lbs', '2024-05-15', '2026-05-15', 'Under Maintenance', '2026-08-15', '11111111-1111-1111-1111-111111111111'),
('EXT-007-2024', 'Building A - Floor 3 - Office', 'CO2', '5 lbs', '2024-01-20', '2026-01-20', 'Active', '2026-06-20', '11111111-1111-1111-1111-111111111111'),
('EXT-008-2024', 'Main Gate - Security Post', 'Water', '5 lbs', '2024-06-01', '2026-06-01', 'Active', '2026-09-01', '11111111-1111-1111-1111-111111111111');

-- Sample inspections
INSERT INTO inspections (extinguisher_id, scheduled_by, assigned_inspector, scheduled_date, inspection_type, status, priority) VALUES
((SELECT id FROM extinguishers WHERE serial_number='EXT-001-2024'), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '2026-06-15 09:00:00', 'routine', 'scheduled', 'normal'),
((SELECT id FROM extinguishers WHERE serial_number='EXT-004-2023'), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '2026-06-10 10:00:00', 'emergency', 'overdue', 'urgent'),
((SELECT id FROM extinguishers WHERE serial_number='EXT-002-2024'), '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-06-20 14:00:00', 'annual', 'scheduled', 'high');

-- Sample maintenance logs
INSERT INTO maintenance_logs (extinguisher_id, performed_by, action_taken, action_date, conditions_noted, pressure_reading, seal_intact, pin_intact, label_readable, result) VALUES
((SELECT id FROM extinguishers WHERE serial_number='EXT-001-2024'), '22222222-2222-2222-2222-222222222222', 'Full inspection and pressure test. Replaced seal and safety pin.', '2025-06-15', 'Good condition. Slight pressure drop noted but within acceptable range.', 185.5, true, true, true, 'pass'),
((SELECT id FROM extinguishers WHERE serial_number='EXT-003-2024'), '22222222-2222-2222-2222-222222222222', 'Routine monthly inspection. Cleaned exterior and checked nozzle.', '2026-05-10', 'Excellent condition. All components functional.', 195.0, true, true, true, 'pass'),
((SELECT id FROM extinguishers WHERE serial_number='EXT-004-2023'), '22222222-2222-2222-2222-222222222222', 'Expiry assessment. Unit flagged for replacement.', '2025-10-01', 'Expired unit. Pressure critically low. Label partially damaged.', 45.0, false, true, false, 'fail');
