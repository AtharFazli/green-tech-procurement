const path = require('path');
const bcrypt = require('bcryptjs');
const db = require(path.join(__dirname, '..', 'config', 'db'));
const ActivityLog = require(path.join(__dirname, '..', 'models', 'ActivityLogModel'));
const ProductModel = require(path.join(__dirname, '..', 'models', 'ProductModel'));
const RFPModel = require(path.join(__dirname, '..', 'models', 'RFPModel'));
const RFPLineItemModel = require(path.join(__dirname, '..', 'models', 'RFPLineItemModel'));
const BidModel = require(path.join(__dirname, '..', 'models', 'BidModel'));
const BidLineItemModel = require(path.join(__dirname, '..', 'models', 'BidLineItemModel'));

const pw = bcrypt.hashSync('buyer123', 10);

// 5 buyers
const buyers = [
  { name: 'EcoCorp International', email: 'ecocorp@buyer.com' },
  { name: 'GreenBuild Partners', email: 'greenbuild@buyer.com' },
  { name: 'Sustainable Ventures Ltd', email: 'sustventures@buyer.com' },
  { name: 'ClearEnergy Solutions', email: 'clearenergy@buyer.com' },
  { name: 'NatureFirst Procurement', email: 'naturefirst@buyer.com' },
];

// 6 categories
const categories = [
  { name: 'Solar & Renewable Energy', slug: 'solar-renewable' },
  { name: 'Energy Storage & Batteries', slug: 'energy-storage' },
  { name: 'Sustainable Materials', slug: 'sustainable-materials' },
  { name: 'Waste Management & Recycling', slug: 'waste-management' },
  { name: 'Green Building & Construction', slug: 'green-building' },
  { name: 'Water & Environmental Tech', slug: 'water-enviro-tech' },
];

const rfpTemplates = [
  { title: 'Utility-Scale Solar Panel Supply', desc: 'Seeking qualified vendors for 50MW solar farm panel supply with bifacial modules and 25-year performance warranty', budget_min: 5000000, budget_max: 8500000, green: true },
  { title: 'Lithium Battery Storage System', desc: 'Grid-scale battery storage system 100MWh capacity with BMS and 15-year lifecycle', budget_min: 12000000, budget_max: 18000000, green: true },
  { title: 'Recycled Construction Materials', desc: 'Annual supply of recycled aggregate and reclaimed wood for LEED-certified building project', budget_min: 800000, budget_max: 1500000, green: true },
  { title: 'EV Fleet Charging Infrastructure', desc: 'Installation of 200 EV charging stations across 5 facility locations with smart load management', budget_min: 2500000, budget_max: 4000000, green: true },
  { title: 'Industrial Wastewater Treatment', desc: 'Zero-liquid-discharge wastewater treatment system for manufacturing facility, 2M gallons/day capacity', budget_min: 3000000, budget_max: 5500000, green: true },
  { title: 'Green Hydrogen Production Plant', desc: '10MW electrolyzer plant with compression and storage for industrial hydrogen supply', budget_min: 15000000, budget_max: 25000000, green: true },
  { title: 'Sustainable Packaging Supply', desc: 'Annual supply of compostable packaging materials for food processing division, 500K units/month', budget_min: 400000, budget_max: 750000, green: true },
  { title: 'HVAC System Retrofit', desc: 'Energy-efficient HVAC replacement across 3 office buildings including heat pumps and smart controls', budget_min: 1800000, budget_max: 2800000, green: false },
  { title: 'Solar Rooftop Installation', desc: '2MW rooftop solar PV installation across warehouse and office facilities with net metering', budget_min: 1200000, budget_max: 2000000, green: true },
  { title: 'Carbon Accounting Software', desc: 'Enterprise carbon accounting platform with supply chain scope 3 tracking and reporting', budget_min: 150000, budget_max: 350000, green: true },
  { title: 'Green Office Furniture', desc: '500 workstations using recycled and FSC-certified materials with ergonomic design', budget_min: 600000, budget_max: 1000000, green: true },
  { title: 'Wind Turbine Maintenance', desc: '3-year maintenance contract for 15 MW wind farm including parts and remote monitoring', budget_min: 2200000, budget_max: 3500000, green: true },
  { title: 'Smart Water Metering System', desc: 'Installation of 10000 smart water meters with IoT platform and leak detection analytics', budget_min: 900000, budget_max: 1500000, green: true },
  { title: 'E-Waste Recycling Program', desc: 'Nationwide e-waste collection and recycling program for corporate IT equipment disposal', budget_min: 200000, budget_max: 400000, green: true },
  { title: 'LED Lighting Retrofit', desc: 'LED lighting upgrade across 8 facilities with smart controls and daylight harvesting', budget_min: 750000, budget_max: 1200000, green: true },
  { title: 'Energy Management System', desc: 'Enterprise EMS platform with real-time monitoring, AI optimization and ISO 50001 compliance', budget_min: 350000, budget_max: 600000, green: false },
  { title: 'Green Data Center Cooling', desc: 'Immersion cooling system retrofit for legacy data center reducing PUE from 1.6 to 1.05', budget_min: 4500000, budget_max: 7000000, green: true },
  { title: 'Biodegradable Cleaning Products', desc: 'Annual supply of industrial cleaning chemicals — bio-based, zero-VOC, 100K gallons/year', budget_min: 120000, budget_max: 250000, green: true },
  { title: 'Electric Cargo Bikes Fleet', desc: '100 electric cargo bikes for last-mile urban delivery operations with battery swap system', budget_min: 500000, budget_max: 850000, green: true },
  { title: 'Reforestation Drone Services', desc: 'Aerial seeding and monitoring for 5000 hectare reforestation project with survival tracking', budget_min: 800000, budget_max: 1300000, green: true },
];

