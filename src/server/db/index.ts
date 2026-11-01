import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

export interface ServiceCentre {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  phone: string;
  email: string;
  operating_hours: string;
  rating: number;
}

export interface ServiceablePin {
  pin_code: string;
  city: string;
  state: string;
  service_centre_id: string;
  is_active: boolean;
}

export interface DeviceCatalogItem {
  id: string;
  device_type: string;
  brand: string;
  model_name: string;
  model_number: string;
  release_year: number;
  base_market_value: number;
}

export interface RepairEstimateItem {
  id: string;
  device_type: string;
  brand: string;
  fault_type: string;
  fault_label: string;
  original_part_cost: number;
  labour_cost: number;
  turnaround_days: number;
  cheaper_alt_name: string;
  cheaper_alt_cost: number;
  cheaper_alt_tradeoff: string;
}

export interface ReplacementOptionItem {
  id: string;
  device_type: string;
  name: string;
  condition: string;
  price: number;
  key_difference: string;
  best_for: string;
  suitability_criteria: string;
}

export type UserRole = 'customer' | 'repairman';

export interface User {
  id: string;
  email: string;
  phone: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  shop_name?: string;
  shop_address?: string;
  shop_city?: string;
  shop_pin?: string;
  shop_phone?: string;
  created_at: string;
}

export interface RepairBid {
  id: string;
  ticket_id: string;
  repairman_id: string;
  repairman_name: string;
  shop_name: string;
  shop_address: string;
  shop_city: string;
  shop_pin: string;
  shop_phone: string;
  bid_price: number;
  parts_cost: number;
  labour_cost: number;
  turnaround_days: number;
  warranty_days: number;
  repair_approach: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface RepairRequest {
  id: string;
  user_id: string;
  customer_name?: string;
  customer_phone?: string;
  device_photo_url: string;
  device_type: string;
  brand: string;
  product_name: string;
  model_number: string;
  serial_number: string;
  fault_types: string[];
  budget_inr: number;
  pin_code: string;
  city?: string;
  service_centre_id: string;
  selected_option: string;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  accepted_bid_id?: string;
  status: string; // 'open_for_bids', 'estimated', 'confirmed', 'completed'
  created_at: string;
}

// In-Memory Indexed Store Data Structures (Simulating real B-Tree / Hash Indexes)
class InMemoryStore {
  users: Map<string, User> = new Map();
  usersByEmail: Map<string, string> = new Map(); // Unique Index
  usersByPhone: Map<string, string> = new Map(); // Unique Index
  
  serviceCentres: Map<string, ServiceCentre> = new Map();
  serviceCentresByPin: Map<string, string[]> = new Map(); // Index
  serviceCentresByCity: Map<string, string[]> = new Map(); // Index

  serviceablePins: Map<string, ServiceablePin> = new Map(); // Primary key index
  
  deviceCatalog: Map<string, DeviceCatalogItem> = new Map();
  deviceByModel: Map<string, string> = new Map(); // Index
  
  repairEstimates: Map<string, RepairEstimateItem> = new Map();
  // Compound index: device_type + ":" + brand + ":" + fault_type
  estimatesByDeviceBrandFault: Map<string, string> = new Map();
  // Fallback compound index: brand + ":" + fault_type
  estimatesByBrandFault: Map<string, string> = new Map();
  // Fallback index: device_type + ":" + fault_type
  estimatesByTypeFault: Map<string, string> = new Map();

  replacementOptions: Map<string, ReplacementOptionItem> = new Map();
  // Index: device_type -> IDs sorted by price
  replacementsByType: Map<string, string[]> = new Map();

  repairRequests: Map<string, RepairRequest> = new Map();
  requestsByUser: Map<string, string[]> = new Map(); // Index

  // Repair Bids (Marketplace of Shopkeepers and Repairmen)
  repairBids: Map<string, RepairBid> = new Map();
  bidsByTicket: Map<string, string[]> = new Map(); // Index: ticket_id -> bid_ids
  bidsByRepairman: Map<string, string[]> = new Map(); // Index: repairman_id -> bid_ids
}

class DatabaseManager {
  private pool: pg.Pool | null = null;
  public isPostgresConnected = false;
  public store = new InMemoryStore();

  async init() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        this.pool = new Pool({
          connectionString: dbUrl,
          connectionTimeoutMillis: 2000,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();
        this.isPostgresConnected = true;
        console.log('[DB] Successfully connected to PostgreSQL.');
      } catch (err) {
        console.warn('[DB] PostgreSQL connection not reachable, operating on high-performance indexed embedded store.');
        this.isPostgresConnected = false;
      }
    } else {
      console.log('[DB] No DATABASE_URL specified. Running with indexed embedded store.');
    }

    await this.seed();
  }

