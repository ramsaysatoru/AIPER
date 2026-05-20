/**
 * Seed script: populates the Parameter collection with standard food testing parameters.
 * Run once: node seedParameters.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const parameterSchema = new mongoose.Schema({
  s_no: { type: Number, unique: true },
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Micro', 'Chemical'], required: true },
  unit: { type: String, required: true }
}, { timestamps: true });

const Parameter = mongoose.model('Parameter', parameterSchema);

const parameters = [
  // ── MICROBIOLOGICAL ──
  { name: 'Total Plate Count (TPC)', type: 'Micro', unit: 'CFU/g' },
  { name: 'Total Coliform Count', type: 'Micro', unit: 'CFU/g' },
  { name: 'E. coli Count', type: 'Micro', unit: 'CFU/g' },
  { name: 'Yeast & Mould Count', type: 'Micro', unit: 'CFU/g' },
  { name: 'Staphylococcus aureus', type: 'Micro', unit: 'CFU/g' },
  { name: 'Salmonella spp.', type: 'Micro', unit: 'Absent/25g' },
  { name: 'Listeria monocytogenes', type: 'Micro', unit: 'Absent/25g' },
  { name: 'Bacillus cereus', type: 'Micro', unit: 'CFU/g' },
  { name: 'Clostridium perfringens', type: 'Micro', unit: 'CFU/g' },
  { name: 'Lactic Acid Bacteria (LAB)', type: 'Micro', unit: 'CFU/g' },
  { name: 'Faecal Coliform', type: 'Micro', unit: 'CFU/g' },
  { name: 'Aerobic Plate Count (APC)', type: 'Micro', unit: 'CFU/mL' },
  { name: 'Pseudomonas spp.', type: 'Micro', unit: 'CFU/g' },
  { name: 'Enterobacteriaceae Count', type: 'Micro', unit: 'CFU/g' },
  { name: 'Campylobacter spp.', type: 'Micro', unit: 'Absent/25g' },

  // ── CHEMICAL / PHYSICOCHEMICAL ──
  { name: 'pH', type: 'Chemical', unit: 'pH units' },
  { name: 'Moisture Content', type: 'Chemical', unit: '%' },
  { name: 'Ash Content', type: 'Chemical', unit: '%' },
  { name: 'Crude Protein', type: 'Chemical', unit: '%' },
  { name: 'Crude Fat', type: 'Chemical', unit: '%' },
  { name: 'Crude Fibre', type: 'Chemical', unit: '%' },
  { name: 'Total Carbohydrates', type: 'Chemical', unit: '%' },
  { name: 'Total Sugars', type: 'Chemical', unit: 'g/100g' },
  { name: 'Reducing Sugars', type: 'Chemical', unit: 'g/100g' },
  { name: 'Total Dissolved Solids (TDS)', type: 'Chemical', unit: 'mg/L' },
  { name: 'Titratable Acidity', type: 'Chemical', unit: '%' },
  { name: 'Water Activity (Aw)', type: 'Chemical', unit: 'Aw' },
  { name: 'Sodium (Na)', type: 'Chemical', unit: 'mg/100g' },
  { name: 'Potassium (K)', type: 'Chemical', unit: 'mg/100g' },
  { name: 'Calcium (Ca)', type: 'Chemical', unit: 'mg/100g' },
  { name: 'Iron (Fe)', type: 'Chemical', unit: 'mg/100g' },
  { name: 'Zinc (Zn)', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Lead (Pb)', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Cadmium (Cd)', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Arsenic (As)', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Mercury (Hg)', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Total Aflatoxins', type: 'Chemical', unit: 'µg/kg' },
  { name: 'Aflatoxin B1', type: 'Chemical', unit: 'µg/kg' },
  { name: 'Nitrate', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Nitrite', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Sulphur Dioxide (SO₂)', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Benzoic Acid', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Sorbic Acid', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Acidity Index (Oil)', type: 'Chemical', unit: 'mg KOH/g' },
  { name: 'Peroxide Value (Oil)', type: 'Chemical', unit: 'mEq O₂/kg' },
  { name: 'Iodine Value', type: 'Chemical', unit: 'g I₂/100g' },
  { name: 'Saponification Value', type: 'Chemical', unit: 'mg KOH/g' },
  { name: 'Trans Fatty Acids', type: 'Chemical', unit: '%' },
  { name: 'Cholesterol', type: 'Chemical', unit: 'mg/100g' },
  { name: 'Vitamin C (Ascorbic Acid)', type: 'Chemical', unit: 'mg/100g' },
  { name: 'Vitamin A', type: 'Chemical', unit: 'µg/100g' },
  { name: 'Vitamin D', type: 'Chemical', unit: 'µg/100g' },
  { name: 'Calorific Value', type: 'Chemical', unit: 'kcal/100g' },
  { name: 'Brix (°Brix)', type: 'Chemical', unit: '°Bx' },
  { name: 'Salt Content (NaCl)', type: 'Chemical', unit: '%' },
  { name: 'Formaldehyde', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Hydrogen Cyanide (HCN)', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Pesticide Residues (Total)', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Melamine', type: 'Chemical', unit: 'mg/kg' },
  { name: 'Urea (Milk Adulteration)', type: 'Chemical', unit: '%' },
  { name: 'Starch Content', type: 'Chemical', unit: '%' },
];

async function seed() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodlab';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    let added = 0, skipped = 0;
    for (let i = 0; i < parameters.length; i++) {
      const p = parameters[i];
      const exists = await Parameter.findOne({ name: { $regex: new RegExp(`^${p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
      if (exists) {
        skipped++;
        continue;
      }
      // Assign s_no manually to avoid race condition
      const last = await Parameter.findOne({}, {}, { sort: { s_no: -1 } });
      const s_no = last && last.s_no ? last.s_no + 1 : 1;
      await Parameter.create({ ...p, s_no });
      added++;
      process.stdout.write(`\r  Added ${added} parameters...`);
    }

    console.log(`\n\nDone! Added: ${added}, Already existed (skipped): ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error('\nSeed error:', err.message);
    process.exit(1);
  }
}

seed();
