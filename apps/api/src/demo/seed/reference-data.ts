import type { DosageForm } from '@prisma/client';

/**
 * Catalogue reference data. All medicine, product and test records are fictional
 * demonstration content and must not be used for medical decisions.
 */

export const LOCALITIES = [
  'Central District',
  'Lake View',
  'Green Hills',
  'City Centre',
  'North Avenue',
  'Tech Park',
  'Riverside',
] as const;

export const CITY = 'Bengaluru';
export const STATE = 'Karnataka';

export const LOCALITY_POSTCODES: Record<string, string> = {
  'Central District': '560001',
  'Lake View': '560034',
  'Green Hills': '560076',
  'City Centre': '560009',
  'North Avenue': '560024',
  'Tech Park': '560103',
  Riverside: '560062',
};

export interface SpecialtySeed {
  name: string;
  slug: string;
  icon: string;
  description: string;
}

export const SPECIALTIES: SpecialtySeed[] = [
  { name: 'General Physician', slug: 'general-physician', icon: 'stethoscope', description: 'Fever, infections, lifestyle conditions and everyday health concerns.' },
  { name: 'Dermatologist', slug: 'dermatologist', icon: 'sparkles', description: 'Skin, hair and nail conditions including acne, allergies and pigmentation.' },
  { name: 'Pediatrician', slug: 'pediatrician', icon: 'baby', description: 'Healthcare for infants, children and adolescents.' },
  { name: 'Cardiologist', slug: 'cardiologist', icon: 'heart-pulse', description: 'Heart health, blood pressure and cardiovascular care.' },
  { name: 'Orthopedic', slug: 'orthopedic', icon: 'bone', description: 'Bones, joints, sports injuries and back pain.' },
  { name: 'Gynecologist', slug: 'gynecologist', icon: 'heart-handshake', description: "Women's health, pregnancy and reproductive care." },
  { name: 'Dentist', slug: 'dentist', icon: 'smile', description: 'Dental check-ups, cleaning, fillings and oral care.' },
  { name: 'ENT Specialist', slug: 'ent-specialist', icon: 'ear', description: 'Ear, nose, throat and sinus conditions.' },
  { name: 'Ophthalmologist', slug: 'ophthalmologist', icon: 'eye', description: 'Eye examinations, vision care and eye conditions.' },
  { name: 'Physiotherapist', slug: 'physiotherapist', icon: 'activity', description: 'Rehabilitation, mobility and pain management.' },
  { name: 'Neurologist', slug: 'neurologist', icon: 'brain', description: 'Headaches, nerve and neurological conditions.' },
  { name: 'Psychiatrist', slug: 'psychiatrist', icon: 'brain-circuit', description: 'Mental health, stress, sleep and emotional wellbeing.' },
];

export interface CategorySeed {
  name: string;
  slug: string;
  icon: string;
  colorTheme: string;
  description: string;
}

export const MEDICINE_CATEGORIES: CategorySeed[] = [
  { name: 'Pain Relief', slug: 'pain-relief', icon: 'pill', colorTheme: 'mint', description: 'Tablets, gels and sprays for everyday aches.' },
  { name: 'Cold & Cough', slug: 'cold-cough', icon: 'thermometer', colorTheme: 'blue', description: 'Syrups, lozenges and allergy relief.' },
  { name: 'Vitamins & Supplements', slug: 'vitamins-supplements', icon: 'citrus', colorTheme: 'cream', description: 'Daily nutrition and immunity support.' },
  { name: 'Diabetes Care', slug: 'diabetes-care', icon: 'droplet', colorTheme: 'lavender', description: 'Glucometers, strips and diabetes essentials.' },
  { name: 'First Aid', slug: 'first-aid', icon: 'cross', colorTheme: 'pink', description: 'Bandages, antiseptics and wound care.' },
  { name: 'Personal Care', slug: 'personal-care', icon: 'hand-heart', colorTheme: 'mint', description: 'Hygiene and everyday personal care.' },
  { name: 'Baby Care', slug: 'baby-care', icon: 'baby', colorTheme: 'cream', description: 'Gentle care for little ones.' },
  { name: 'Digestive Health', slug: 'digestive-health', icon: 'salad', colorTheme: 'blue', description: 'Antacids, probiotics and digestive support.' },
  { name: 'Skin Care', slug: 'skin-care', icon: 'sparkles', colorTheme: 'pink', description: 'Moisturisers, sunscreens and dermatology products.' },
  { name: 'Health Devices', slug: 'health-devices', icon: 'monitor-smartphone', colorTheme: 'lavender', description: 'Thermometers, BP monitors and oximeters.' },
  { name: "Women's Wellness", slug: 'womens-wellness', icon: 'flower-2', colorTheme: 'pink', description: "Supplements and care for women's health." },
  { name: 'Elder Care', slug: 'elder-care', icon: 'hand-helping', colorTheme: 'cream', description: 'Mobility aids and care for seniors.' },
];

