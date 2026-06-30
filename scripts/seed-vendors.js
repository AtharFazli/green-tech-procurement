const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const uuidv4 = () => crypto.randomUUID();

const vendors = [
  { company: 'SolarNova Energy', country: 'US', green_certs: 'ISO 14001, Solar Certified, LEED', score: 92, desc: 'Premium solar panel manufacturing and installation with zero-waste production facilities' },
  { company: 'WindStream Tech', country: 'DE', green_certs: 'ISO 14001, TUV Rheinland, EU Ecolabel', score: 88, desc: 'Advanced wind turbine solutions for onshore and offshore applications' },
  { company: 'EcoCharge Systems', country: 'CN', green_certs: 'ISO 14001, RoHS, China Environmental Label', score: 75, desc: 'High-capacity lithium-ion battery packs for renewable energy storage' },
  { company: 'GreenHydrogen Labs', country: 'NL', green_certs: 'ISO 14001, EU Ecolabel, Carbon Trust', score: 90, desc: 'Green hydrogen production via electrolysis powered by renewable energy' },
  { company: 'BioPlastix Corp', country: 'FR', green_certs: 'OK Biodegradable, EU Ecolabel, Cradle to Cradle', score: 85, desc: 'Biodegradable polymers from agricultural waste for industrial packaging' },
  { company: 'AquaPure Solutions', country: 'SG', green_certs: 'ISO 14001, WaterSense, Green Mark', score: 78, desc: 'Smart water filtration systems with IoT monitoring for industrial use' },
  { company: 'TerraGrow Agritech', country: 'IL', green_certs: 'ISO 14001, Organic Certified, Fair Trade', score: 82, desc: 'Vertical farming systems with AI-driven climate optimization' },
  { company: 'CircuBuild Materials', country: 'CA', green_certs: 'ISO 14001, Cradle to Cradle, FSC Certified', score: 80, desc: 'Recycled construction materials from demolition waste and reclaimed wood' },
  { company: 'GreenFleet Logistics', country: 'SE', green_certs: 'ISO 14001, EU Ecolabel, CarbonNeutral', score: 86, desc: 'Electric last-mile delivery fleet powered by 100% renewable energy' },
  { company: 'EcoTextile Mill', country: 'IN', green_certs: 'GOTS, OEKO-TEX, Fair Trade, Bluesign', score: 74, desc: 'Organic cotton and hemp textiles processed with natural dyes and zero-water discharge' },
  { company: 'PureAir Technologies', country: 'JP', green_certs: 'ISO 14001, JIS Eco Mark, CASBEE', score: 83, desc: 'Industrial air purification systems using photocatalytic oxidation technology' },
  { company: 'WasteNot Converters', country: 'BR', green_certs: 'ISO 14001, Carbon Trust, EPEAT', score: 71, desc: 'Waste-to-energy conversion plants for municipal solid waste' },
  { company: 'AgriCarbon Credits', country: 'KE', green_certs: 'Fair Trade, Carbon Trust, Rainforest Alliance', score: 79, desc: 'Regenerative agriculture programs generating verified carbon credits' },
  { company: 'SmartGrid Dynamics', country: 'US', green_certs: 'ISO 14001, Energy Star, IEEE Green ICT', score: 87, desc: 'AI-powered smart grid management systems for utility-scale energy optimization' },
  { company: 'OceanRevive Technologies', country: 'AU', green_certs: 'ISO 14001, Marine Stewardship, Blue Flag', score: 76, desc: 'Ocean plastic cleanup drones and marine ecosystem restoration' },
  { company: 'EcoCool Data Centers', country: 'FI', green_certs: 'ISO 14001, EU Ecolabel, Climate Neutral', score: 91, desc: 'Carbon-neutral data centers using immersion cooling and waste heat recovery' },
  { company: 'SunHarvest Agriculture', country: 'ES', green_certs: 'Organic Certified, EU Ecolabel, Water Footprint', score: 77, desc: 'Solar-powered drip irrigation systems with soil moisture sensors' },
  { company: 'GreenSteel Manufacturing', country: 'UK', green_certs: 'ISO 14001, BES 6001, Carbon Trust Standard', score: 73, desc: 'Low-carbon steel production using hydrogen-based direct reduction process' },
  { company: 'BioFuel Innovations', country: 'MY', green_certs: 'ISO 14001, RSPO, ISCC', score: 72, desc: 'Second-generation biofuels from palm oil mill effluent and agricultural residue' },
  { company: 'EcoVapor Recovery', country: 'NO', green_certs: 'ISO 14001, EU Ecolabel, CarbonNeutral', score: 84, desc: 'Vapor recovery systems for oil and gas facilities reducing methane emissions by 95%' },
  { company: 'GreenRail Transit', country: 'CH', green_certs: 'ISO 14001, EU Ecolabel, Climate Neutral', score: 82, desc: 'Hydrogen-powered train systems and sustainable railway infrastructure' },
  { company: 'EcoPaint Solutions', country: 'IT', green_certs: 'EU Ecolabel, Cradle to Cradle, LEED Compliant', score: 76, desc: 'Zero-VOC paints and coatings made from recycled materials' },
  { company: 'VertiFarm Systems', country: 'JP', green_certs: 'Organic Certified, JAS, Eco Mark', score: 80, desc: 'Modular vertical farming containers with automated nutrient delivery' },
  { company: 'GreenBit Mining', country: 'CA', green_certs: 'ISO 14001, Energy Star, CarbonNeutral', score: 81, desc: 'Cryptocurrency mining powered entirely by stranded renewable energy assets' },
  { company: 'BioBuild Panels', country: 'PL', green_certs: 'Cradle to Cradle, FSC Certified, EU Ecolabel', score: 77, desc: 'Hemp-based construction panels with negative carbon footprint' },
  { company: 'AquaSmart Meters', country: 'UK', green_certs: 'ISO 14001, WaterSense', score: 74, desc: 'Smart water metering with AI leak detection and consumption analytics' },
  { company: 'EcoLight Tech', country: 'KR', green_certs: 'ISO 14001, Energy Star, KC Eco Label', score: 79, desc: 'High-efficiency OLED lighting panels with 95% energy reduction' },
  { company: 'GreenRoof Installers', country: 'DE', green_certs: 'FLL Certified, EU Ecolabel, DGNB', score: 78, desc: 'Green roof systems with native biodiversity and stormwater management' },
  { company: 'Waste2Wear Textiles', country: 'PT', green_certs: 'GOTS, OEKO-TEX, Bluesign, Fair Trade', score: 83, desc: 'Recycled polyester fabrics from ocean plastic waste for apparel industry' },
  { company: 'CarbonCapture Corp', country: 'US', green_certs: 'ISO 14001, Carbon Trust, VCS', score: 89, desc: 'Direct air capture systems removing CO2 from ambient air at scale' },
  { company: 'EcoPave Surfaces', country: 'AU', green_certs: 'ISO 14001, Green Building Council, Cradle to Cradle', score: 72, desc: 'Permeable recycled pavement for urban heat island reduction' },
  { company: 'SmartWaste Bins', country: 'SG', green_certs: 'ISO 14001, Green Mark', score: 75, desc: 'IoT-enabled waste bins with compaction and fill-level optimization' },
  { company: 'GreenAmmonia Tech', country: 'DK', green_certs: 'ISO 14001, EU Ecolabel, Carbon Trust', score: 86, desc: 'Green ammonia production using wind power for maritime fuel' },
  { company: 'BioCement Industries', country: 'IN', green_certs: 'ISO 14001, GRIHA, IGBC', score: 70, desc: 'Carbon-negative cement using bacteria-based bio-mineralization' },
  { company: 'EcoPackaging Lab', country: 'SE', green_certs: 'Cradle to Cradle, FSC Certified, EU Ecolabel', score: 84, desc: 'Mushroom-based packaging as compostable styrofoam alternative' },
  { company: 'HydroGen Mobility', country: 'DE', green_certs: 'ISO 14001, TUV Rheinland, CarbonNeutral', score: 85, desc: 'Hydrogen fuel cell systems for heavy-duty trucks and buses' },
  { company: 'GreenChem Solutions', country: 'NL', green_certs: 'ISO 14001, EU Ecolabel, Cradle to Cradle', score: 78, desc: 'Bio-based solvents and green chemistry for industrial cleaning' },
  { company: 'EcoDrone Services', country: 'ZA', green_certs: 'ISO 14001, Carbon Trust, Fair Trade', score: 73, desc: 'Electric drone fleet for precision agriculture and reforestation' },
  { company: 'ThermoEarth Geothermal', country: 'IS', green_certs: 'ISO 14001, EU Ecolabel, CarbonNeutral', score: 91, desc: 'Enhanced geothermal systems for baseload renewable energy' },
  { company: 'GreenFoam Insulation', country: 'US', green_certs: 'ISO 14001, LEED Compliant, Energy Star', score: 76, desc: 'Aerogel-based insulation from recycled silica' },
  { company: 'BioLubricants Co', country: 'FR', green_certs: 'EU Ecolabel, OK Biodegradable, Cradle to Cradle', score: 74, desc: 'Biodegradable industrial lubricants from vegetable oils' },
  { company: 'SolarSkin Panels', country: 'CN', green_certs: 'ISO 14001, TUV Rheinland, CQC Green', score: 77, desc: 'BIPV solar panels designed as building materials' },
  { company: 'EcoFleet Charging', country: 'NO', green_certs: 'ISO 14001, EU Ecolabel, Carbon Trust', score: 82, desc: 'Wireless EV charging integrated with smart grid demand response' },
  { company: 'GreenWave Energy', country: 'PT', green_certs: 'ISO 14001, Carbon Trust, EU Ecolabel', score: 80, desc: 'Wave energy converters with bi-directional turbine tech' },
  { company: 'WasteWatcher AI', country: 'EE', green_certs: 'ISO 14001, EU Ecolabel, EPEAT', score: 84, desc: 'AI-powered waste sorting robots achieving 99% purity' },
  { company: 'EcoHarvest Drones', country: 'BR', green_certs: 'ISO 14001, Organic Certified, Carbon Trust', score: 71, desc: 'Autonomous drone swarms for reforestation at scale' },
  { company: 'GreenBlock Masonry', country: 'CO', green_certs: 'LEED Compliant, Cradle to Cradle, FSC Certified', score: 69, desc: 'Compressed earth blocks with natural binders' },
  { company: 'BioChar Global', country: 'GH', green_certs: 'Fair Trade, Carbon Trust, Organic Certified', score: 75, desc: 'Biochar from agricultural waste for carbon sequestration' },
  { company: 'AquaCool Systems', country: 'AE', green_certs: 'ISO 14001, Energy Star, Estidama Pearl', score: 73, desc: 'District cooling using seawater heat exchange for arid climates' },
  { company: 'EcoTyre Recycling', country: 'ES', green_certs: 'ISO 14001, EU Ecolabel, Cradle to Cradle', score: 72, desc: 'End-of-life tire recycling into rubber modified asphalt' },
  { company: 'GreenAI Analytics', country: 'IE', green_certs: 'ISO 14001, Carbon Trust, EPEAT', score: 85, desc: 'ML-powered carbon accounting for supply chain optimization' },
  { company: 'HelioChem Fuels', country: 'US', green_certs: 'ISO 14001, Carbon Trust, Solar Certified', score: 81, desc: 'Solar thermochemical reactors converting CO2 into fuels' },
  { company: 'BioFiber Composites', country: 'PH', green_certs: 'FSC Certified, Organic Certified, Fair Trade', score: 70, desc: 'Abaca and coconut fiber composites for auto interiors' },
  { company: 'EcoCrush Aggregates', country: 'UK', green_certs: 'ISO 14001, BES 6001, Cradle to Cradle', score: 68, desc: 'Recycled concrete aggregates with carbon capture' },
  { company: 'WindWing Turbines', country: 'DK', green_certs: 'ISO 14001, TUV Rheinland, EU Ecolabel', score: 88, desc: 'Bladeless wind turbines using oscillating wing tech' },
  { company: 'GreenFilter Systems', country: 'US', green_certs: 'ISO 14001, WaterSense, NSF/ANSI 53', score: 74, desc: 'Bio-sand water filters for wastewater without chemicals' },
  { company: 'EcoCoat Technologies', country: 'CH', green_certs: 'ISO 14001, Cradle to Cradle, EU Ecolabel', score: 79, desc: 'Self-healing anti-corrosion coatings using microcapsules' },
  { company: 'SunCell Power', country: 'AU', green_certs: 'ISO 14001, Solar Certified, TUV Rheinland', score: 82, desc: 'Perovskite solar cells achieving 30% in flexible format' },
  { company: 'BioDigester Pro', country: 'TH', green_certs: 'ISO 14001, Carbon Trust, Organic Certified', score: 72, desc: 'Modular anaerobic digesters converting food waste to biogas' },
  { company: 'GreenHeat Pumps', country: 'SE', green_certs: 'ISO 14001, EU Ecolabel, Energy Star', score: 83, desc: 'High-temperature industrial heat pumps using CO2 refrigerant' },
  { company: 'EcoPlumb Systems', country: 'IL', green_certs: 'ISO 14001, WaterSense, Green Label', score: 76, desc: 'Greywater recycling with UV disinfection for buildings' },
  { company: 'CarbonFarm Credits', country: 'UY', green_certs: 'Carbon Trust, Fair Trade, Rainforest Alliance', score: 78, desc: 'Silvopasture systems generating carbon credits' },
  { company: 'GreenGas Networks', country: 'MY', green_certs: 'ISO 14001, ISCC, Carbon Trust', score: 71, desc: 'Biomethane injection into natural gas from palm waste' },
  { company: 'EcoLite Frames', country: 'IT', green_certs: 'Cradle to Cradle, FSC Certified, EU Ecolabel', score: 77, desc: 'Bamboo bicycle frames with hemp reinforcements' },
  { company: 'WavePiston Energy', country: 'UK', green_certs: 'ISO 14001, Carbon Trust, Marine Stewardship', score: 81, desc: 'Offshore wave energy piston arrays with minimal ecosystem impact' },
  { company: 'GreenMining Solutions', country: 'CL', green_certs: 'ISO 14001, Carbon Trust, Copper Mark', score: 70, desc: 'Waterless mineral processing using electrostatic separation' },
  { company: 'EcoSorb Materials', country: 'KR', green_certs: 'ISO 14001, KC Eco Label, Cradle to Cradle', score: 73, desc: 'Bio-based oil spill absorbents from cellulose aerogels' },
  { company: 'SolarDesal Systems', country: 'SA', green_certs: 'ISO 14001, WaterSense, Carbon Trust', score: 79, desc: 'Solar-powered desalination using membrane distillation' },
  { company: 'GreenServer Hosting', country: 'IS', green_certs: 'ISO 14001, EU Ecolabel, Climate Neutral', score: 90, desc: 'Carbon-negative cloud hosting powered by geothermal' },
  { company: 'BioAsphalt Tech', country: 'NL', green_certs: 'ISO 14001, Cradle to Cradle, EU Ecolabel', score: 75, desc: 'Lignin-based asphalt binder reducing petroleum use by 70%' },
  { company: 'EcoKool Refrigeration', country: 'DE', green_certs: 'ISO 14001, Energy Star, TUV Rheinland', score: 78, desc: 'Magnetic refrigeration using gadolinium alloys, zero GHG' },
  { company: 'GreenCement Ventures', country: 'IN', green_certs: 'ISO 14001, GRIHA, IGBC, Cradle to Cradle', score: 72, desc: 'Geopolymer cement from fly ash with 80% lower CO2' },
  { company: 'EcoWash Laundry', country: 'JP', green_certs: 'ISO 14001, WaterSense, Eco Mark', score: 76, desc: 'Ozone-based commercial laundry reducing water by 90%' },
  { company: 'BioSensor Diagnostics', country: 'SG', green_certs: 'ISO 14001, Green Mark, Carbon Trust', score: 84, desc: 'Enzymatic biosensors for real-time water monitoring' },
  { company: 'GreenTrack Logistics', country: 'US', green_certs: 'ISO 14001, CarbonNeutral, SmartWay', score: 80, desc: 'AI-optimized freight routing reducing empty miles by 35%' },
  { company: 'EcoMetal Recycling', country: 'ZA', green_certs: 'ISO 14001, Carbon Trust, EPEAT', score: 69, desc: 'Urban mining of precious metals from e-waste via bioleaching' },
  { company: 'SunBrick Construction', country: 'CN', green_certs: 'ISO 14001, CQC Green, LEED Compliant', score: 74, desc: 'Solar-reflective ceramic bricks reducing cooling load by 40%' },
  { company: 'GreenPack Logistics', country: 'PL', green_certs: 'ISO 14001, FSC Certified, Cradle to Cradle', score: 73, desc: 'Reusable smart packaging with RFID for circular supply chain' },
  { company: 'BioGlue Adhesives', country: 'DE', green_certs: 'EU Ecolabel, Cradle to Cradle, OK Biodegradable', score: 79, desc: 'Protein-based industrial adhesives from bloodmeal and soy' },
  { company: 'EcoVentilation Tech', country: 'SE', green_certs: 'ISO 14001, Energy Star, EU Ecolabel', score: 82, desc: 'Heat recovery ventilation with 95% efficiency for passive buildings' },
  { company: 'CarbonStone Aggregates', country: 'CA', green_certs: 'ISO 14001, Cradle to Cradle, Carbon Trust', score: 77, desc: 'Carbon-negative aggregates from mineralized CO2' },
  { company: 'GreenScreens Media', country: 'UK', green_certs: 'ISO 14001, Carbon Trust, EPEAT', score: 81, desc: 'E-ink digital signage powered by ambient light harvesting' },
  { company: 'EcoFertilizer Corp', country: 'EG', green_certs: 'Organic Certified, Carbon Trust, ISO 14001', score: 71, desc: 'Bio-fertilizers from nitrogen-fixing bacteria' },
  { company: 'ThermoPower Storage', country: 'ES', green_certs: 'ISO 14001, TUV Rheinland, Energy Star', score: 86, desc: 'Molten salt thermal storage for concentrated solar power' },
  { company: 'GreenPump Hydraulics', country: 'IT', green_certs: 'ISO 14001, EU Ecolabel, Cradle to Cradle', score: 75, desc: 'Water hydraulic systems eliminating mineral oil from machinery' },
  { company: 'BioPlas Packaging', country: 'BR', green_certs: 'FSC Certified, OK Compost, Organic Certified', score: 73, desc: 'Compostable packaging from cassava starch and bagasse' },
  { company: 'EcoGuard Pesticides', country: 'KE', green_certs: 'Organic Certified, Fair Trade, Rainforest Alliance', score: 76, desc: 'Neem-based biopesticides through cooperative farming' },
  { company: 'SolarWeave Fabrics', country: 'US', green_certs: 'ISO 14001, Cradle to Cradle, Solar Certified', score: 83, desc: 'Textile-integrated photovoltaic fabrics for building facades' },
  { company: 'GreenShred Recycling', country: 'AU', green_certs: 'ISO 14001, Carbon Trust, EPEAT', score: 70, desc: 'Industrial shredding for end-of-life wind turbine blades' },
  { company: 'BioStim Growth', country: 'FR', green_certs: 'Organic Certified, EU Ecolabel, Carbon Trust', score: 78, desc: 'Seaweed-based biostimulants enhancing crop yield' },
  { company: 'EcoChill Cooling', country: 'SG', green_certs: 'ISO 14001, Green Mark, Energy Star', score: 77, desc: 'District cooling using ice thermal storage for data centers' },
  { company: 'WindFish Turbines', country: 'NO', green_certs: 'ISO 14001, Carbon Trust, Marine Stewardship', score: 85, desc: 'Fish-friendly underwater tidal turbines with biomimetic blades' },
  { company: 'GreenCode Software', country: 'EE', green_certs: 'ISO 14001, EPEAT, Carbon Trust', score: 88, desc: 'Energy-efficient compilers reducing CPU cycles by 40%' },
  { company: 'EcoReef Marine', country: 'MV', green_certs: 'ISO 14001, Marine Stewardship, Blue Flag', score: 72, desc: '3D-printed artificial coral reefs from seawater calcium' },
  { company: 'BioCeramic Filters', country: 'JP', green_certs: 'ISO 14001, JIS Eco Mark, Cradle to Cradle', score: 80, desc: 'Diatomaceous earth ceramic filters for microplastic removal' },
  { company: 'GreenCryo Tech', country: 'CH', green_certs: 'ISO 14001, Carbon Trust, EU Ecolabel', score: 84, desc: 'Liquid air energy storage for grid-scale duration' },
  { company: 'EcoMud Drilling', country: 'US', green_certs: 'ISO 14001, Carbon Trust, API Monogram', score: 71, desc: 'Biodegradable drilling fluids from guar gum for geothermal' },
  { company: 'SolarDew Water', country: 'IL', green_certs: 'ISO 14001, WaterSense, Carbon Trust', score: 76, desc: 'Atmospheric water generators powered by solar PV' },
  { company: 'BioNano Filters', country: 'KR', green_certs: 'ISO 14001, KC Eco Label, Cradle to Cradle', score: 83, desc: 'Graphene oxide membrane filters for brine concentration' },
  { company: 'GreenAisle Retail', country: 'UK', green_certs: 'B Corp, Carbon Trust, Fair Trade, LEED', score: 79, desc: 'Zero-waste grocery platform with reusable containers' },
  { company: 'EcoSonic Sensors', country: 'IE', green_certs: 'ISO 14001, EPEAT, Carbon Trust', score: 82, desc: 'Acoustic sensors for biodiversity monitoring via soundscape' },
  { company: 'ThermoGreen Insulation', country: 'DE', green_certs: 'Cradle to Cradle, EU Ecolabel, FSC Certified', score: 78, desc: 'Wood fiber insulation boards with vapor-open construction' },
  { company: 'GreenSwell Energy', country: 'PT', green_certs: 'ISO 14001, Carbon Trust, Marine Stewardship', score: 81, desc: 'Swell energy harvesters using dielectric elastomer generators' },
];

const passwordHash = bcrypt.hashSync('vendor123', 10);
const now = new Date().toISOString();

const insertUser = db.prepare("INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 'vendor', 1, ?, ?)");
const insertVendor = db.prepare("INSERT INTO vendors (id, user_id, company_name, description, website, address, country, tax_id, green_certifications, sustainability_score, is_approved, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)");

const txn = db.transaction(() => {
  for (const v of vendors) {
    const userId = uuidv4();
    const vendorId = uuidv4();
    const safeName = v.company.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = safeName + Math.floor(Math.random() * 900 + 100) + '@greentech.com';
    const website = 'https://www.' + safeName + '.com';
    const address = (Math.floor(Math.random() * 999) + 1) + ' Green Street, Suite ' + (Math.floor(Math.random() * 100) + 1);
    const taxId = 'TAX-' + (1000000 + Math.floor(Math.random() * 9000000));
    insertUser.run(userId, email, passwordHash, v.company, now, now);
    insertVendor.run(vendorId, userId, v.company, v.desc, website, address, v.country, taxId, v.green_certs, v.score, now, now);
  }
  return vendors.length;
});

const count = txn();
console.log('Inserted ' + count + ' green tech vendors into database');