  async seed() {
    // 1. Seed demo user (Customer)
    const salt = bcrypt.genSaltSync(10);
    const demoPasswordHash = bcrypt.hashSync('Password@123', salt);
    
    const demoUser: User = {
      id: 'usr_demo_001',
      email: 'demo@repairassist.in',
      phone: '9876543210',
      password_hash: demoPasswordHash,
      full_name: 'Aditi Sharma',
      role: 'customer',
      created_at: new Date().toISOString()
    };
    this.store.users.set(demoUser.id, demoUser);
    this.store.usersByEmail.set(demoUser.email.toLowerCase(), demoUser.id);
    this.store.usersByPhone.set(demoUser.phone, demoUser.id);

    // 1b. Seed demo repair specialists / shopkeepers
    const repairman1: User = {
      id: 'usr_repairman_001',
      email: 'rajesh@indiranagarrepairs.in',
      phone: '9845012345',
      password_hash: demoPasswordHash,
      full_name: 'Rajesh Kumar',
      role: 'repairman',
      shop_name: 'Rajesh Electronics & Logic Board Lab',
      shop_address: 'Shop 4, 12th Main, HAL 2nd Stage, Indiranagar',
      shop_city: 'Bengaluru',
      shop_pin: '560038',
      shop_phone: '+91 80 4123 9988',
      created_at: new Date().toISOString()
    };
    this.store.users.set(repairman1.id, repairman1);
    this.store.usersByEmail.set(repairman1.email.toLowerCase(), repairman1.id);
    this.store.usersByPhone.set(repairman1.phone, repairman1.id);

    const repairman2: User = {
      id: 'usr_repairman_002',
      email: 'anand@koramangalacare.in',
      phone: '9845099887',
      password_hash: demoPasswordHash,
      full_name: 'Anand Swamy',
      role: 'repairman',
      shop_name: 'Koramangala Precision Hardware Works',
      shop_address: '78 5th Block, 80ft Road, Koramangala',
      shop_city: 'Bengaluru',
      shop_pin: '560034',
      shop_phone: '+91 80 4222 3344',
      created_at: new Date().toISOString()
    };
    this.store.users.set(repairman2.id, repairman2);
    this.store.usersByEmail.set(repairman2.email.toLowerCase(), repairman2.id);
    this.store.usersByPhone.set(repairman2.phone, repairman2.id);

    // 2. Seed Service Centres
    const centres: ServiceCentre[] = [
      {
        id: 'sc_blr_01',
        name: 'Indiranagar Central Service Hub',
        address: '1204 100ft Road, HAL 2nd Stage, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pin_code: '560038',
        phone: '+91 80 4932 7700',
        email: 'indiranagar@repairassist.in',
        operating_hours: '09:30 AM to 07:00 PM (Monday to Saturday)',
        rating: 4.9
      },
      {
        id: 'sc_blr_02',
        name: 'MG Road Flagship Electronics Lab',
        address: '84/1 Mahatma Gandhi Road, Shivaji Nagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pin_code: '560001',
        phone: '+91 80 4123 4567',
        email: 'mgroad@repairassist.in',
        operating_hours: '09:00 AM to 06:30 PM (Monday to Saturday)',
        rating: 4.8
      },
      {
        id: 'sc_mum_01',
        name: 'Fort Authorised Diagnostics Hub',
        address: '45 Nariman Point, Express Towers Ground Floor',
        city: 'Mumbai',
        state: 'Maharashtra',
        pin_code: '400021',
        phone: '+91 22 6789 0123',
        email: 'fort@repairassist.in',
        operating_hours: '10:00 AM to 07:00 PM (Monday to Saturday)',
        rating: 4.8
      },
      {
        id: 'sc_del_01',
        name: 'Connaught Place Service Pavilion',
        address: 'Block B, Radial Road 3, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        pin_code: '110001',
        phone: '+91 11 4567 8901',
        email: 'cp@repairassist.in',
        operating_hours: '10:00 AM to 06:30 PM (Monday to Saturday)',
        rating: 4.7
      },
      {
        id: 'sc_hyd_01',
        name: 'Hitec City Device Repair Lab',
        address: 'Cyber Towers Level 2, Madhapur',
        city: 'Hyderabad',
        state: 'Telangana',
        pin_code: '500081',
        phone: '+91 40 6655 4433',
        email: 'hiteccity@repairassist.in',
        operating_hours: '09:30 AM to 07:00 PM (Monday to Saturday)',
        rating: 4.9
      },
      {
        id: 'sc_chn_01',
        name: 'Anna Salai Authorised Service Center',
        address: '18 Mount Road, Thousand Lights',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pin_code: '600002',
        phone: '+91 44 2855 1234',
        email: 'annasalai@repairassist.in',
        operating_hours: '09:30 AM to 06:30 PM (Monday to Saturday)',
        rating: 4.8
      },
      {
        id: 'sc_pun_01',
        name: 'Shivajinagar Hardware Workshop',
        address: 'Fergusson College Road, Shivajinagar',
        city: 'Pune',
        state: 'Maharashtra',
        pin_code: '411005',
        phone: '+91 20 2567 8900',
        email: 'pune@repairassist.in',
        operating_hours: '10:00 AM to 07:00 PM (Monday to Saturday)',
        rating: 4.8
      }
    ];

    for (const c of centres) {
      this.store.serviceCentres.set(c.id, c);
      const byPin = this.store.serviceCentresByPin.get(c.pin_code) || [];
      byPin.push(c.id);
      this.store.serviceCentresByPin.set(c.pin_code, byPin);

      const byCity = this.store.serviceCentresByCity.get(c.city.toLowerCase()) || [];
      byCity.push(c.id);
      this.store.serviceCentresByCity.set(c.city.toLowerCase(), byCity);
    }

    // 3. Seed Serviceable PIN codes
    const pins: ServiceablePin[] = [
      { pin_code: '560038', city: 'Bengaluru', state: 'Karnataka', service_centre_id: 'sc_blr_01', is_active: true },
      { pin_code: '560001', city: 'Bengaluru', state: 'Karnataka', service_centre_id: 'sc_blr_02', is_active: true },
      { pin_code: '560025', city: 'Bengaluru', state: 'Karnataka', service_centre_id: 'sc_blr_02', is_active: true },
      { pin_code: '560034', city: 'Bengaluru', state: 'Karnataka', service_centre_id: 'sc_blr_01', is_active: true },
      { pin_code: '560076', city: 'Bengaluru', state: 'Karnataka', service_centre_id: 'sc_blr_01', is_active: true },
      { pin_code: '560100', city: 'Bengaluru', state: 'Karnataka', service_centre_id: 'sc_blr_01', is_active: true },
      { pin_code: '400021', city: 'Mumbai', state: 'Maharashtra', service_centre_id: 'sc_mum_01', is_active: true },
      { pin_code: '400001', city: 'Mumbai', state: 'Maharashtra', service_centre_id: 'sc_mum_01', is_active: true },
      { pin_code: '400050', city: 'Mumbai', state: 'Maharashtra', service_centre_id: 'sc_mum_01', is_active: true },
      { pin_code: '110001', city: 'New Delhi', state: 'Delhi', service_centre_id: 'sc_del_01', is_active: true },
      { pin_code: '110016', city: 'New Delhi', state: 'Delhi', service_centre_id: 'sc_del_01', is_active: true },
      { pin_code: '110020', city: 'New Delhi', state: 'Delhi', service_centre_id: 'sc_del_01', is_active: true },
      { pin_code: '500081', city: 'Hyderabad', state: 'Telangana', service_centre_id: 'sc_hyd_01', is_active: true },
      { pin_code: '500032', city: 'Hyderabad', state: 'Telangana', service_centre_id: 'sc_hyd_01', is_active: true },
      { pin_code: '600002', city: 'Chennai', state: 'Tamil Nadu', service_centre_id: 'sc_chn_01', is_active: true },
      { pin_code: '600001', city: 'Chennai', state: 'Tamil Nadu', service_centre_id: 'sc_chn_01', is_active: true },
      { pin_code: '411005', city: 'Pune', state: 'Maharashtra', service_centre_id: 'sc_pun_01', is_active: true },
      { pin_code: '411001', city: 'Pune', state: 'Maharashtra', service_centre_id: 'sc_pun_01', is_active: true }
    ];

    for (const p of pins) {
      this.store.serviceablePins.set(p.pin_code, p);
    }

    // 4. Seed Device Catalog
    const devices: DeviceCatalogItem[] = [
      { id: 'dev_01', device_type: 'smartphone', brand: 'Apple', model_name: 'iPhone 15 Pro', model_number: 'A3106', release_year: 2023, base_market_value: 119900 },
      { id: 'dev_02', device_type: 'smartphone', brand: 'Apple', model_name: 'iPhone 14', model_number: 'A2882', release_year: 2022, base_market_value: 59900 },
      { id: 'dev_03', device_type: 'smartphone', brand: 'Samsung', model_name: 'Galaxy S23 5G', model_number: 'SM-S911B', release_year: 2023, base_market_value: 64999 },
      { id: 'dev_04', device_type: 'smartphone', brand: 'Google', model_name: 'Pixel 8 Pro', model_number: 'G1MNW', release_year: 2023, base_market_value: 84999 },
      { id: 'dev_05', device_type: 'laptop', brand: 'Apple', model_name: 'MacBook Air M2 13-inch', model_number: 'A2681', release_year: 2022, base_market_value: 99900 },
      { id: 'dev_06', device_type: 'laptop', brand: 'Dell', model_name: 'XPS 13 Plus', model_number: '9320', release_year: 2023, base_market_value: 124000 },
      { id: 'dev_07', device_type: 'tablet', brand: 'Apple', model_name: 'iPad Pro 11-inch M2', model_number: 'A2759', release_year: 2022, base_market_value: 81900 },
      { id: 'dev_08', device_type: 'tablet', brand: 'Samsung', model_name: 'Galaxy Tab S9', model_number: 'SM-X710', release_year: 2023, base_market_value: 62999 }
    ];

    for (const d of devices) {
      this.store.deviceCatalog.set(d.id, d);
      this.store.deviceByModel.set(d.model_number.toUpperCase(), d.id);
    }

    // 5. Seed Repair Estimates Matrix
    const estimates: RepairEstimateItem[] = [
      // Smartphone - Apple
      {
        id: 'est_app_screen',
        device_type: 'smartphone',
        brand: 'Apple',
        fault_type: 'screen_crack',
        fault_label: 'Display Glass & OLED Fracture',
        original_part_cost: 16500,
        labour_cost: 1400,
        turnaround_days: 2,
        cheaper_alt_name: 'OEM-Grade Tier-1 OLED Panel',
        cheaper_alt_cost: 9800,
        cheaper_alt_tradeoff: 'Retains high color gamut and touch response, but lacks factory True Tone sensor calibration, saving ₹6,700.'
      },
      {
        id: 'est_app_battery',
        device_type: 'smartphone',
        brand: 'Apple',
        fault_type: 'battery_degrade',
        fault_label: 'Battery Degradation & Capacity Loss',
        original_part_cost: 6200,
        labour_cost: 800,
        turnaround_days: 1,
        cheaper_alt_name: 'Certified High-Density Cobalt Cell',
        cheaper_alt_cost: 3400,
        cheaper_alt_tradeoff: 'Delivers full cycle runtime, but displays an unverified part status in iOS settings, saving ₹2,800.'
      },
      {
        id: 'est_app_liquid',
        device_type: 'smartphone',
        brand: 'Apple',
        fault_type: 'liquid_damage',
        fault_label: 'Liquid Intrusion & Motherboard Corrosion',
        original_part_cost: 26000,
        labour_cost: 2800,
        turnaround_days: 4,
        cheaper_alt_name: 'Component-Level Micro-Soldering Rework',
        cheaper_alt_cost: 12500,
        cheaper_alt_tradeoff: 'Ultrasonically cleans and replaces shorted trace capacitors rather than swapping the whole logic board. Bench testing requires 2 extra days, saving ₹13,500.'
      },
      {
        id: 'est_app_port',
        device_type: 'smartphone',
        brand: 'Apple',
        fault_type: 'charging_port',
        fault_label: 'Charging Port & Lightning/USB-C Pins Damaged',
        original_part_cost: 4200,
        labour_cost: 900,
        turnaround_days: 1,
        cheaper_alt_name: 'Flex Cable Pin Reconditioning',
        cheaper_alt_cost: 2100,
        cheaper_alt_tradeoff: 'Reconditions contact pins and micro-flex connector without full chassis teardown, saving ₹2,100.'
      },
      {
        id: 'est_app_camera',
        device_type: 'smartphone',
        brand: 'Apple',
        fault_type: 'camera_fault',
        fault_label: 'Rear Camera Sensor / Optical Glass Fracture',
        original_part_cost: 8900,
        labour_cost: 1200,
        turnaround_days: 2,
        cheaper_alt_name: 'Sapphire Crystal Lens Replacement',
        cheaper_alt_cost: 3900,
        cheaper_alt_tradeoff: 'Preserves the authentic internal optical sensor and only replaces fractured outer sapphire glass, saving ₹5,000.'
      },

      // Smartphone - Samsung
      {
        id: 'est_sam_screen',
        device_type: 'smartphone',
        brand: 'Samsung',
        fault_type: 'screen_crack',
        fault_label: 'Dynamic AMOLED 2X Panel Fracture',
        original_part_cost: 14200,
        labour_cost: 1200,
        turnaround_days: 2,
        cheaper_alt_name: 'Refurbished Factory Service Pack',
        cheaper_alt_cost: 8600,
        cheaper_alt_tradeoff: 'Genuine Samsung glass re-laminated onto original OLED matrix; retains 120Hz refresh rate with minor bezel variance, saving ₹5,600.'
      },
      {
        id: 'est_sam_battery',
        device_type: 'smartphone',
        brand: 'Samsung',
        fault_type: 'battery_degrade',
        fault_label: 'Battery Degradation & Rapid Drain',
        original_part_cost: 4900,
        labour_cost: 800,
        turnaround_days: 1,
        cheaper_alt_name: 'OEM Compatible Polymer Cell',
        cheaper_alt_cost: 2700,
        cheaper_alt_tradeoff: 'Compliant with fast charging standards, lacks Samsung Care serial log registration, saving ₹2,200.'
      },
      {
        id: 'est_sam_liquid',
        device_type: 'smartphone',
        brand: 'Samsung',
        fault_type: 'liquid_damage',
        fault_label: 'Liquid Corrosion & Bootloop Failure',
        original_part_cost: 22000,
        labour_cost: 2500,
        turnaround_days: 3,
        cheaper_alt_name: 'Power IC Reballing & Trace Cleaning',
        cheaper_alt_cost: 10800,
        cheaper_alt_tradeoff: 'Reseats main power IC and cleans galvanic corrosion; takes 1 additional diagnostic day, saving ₹11,200.'
      },
      {
        id: 'est_sam_port',
        device_type: 'smartphone',
        brand: 'Samsung',
        fault_type: 'charging_port',
        fault_label: 'USB-C Sub-board Moisture & Pin Degradation',
        original_part_cost: 3400,
        labour_cost: 800,
        turnaround_days: 1,
        cheaper_alt_name: 'Sub-board Assembly Replacement',
        cheaper_alt_cost: 1800,
        cheaper_alt_tradeoff: 'Replaces port sub-board with certified OEM partner unit; retains 25W/45W charging, saving ₹1,600.'
      },
      {
        id: 'est_sam_camera',
        device_type: 'smartphone',
        brand: 'Samsung',
        fault_type: 'camera_fault',
        fault_label: 'Camera OIS Blur or Glass Crack',
        original_part_cost: 7600,
        labour_cost: 1000,
        turnaround_days: 2,
        cheaper_alt_name: 'Outer Optical Glass Rework',
        cheaper_alt_cost: 3200,
        cheaper_alt_tradeoff: 'Replaces cracked outer glass window while preserving authentic sensor, saving ₹4,400.'
      },

      // Laptop - Apple / General
      {
        id: 'est_lap_screen',
        device_type: 'laptop',
        brand: 'Apple',
        fault_type: 'screen_crack',
        fault_label: 'Liquid Retina Display Assembly Fracture',
        original_part_cost: 28500,
        labour_cost: 2200,
        turnaround_days: 3,
        cheaper_alt_name: 'LCD Matrix Rework (Chassis Preserved)',
        cheaper_alt_cost: 16500,
        cheaper_alt_tradeoff: 'Replaces damaged internal LCD panel inside the original aluminum clamshell lid rather than swapping the whole top case, saving ₹12,000.'
      },
      {
        id: 'est_lap_battery',
        device_type: 'laptop',
        brand: 'Apple',
        fault_type: 'battery_degrade',
        fault_label: 'Battery Cycle Exceeded / Service Recommended',
        original_part_cost: 12500,
        labour_cost: 1500,
        turnaround_days: 1,
        cheaper_alt_name: 'Certified High-Yield Lithium Pouch Pack',
        cheaper_alt_cost: 6800,
        cheaper_alt_tradeoff: 'Individual cells replaced with OEM-spec pouches without replacing entire palmrest and keyboard assembly, saving ₹5,700.'
      },
      {
        id: 'est_lap_liquid',
        device_type: 'laptop',
        brand: 'Apple',
        fault_type: 'liquid_damage',
        fault_label: 'Liquid Spill & Logic Board Short Circuit',
        original_part_cost: 48000,
        labour_cost: 3500,
        turnaround_days: 5,
        cheaper_alt_name: 'Ultrasonic Bath & Power Stage Micro-repair',
        cheaper_alt_cost: 19500,
        cheaper_alt_tradeoff: 'Restores motherboard power rails and shorted MOSFETs without replacing soldered processor and memory, saving ₹28,500.'
      },
      {
        id: 'est_lap_port',
        device_type: 'laptop',
        brand: 'Apple',
        fault_type: 'charging_port',
        fault_label: 'MagSafe / Thunderbolt Port Physical Wear',
        original_part_cost: 6500,
        labour_cost: 1200,
        turnaround_days: 2,
        cheaper_alt_name: 'I/O Daughterboard Replacement',
        cheaper_alt_cost: 3600,
        cheaper_alt_tradeoff: 'Swaps modular side daughterboard rather than mainboard connector, saving ₹2,900.'
      },

      // Tablet - Apple / General
      {
        id: 'est_tab_screen',
        device_type: 'tablet',
        brand: 'Apple',
        fault_type: 'screen_crack',
        fault_label: 'Digitizer & Liquid Retina Panel Shattered',
        original_part_cost: 21500,
        labour_cost: 1600,
        turnaround_days: 2,
        cheaper_alt_name: 'Digitizer Glass Lamination',
        cheaper_alt_cost: 11200,
        cheaper_alt_tradeoff: 'Re-laminates touch glass layer if underlying display matrix is unharmed, saving ₹10,300.'
      },
      {
        id: 'est_tab_battery',
        device_type: 'tablet',
        brand: 'Apple',
        fault_type: 'battery_degrade',
        fault_label: 'Battery Health Critical Failure',
        original_part_cost: 7800,
        labour_cost: 1200,
        turnaround_days: 2,
        cheaper_alt_name: 'OEM Spec Replacement Cell',
        cheaper_alt_cost: 4400,
        cheaper_alt_tradeoff: 'Requires gentle thermal adhesive separation, provides full daily battery life, saving ₹3,400.'
      }
    ];

    for (const est of estimates) {
      this.store.repairEstimates.set(est.id, est);
      this.store.estimatesByDeviceBrandFault.set(`${est.device_type.toLowerCase()}:${est.brand.toLowerCase()}:${est.fault_type.toLowerCase()}`, est.id);
      this.store.estimatesByBrandFault.set(`${est.brand.toLowerCase()}:${est.fault_type.toLowerCase()}`, est.id);
      this.store.estimatesByTypeFault.set(`${est.device_type.toLowerCase()}:${est.fault_type.toLowerCase()}`, est.id);
    }

    // 6. Seed Replacement Options
    const replacements: ReplacementOptionItem[] = [
      // Smartphone Replacements
      {
        id: 'rep_phone_01',
        device_type: 'smartphone',
        name: 'Apple iPhone 14 (128GB)',
        condition: 'Authorised Refurbished - Grade A',
        price: 42999,
        key_difference: 'A15 Bionic performance, guaranteed 95%+ battery health, fully tested 32-point inspection, 12-month domestic warranty.',
        best_for: 'Sensible daily value when repair exceeds 50% of device worth.',
        suitability_criteria: 'budget_under_50000'
      },
      {
        id: 'rep_phone_02',
        device_type: 'smartphone',
        name: 'Apple iPhone 15 (128GB)',
        condition: 'Open Box - Like New',
        price: 58999,
        key_difference: 'Dynamic Island, 48MP primary sensor, USB-C unified charging, balance of original manufacturer warranty included.',
        best_for: 'Modern upgrade without paying full retail shelf price.',
        suitability_criteria: 'modern_replacement'
      },
      {
        id: 'rep_phone_03',
        device_type: 'smartphone',
        name: 'Samsung Galaxy S23 5G (256GB)',
        condition: 'Brand New - Sealed Box',
        price: 64999,
        key_difference: 'Snapdragon 8 Gen 2 Mobile Platform, 120Hz Dynamic AMOLED 2X, 3x optical telephoto lens, full 1-year brand warranty.',
        best_for: 'Customers preferring a fresh flagship with maximum longevity.',
        suitability_criteria: 'premium_longevity'
      },

      // Laptop Replacements
      {
        id: 'rep_lap_01',
        device_type: 'laptop',
        name: 'Apple MacBook Air M1 (256GB SSD, 8GB RAM)',
        condition: 'Authorised Refurbished - Grade A',
        price: 54999,
        key_difference: 'Whisper-quiet fanless thermal design, 18-hour battery longevity, 12-month domestic warranty.',
        best_for: 'Practical everyday computing if motherboard repair is uneconomical.',
        suitability_criteria: 'budget_under_60000'
      },
      {
        id: 'rep_lap_02',
        device_type: 'laptop',
        name: 'Apple MacBook Air M2 (256GB SSD, 8GB RAM)',
        condition: 'Open Box - Like New',
        price: 78999,
        key_difference: 'MagSafe 3 fast charging, 1080p FaceTime HD camera, Liquid Retina display, balance of AppleCare.',
        best_for: 'Modern performance upgrade for creative and professional workloads.',
        suitability_criteria: 'modern_replacement'
      },
      {
        id: 'rep_lap_03',
        device_type: 'laptop',
        name: 'Lenovo ThinkPad T14 Gen 3 (512GB, 16GB RAM)',
        condition: 'Brand New - Sealed',
        price: 84500,
        key_difference: 'Mil-SPEC 810H durability, modular RAM slots, dual Thunderbolt 4 ports, 3-year onsite premier support.',
        best_for: 'Enterprise resilience with heavy typing and multitasking.',
        suitability_criteria: 'premium_longevity'
      },

      // Tablet Replacements
      {
        id: 'rep_tab_01',
        device_type: 'tablet',
        name: 'Apple iPad 10th Gen (64GB Wi-Fi)',
        condition: 'Authorised Refurbished - Grade A',
        price: 28999,
        key_difference: '10.9-inch Liquid Retina display, A14 Bionic chip, landscape 12MP front camera with Center Stage.',
        best_for: 'Educational, reading, and light streaming utility.',
        suitability_criteria: 'budget_under_35000'
      },
      {
        id: 'rep_tab_02',
        device_type: 'tablet',
        name: 'Apple iPad Air M1 (64GB Wi-Fi)',
        condition: 'Open Box - Like New',
        price: 43999,
        key_difference: 'M1 chip desktop-class architecture, Apple Pencil 2 magnetic wireless charging, P3 wide color display.',
        best_for: 'Digital artists and note-takers requiring fast stylus responsiveness.',
        suitability_criteria: 'modern_replacement'
      },
      {
        id: 'rep_tab_03',
        device_type: 'tablet',
        name: 'Samsung Galaxy Tab S9 FE (128GB)',
        condition: 'Brand New - Sealed Box',
        price: 36999,
        key_difference: 'Included S Pen in box, IP68 water & dust resistance, 90Hz display, 1-year Samsung warranty.',
        best_for: 'All-weather versatility and bundled stylus value.',
        suitability_criteria: 'premium_longevity'
      }
    ];

    for (const r of replacements) {
      this.store.replacementOptions.set(r.id, r);
      const list = this.store.replacementsByType.get(r.device_type.toLowerCase()) || [];
      list.push(r.id);
      this.store.replacementsByType.set(r.device_type.toLowerCase(), list);
    }

    // 7. Seed Initial Open Customer Repair Requests (Tickets for Marketplace)
    const sampleTicket1: RepairRequest = {
      id: 'req_sample_01',
      user_id: 'usr_demo_001',
      customer_name: 'Aditi Sharma',
      customer_phone: '9876543210',
      device_photo_url: '',
      device_type: 'smartphone',
      brand: 'Apple',
      product_name: 'iPhone 15 Pro',
      model_number: 'A3106',
      serial_number: 'F2LNQ1P0M9',
      fault_types: ['screen_crack'],
      budget_inr: 20000,
      pin_code: '560038',
      city: 'Bengaluru',
      service_centre_id: 'sc_blr_01',
      selected_option: 'repair_original',
      subtotal: 17900,
      gst_amount: 3222,
      grand_total: 21122,
      status: 'open_for_bids',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    };
    this.store.repairRequests.set(sampleTicket1.id, sampleTicket1);
    this.store.requestsByUser.set(sampleTicket1.user_id, [sampleTicket1.id]);

    const sampleTicket2: RepairRequest = {
      id: 'req_sample_02',
      user_id: 'usr_demo_001',
      customer_name: 'Aditi Sharma',
      customer_phone: '9876543210',
      device_photo_url: '',
      device_type: 'laptop',
      brand: 'Apple',
      product_name: 'MacBook Air M2 13-inch',
      model_number: 'A2681',
      serial_number: 'C02G1234MD6R',
      fault_types: ['liquid_damage', 'charging_port'],
      budget_inr: 35000,
      pin_code: '560038',
      city: 'Bengaluru',
      service_centre_id: 'sc_blr_01',
      selected_option: 'repair_cheaper',
      subtotal: 23100,
      gst_amount: 4158,
      grand_total: 27258,
      status: 'open_for_bids',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    };
    this.store.repairRequests.set(sampleTicket2.id, sampleTicket2);
    const userReqs = this.store.requestsByUser.get(sampleTicket2.user_id) || [];
    userReqs.push(sampleTicket2.id);
    this.store.requestsByUser.set(sampleTicket2.user_id, userReqs);

    // 8. Seed Initial Repairman Bids on Sample Ticket 1
    const sampleBid1: RepairBid = {
      id: 'bid_001',
      ticket_id: 'req_sample_01',
      repairman_id: 'usr_repairman_001',
      repairman_name: 'Rajesh Kumar',
      shop_name: 'Rajesh Electronics & Logic Board Lab',
      shop_address: 'Shop 4, 12th Main, HAL 2nd Stage, Indiranagar',
      shop_city: 'Bengaluru',
      shop_pin: '560038',
      shop_phone: '+91 80 4123 9988',
      bid_price: 12500,
      parts_cost: 10500,
      labour_cost: 2000,
      turnaround_days: 1,
      warranty_days: 90,
      repair_approach: 'Direct Tier-1 OLED panel replacement with factory True Tone serialization copied from your broken glass. Same-day 3-hour bench turnaround.',
      status: 'pending',
      created_at: new Date(Date.now() - 3600000).toISOString()
    };
    this.store.repairBids.set(sampleBid1.id, sampleBid1);
    this.store.bidsByTicket.set(sampleBid1.ticket_id, [sampleBid1.id]);
    this.store.bidsByRepairman.set(sampleBid1.repairman_id, [sampleBid1.id]);

    const sampleBid2: RepairBid = {
      id: 'bid_002',
      ticket_id: 'req_sample_01',
      repairman_id: 'usr_repairman_002',
      repairman_name: 'Anand Swamy',
      shop_name: 'Koramangala Precision Hardware Works',
      shop_address: '78 5th Block, 80ft Road, Koramangala',
      shop_city: 'Bengaluru',
      shop_pin: '560034',
      shop_phone: '+91 80 4222 3344',
      bid_price: 11000,
      parts_cost: 9200,
      labour_cost: 1800,
      turnaround_days: 2,
      warranty_days: 60,
      repair_approach: 'Factory refurbished original OLED matrix re-lamination with new oleophobic top glass. Tested 120Hz touch response, saving ₹6,900 vs authorised desk.',
      status: 'pending',
      created_at: new Date(Date.now() - 1800000).toISOString()
    };
    this.store.repairBids.set(sampleBid2.id, sampleBid2);
    const ticketBids = this.store.bidsByTicket.get(sampleBid2.ticket_id) || [];
    ticketBids.push(sampleBid2.id);
    this.store.bidsByTicket.set(sampleBid2.ticket_id, ticketBids);
    this.store.bidsByRepairman.set(sampleBid2.repairman_id, [sampleBid2.id]);

    console.log('[DB] Seed completed: catalog, centres, estimates, replacements, marketplace tickets, and shopkeeper bids are loaded.');
  }