export interface MedicineSeed {
  key: string;
  name: string;
  genericName: string;
  brand: string;
  manufacturer: string;
  strength: string | null;
  dosageForm: DosageForm;
  packSize: string;
  mrp: number;
  requiresPrescription: boolean;
  category: string;
  description: string;
}

const MFG = {
  hcl: 'HealthCare Labs',
  sun: 'Sunleaf Pharma',
  med: 'Medivia Life Sciences',
  aro: 'Arogya Remedies',
  blu: 'BlueRiver Pharma',
  nuv: 'Nuvia Wellness',
  cpd: 'CarePlus Devices',
  him: 'Himgiri Naturals',
} as const;

function m(
  key: string,
  name: string,
  genericName: string,
  brand: string,
  manufacturer: string,
  strength: string | null,
  dosageForm: DosageForm,
  packSize: string,
  mrp: number,
  requiresPrescription: boolean,
  category: string,
  description: string,
): MedicineSeed {
  return { key, name, genericName, brand, manufacturer, strength, dosageForm, packSize, mrp, requiresPrescription, category, description };
}

/** `key` is a stable identifier used by clinical templates and the golden scenario. */
export const MEDICINES: MedicineSeed[] = [
  // Pain relief
  m('paracetamol-500', 'Demo Paracetamol 500mg', 'Paracetamol (demo)', 'Paracare-D', MFG.hcl, '500 mg', 'TABLET', '15 Tablets', 35, false, 'pain-relief', 'Demo listing for a common fever and pain relief tablet.'),
  m('paracetamol-650', 'Demo Paracetamol 650mg', 'Paracetamol (demo)', 'Paracare-D 650', MFG.hcl, '650 mg', 'TABLET', '15 Tablets', 42, false, 'pain-relief', 'Demo listing for a higher-strength paracetamol tablet.'),
  m('ibuprofen-400', 'Demo Ibuprofen 400mg', 'Ibuprofen (demo)', 'Ibuflex-D', MFG.sun, '400 mg', 'TABLET', '10 Tablets', 48, true, 'pain-relief', 'Demo listing for an anti-inflammatory tablet.'),
  m('diclofenac-gel', 'Demo Diclofenac Gel 30g', 'Diclofenac (demo)', 'FlexiGel-D', MFG.aro, '1% w/w', 'GEL', '30 g Tube', 125, false, 'pain-relief', 'Demo listing for a topical pain relief gel.'),
  m('aceclofenac-para', 'Demo Aceclofenac + Paracetamol', 'Aceclofenac + Paracetamol (demo)', 'AceRelief-D', MFG.med, '100 mg / 325 mg', 'TABLET', '10 Tablets', 95, true, 'pain-relief', 'Demo listing for a combination pain relief tablet.'),
  m('pain-spray', 'Demo Pain Relief Spray 55g', 'Menthol + Methyl Salicylate (demo)', 'CoolSpray-D', MFG.aro, null, 'SPRAY', '55 g Can', 185, false, 'pain-relief', 'Demo listing for a cooling pain relief spray.'),
  // Cold & cough
  m('cough-syrup', 'Demo Cough Relief Syrup', 'Dextromethorphan (demo)', 'CoughEase-D', MFG.blu, '100 ml', 'SYRUP', '100 ml Bottle', 110, false, 'cold-cough', 'Demo listing for a dry cough syrup.'),
  m('cetirizine-10', 'Demo Cetirizine 10mg', 'Cetirizine (demo)', 'Allerfree-D', MFG.sun, '10 mg', 'TABLET', '10 Tablets', 28, false, 'cold-cough', 'Demo listing for an antihistamine tablet.'),
  m('levocetirizine-5', 'Demo Levocetirizine 5mg', 'Levocetirizine (demo)', 'LevoCalm-D', MFG.sun, '5 mg', 'TABLET', '10 Tablets', 45, true, 'cold-cough', 'Demo listing for an antihistamine tablet.'),
  m('steam-caps', 'Demo Steam Inhalation Capsules', 'Menthol + Eucalyptus (demo)', 'VapoCaps-D', MFG.him, null, 'CAPSULE', '10 Capsules', 60, false, 'cold-cough', 'Demo listing for steam inhalation capsules.'),
  m('montelukast-levo', 'Demo Montelukast + Levocetirizine', 'Montelukast + Levocetirizine (demo)', 'MontiLevo-D', MFG.med, '10 mg / 5 mg', 'TABLET', '10 Tablets', 165, true, 'cold-cough', 'Demo listing for an allergy combination tablet.'),
  m('lozenges', 'Demo Throat Lozenges Honey Lemon', 'Amylmetacresol (demo)', 'ThroatEase-D', MFG.him, null, 'TABLET', '16 Lozenges', 40, false, 'cold-cough', 'Demo listing for soothing throat lozenges.'),
  m('saline-spray', 'Demo Saline Nasal Spray', 'Sodium Chloride 0.65% (demo)', 'NasoClear-D', MFG.blu, '0.65%', 'SPRAY', '20 ml Bottle', 90, false, 'cold-cough', 'Demo listing for a saline nasal spray.'),
  // Vitamins & supplements
  m('vitd3-2000', 'Demo Vitamin D3 2000 IU', 'Cholecalciferol (demo)', 'SunVit-D', MFG.nuv, '2000 IU', 'CAPSULE', '30 Capsules', 299, false, 'vitamins-supplements', 'Demo listing for a daily vitamin D3 supplement.'),
  m('vitd3-60k', 'Demo Vitamin D3 60000 IU', 'Cholecalciferol (demo)', 'SunVit-D 60K', MFG.nuv, '60000 IU', 'CAPSULE', '4 Capsules', 135, true, 'vitamins-supplements', 'Demo listing for a weekly vitamin D3 capsule.'),
  m('multivitamin', 'Demo Multivitamin Daily', 'Multivitamin + Minerals (demo)', 'VitaDay-D', MFG.nuv, null, 'TABLET', '30 Tablets', 399, false, 'vitamins-supplements', 'Demo listing for a daily multivitamin.'),
  m('vitc-500', 'Demo Vitamin C 500mg Chewable', 'Ascorbic Acid (demo)', 'CeeMax-D', MFG.him, '500 mg', 'TABLET', '30 Tablets', 180, false, 'vitamins-supplements', 'Demo listing for a chewable vitamin C tablet.'),
  m('bcomplex-zinc', 'Demo B-Complex with Zinc', 'Vitamin B Complex + Zinc (demo)', 'BeZinc-D', MFG.hcl, null, 'CAPSULE', '15 Capsules', 55, false, 'vitamins-supplements', 'Demo listing for a B-complex supplement.'),
  m('omega3', 'Demo Omega-3 Fish Oil 1000mg', 'Omega-3 Fatty Acids (demo)', 'OmegaPure-D', MFG.nuv, '1000 mg', 'CAPSULE', '30 Capsules', 549, false, 'vitamins-supplements', 'Demo listing for an omega-3 supplement.'),
  m('calcium-d3', 'Demo Calcium + Vitamin D3', 'Calcium Carbonate + D3 (demo)', 'CalciStrong-D', MFG.hcl, '500 mg / 250 IU', 'TABLET', '15 Tablets', 115, false, 'vitamins-supplements', 'Demo listing for a calcium supplement.'),
  m('iron-folic', 'Demo Iron + Folic Acid', 'Ferrous Ascorbate + Folic Acid (demo)', 'FeroFol-D', MFG.med, null, 'TABLET', '30 Tablets', 85, false, 'vitamins-supplements', 'Demo listing for an iron supplement.'),
  // Diabetes care
  m('metformin-500', 'Demo Metformin 500mg', 'Metformin (demo)', 'GlucoNorm-D', MFG.sun, '500 mg', 'TABLET', '20 Tablets', 38, true, 'diabetes-care', 'Demo listing for a diabetes tablet.'),
  m('glimepiride-1', 'Demo Glimepiride 1mg', 'Glimepiride (demo)', 'GlimCare-D', MFG.sun, '1 mg', 'TABLET', '30 Tablets', 110, true, 'diabetes-care', 'Demo listing for a diabetes tablet.'),
  m('glucometer', 'Demo Glucometer Kit', 'Blood Glucose Monitor (demo)', 'GlucoCheck-D', MFG.cpd, null, 'DEVICE', '1 Kit', 1299, false, 'diabetes-care', 'Demo listing for a home glucometer kit.'),
  m('test-strips', 'Demo Glucose Test Strips', 'Glucose Test Strips (demo)', 'GlucoCheck-D Strips', MFG.cpd, null, 'DEVICE', '50 Strips', 899, false, 'diabetes-care', 'Demo listing for glucometer test strips.'),
  m('lancets', 'Demo Sterile Lancets', 'Lancets (demo)', 'GlucoCheck-D Lancets', MFG.cpd, null, 'DEVICE', '100 Lancets', 249, false, 'diabetes-care', 'Demo listing for sterile lancets.'),
  m('sweetener', 'Demo Sugar-Free Sweetener', 'Sucralose (demo)', 'SweetZero-D', MFG.nuv, null, 'OTHER', '100 Pellets', 175, false, 'diabetes-care', 'Demo listing for a sugar-free sweetener.'),
  // First aid
  m('antiseptic', 'Demo Antiseptic Liquid 250ml', 'Chloroxylenol (demo)', 'SafeGuard-D', MFG.hcl, null, 'OTHER', '250 ml Bottle', 145, false, 'first-aid', 'Demo listing for an antiseptic liquid.'),
  m('bandages', 'Demo Adhesive Bandages', 'Adhesive Bandages (demo)', 'QuickStrip-D', MFG.cpd, null, 'OTHER', '100 Strips', 120, false, 'first-aid', 'Demo listing for adhesive bandages.'),
  m('povidone', 'Demo Povidone-Iodine Ointment 15g', 'Povidone-Iodine 5% (demo)', 'IodoHeal-D', MFG.aro, '5% w/w', 'OINTMENT', '15 g Tube', 70, false, 'first-aid', 'Demo listing for an antiseptic ointment.'),
  m('cotton-roll', 'Demo Absorbent Cotton Roll', 'Absorbent Cotton (demo)', 'SoftCott-D', MFG.cpd, null, 'OTHER', '100 g Roll', 65, false, 'first-aid', 'Demo listing for absorbent cotton.'),
  m('crepe-bandage', 'Demo Crepe Bandage 10cm', 'Crepe Bandage (demo)', 'FlexWrap-D', MFG.cpd, null, 'OTHER', '1 Roll', 150, false, 'first-aid', 'Demo listing for an elastic crepe bandage.'),
  m('ors', 'Demo ORS Electrolyte Sachets', 'Oral Rehydration Salts (demo)', 'HydraLyte-D', MFG.hcl, null, 'SACHET', '5 Sachets', 110, false, 'first-aid', 'Demo listing for oral rehydration sachets.'),
  // Personal care
  m('sanitizer', 'Demo Hand Sanitizer 500ml', 'Ethyl Alcohol 70% (demo)', 'PureHands-D', MFG.him, null, 'OTHER', '500 ml Bottle', 250, false, 'personal-care', 'Demo listing for a hand sanitizer.'),
  m('toothpaste', 'Demo Herbal Toothpaste 150g', 'Herbal Toothpaste (demo)', 'DentaLeaf-D', MFG.him, null, 'OTHER', '150 g Tube', 110, false, 'personal-care', 'Demo listing for an herbal toothpaste.'),
  m('mild-shampoo', 'Demo Mild Daily Shampoo 200ml', 'Mild Shampoo (demo)', 'SilkCare-D', MFG.him, null, 'LOTION', '200 ml Bottle', 225, false, 'personal-care', 'Demo listing for a mild shampoo.'),
  m('lip-balm', 'Demo Lip Balm SPF 15', 'Lip Balm (demo)', 'LipSoft-D', MFG.him, null, 'OTHER', '4.5 g Stick', 99, false, 'personal-care', 'Demo listing for a lip balm.'),
  // Baby care
  m('baby-lotion', 'Demo Baby Lotion 200ml', 'Baby Lotion (demo)', 'TinyTouch-D', MFG.nuv, null, 'LOTION', '200 ml Bottle', 245, false, 'baby-care', 'Demo listing for a gentle baby lotion.'),
  m('baby-diapers', 'Demo Baby Diaper Pants (M)', 'Diaper Pants (demo)', 'TinyTouch-D Pants', MFG.nuv, null, 'OTHER', '42 Pants', 899, false, 'baby-care', 'Demo listing for baby diaper pants.'),
  m('rash-cream', 'Demo Baby Rash Cream 50g', 'Zinc Oxide (demo)', 'TinyTouch-D Rash', MFG.aro, null, 'CREAM', '50 g Tube', 175, false, 'baby-care', 'Demo listing for a diaper rash cream.'),
  m('paed-drops', 'Demo Paracetamol Paediatric Drops', 'Paracetamol (demo)', 'Paracare-D Kids', MFG.hcl, '100 mg/ml', 'DROPS', '15 ml Bottle', 45, true, 'baby-care', 'Demo listing for paediatric drops.'),
  m('baby-wipes', 'Demo Baby Wipes', 'Baby Wipes (demo)', 'TinyTouch-D Wipes', MFG.nuv, null, 'OTHER', '72 Wipes', 199, false, 'baby-care', 'Demo listing for baby wipes.'),
  // Digestive health
  m('antacid', 'Demo Antacid Liquid Mint 170ml', 'Aluminium + Magnesium Hydroxide (demo)', 'AcidCalm-D', MFG.blu, null, 'SUSPENSION', '170 ml Bottle', 135, false, 'digestive-health', 'Demo listing for an antacid liquid.'),
  m('pantoprazole-40', 'Demo Pantoprazole 40mg', 'Pantoprazole (demo)', 'PantoGuard-D', MFG.sun, '40 mg', 'TABLET', '15 Tablets', 145, true, 'digestive-health', 'Demo listing for an acid-reducing tablet.'),
  m('probiotic', 'Demo Probiotic Capsules', 'Lactobacillus (demo)', 'GutWell-D', MFG.nuv, null, 'CAPSULE', '10 Capsules', 190, false, 'digestive-health', 'Demo listing for a probiotic supplement.'),
  m('enzyme-syrup', 'Demo Digestive Enzyme Syrup', 'Digestive Enzymes (demo)', 'DigiZyme-D', MFG.him, null, 'SYRUP', '200 ml Bottle', 150, false, 'digestive-health', 'Demo listing for a digestive enzyme syrup.'),
  m('isabgol', 'Demo Isabgol Husk 100g', 'Psyllium Husk (demo)', 'FibrePlus-D', MFG.him, null, 'POWDER', '100 g Pack', 125, false, 'digestive-health', 'Demo listing for a fibre supplement.'),
  m('ondansetron-4', 'Demo Ondansetron 4mg', 'Ondansetron (demo)', 'NauseaStop-D', MFG.med, '4 mg', 'TABLET', '10 Tablets', 62, true, 'digestive-health', 'Demo listing for an anti-nausea tablet.'),
  // Skin care
  m('moisturizer', 'Demo Moisturizing Cream 100g', 'Ceramide Moisturiser (demo)', 'DermaSoft-D', MFG.aro, null, 'CREAM', '100 g Tube', 320, false, 'skin-care', 'Demo listing for a fragrance-free moisturiser.'),
  m('sunscreen', 'Demo Sunscreen SPF 50 Gel', 'Broad Spectrum Sunscreen (demo)', 'SunShield-D', MFG.aro, 'SPF 50', 'GEL', '50 g Tube', 450, false, 'skin-care', 'Demo listing for a broad-spectrum sunscreen.'),
  m('clotrimazole', 'Demo Clotrimazole Cream 1%', 'Clotrimazole (demo)', 'FungiClear-D', MFG.sun, '1% w/w', 'CREAM', '20 g Tube', 85, false, 'skin-care', 'Demo listing for an antifungal cream.'),
  m('adapalene', 'Demo Adapalene Gel 0.1%', 'Adapalene (demo)', 'ClearSkin-D', MFG.med, '0.1% w/w', 'GEL', '15 g Tube', 220, true, 'skin-care', 'Demo listing for a topical acne gel.'),
  m('calamine', 'Demo Calamine Lotion 100ml', 'Calamine (demo)', 'CalaSoothe-D', MFG.hcl, null, 'LOTION', '100 ml Bottle', 95, false, 'skin-care', 'Demo listing for a soothing calamine lotion.'),
  m('keto-shampoo', 'Demo Ketoconazole Shampoo 2%', 'Ketoconazole (demo)', 'DandruFree-D', MFG.sun, '2% w/v', 'LOTION', '100 ml Bottle', 285, true, 'skin-care', 'Demo listing for a medicated shampoo.'),
  m('hydrocortisone', 'Demo Hydrocortisone Cream 1%', 'Hydrocortisone (demo)', 'CortiCalm-D', MFG.med, '1% w/w', 'CREAM', '15 g Tube', 60, true, 'skin-care', 'Demo listing for a mild topical steroid cream.'),
  m('doxycycline-100', 'Demo Doxycycline 100mg', 'Doxycycline (demo)', 'DoxyCare-D', MFG.blu, '100 mg', 'CAPSULE', '10 Capsules', 115, true, 'skin-care', 'Demo listing for an antibiotic capsule.'),
  // Health devices
  m('thermometer', 'Demo Digital Thermometer', 'Digital Thermometer (demo)', 'TempCheck-D', MFG.cpd, null, 'DEVICE', '1 Unit', 250, false, 'health-devices', 'Demo listing for a digital thermometer.'),
  m('bp-monitor', 'Demo Automatic BP Monitor', 'Blood Pressure Monitor (demo)', 'PulseTrack-D', MFG.cpd, null, 'DEVICE', '1 Unit', 2199, false, 'health-devices', 'Demo listing for an automatic BP monitor.'),
  m('oximeter', 'Demo Fingertip Pulse Oximeter', 'Pulse Oximeter (demo)', 'OxyRead-D', MFG.cpd, null, 'DEVICE', '1 Unit', 1499, false, 'health-devices', 'Demo listing for a pulse oximeter.'),
  m('nebulizer', 'Demo Compact Nebulizer', 'Nebulizer (demo)', 'BreatheEasy-D', MFG.cpd, null, 'DEVICE', '1 Unit', 1999, false, 'health-devices', 'Demo listing for a compact nebulizer.'),
  m('hot-water-bag', 'Demo Hot Water Bag', 'Hot Water Bag (demo)', 'WarmRelief-D', MFG.cpd, null, 'DEVICE', '1 Unit', 349, false, 'health-devices', 'Demo listing for a hot water bag.'),
  // Women's wellness
  m('folic-5', 'Demo Folic Acid 5mg', 'Folic Acid (demo)', 'FolaCare-D', MFG.hcl, '5 mg', 'TABLET', '30 Tablets', 55, true, 'womens-wellness', 'Demo listing for a folic acid tablet.'),
  m('sanitary-pads', 'Demo Sanitary Pads XL', 'Sanitary Pads (demo)', 'ComfortDay-D', MFG.nuv, null, 'OTHER', '30 Pads', 299, false, 'womens-wellness', 'Demo listing for sanitary pads.'),
  m('cranberry', 'Demo Cranberry Capsules', 'Cranberry Extract (demo)', 'UriCare-D', MFG.him, null, 'CAPSULE', '30 Capsules', 450, false, 'womens-wellness', 'Demo listing for a cranberry supplement.'),
  m('intimate-wash', 'Demo Intimate Wash 100ml', 'pH Balanced Wash (demo)', 'FemCare-D', MFG.him, null, 'LOTION', '100 ml Bottle', 199, false, 'womens-wellness', 'Demo listing for an intimate wash.'),
  m('prenatal', 'Demo Prenatal Multivitamin', 'Prenatal Multivitamin (demo)', 'MomVita-D', MFG.nuv, null, 'TABLET', '30 Tablets', 425, false, 'womens-wellness', 'Demo listing for a prenatal multivitamin.'),
  // Elder care
  m('adult-diapers', 'Demo Adult Diapers (L)', 'Adult Diapers (demo)', 'DignaCare-D', MFG.nuv, null, 'OTHER', '10 Pieces', 599, false, 'elder-care', 'Demo listing for adult diapers.'),
  m('knee-brace', 'Demo Knee Support Brace', 'Knee Support (demo)', 'JointGuard-D', MFG.cpd, null, 'DEVICE', '1 Unit', 499, false, 'elder-care', 'Demo listing for a knee support brace.'),
  m('walking-stick', 'Demo Foldable Walking Stick', 'Walking Stick (demo)', 'StepSure-D', MFG.cpd, null, 'DEVICE', '1 Unit', 799, false, 'elder-care', 'Demo listing for a foldable walking stick.'),
  m('joint-care', 'Demo Joint Care Supplement', 'Glucosamine + Chondroitin (demo)', 'FlexiJoint-D', MFG.nuv, null, 'TABLET', '30 Tablets', 650, false, 'elder-care', 'Demo listing for a joint care supplement.'),
  m('amlodipine-5', 'Demo Amlodipine 5mg', 'Amlodipine (demo)', 'AmloCare-D', MFG.sun, '5 mg', 'TABLET', '30 Tablets', 60, true, 'elder-care', 'Demo listing for a blood pressure tablet.'),
  m('atorvastatin-10', 'Demo Atorvastatin 10mg', 'Atorvastatin (demo)', 'StatiCare-D', MFG.sun, '10 mg', 'TABLET', '15 Tablets', 99, true, 'elder-care', 'Demo listing for a cholesterol tablet.'),
  m('telmisartan-40', 'Demo Telmisartan 40mg', 'Telmisartan (demo)', 'TelmiCare-D', MFG.med, '40 mg', 'TABLET', '30 Tablets', 120, true, 'elder-care', 'Demo listing for a blood pressure tablet.'),
];

