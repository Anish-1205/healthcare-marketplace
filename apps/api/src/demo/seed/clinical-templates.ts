/**
 * Sample consultation content used to populate historical records, written the way a
 * doctor would type it. This is fictional demo content — the application never
 * generates clinical text, diagnoses or dosage instructions.
 */

export interface PrescriptionLineSeed {
  medicine: string; // MEDICINES key
  dosage: string;
  frequency: string;
  duration: string;
  timing?: string;
  instructions?: string;
  quantity: number;
}

export interface ClinicalTemplate {
  reason: string;
  chiefComplaint: string;
  observations: string;
  diagnosis: string;
  notes: string;
  advice: string;
  followUpDays?: number;
  items: PrescriptionLineSeed[];
}

export const CLINICAL_TEMPLATES: Record<string, ClinicalTemplate[]> = {
  'general-physician': [
    {
      reason: 'Fever and body ache for 2 days',
      chiefComplaint: 'Fever up to 101°F with body ache and mild sore throat since 2 days.',
      observations: 'Temp 100.4°F, throat mildly congested, chest clear.',
      diagnosis: 'Acute viral fever (demo)',
      notes: 'Advised rest and oral fluids. Review if fever persists beyond 3 days.',
      advice: 'Drink plenty of fluids. Take adequate rest.',
      followUpDays: 5,
      items: [
        { medicine: 'paracetamol-650', dosage: '1 tablet', frequency: 'Three times a day', duration: '3 days', timing: 'After food', instructions: 'Only if temperature is above 100°F', quantity: 1 },
        { medicine: 'cetirizine-10', dosage: '1 tablet', frequency: 'Once daily', duration: '5 days', timing: 'Night', quantity: 1 },
        { medicine: 'ors', dosage: '1 sachet in 1 litre water', frequency: 'Sip through the day', duration: '3 days', quantity: 1 },
      ],
    },
    {
      reason: 'Acidity and bloating after meals',
      chiefComplaint: 'Burning sensation in upper abdomen and bloating after meals for 1 week.',
      observations: 'Mild epigastric tenderness. No other findings.',
      diagnosis: 'Gastritis (demo)',
      notes: 'Discussed meal timings and avoiding late dinners.',
      advice: 'Avoid spicy and oily food. Small frequent meals.',
      followUpDays: 14,
      items: [
        { medicine: 'pantoprazole-40', dosage: '1 tablet', frequency: 'Once daily', duration: '14 days', timing: 'Before breakfast', quantity: 1 },
        { medicine: 'antacid', dosage: '10 ml', frequency: 'As needed, up to three times a day', duration: '7 days', timing: 'After food', quantity: 1 },
        { medicine: 'probiotic', dosage: '1 capsule', frequency: 'Once daily', duration: '10 days', timing: 'After lunch', quantity: 1 },
      ],
    },
    {
      reason: 'Routine follow-up for blood sugar',
      chiefComplaint: 'Follow-up visit. Home sugar readings slightly elevated.',
      observations: 'BP 128/84. Weight stable.',
      diagnosis: 'Type 2 diabetes mellitus — follow-up (demo)',
      notes: 'Reviewed home readings. Continue current plan; repeat HbA1c in 3 months.',
      advice: 'Walk 30 minutes daily. Limit sweets and refined carbohydrates.',
      followUpDays: 90,
      items: [
        { medicine: 'metformin-500', dosage: '1 tablet', frequency: 'Twice daily', duration: '30 days', timing: 'After breakfast and dinner', quantity: 3 },
        { medicine: 'test-strips', dosage: 'As directed', frequency: 'Check fasting sugar twice a week', duration: '30 days', quantity: 1 },
      ],
    },
  ],
  dermatologist: [
    {
      reason: 'Acne breakouts on face',
      chiefComplaint: 'Recurrent pimples on cheeks and forehead for 3 months.',
      observations: 'Multiple comedones and inflamed papules over cheeks and forehead. No scarring.',
      diagnosis: 'Acne vulgaris, moderate (demo)',
      notes: 'Explained skin-care routine. Avoid picking lesions.',
      advice: 'Wash face twice daily with a mild cleanser. Use non-comedogenic products.',
      followUpDays: 42,
      items: [
        { medicine: 'adapalene', dosage: 'Pea-sized amount', frequency: 'Once daily', duration: '8 weeks', timing: 'Night', instructions: 'Apply on clean, dry skin. Avoid eyes and lips.', quantity: 1 },
        { medicine: 'doxycycline-100', dosage: '1 capsule', frequency: 'Once daily', duration: '4 weeks', timing: 'After food', instructions: 'Take with a full glass of water.', quantity: 3 },
        { medicine: 'sunscreen', dosage: 'Apply generously', frequency: 'Every morning', duration: 'Ongoing', timing: 'Morning', quantity: 1 },
      ],
    },
    {
      reason: 'Itchy scaly patch on the neck',
      chiefComplaint: 'Itchy, ring-shaped rash on the side of the neck for 3 weeks.',
      observations: 'Annular scaly plaque with raised border on left side of neck.',
      diagnosis: 'Tinea corporis (demo)',
      notes: 'Advised keeping the area dry. Avoid sharing towels.',
      advice: 'Wear loose cotton clothing. Keep skin folds dry.',
      followUpDays: 21,
      items: [
        { medicine: 'clotrimazole', dosage: 'Thin layer', frequency: 'Twice daily', duration: '3 weeks', timing: 'Morning and night', instructions: 'Apply 2 cm beyond the edge of the rash.', quantity: 2 },
        { medicine: 'cetirizine-10', dosage: '1 tablet', frequency: 'Once daily', duration: '7 days', timing: 'Night', quantity: 1 },
      ],
    },
    {
      reason: 'Dandruff and itchy scalp',
      chiefComplaint: 'Flaking and itching of the scalp for 2 months.',
      observations: 'Greasy scales over scalp, mild redness along hairline.',
      diagnosis: 'Seborrhoeic dermatitis (demo)',
      notes: 'Discussed shampoo technique and contact time.',
      advice: 'Leave medicated shampoo on the scalp for 5 minutes before rinsing.',
      followUpDays: 30,
      items: [
        { medicine: 'keto-shampoo', dosage: 'Apply to wet scalp', frequency: 'Twice a week', duration: '4 weeks', instructions: 'Leave for 5 minutes, then rinse.', quantity: 1 },
        { medicine: 'moisturizer', dosage: 'Apply as needed', frequency: 'Twice daily', duration: '4 weeks', quantity: 1 },
      ],
    },
  ],
  pediatrician: [
    {
      reason: 'Child has cold and mild fever',
      chiefComplaint: 'Runny nose, cough and low-grade fever for 2 days.',
      observations: 'Temp 99.8°F, nasal congestion, chest clear. Active and feeding well.',
      diagnosis: 'Upper respiratory tract infection (demo)',
      notes: 'Explained warning signs to parents.',
      advice: 'Plenty of fluids. Saline nasal drops before feeds.',
      followUpDays: 4,
      items: [
        { medicine: 'paed-drops', dosage: 'As per weight, measured by parent with dropper', frequency: 'Up to 3 times a day', duration: '3 days', instructions: 'Only if fever is above 100°F', quantity: 1 },
        { medicine: 'saline-spray', dosage: '1 spray each nostril', frequency: 'Three times a day', duration: '5 days', quantity: 1 },
      ],
    },
    {
      reason: 'Routine growth check-up',
      chiefComplaint: 'Routine visit for growth and development review.',
      observations: 'Height and weight on the 50th percentile. Development appropriate for age.',
      diagnosis: 'Healthy child — routine review (demo)',
      notes: 'Discussed balanced diet and screen time.',
      advice: 'Continue balanced diet with fruits and vegetables.',
      followUpDays: 180,
      items: [{ medicine: 'multivitamin', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', timing: 'After breakfast', quantity: 1 }],
    },
  ],
  cardiologist: [
    {
      reason: 'Blood pressure review',
      chiefComplaint: 'Home BP readings consistently around 145/92 for a month.',
      observations: 'BP 148/94, pulse 78 regular. Heart sounds normal.',
      diagnosis: 'Essential hypertension (demo)',
      notes: 'Advised home BP log. Lipid profile ordered.',
      advice: 'Reduce salt intake. 30 minutes of brisk walking daily.',
      followUpDays: 30,
      items: [
        { medicine: 'amlodipine-5', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', timing: 'Morning', quantity: 1 },
        { medicine: 'atorvastatin-10', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', timing: 'Night', quantity: 2 },
      ],
    },
    {
      reason: 'Chest discomfort on exertion — evaluation',
      chiefComplaint: 'Occasional chest tightness while climbing stairs for 2 weeks.',
      observations: 'BP 132/86. ECG in clinic within normal limits.',
      diagnosis: 'Under evaluation — stress test advised (demo)',
      notes: 'Treadmill test and lipid profile scheduled. Explained emergency warning signs.',
      advice: 'Avoid strenuous activity until review.',
      followUpDays: 7,
      items: [{ medicine: 'telmisartan-40', dosage: '1 tablet', frequency: 'Once daily', duration: '14 days', timing: 'Morning', quantity: 1 }],
    },
  ],
  orthopedic: [
    {
      reason: 'Lower back pain',
      chiefComplaint: 'Lower back pain for 10 days after lifting a heavy box.',
      observations: 'Paraspinal muscle tenderness, no neurological deficit.',
      diagnosis: 'Mechanical low back strain (demo)',
      notes: 'Advised posture correction and core-strengthening exercises.',
      advice: 'Avoid lifting heavy weights. Use a firm mattress.',
      followUpDays: 14,
      items: [
        { medicine: 'aceclofenac-para', dosage: '1 tablet', frequency: 'Twice daily', duration: '5 days', timing: 'After food', quantity: 1 },
        { medicine: 'diclofenac-gel', dosage: 'Apply locally', frequency: 'Three times a day', duration: '10 days', instructions: 'Gently massage over painful area.', quantity: 1 },
        { medicine: 'hot-water-bag', dosage: 'Warm compress', frequency: 'Twice daily', duration: '10 days', quantity: 1 },
      ],
    },
    {
      reason: 'Knee pain while walking',
      chiefComplaint: 'Right knee pain on climbing stairs for 2 months.',
      observations: 'Mild crepitus right knee, no effusion.',
      diagnosis: 'Early osteoarthritis, right knee (demo)',
      notes: 'Quadriceps strengthening exercises demonstrated.',
      advice: 'Maintain healthy weight. Avoid squatting.',
      followUpDays: 30,
      items: [
        { medicine: 'joint-care', dosage: '1 tablet', frequency: 'Once daily', duration: '60 days', timing: 'After breakfast', quantity: 2 },
        { medicine: 'calcium-d3', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', timing: 'After lunch', quantity: 2 },
        { medicine: 'knee-brace', dosage: 'Wear during activity', frequency: 'As needed', duration: 'Ongoing', quantity: 1 },
      ],
    },
  ],
  gynecologist: [
    {
      reason: 'Antenatal check-up',
      chiefComplaint: 'Routine antenatal visit, 12 weeks of pregnancy.',
      observations: 'BP 110/70. Weight gain appropriate.',
      diagnosis: 'Intrauterine pregnancy, 12 weeks — routine (demo)',
      notes: 'First-trimester scan reviewed. Next scan scheduled.',
      advice: 'Balanced diet, adequate hydration and rest.',
      followUpDays: 28,
      items: [
        { medicine: 'folic-5', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', timing: 'After breakfast', quantity: 1 },
        { medicine: 'prenatal', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', timing: 'After lunch', quantity: 1 },
      ],
    },
    {
      reason: 'Fatigue and low energy',
      chiefComplaint: 'Tiredness and low energy for 1 month.',
      observations: 'Mild pallor. Haemoglobin report 10.8 g/dL.',
      diagnosis: 'Mild iron-deficiency anaemia (demo)',
      notes: 'Diet counselling done. Repeat haemoglobin after 6 weeks.',
      advice: 'Include iron-rich foods such as greens, dates and legumes.',
      followUpDays: 42,
      items: [
        { medicine: 'iron-folic', dosage: '1 tablet', frequency: 'Once daily', duration: '60 days', timing: 'After lunch', quantity: 2 },
        { medicine: 'vitc-500', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', timing: 'After lunch', quantity: 1 },
      ],
    },
  ],
  dentist: [
    {
      reason: 'Tooth sensitivity',
      chiefComplaint: 'Sensitivity to cold drinks in lower left teeth.',
      observations: 'Mild gum recession over lower premolars. No caries.',
      diagnosis: 'Dentine hypersensitivity (demo)',
      notes: 'Scaling done. Brushing technique demonstrated.',
      advice: 'Use a soft-bristle brush. Avoid aggressive brushing.',
      followUpDays: 90,
      items: [{ medicine: 'toothpaste', dosage: 'Pea-sized amount', frequency: 'Twice daily', duration: 'Ongoing', quantity: 1 }],
    },
  ],
  'ent-specialist': [
    {
      reason: 'Blocked nose and sneezing',
      chiefComplaint: 'Sneezing, blocked nose and itchy eyes every morning for 3 weeks.',
      observations: 'Pale, swollen nasal mucosa. Throat normal.',
      diagnosis: 'Allergic rhinitis (demo)',
      notes: 'Advised to identify and avoid triggers such as dust.',
      advice: 'Use a mask while dusting. Steam inhalation at night.',
      followUpDays: 21,
      items: [
        { medicine: 'montelukast-levo', dosage: '1 tablet', frequency: 'Once daily', duration: '14 days', timing: 'Night', quantity: 2 },
        { medicine: 'saline-spray', dosage: '2 sprays each nostril', frequency: 'Twice daily', duration: '14 days', quantity: 1 },
        { medicine: 'steam-caps', dosage: '1 capsule in hot water', frequency: 'Once daily', duration: '7 days', timing: 'Night', quantity: 1 },
      ],
    },
  ],
  ophthalmologist: [
    {
      reason: 'Eye strain and dryness',
      chiefComplaint: 'Burning and dryness in both eyes after long screen hours.',
      observations: 'Vision 6/6 both eyes. Reduced tear break-up time.',
      diagnosis: 'Computer vision syndrome with dry eye (demo)',
      notes: 'Advised 20-20-20 rule for screen use.',
      advice: 'Blink often. Take screen breaks every 20 minutes.',
      followUpDays: 30,
      items: [{ medicine: 'omega3', dosage: '1 capsule', frequency: 'Once daily', duration: '30 days', timing: 'After dinner', quantity: 1 }],
    },
  ],
  physiotherapist: [
    {
      reason: 'Neck stiffness from desk work',
      chiefComplaint: 'Neck and shoulder stiffness after long desk hours.',
      observations: 'Forward head posture, trapezius tightness.',
      diagnosis: 'Postural neck pain (demo)',
      notes: 'Home exercise programme shared: chin tucks, shoulder rolls.',
      advice: 'Adjust monitor to eye level. Stretch every hour.',
      followUpDays: 14,
      items: [{ medicine: 'pain-spray', dosage: 'Spray locally', frequency: 'Twice daily', duration: '7 days', instructions: 'Before exercises', quantity: 1 }],
    },
  ],
  neurologist: [
    {
      reason: 'Recurring headaches',
      chiefComplaint: 'Throbbing one-sided headaches twice a week for 2 months.',
      observations: 'Neurological examination normal.',
      diagnosis: 'Migraine without aura (demo)',
      notes: 'Headache diary advised. Identify triggers such as missed meals and poor sleep.',
      advice: 'Regular sleep schedule. Stay hydrated.',
      followUpDays: 30,
      items: [{ medicine: 'paracetamol-500', dosage: '2 tablets', frequency: 'At onset of headache', duration: 'As needed', instructions: 'Not more than 3 days a week', quantity: 1 }],
    },
  ],
  psychiatrist: [
    {
      reason: 'Stress and poor sleep',
      chiefComplaint: 'Difficulty falling asleep and work-related stress for 6 weeks.',
      observations: 'Alert, cooperative. Mild anxiety symptoms.',
      diagnosis: 'Adjustment-related sleep difficulty (demo)',
      notes: 'Sleep hygiene and relaxation techniques discussed. Counselling sessions planned.',
      advice: 'Fixed bedtime, no screens 1 hour before sleep.',
      followUpDays: 14,
      items: [{ medicine: 'bcomplex-zinc', dosage: '1 capsule', frequency: 'Once daily', duration: '30 days', timing: 'After breakfast', quantity: 2 }],
    },
  ],
};

/**
 * Golden scenario — what Dr. Maya Rao records for Rahul Verma.
 * In `ready` mode this is NOT seeded; docs/DEMO_GUIDE.md tells the presenter what to type.
 */
export const GOLDEN_CONSULTATION: ClinicalTemplate = {
  reason: 'Itchy red patches on both forearms',
  chiefComplaint: 'Itchy, red patches on both forearms for 2 weeks, worse after using a new detergent.',
  observations: 'Well-defined erythematous patches with mild scaling on both forearms. No oozing.',
  diagnosis: 'Contact dermatitis (demo)',
  notes: 'Likely reaction to new detergent. Advised to switch back and avoid direct contact.',
  advice: 'Avoid the suspected detergent. Use lukewarm water and pat skin dry.',
  followUpDays: 14,
  items: [
    { medicine: 'hydrocortisone', dosage: 'Thin layer', frequency: 'Twice daily', duration: '7 days', timing: 'Morning and night', instructions: 'Apply only on affected patches.', quantity: 1 },
    { medicine: 'levocetirizine-5', dosage: '1 tablet', frequency: 'Once daily', duration: '10 days', timing: 'Night', quantity: 1 },
    { medicine: 'moisturizer', dosage: 'Apply generously', frequency: 'Three times a day', duration: '4 weeks', quantity: 1 },
    { medicine: 'calamine', dosage: 'Apply as needed', frequency: 'For itching', duration: '7 days', quantity: 1 },
  ],
};