  // Database helper methods
  async getUserByEmail(email: string): Promise<User | null> {
    const userId = this.store.usersByEmail.get(email.toLowerCase());
    if (!userId) return null;
    return this.store.users.get(userId) || null;
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    const userId = this.store.usersByPhone.get(phone);
    if (!userId) return null;
    return this.store.users.get(userId) || null;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.store.users.get(id) || null;
  }

  async createUser(user: Omit<User, 'created_at'>): Promise<User> {
    const newUser: User = {
      ...user,
      created_at: new Date().toISOString()
    };
    this.store.users.set(newUser.id, newUser);
    this.store.usersByEmail.set(newUser.email.toLowerCase(), newUser.id);
    this.store.usersByPhone.set(newUser.phone, newUser.id);
    return newUser;
  }

  async getServiceablePin(pin: string): Promise<ServiceablePin | null> {
    return this.store.serviceablePins.get(pin) || null;
  }

  async getServiceCentreById(id: string): Promise<ServiceCentre | null> {
    return this.store.serviceCentres.get(id) || null;
  }

  async getServiceCentreByPin(pin: string): Promise<ServiceCentre | null> {
    const pinData = this.store.serviceablePins.get(pin);
    if (pinData) {
      return this.store.serviceCentres.get(pinData.service_centre_id) || null;
    }
    // Check direct service centre pin
    const centreIds = this.store.serviceCentresByPin.get(pin);
    if (centreIds && centreIds.length > 0) {
      return this.store.serviceCentres.get(centreIds[0]) || null;
    }
    return null;
  }