export interface LabTestSeed {
  code: string;
  name: string;
  category: string;
  description: string;
  parametersCount: number;
  sampleType: string;
  fastingRequired: boolean;
  turnaroundHours: number;
  mrp: number;
  price: number;
  isPopular?: boolean;
  includes?: string[]; // codes, for packages
}

export const LAB_TESTS: LabTestSeed[] = [
  { code: 'CBC', name: 'Complete Blood Count', category: 'Blood', description: 'Measures red cells, white cells, haemoglobin and platelets.', parametersCount: 24, sampleType: 'Blood', fastingRequired: false, turnaroundHours: 12, mrp: 450, price: 299, isPopular: true },
  { code: 'THY', name: 'Thyroid Profile (T3, T4, TSH)', category: 'Thyroid', description: 'Evaluates thyroid gland function.', parametersCount: 3, sampleType: 'Blood', fastingRequired: false, turnaroundHours: 24, mrp: 700, price: 449, isPopular: true },
  { code: 'LIP', name: 'Lipid Profile', category: 'Heart', description: 'Cholesterol, triglycerides, HDL and LDL levels.', parametersCount: 8, sampleType: 'Blood', fastingRequired: true, turnaroundHours: 24, mrp: 800, price: 499, isPopular: true },
  { code: 'VITD', name: 'Vitamin D (25-OH)', category: 'Vitamins', description: 'Measures vitamin D levels in blood.', parametersCount: 1, sampleType: 'Blood', fastingRequired: false, turnaroundHours: 24, mrp: 1400, price: 899, isPopular: true },
  { code: 'B12', name: 'Vitamin B12', category: 'Vitamins', description: 'Measures vitamin B12 levels in blood.', parametersCount: 1, sampleType: 'Blood', fastingRequired: false, turnaroundHours: 24, mrp: 1100, price: 699 },
  { code: 'HBA1C', name: 'HbA1c (Glycated Haemoglobin)', category: 'Diabetes', description: 'Average blood sugar over the past 3 months.', parametersCount: 1, sampleType: 'Blood', fastingRequired: false, turnaroundHours: 12, mrp: 600, price: 399 },
  { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Diabetes', description: 'Blood glucose level after fasting.', parametersCount: 1, sampleType: 'Blood', fastingRequired: true, turnaroundHours: 6, mrp: 150, price: 99 },
  { code: 'LFT', name: 'Liver Function Test', category: 'Liver', description: 'Enzymes, proteins and bilirubin levels.', parametersCount: 11, sampleType: 'Blood', fastingRequired: false, turnaroundHours: 24, mrp: 900, price: 599 },
  { code: 'KFT', name: 'Kidney Function Test', category: 'Kidney', description: 'Creatinine, urea and electrolyte levels.', parametersCount: 9, sampleType: 'Blood', fastingRequired: false, turnaroundHours: 24, mrp: 850, price: 549 },
  { code: 'URINE', name: 'Urine Routine & Microscopy', category: 'Urine', description: 'Physical, chemical and microscopic urine analysis.', parametersCount: 18, sampleType: 'Urine', fastingRequired: false, turnaroundHours: 12, mrp: 300, price: 199 },
  { code: 'IRON', name: 'Iron Studies', category: 'Blood', description: 'Serum iron, TIBC and ferritin.', parametersCount: 4, sampleType: 'Blood', fastingRequired: true, turnaroundHours: 24, mrp: 1200, price: 799 },
  { code: 'CRP', name: 'C-Reactive Protein (CRP)', category: 'Infection', description: 'Marker of inflammation in the body.', parametersCount: 1, sampleType: 'Blood', fastingRequired: false, turnaroundHours: 12, mrp: 600, price: 399 },
  { code: 'DENGUE', name: 'Dengue NS1 Antigen', category: 'Infection', description: 'Early detection test for dengue.', parametersCount: 1, sampleType: 'Blood', fastingRequired: false, turnaroundHours: 12, mrp: 900, price: 599 },
  { code: 'PKG-BASIC', name: 'Basic Health Checkup', category: 'Packages', description: 'Essential screening covering blood count, sugar, lipids, kidney and urine.', parametersCount: 61, sampleType: 'Blood, Urine', fastingRequired: true, turnaroundHours: 24, mrp: 2550, price: 1299, isPopular: true, includes: ['CBC', 'FBS', 'LIP', 'KFT', 'URINE'] },
  { code: 'PKG-DIAB', name: 'Diabetes Screening', category: 'Packages', description: 'Fasting sugar, HbA1c, kidney function and urine analysis.', parametersCount: 29, sampleType: 'Blood, Urine', fastingRequired: true, turnaroundHours: 24, mrp: 1900, price: 999, isPopular: true, includes: ['FBS', 'HBA1C', 'KFT', 'URINE'] },
  { code: 'PKG-FULL', name: 'Full Body Checkup Advanced', category: 'Packages', description: 'Comprehensive panel including thyroid, liver, kidney, lipids and vitamins.', parametersCount: 82, sampleType: 'Blood', fastingRequired: true, turnaroundHours: 36, mrp: 6900, price: 2999, isPopular: true, includes: ['CBC', 'THY', 'LIP', 'LFT', 'KFT', 'VITD', 'B12', 'HBA1C'] },
  { code: 'PKG-WOMEN', name: "Women's Wellness Package", category: 'Packages', description: 'Blood count, thyroid, iron studies and vitamin D.', parametersCount: 32, sampleType: 'Blood', fastingRequired: true, turnaroundHours: 24, mrp: 3750, price: 1899, includes: ['CBC', 'THY', 'IRON', 'VITD'] },
];

export const LAB_TIME_SLOTS = ['07:00 - 08:00', '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '16:00 - 17:00', '17:00 - 18:00'];

export const DELIVERY_AGENTS = [
  { name: 'Arun Kumar', phone: '+91 98450 11223', vehicleType: 'Motorbike', vehicleNumber: 'KA-01-EX-4521' },
  { name: 'Manoj Shetty', phone: '+91 98860 33410', vehicleType: 'Scooter', vehicleNumber: 'KA-05-MN-7788' },
  { name: 'Ravi Prakash', phone: '+91 99001 55672', vehicleType: 'Motorbike', vehicleNumber: 'KA-03-RP-1290' },
  { name: 'Salim Sheikh', phone: '+91 97411 80045', vehicleType: 'Electric Scooter', vehicleNumber: 'KA-51-EV-3021' },
  { name: 'Karthik Gowda', phone: '+91 96320 44718', vehicleType: 'Motorbike', vehicleNumber: 'KA-02-KG-6654' },
];