// Line item templates per RFP
const lineItemSets = [
  [{ n: 'Bifacial Solar Panels 550W', q: 90000, u: 'units' }, { n: 'Mounting Structure Aluminum', q: 90000, u: 'units' }, { n: 'Inverter String 250kW', q: 200, u: 'units' }, { n: 'Monitoring System', q: 1, u: 'lot' }],
  [{ n: 'LFP Battery Cells', q: 20000, u: 'modules' }, { n: 'Battery Management System', q: 1, u: 'lot' }, { n: 'Thermal Management Unit', q: 50, u: 'units' }],
  [{ n: 'Recycled Concrete Aggregate', q: 50000, u: 'tons' }, { n: 'Reclaimed Wood Planks', q: 10000, u: 'board ft' }, { n: 'Recycled Steel Rebar', q: 5000, u: 'tons' }],
  [{ n: 'Level 2 AC Charger', q: 180, u: 'units' }, { n: 'DC Fast Charger 150kW', q: 20, u: 'units' }, { n: 'Load Management Software', q: 1, u: 'lot' }, { n: 'Installation Labor', q: 5, u: 'sites' }],
  [{ n: 'Membrane Bioreactor', q: 8, u: 'units' }, { n: 'Reverse Osmosis System', q: 4, u: 'units' }, { n: 'UV Disinfection Unit', q: 2, u: 'units' }],
  [{ n: 'PEM Electrolyzer 5MW', q: 2, u: 'units' }, { n: 'Hydrogen Compressor', q: 4, u: 'units' }, { n: 'Storage Tanks 500bar', q: 10, u: 'units' }],
  [{ n: 'Compostable Clamshells', q: 3000000, u: 'units' }, { n: 'Compostable Cutlery Sets', q: 2000000, u: 'sets' }, { n: 'Paper Straws', q: 1000000, u: 'units' }],
  [{ n: 'Air Source Heat Pump 50kW', q: 12, u: 'units' }, { n: 'Smart Thermostat System', q: 1, u: 'lot' }, { n: 'Ductwork & Insulation', q: 3, u: 'buildings' }],
  [{ n: 'Solar Panel 400W', q: 5000, u: 'units' }, { n: 'Microinverter', q: 5000, u: 'units' }, { n: 'Roof Mount System', q: 1, u: 'lot' }],
  [{ n: 'Carbon Accounting License', q: 3, u: 'years' }, { n: 'Implementation & Training', q: 1, u: 'lot' }, { n: 'API Integration', q: 3, u: 'systems' }],
  [{ n: 'Ergonomic Desk Standing', q: 500, u: 'units' }, { n: 'Recycled Material Chair', q: 500, u: 'units' }, { n: 'FSC Desk', q: 500, u: 'units' }],
  [{ n: 'Gearbox Overhaul Kit', q: 15, u: 'sets' }, { n: 'Blade Inspection Drone', q: 1, u: 'unit' }, { n: 'Remote Monitoring Platform', q: 3, u: 'years' }],
  [{ n: 'Smart Water Meter', q: 10000, u: 'units' }, { n: 'IoT Gateway', q: 200, u: 'units' }, { n: 'Analytics Platform', q: 1, u: 'lot' }],
  [{ n: 'Collection Bins', q: 500, u: 'units' }, { n: 'Transport Logistics', q: 12, u: 'months' }, { n: 'Data Destruction Service', q: 5000, u: 'devices' }],
  [{ n: 'LED Panel 2x2 40W', q: 8000, u: 'units' }, { n: 'Occupancy Sensor', q: 2000, u: 'units' }, { n: 'Daylight Harvesting Controller', q: 2000, u: 'units' }],
  [{ n: 'EMS Platform License', q: 5, u: 'years' }, { n: 'IoT Sensors Bundle', q: 500, u: 'units' }, { n: 'Commissioning Services', q: 1, u: 'lot' }],
  [{ n: 'Immersion Cooling Tank', q: 20, u: 'units' }, { n: 'Dielectric Fluid 500L', q: 40, u: 'drums' }, { n: 'Coolant Distribution Unit', q: 5, u: 'units' }],
  [{ n: 'Bio-Cleaning Concentrate', q: 50000, u: 'gallons' }, { n: 'Refillable Dispenser', q: 500, u: 'units' }, { n: 'Dilution Control System', q: 50, u: 'units' }],
  [{ n: 'Electric Cargo Bike', q: 100, u: 'units' }, { n: 'Swappable Battery Pack', q: 200, u: 'units' }, { n: 'Charging Station 10-Bay', q: 10, u: 'units' }],
  [{ n: 'Seeding Drone Fleet', q: 20, u: 'units' }, { n: 'Seed Pods 1000-seed', q: 5000, u: 'pods' }, { n: 'Survival Monitoring System', q: 1, u: 'lot' }],
];