  async getDeviceCatalog(brand?: string, deviceType?: string): Promise<DeviceCatalogItem[]> {
    const items = Array.from(this.store.deviceCatalog.values());
    return items.filter(i => {
      if (brand && i.brand.toLowerCase() !== brand.toLowerCase()) return false;
      if (deviceType && i.device_type.toLowerCase() !== deviceType.toLowerCase()) return false;
      return true;
    });
  }

  async getEstimatesForFaults(deviceType: string, brand: string, faults: string[]): Promise<RepairEstimateItem[]> {
    const results: RepairEstimateItem[] = [];
    for (const fault of faults) {
      // 1. Try device_type + brand + fault compound key
      const compoundKey = `${deviceType.toLowerCase()}:${brand.toLowerCase()}:${fault.toLowerCase()}`;
      let estId = this.store.estimatesByDeviceBrandFault.get(compoundKey);

      // 2. Fallback to brand + fault
      if (!estId) {
        estId = this.store.estimatesByBrandFault.get(`${brand.toLowerCase()}:${fault.toLowerCase()}`);
      }

      // 3. Fallback to device_type + fault
      if (!estId) {
        estId = this.store.estimatesByTypeFault.get(`${deviceType.toLowerCase()}:${fault.toLowerCase()}`);
      }
      if (estId) {
        const item = this.store.repairEstimates.get(estId);
        if (item) results.push(item);
      } else {
        // Fallback default pricing if specific model/fault combo is not in seed
        results.push({
          id: `est_fallback_${fault}`,
          device_type: deviceType,
          brand,
          fault_type: fault,
          fault_label: fault.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          original_part_cost: 4500,
          labour_cost: 950,
          turnaround_days: 2,
          cheaper_alt_name: 'Certified Component Refurbishment',
          cheaper_alt_cost: 2500,
          cheaper_alt_tradeoff: 'Bench reconditioning of faulty submodule without full housing swap, saving ₹2,000.'
        });
      }
    }
    return results;
  }

