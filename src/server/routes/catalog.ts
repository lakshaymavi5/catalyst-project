import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { cache } from '../cache/index.js';

const router = Router();

// Device types and brand directory
const BRAND_CATALOG = {
  smartphone: ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi'],
  laptop: ['Apple', 'Dell', 'Lenovo', 'HP', 'Asus'],
  tablet: ['Apple', 'Samsung', 'Lenovo']
};

const FAULTS_BY_CATEGORY: Record<string, Array<{ id: string; label: string; description: string }>> = {
  smartphone: [
    { id: 'screen_crack', label: 'Screen / Display Glass Fracture', description: 'Cracked outer glass, touch dead zones, vertical lines, or black OLED ink bleed.' },
    { id: 'battery_degrade', label: 'Battery Degradation & Rapid Drain', description: 'Significant capacity drop, sudden shutdowns, or swollen chassis enclosure.' },
    { id: 'liquid_damage', label: 'Liquid Contact & Moisture Short', description: 'Device exposed to water, beverages, or steam; intermittent or failure to boot.' },
    { id: 'charging_port', label: 'Charging Port & Cable Connection Fault', description: 'Cable must be angled, slow charging warning, or physical debris lodged in port.' },
    { id: 'camera_fault', label: 'Camera Sensor or Optical Lens Fracture', description: 'Cracked rear camera glass lens, unfocused blurry shots, or OIS camera rattle.' }
  ],
  laptop: [
    { id: 'screen_crack', label: 'Screen Panel / Clamshell Fracture', description: 'Cracked inner matrix, flickering backlight, or broken hinge assembly.' },
    { id: 'battery_degrade', label: 'Battery Health Critical Failure', description: 'System reports service battery recommendation, fails to hold charge off AC adapter.' },
    { id: 'liquid_damage', label: 'Keyboard Liquid Spill & Logic Board Short', description: 'Spill across keyboard deck resulting in sticky keys, fan surge, or power loss.' },
    { id: 'charging_port', label: 'DC Jack / USB-C Thunderbolt Port Wear', description: 'Loose power receptacle, burnt pins, or failure to negotiate high-wattage power.' }
  ],
  tablet: [
    { id: 'screen_crack', label: 'Digitizer & Display Shattered', description: 'Shattered front glass, unresponsive stylus digitizer, or internal ink bleed.' },
    { id: 'battery_degrade', label: 'Battery Health Exhaustion', description: 'Thermal runaway while charging, short runtime, or battery failure.' }
  ]
};

// GET /api/catalog/metadata
router.get('/metadata', (_req: Request, res: Response) => {
  // HTTP Cache Header: public catalog cached in browser/CDN for 1 hour
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({
    status: 'success',
    data: {
      brandsByCategory: BRAND_CATALOG,
      faultsByCategory: FAULTS_BY_CATEGORY
    }
  });
});

// GET /api/catalog/devices
router.get('/devices', async (req: Request, res: Response) => {
  const brand = req.query.brand as string | undefined;
  const deviceType = req.query.deviceType as string | undefined;

  const cacheKey = cache.constructor ? (cache as any).constructor.keys.deviceCatalog(brand, deviceType) : `catalog:${brand}:${deviceType}`;
  const cachedData = await cache.get(cacheKey);

  if (cachedData) {
    res.setHeader('X-Cache', 'HIT');
    res.json({ status: 'success', data: cachedData });
    return;
  }

  const items = await db.getDeviceCatalog(brand, deviceType);
  await cache.set(cacheKey, items, 3600); // 1 hour TTL

  res.setHeader('X-Cache', 'MISS');
  res.json({
    status: 'success',
    data: items
  });
});

// GET /api/catalog/validate-pin/:pin
router.get('/validate-pin/:pin', async (req: Request, res: Response): Promise<void> => {
  const pin = String(req.params.pin || '').trim();

  if (!/^\d{6}$/.test(pin)) {
    res.status(400).json({
      status: 'error',
      code: 'INVALID_PIN_FORMAT',
      message: 'PIN code must be exactly 6 numeric digits.'
    });
    return;
  }

  const cacheKey = `pin:serviceable:${pin}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    res.json({ status: 'success', data: cached });
    return;
  }

  const serviceable = await db.getServiceablePin(pin);
  if (!serviceable || !serviceable.is_active) {
    // Check if we have a nearest regional center to advise the user
    res.status(404).json({
      status: 'error',
      code: 'UNSERVICEABLE_PIN',
      message: `PIN code ${pin} is outside our direct pick-up network. Nearest serviceable metropolitan regions include Bengaluru (560001, 560038), Mumbai (400021), Delhi (110001), Hyderabad (500081), Chennai (600002), and Pune (411005).`,
      fallbackServiceCentre: {
        name: 'National Mail-in Repair Center',
        phone: '+91 80 4932 7700',
        operatingHours: '09:00 AM to 07:00 PM IST (Mon-Sat)',
        email: 'mail-in@repairassist.in'
      }
    });
    return;
  }

  const centre = await db.getServiceCentreById(serviceable.service_centre_id);

  const payload = {
    pinCode: serviceable.pin_code,
    city: serviceable.city,
    state: serviceable.state,
    serviceCentre: centre
  };

  await cache.set(cacheKey, payload, 3600); // 60 min TTL

  res.setHeader('X-Cache', 'MISS');
  res.json({
    status: 'success',
    data: payload
  });
});

// GET /api/catalog/service-centre/fallback
router.get('/service-centre/fallback', async (_req: Request, res: Response) => {
  const centre = await db.getServiceCentreById('sc_blr_01');
  res.json({
    status: 'success',
    data: centre
  });
});

export default router;