const now = new Date().toISOString();
const seedTxn = db.transaction(() => {
  const buyerIds = buyers.map(b => {
    const uid = require('crypto').randomUUID();
    db.prepare("INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at) VALUES (?,?,?,?,'buyer',1,?,?)").run(uid, b.email, pw, b.name, now, now);
    ActivityLog.log(uid, 'account.created', 'user', uid, { role: 'buyer', name: b.name });
    return uid;
  });

  const catIds = categories.map(c => {
    const cid = require('crypto').randomUUID();
    db.prepare("INSERT INTO product_categories (id, name, slug, description, created_at) VALUES (?,?,?,?,?)").run(cid, c.name, c.slug, c.name + ' category', now);
    return cid;
  });

  const vendorRows = db.prepare("SELECT id, user_id FROM vendors").all();

  // 3 products per vendor, mix categories
  const productNames = [
    'Solar Panel 550W Mono', 'Lithium Battery 5kWh', 'Recycled Steel Beam', 'Smart Thermostat Pro',
    'Eco Insulation Board', 'Water Filter System', 'Green Concrete Mix', 'LED Panel 40W',
    'Biodegradable Film Roll', 'Wind Turbine Blade', 'Heat Pump Unit', 'Carbon Filter Media',
    'Recycled Plastic Lumber', 'Solar Inverter 10kW', 'Compostable Bag 50L', 'IoT Sensor Hub',
    'Aluminum Frame Recycled', 'Battery Management PCB', 'Eco Paint 5L', 'Rainwater Harvest Tank',
  ];
  let prodCount = 0;
  vendorRows.forEach(v => {
    const n = 2 + Math.floor(Math.random() * 2); // 2-3 products
    for (let i = 0; i < n; i++) {
      const name = productNames[prodCount % productNames.length] + ' ' + v.id.slice(0, 4);
      ProductModel.create({
        vendor_id: v.id,
        category_id: catIds[Math.floor(Math.random() * catIds.length)],
        name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: 'High-quality ' + name + ' for sustainable projects',
        unit: 'unit', base_price: 10 + Math.random() * 5000,
        carbon_footprint_kg: Math.round(Math.random() * 100),
        is_green_certified: Math.random() > 0.3,
        stock_qty: Math.floor(Math.random() * 1000),
      });
      prodCount++;
    }
  });

  // 20 RFPs from random buyers, spread over last 3 months
  const rfpIds = [];
  rfpTemplates.forEach((t, i) => {
    const buyerId = buyerIds[i % buyerIds.length];
    const daysAgo = Math.floor(Math.random() * 90);
    const deadline = new Date(Date.now() - daysAgo * 86400000 + (30 + Math.floor(Math.random() * 60)) * 86400000);
    const rfp = RFPModel.create({
      buyer_id: buyerId,
      title: t.title, description: t.desc,
      deadline: deadline.toISOString(),
      budget_min: t.budget_min, budget_max: t.budget_max,
      is_green_rfp: t.green,
    });
    // Publish most
    if (Math.random() > 0.2) {
      db.prepare("UPDATE rfps SET status='open', updated_at=? WHERE id=?").run(now, rfp.id);
    }
    rfpIds.push(rfp.id);
  });

  // Line items for each RFP
  rfpIds.forEach((rid, i) => {
    const items = lineItemSets[i % lineItemSets.length];
    RFPLineItemModel.bulkCreate(rid, items.map((it, idx) => ({
      item_name: it.n, quantity: it.q, unit: it.u, estimated_price: 10 + Math.random() * 500, sort_order: idx + 1,
    })));
  });

  // Bids — 3-6 per RFP
  let bidCount = 0;
  rfpIds.forEach((rid, i) => {
    const numBids = 3 + Math.floor(Math.random() * 4);
    const shuffled = [...vendorRows].sort(() => Math.random() - 0.5).slice(0, numBids);
    const lineItems = RFPLineItemModel.findByRFP(rid);
    shuffled.forEach((v, vi) => {
      const total = (50000 + Math.random() * 5000000) * (0.8 + Math.random() * 0.4); // spread pricing
      const bid = BidModel.create({
        rfp_id: rid, vendor_id: v.id,
        total_amount: Math.round(total * 100) / 100,
        delivery_timeline_days: 30 + Math.floor(Math.random() * 180),
        sustainability_notes: 'Our green process reduces carbon by ' + (20 + Math.floor(Math.random() * 50)) + '%',
        carbon_offset_included: Math.random() > 0.5,
      });
      // Line items for bid
      BidLineItemModel.bulkCreate(bid.id, lineItems.map(li => ({
        rfp_line_item_id: li.id,
        unit_price: Math.round((1 + Math.random() * 500) * 100) / 100,
        quantity: li.quantity,
        green_score: Math.round(Math.random() * 100),
      })));
      bidCount++;

      // Award some RFPs to first bid
      if (vi === 0 && Math.random() > 0.6 && i % 3 === 0) {
        db.prepare("UPDATE rfps SET status='awarded', awarded_bid_id=?, updated_at=? WHERE id=?").run(bid.id, now, rid);
        db.prepare("UPDATE bids SET is_winner=1, updated_at=? WHERE id=?").run(now, bid.id);
      }
    });
  });
});

seedTxn();
const counts = db.prepare("SELECT 'users' t, COUNT(*) c FROM users UNION SELECT 'vendors', COUNT(*) FROM vendors UNION SELECT 'products', COUNT(*) FROM products UNION SELECT 'rfps', COUNT(*) FROM rfps UNION SELECT 'bids', COUNT(*) FROM bids UNION SELECT 'activity_logs', COUNT(*) FROM activity_logs").all();
counts.forEach(r => console.log(r.t + ': ' + r.c));
console.log('\nBuyer login: ecocorp@buyer.com / buyer123');
console.log('Vendor login: any vendor email (e.g. solarnovaenergy###@greentech.com) / vendor123');
