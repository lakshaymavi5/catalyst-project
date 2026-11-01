-- ==============================================================================
-- DATABASE SCHEMA: Device Repair Assistant
-- PostgreSQL 14+ Compatible DDL
-- Includes explicit indexing for all WHERE, JOIN, and ORDER BY columns.
-- ==============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer', -- 'customer' or 'repairman'
    shop_name VARCHAR(255),
    shop_address TEXT,
    shop_city VARCHAR(100),
    shop_pin VARCHAR(10),
    shop_phone VARCHAR(25),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Rationale: Instant O(1) user identification during login and authentication.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- Index Rationale: Lookup for OTP / phone-based authentication pathways.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
-- Index Rationale: Fast filtering by account role (customer vs repairman)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);


-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Rationale: Rapid JOIN between active sessions and user profiles.
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
-- Index Rationale: High-frequency WHERE filter for cron jobs pruning expired sessions.
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);


-- 3. Authorised Service Centres Table
CREATE TABLE IF NOT EXISTS service_centres (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pin_code VARCHAR(10) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    email VARCHAR(100),
    operating_hours VARCHAR(100) NOT NULL,
    rating NUMERIC(2,1) DEFAULT 4.8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Rationale: Direct WHERE lookup mapping customer's PIN code to local facility.
CREATE INDEX IF NOT EXISTS idx_service_centres_pin_code ON service_centres(pin_code);
-- Index Rationale: Fallback regional query WHERE city = ? when precise PIN has no direct center.
CREATE INDEX IF NOT EXISTS idx_service_centres_city ON service_centres(city);


-- 4. Serviceable Pin Codes Table
CREATE TABLE IF NOT EXISTS serviceable_pins (
    pin_code VARCHAR(10) PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    service_centre_id VARCHAR(36) NOT NULL REFERENCES service_centres(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Rationale: Sub-millisecond validation WHERE pin_code = ? AND is_active = TRUE.
CREATE INDEX IF NOT EXISTS idx_serviceable_pins_code ON serviceable_pins(pin_code);
-- Index Rationale: JOIN operations linking pin codes to specific service hubs.
CREATE INDEX IF NOT EXISTS idx_serviceable_pins_centre_id ON serviceable_pins(service_centre_id);


-- 5. Device Catalog
CREATE TABLE IF NOT EXISTS device_catalog (
    id VARCHAR(36) PRIMARY KEY,
    device_type VARCHAR(50) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    model_name VARCHAR(150) NOT NULL,
    model_number VARCHAR(50) NOT NULL,
    release_year INT NOT NULL,
    base_market_value NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Rationale: Filtered dropdown queries WHERE brand = ? AND device_type = ?.
CREATE INDEX IF NOT EXISTS idx_device_catalog_brand_type ON device_catalog(brand, device_type);
-- Index Rationale: Strict model number verification WHERE model_number = ?.
CREATE INDEX IF NOT EXISTS idx_device_catalog_model_number ON device_catalog(model_number);


-- 6. Repair Estimates Matrix
CREATE TABLE IF NOT EXISTS repair_estimates (
    id VARCHAR(36) PRIMARY KEY,
    device_type VARCHAR(50) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    fault_type VARCHAR(50) NOT NULL,
    fault_label VARCHAR(100) NOT NULL,
    original_part_cost NUMERIC(10,2) NOT NULL,
    labour_cost NUMERIC(10,2) NOT NULL,
    turnaround_days INT NOT NULL,
    cheaper_alt_name VARCHAR(150) NOT NULL,
    cheaper_alt_cost NUMERIC(10,2) NOT NULL,
    cheaper_alt_tradeoff TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Rationale: Compound index for live multi-fault calculation WHERE brand = ? AND fault_type = ?.
CREATE INDEX IF NOT EXISTS idx_repair_estimates_brand_fault ON repair_estimates(brand, fault_type);
-- Index Rationale: Fallback lookup WHERE device_type = ? AND fault_type = ?.
CREATE INDEX IF NOT EXISTS idx_repair_estimates_device_fault ON repair_estimates(device_type, fault_type);


-- 7. Replacement Options Table
CREATE TABLE IF NOT EXISTS replacement_options (
    id VARCHAR(36) PRIMARY KEY,
    device_type VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    condition VARCHAR(50) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    key_difference TEXT NOT NULL,
    best_for VARCHAR(150) NOT NULL,
    suitability_criteria VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Rationale: Fetching relevant replacement alternatives WHERE device_type = ?.
CREATE INDEX IF NOT EXISTS idx_replacement_options_device_type ON replacement_options(device_type);
-- Index Rationale: ORDER BY price ASC for sorting replacement tiers within budget constraints.
CREATE INDEX IF NOT EXISTS idx_replacement_options_price ON replacement_options(price ASC);


-- 8. Customer Repair Requests / Quotes Table
CREATE TABLE IF NOT EXISTS repair_requests (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id),
    device_photo_url TEXT,
    device_type VARCHAR(50) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    model_number VARCHAR(50) NOT NULL,
    serial_number VARCHAR(50) NOT NULL,
    fault_types TEXT NOT NULL,
    budget_inr NUMERIC(10,2) NOT NULL,
    pin_code VARCHAR(10) NOT NULL,
    service_centre_id VARCHAR(36) REFERENCES service_centres(id),
    selected_option VARCHAR(50) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    gst_amount NUMERIC(10,2) NOT NULL,
    grand_total NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'estimated',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Rationale: Customer order history query WHERE user_id = ? ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS idx_repair_requests_user_id ON repair_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_repair_requests_created_at ON repair_requests(created_at DESC);
-- Index Rationale: Regional dispatch queue filtering WHERE pin_code = ? AND status = ?.
CREATE INDEX IF NOT EXISTS idx_repair_requests_pin_status ON repair_requests(pin_code, status);


-- 9. Marketplace Repair Bids Table (Shopkeepers & Independent Technicians)
CREATE TABLE IF NOT EXISTS repair_bids (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) NOT NULL REFERENCES repair_requests(id) ON DELETE CASCADE,
    repairman_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repairman_name VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255) NOT NULL,
    shop_address TEXT NOT NULL,
    shop_city VARCHAR(100) NOT NULL,
    shop_pin VARCHAR(10) NOT NULL,
    shop_phone VARCHAR(25) NOT NULL,
    bid_price NUMERIC(10,2) NOT NULL,
    parts_cost NUMERIC(10,2) NOT NULL,
    labour_cost NUMERIC(10,2) NOT NULL,
    turnaround_days INT NOT NULL,
    warranty_days INT DEFAULT 90,
    repair_approach TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Rationale: Retrieve all competing bids for customer ticket WHERE ticket_id = ? ORDER BY bid_price ASC.
CREATE INDEX IF NOT EXISTS idx_repair_bids_ticket_id ON repair_bids(ticket_id);
-- Index Rationale: Fetch all active bids submitted by a specific repair shopkeeper WHERE repairman_id = ?.
CREATE INDEX IF NOT EXISTS idx_repair_bids_repairman_id ON repair_bids(repairman_id);
-- Index Rationale: Chronological sorting for marketplace feeds.
CREATE INDEX IF NOT EXISTS idx_repair_bids_created_at ON repair_bids(created_at DESC);
