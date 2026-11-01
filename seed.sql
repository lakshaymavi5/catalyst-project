-- ==============================================================================
-- POSTGRESQL PRODUCTION SEED SCRIPT
-- Device Repair Assistant
-- Run: psql -U postgres -d device_repair -f seed.sql
-- ==============================================================================

-- 1. Seed Demo User (Password: Password@123)
-- bcrypt hash with cost factor 10
INSERT INTO users (id, email, phone, password_hash, full_name, created_at)
VALUES (
    'usr_demo_001',
    'demo@repairassist.in',
    '9876543210',
    '$2a$10$wE9K2j3wW9zM7FzP2xJ0Ae5vF0rA0u0qH7K2j3wW9zM7FzP2xJ0Ae',
    'Aditi Sharma',
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- 2. Seed Service Centres
INSERT INTO service_centres (id, name, address, city, state, pin_code, phone, email, operating_hours, rating)
VALUES
('sc_blr_01', 'Indiranagar Central Service Hub', '1204 100ft Road, HAL 2nd Stage, Indiranagar', 'Bengaluru', 'Karnataka', '560038', '+91 80 4932 7700', 'indiranagar@repairassist.in', '09:30 AM to 07:00 PM (Monday to Saturday)', 4.9),
('sc_blr_02', 'MG Road Flagship Electronics Lab', '84/1 Mahatma Gandhi Road, Shivaji Nagar', 'Bengaluru', 'Karnataka', '560001', '+91 80 4123 4567', 'mgroad@repairassist.in', '09:00 AM to 06:30 PM (Monday to Saturday)', 4.8),
('sc_mum_01', 'Fort Authorised Diagnostics Hub', '45 Nariman Point, Express Towers Ground Floor', 'Mumbai', 'Maharashtra', '400021', '+91 22 6789 0123', 'fort@repairassist.in', '10:00 AM to 07:00 PM (Monday to Saturday)', 4.8),
('sc_del_01', 'Connaught Place Service Pavilion', 'Block B, Radial Road 3, Connaught Place', 'New Delhi', 'Delhi', '110001', '+91 11 4567 8901', 'cp@repairassist.in', '10:00 AM to 06:30 PM (Monday to Saturday)', 4.7),
('sc_hyd_01', 'Hitec City Device Repair Lab', 'Cyber Towers Level 2, Madhapur', 'Hyderabad', 'Telangana', '500081', '+91 40 6655 4433', 'hiteccity@repairassist.in', '09:30 AM to 07:00 PM (Monday to Saturday)', 4.9),
('sc_chn_01', 'Anna Salai Authorised Service Center', '18 Mount Road, Thousand Lights', 'Chennai', 'Tamil Nadu', '600002', '+91 44 2855 1234', 'annasalai@repairassist.in', '09:30 AM to 06:30 PM (Monday to Saturday)', 4.8),
('sc_pun_01', 'Shivajinagar Hardware Workshop', 'Fergusson College Road, Shivajinagar', 'Pune', 'Maharashtra', '411005', '+91 20 2567 8900', 'pune@repairassist.in', '10:00 AM to 07:00 PM (Monday to Saturday)', 4.8)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Serviceable PIN Codes
INSERT INTO serviceable_pins (pin_code, city, state, service_centre_id, is_active)
VALUES
('560038', 'Bengaluru', 'Karnataka', 'sc_blr_01', TRUE),
('560001', 'Bengaluru', 'Karnataka', 'sc_blr_02', TRUE),
('560025', 'Bengaluru', 'Karnataka', 'sc_blr_02', TRUE),
('560034', 'Bengaluru', 'Karnataka', 'sc_blr_01', TRUE),
('560076', 'Bengaluru', 'Karnataka', 'sc_blr_01', TRUE),
('560100', 'Bengaluru', 'Karnataka', 'sc_blr_01', TRUE),
('400021', 'Mumbai', 'Maharashtra', 'sc_mum_01', TRUE),
('400001', 'Mumbai', 'Maharashtra', 'sc_mum_01', TRUE),
('400050', 'Mumbai', 'Maharashtra', 'sc_mum_01', TRUE),
('110001', 'New Delhi', 'Delhi', 'sc_del_01', TRUE),
('110016', 'New Delhi', 'Delhi', 'sc_del_01', TRUE),
('110020', 'New Delhi', 'Delhi', 'sc_del_01', TRUE),
('500081', 'Hyderabad', 'Telangana', 'sc_hyd_01', TRUE),
('500032', 'Hyderabad', 'Telangana', 'sc_hyd_01', TRUE),
('600002', 'Chennai', 'Tamil Nadu', 'sc_chn_01', TRUE),
('600001', 'Chennai', 'Tamil Nadu', 'sc_chn_01', TRUE),
('411005', 'Pune', 'Maharashtra', 'sc_pun_01', TRUE),
('411001', 'Pune', 'Maharashtra', 'sc_pun_01', TRUE)
ON CONFLICT (pin_code) DO NOTHING;

-- 4. Seed Repair Estimates Matrix
INSERT INTO repair_estimates (id, device_type, brand, fault_type, fault_label, original_part_cost, labour_cost, turnaround_days, cheaper_alt_name, cheaper_alt_cost, cheaper_alt_tradeoff)
VALUES
('est_app_screen', 'smartphone', 'Apple', 'screen_crack', 'Display Glass & OLED Fracture', 16500.00, 1400.00, 2, 'OEM-Grade Tier-1 OLED Panel', 9800.00, 'Retains high color gamut and touch response, but lacks factory True Tone sensor calibration, saving ₹6,700.'),
('est_app_battery', 'smartphone', 'Apple', 'battery_degrade', 'Battery Degradation & Capacity Loss', 6200.00, 800.00, 1, 'Certified High-Density Cobalt Cell', 3400.00, 'Delivers full cycle runtime, but displays an unverified part status in iOS settings, saving ₹2,800.'),
('est_app_liquid', 'smartphone', 'Apple', 'liquid_damage', 'Liquid Intrusion & Motherboard Corrosion', 26000.00, 2800.00, 4, 'Component-Level Micro-Soldering Rework', 12500.00, 'Ultrasonically cleans and replaces shorted trace capacitors rather than swapping the whole logic board. Bench testing requires 2 extra days, saving ₹13,500.'),
('est_app_port', 'smartphone', 'Apple', 'charging_port', 'Charging Port & Lightning/USB-C Pins Damaged', 4200.00, 900.00, 1, 'Flex Cable Pin Reconditioning', 2100.00, 'Reconditions contact pins and micro-flex connector without full chassis teardown, saving ₹2,100.'),
('est_app_camera', 'smartphone', 'Apple', 'camera_fault', 'Rear Camera Sensor / Optical Glass Fracture', 8900.00, 1200.00, 2, 'Sapphire Crystal Lens Replacement', 3900.00, 'Preserves the authentic internal optical sensor and only replaces fractured outer sapphire glass, saving ₹5,000.'),

('est_sam_screen', 'smartphone', 'Samsung', 'screen_crack', 'Dynamic AMOLED 2X Panel Fracture', 14200.00, 1200.00, 2, 'Refurbished Factory Service Pack', 8600.00, 'Genuine Samsung glass re-laminated onto original OLED matrix; retains 120Hz refresh rate with minor bezel variance, saving ₹5,600.'),
('est_sam_battery', 'smartphone', 'Samsung', 'battery_degrade', 'Battery Degradation & Rapid Drain', 4900.00, 800.00, 1, 'OEM Compatible Polymer Cell', 2700.00, 'Compliant with fast charging standards, lacks Samsung Care serial log registration, saving ₹2,200.'),
('est_sam_liquid', 'smartphone', 'Samsung', 'liquid_damage', 'Liquid Corrosion & Bootloop Failure', 22000.00, 2500.00, 3, 'Power IC Reballing & Trace Cleaning', 10800.00, 'Reseats main power IC and cleans galvanic corrosion; takes 1 additional diagnostic day, saving ₹11,200.'),

('est_lap_screen', 'laptop', 'Apple', 'screen_crack', 'Liquid Retina Display Assembly Fracture', 28500.00, 2200.00, 3, 'LCD Matrix Rework (Chassis Preserved)', 16500.00, 'Replaces damaged internal LCD panel inside the original aluminum clamshell lid rather than swapping the whole top case, saving ₹12,000.'),
('est_lap_battery', 'laptop', 'Apple', 'battery_degrade', 'Battery Cycle Exceeded / Service Recommended', 12500.00, 1500.00, 1, 'Certified High-Yield Lithium Pouch Pack', 6800.00, 'Individual cells replaced with OEM-spec pouches without replacing entire palmrest and keyboard assembly, saving ₹5,700.'),
('est_lap_liquid', 'laptop', 'Apple', 'liquid_damage', 'Liquid Spill & Logic Board Short Circuit', 48000.00, 3500.00, 5, 'Ultrasonic Bath & Power Stage Micro-repair', 19500.00, 'Restores motherboard power rails and shorted MOSFETs without replacing soldered processor and memory, saving ₹28,500.')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Replacement Options
INSERT INTO replacement_options (id, device_type, name, condition, price, key_difference, best_for, suitability_criteria)
VALUES
('rep_phone_01', 'smartphone', 'Apple iPhone 14 (128GB)', 'Authorised Refurbished - Grade A', 42999.00, 'A15 Bionic performance, guaranteed 95%+ battery health, fully tested 32-point inspection, 12-month domestic warranty.', 'Sensible daily value when repair exceeds 50% of device worth.', 'budget_under_50000'),
('rep_phone_02', 'smartphone', 'Apple iPhone 15 (128GB)', 'Open Box - Like New', 58999.00, 'Dynamic Island, 48MP primary sensor, USB-C unified charging, balance of original manufacturer warranty included.', 'Modern upgrade without paying full retail shelf price.', 'modern_replacement'),
('rep_phone_03', 'smartphone', 'Samsung Galaxy S23 5G (256GB)', 'Brand New - Sealed Box', 64999.00, 'Snapdragon 8 Gen 2 Mobile Platform, 120Hz Dynamic AMOLED 2X, 3x optical telephoto lens, full 1-year brand warranty.', 'Customers preferring a fresh flagship with maximum longevity.', 'premium_longevity'),

('rep_lap_01', 'laptop', 'Apple MacBook Air M1 (256GB SSD, 8GB RAM)', 'Authorised Refurbished - Grade A', 54999.00, 'Whisper-quiet fanless thermal design, 18-hour battery longevity, 12-month domestic warranty.', 'Practical everyday computing if motherboard repair is uneconomical.', 'budget_under_60000'),
('rep_lap_02', 'laptop', 'Apple MacBook Air M2 (256GB SSD, 8GB RAM)', 'Open Box - Like New', 78999.00, 'MagSafe 3 fast charging, 1080p FaceTime HD camera, Liquid Retina display, balance of AppleCare.', 'Modern performance upgrade for creative and professional workloads.', 'modern_replacement'),
('rep_lap_03', 'laptop', 'Lenovo ThinkPad T14 Gen 3 (512GB, 16GB RAM)', 'Brand New - Sealed', 84500.00, 'Mil-SPEC 810H durability, modular RAM slots, dual Thunderbolt 4 ports, 3-year onsite premier support.', 'Enterprise resilience with heavy typing and multitasking.', 'premium_longevity')
ON CONFLICT (id) DO NOTHING;