  async getReplacementsForDevice(deviceType: string): Promise<ReplacementOptionItem[]> {
    const repIds = this.store.replacementsByType.get(deviceType.toLowerCase());
    if (repIds && repIds.length > 0) {
      const items = repIds.map(id => this.store.replacementOptions.get(id)!).filter(Boolean);
      // Sort by price ascending
      return items.sort((a, b) => a.price - b.price);
    }
    // Fallback to smartphone replacements if exotic device type
    const fallbackIds = this.store.replacementsByType.get('smartphone') || [];
    return fallbackIds.map(id => this.store.replacementOptions.get(id)!).filter(Boolean);
  }

  async saveRepairRequest(request: RepairRequest): Promise<RepairRequest> {
    this.store.repairRequests.set(request.id, request);
    const userRequests = this.store.requestsByUser.get(request.user_id) || [];
    if (!userRequests.includes(request.id)) {
      userRequests.push(request.id);
    }
    this.store.requestsByUser.set(request.user_id, userRequests);
    return request;
  }

  async getRepairRequest(id: string): Promise<RepairRequest | null> {
    return this.store.repairRequests.get(id) || null;
  }

  // Marketplace Methods for Customers and Repairmen / Shopkeepers
  async getOpenTickets(filters?: { deviceType?: string; city?: string; pinCode?: string }): Promise<RepairRequest[]> {
    const all = Array.from(this.store.repairRequests.values());
    return all.filter(t => {
      // Must be open for bids or active estimate
      if (t.status !== 'open_for_bids' && t.status !== 'estimated') return false;
      if (filters?.deviceType && t.device_type.toLowerCase() !== filters.deviceType.toLowerCase()) return false;
      if (filters?.city && t.city && t.city.toLowerCase() !== filters.city.toLowerCase()) return false;
      if (filters?.pinCode && t.pin_code !== filters.pinCode) return false;
      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createBid(bid: Omit<RepairBid, 'created_at'>): Promise<RepairBid> {
    const newBid: RepairBid = {
      ...bid,
      created_at: new Date().toISOString()
    };
    this.store.repairBids.set(newBid.id, newBid);

    const ticketBids = this.store.bidsByTicket.get(newBid.ticket_id) || [];
    ticketBids.push(newBid.id);
    this.store.bidsByTicket.set(newBid.ticket_id, ticketBids);

    const repairmanBids = this.store.bidsByRepairman.get(newBid.repairman_id) || [];
    repairmanBids.push(newBid.id);
    this.store.bidsByRepairman.set(newBid.repairman_id, repairmanBids);

    return newBid;
  }

  async getBidsForTicket(ticketId: string): Promise<RepairBid[]> {
    const bidIds = this.store.bidsByTicket.get(ticketId) || [];
    const bids = bidIds.map(id => this.store.repairBids.get(id)!).filter(Boolean);
    // Sort by price ascending so lowest / best price is first
    return bids.sort((a, b) => a.bid_price - b.bid_price);
  }

  async getBidsByRepairman(repairmanId: string): Promise<RepairBid[]> {
    const bidIds = this.store.bidsByRepairman.get(repairmanId) || [];
    const bids = bidIds.map(id => this.store.repairBids.get(id)!).filter(Boolean);
    return bids.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async acceptBid(ticketId: string, bidId: string): Promise<{ ticket: RepairRequest; bid: RepairBid }> {
    const ticket = this.store.repairRequests.get(ticketId);
    if (!ticket) throw new Error('Customer repair ticket not found.');

    const bid = this.store.repairBids.get(bidId);
    if (!bid) throw new Error('Repairman bid not found.');

    // Update bid status
    bid.status = 'accepted';
    this.store.repairBids.set(bid.id, bid);

    // Update all other bids on this ticket to declined
    const otherBidIds = this.store.bidsByTicket.get(ticketId) || [];
    for (const otherId of otherBidIds) {
      if (otherId !== bidId) {
        const otherBid = this.store.repairBids.get(otherId);
        if (otherBid) {
          otherBid.status = 'declined';
        }
      }
    }

    // Update ticket
    ticket.accepted_bid_id = bid.id;
    ticket.selected_option = 'repair_marketplace_bid';
    ticket.subtotal = bid.bid_price;
    ticket.gst_amount = Math.round(bid.bid_price * 0.18 * 100) / 100;
    ticket.grand_total = Math.round((ticket.subtotal + ticket.gst_amount) * 100) / 100;
    ticket.status = 'confirmed';
    this.store.repairRequests.set(ticket.id, ticket);

    return { ticket, bid };
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<void> {
    const ticket = this.store.repairRequests.get(ticketId);
    if (ticket) {
      ticket.status = status;
      this.store.repairRequests.set(ticket.id, ticket);
    }
  }
}

export const db = new DatabaseManager();
