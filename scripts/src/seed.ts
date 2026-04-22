import bcrypt from "bcryptjs";
import { db, usersTable, doctorsTable, patientsTable, appointmentsTable, medicalRecordsTable, prescriptionsTable, medicinesTable, invoicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Hash for "demo1234"
  const hash = await bcrypt.hash("demo1234", 10);

  // ---- USERS ----
  const [adminUser] = await db.insert(usersTable).values({
    name: "System Administrator",
    email: "admin@hms.demo",
    passwordHash: hash,
    role: "admin",
    phone: "+1-555-000-0001",
    status: "active",
  }).onConflictDoNothing().returning();

  const [drJamesUser] = await db.insert(usersTable).values({
    name: "Dr. James Carter",
    email: "dr.james@hms.demo",
    passwordHash: hash,
    role: "doctor",
    phone: "+1-555-100-0001",
    status: "active",
  }).onConflictDoNothing().returning();

  const [drSarahUser] = await db.insert(usersTable).values({
    name: "Dr. Sarah Patel",
    email: "dr.sarah@hms.demo",
    passwordHash: hash,
    role: "doctor",
    phone: "+1-555-100-0002",
    status: "active",
  }).onConflictDoNothing().returning();

  const [drMarcusUser] = await db.insert(usersTable).values({
    name: "Dr. Marcus Chen",
    email: "dr.marcus@hms.demo",
    passwordHash: hash,
    role: "doctor",
    phone: "+1-555-100-0003",
    status: "active",
  }).onConflictDoNothing().returning();

  const [aliceUser] = await db.insert(usersTable).values({
    name: "Alice Johnson",
    email: "alice@hms.demo",
    passwordHash: hash,
    role: "patient",
    phone: "+1-555-200-0001",
    status: "active",
  }).onConflictDoNothing().returning();

  const [bobUser] = await db.insert(usersTable).values({
    name: "Bob Williams",
    email: "bob@hms.demo",
    passwordHash: hash,
    role: "patient",
    phone: "+1-555-200-0002",
    status: "active",
  }).onConflictDoNothing().returning();

  const [carolUser] = await db.insert(usersTable).values({
    name: "Carol Davis",
    email: "carol@hms.demo",
    passwordHash: hash,
    role: "patient",
    phone: "+1-555-200-0003",
    status: "active",
  }).onConflictDoNothing().returning();

  const [davidUser] = await db.insert(usersTable).values({
    name: "David Miller",
    email: "david@hms.demo",
    passwordHash: hash,
    role: "patient",
    phone: "+1-555-200-0004",
    status: "active",
  }).onConflictDoNothing().returning();

  const [emilyUser] = await db.insert(usersTable).values({
    name: "Emily Brown",
    email: "emily@hms.demo",
    passwordHash: hash,
    role: "patient",
    phone: "+1-555-200-0005",
    status: "active",
  }).onConflictDoNothing().returning();

  console.log("Users seeded.");

  // ---- DOCTORS ----
  const getOrCreate = async (table: typeof doctorsTable, userId: number | undefined, values: typeof doctorsTable.$inferInsert) => {
    if (!userId) {
      const [existing] = await db.select().from(table).where(eq(table.userId, values.userId));
      return existing;
    }
    const [existing] = await db.select().from(table).where(eq(table.userId, userId));
    if (existing) return existing;
    const [created] = await db.insert(table).values(values).returning();
    return created;
  };

  // Get actual user IDs
  const [jamesActual] = await db.select().from(usersTable).where(eq(usersTable.email, "dr.james@hms.demo"));
  const [sarahActual] = await db.select().from(usersTable).where(eq(usersTable.email, "dr.sarah@hms.demo"));
  const [marcusActual] = await db.select().from(usersTable).where(eq(usersTable.email, "dr.marcus@hms.demo"));

  const james = await getOrCreate(doctorsTable, jamesActual?.id, {
    userId: jamesActual!.id,
    specialty: "Cardiology",
    qualifications: "MD, FACC, Board Certified Cardiologist",
    yearsExperience: 15,
    consultationFee: "250",
    bio: "Dr. Carter is a leading cardiologist with 15+ years of experience in interventional cardiology and heart failure management.",
    photoUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&h=300&fit=crop",
    availableDays: "Mon,Tue,Wed,Thu,Fri",
    availableHours: "09:00-17:00",
  });

  const sarah = await getOrCreate(doctorsTable, sarahActual?.id, {
    userId: sarahActual!.id,
    specialty: "Pediatrics",
    qualifications: "MD, FAAP, Pediatric Emergency Medicine",
    yearsExperience: 10,
    consultationFee: "180",
    bio: "Dr. Patel specializes in pediatric care and child development, known for her gentle approach with young patients.",
    photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&h=300&fit=crop",
    availableDays: "Mon,Wed,Thu,Fri",
    availableHours: "08:00-16:00",
  });

  const marcus = await getOrCreate(doctorsTable, marcusActual?.id, {
    userId: marcusActual!.id,
    specialty: "General Medicine",
    qualifications: "MD, Internal Medicine, Primary Care",
    yearsExperience: 8,
    consultationFee: "150",
    bio: "Dr. Chen provides comprehensive primary care, focusing on preventive medicine and chronic disease management.",
    photoUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&h=300&fit=crop",
    availableDays: "Mon,Tue,Wed,Thu,Fri,Sat",
    availableHours: "08:00-18:00",
  });

  console.log("Doctors seeded.");

  // ---- PATIENTS ----
  const getOrCreatePatient = async (userId: number, values: Omit<typeof patientsTable.$inferInsert, "userId">) => {
    const [existing] = await db.select().from(patientsTable).where(eq(patientsTable.userId, userId));
    if (existing) return existing;
    const [created] = await db.insert(patientsTable).values({ userId, ...values }).returning();
    return created;
  };

  const [aliceActual] = await db.select().from(usersTable).where(eq(usersTable.email, "alice@hms.demo"));
  const [bobActual] = await db.select().from(usersTable).where(eq(usersTable.email, "bob@hms.demo"));
  const [carolActual] = await db.select().from(usersTable).where(eq(usersTable.email, "carol@hms.demo"));
  const [davidActual] = await db.select().from(usersTable).where(eq(usersTable.email, "david@hms.demo"));
  const [emilyActual] = await db.select().from(usersTable).where(eq(usersTable.email, "emily@hms.demo"));

  const alice = await getOrCreatePatient(aliceActual!.id, {
    dateOfBirth: "1988-05-15",
    gender: "female",
    bloodGroup: "A+",
    address: "123 Maple Street, Springfield, IL 62701",
    emergencyContact: "John Johnson: +1-555-300-0001",
    allergies: "Penicillin",
    medicalHistory: "Hypertension (diagnosed 2019), managed with medication",
  });

  const bob = await getOrCreatePatient(bobActual!.id, {
    dateOfBirth: "1975-09-22",
    gender: "male",
    bloodGroup: "O+",
    address: "456 Oak Avenue, Springfield, IL 62702",
    emergencyContact: "Mary Williams: +1-555-300-0002",
    allergies: "None",
    medicalHistory: "Type 2 Diabetes (diagnosed 2018), controlled with diet and metformin",
  });

  const carol = await getOrCreatePatient(carolActual!.id, {
    dateOfBirth: "1992-03-08",
    gender: "female",
    bloodGroup: "B+",
    address: "789 Pine Road, Springfield, IL 62703",
    emergencyContact: "Tom Davis: +1-555-300-0003",
    allergies: "Sulfa drugs, Aspirin",
    medicalHistory: "Asthma (childhood onset), seasonal allergies",
  });

  const david = await getOrCreatePatient(davidActual!.id, {
    dateOfBirth: "1965-11-30",
    gender: "male",
    bloodGroup: "AB-",
    address: "321 Elm Street, Springfield, IL 62704",
    emergencyContact: "Susan Miller: +1-555-300-0004",
    allergies: "Latex",
    medicalHistory: "Coronary artery disease, Hyperlipidemia",
  });

  const emily = await getOrCreatePatient(emilyActual!.id, {
    dateOfBirth: "2000-07-14",
    gender: "female",
    bloodGroup: "O-",
    address: "654 Birch Lane, Springfield, IL 62705",
    emergencyContact: "Robert Brown: +1-555-300-0005",
    allergies: "None known",
    medicalHistory: "No significant medical history",
  });

  console.log("Patients seeded.");

  // ---- MEDICINES ----
  const medicineSeed = [
    { name: "Lisinopril", genericName: "Lisinopril", manufacturer: "Merck", price: "12.50", stockQuantity: 250, expiryDate: "2026-12-31", category: "Antihypertensive" },
    { name: "Metformin 500mg", genericName: "Metformin HCl", manufacturer: "Bristol-Myers Squibb", price: "8.75", stockQuantity: 400, expiryDate: "2026-08-15", category: "Antidiabetic" },
    { name: "Atorvastatin 20mg", genericName: "Atorvastatin Calcium", manufacturer: "Pfizer", price: "18.00", stockQuantity: 180, expiryDate: "2025-11-30", category: "Statin" },
    { name: "Salbutamol Inhaler", genericName: "Albuterol", manufacturer: "GlaxoSmithKline", price: "35.00", stockQuantity: 60, expiryDate: "2025-09-01", category: "Bronchodilator" },
    { name: "Amoxicillin 500mg", genericName: "Amoxicillin", manufacturer: "Sandoz", price: "9.25", stockQuantity: 320, expiryDate: "2026-03-15", category: "Antibiotic" },
    { name: "Omeprazole 20mg", genericName: "Omeprazole", manufacturer: "AstraZeneca", price: "7.50", stockQuantity: 12, expiryDate: "2025-07-20", category: "PPI" },
    { name: "Aspirin 81mg", genericName: "Acetylsalicylic Acid", manufacturer: "Bayer", price: "4.00", stockQuantity: 500, expiryDate: "2027-01-01", category: "Antiplatelet" },
    { name: "Metoprolol 25mg", genericName: "Metoprolol Succinate", manufacturer: "AstraZeneca", price: "22.00", stockQuantity: 8, expiryDate: "2025-06-30", category: "Beta-blocker" },
    { name: "Cetirizine 10mg", genericName: "Cetirizine HCl", manufacturer: "UCB Pharma", price: "6.00", stockQuantity: 200, expiryDate: "2026-10-01", category: "Antihistamine" },
    { name: "Ibuprofen 400mg", genericName: "Ibuprofen", manufacturer: "Reckitt Benckiser", price: "5.50", stockQuantity: 350, expiryDate: "2026-05-15", category: "NSAID" },
  ];

  const medicineIds: number[] = [];
  for (const med of medicineSeed) {
    const [existing] = await db.select().from(medicinesTable).where(eq(medicinesTable.name, med.name));
    if (existing) {
      medicineIds.push(existing.id);
    } else {
      const [created] = await db.insert(medicinesTable).values(med).returning();
      medicineIds.push(created.id);
    }
  }

  console.log("Medicines seeded.");

  // ---- APPOINTMENTS ----
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const tomorrow = new Date(now.getTime() + 86400000);
  const nextWeek = new Date(now.getTime() + 7 * 86400000);
  const lastWeek = new Date(now.getTime() - 7 * 86400000);

  const appointmentSeed = [
    { patientId: alice!.id, doctorId: james!.id, scheduledAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0), status: "confirmed" as const, reason: "Regular cardiac checkup" },
    { patientId: bob!.id, doctorId: marcus!.id, scheduledAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30), status: "pending" as const, reason: "Diabetes follow-up" },
    { patientId: carol!.id, doctorId: sarah!.id, scheduledAt: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 0), status: "confirmed" as const, reason: "Annual pediatric checkup" },
    { patientId: david!.id, doctorId: james!.id, scheduledAt: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 14, 0), status: "pending" as const, reason: "Chest pain evaluation" },
    { patientId: emily!.id, doctorId: marcus!.id, scheduledAt: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 9, 30), status: "pending" as const, reason: "General health checkup" },
    { patientId: alice!.id, doctorId: james!.id, scheduledAt: new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate(), 10, 0), status: "completed" as const, reason: "Echocardiogram follow-up", notes: "Good progress. Continue medication. Schedule stress test in 3 months." },
    { patientId: bob!.id, doctorId: marcus!.id, scheduledAt: new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate(), 11, 0), status: "completed" as const, reason: "Blood glucose monitoring", notes: "HbA1c improved to 7.1%. Continue current regimen." },
    { patientId: carol!.id, doctorId: sarah!.id, scheduledAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 9, 0), status: "cancelled" as const, reason: "Asthma attack follow-up" },
  ];

  const apptIds: number[] = [];
  const existingAppts = await db.select().from(appointmentsTable).where(eq(appointmentsTable.patientId, alice!.id));
  if (existingAppts.length === 0) {
    for (const appt of appointmentSeed) {
      const [created] = await db.insert(appointmentsTable).values(appt).returning();
      apptIds.push(created.id);
    }
  } else {
    apptIds.push(...existingAppts.map(a => a.id));
  }

  console.log("Appointments seeded.");

  // ---- MEDICAL RECORDS ----
  const existingRecords = await db.select().from(medicalRecordsTable).where(eq(medicalRecordsTable.patientId, alice!.id));
  if (existingRecords.length === 0 && apptIds.length >= 6) {
    await db.insert(medicalRecordsTable).values([
      {
        patientId: alice!.id,
        doctorId: james!.id,
        appointmentId: apptIds[5],
        diagnosis: "Hypertensive Heart Disease - Stable",
        treatmentPlan: "Continue Lisinopril 10mg daily. Restrict sodium intake. 30 minutes of moderate exercise daily. Follow-up echocardiogram in 3 months.",
      },
      {
        patientId: bob!.id,
        doctorId: marcus!.id,
        appointmentId: apptIds[6],
        diagnosis: "Type 2 Diabetes Mellitus - Improving Control",
        treatmentPlan: "Continue Metformin 500mg twice daily. HbA1c goal < 7.0%. Low glycemic index diet. Blood glucose monitoring twice daily.",
      },
    ]);
  }

  console.log("Medical records seeded.");

  // ---- PRESCRIPTIONS ----
  const existingRx = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.patientId, alice!.id));
  if (existingRx.length === 0 && apptIds.length >= 6) {
    await db.insert(prescriptionsTable).values([
      {
        patientId: alice!.id,
        doctorId: james!.id,
        appointmentId: apptIds[5],
        medicines: [
          { medicineId: medicineIds[0], medicineName: "Lisinopril", dosage: "10mg", frequency: "Once daily", duration: "90 days" },
          { medicineId: medicineIds[6], medicineName: "Aspirin 81mg", dosage: "81mg", frequency: "Once daily", duration: "90 days" },
        ],
        instructions: "Take Lisinopril in the morning with or without food. Take Aspirin with food to reduce stomach upset. Monitor blood pressure daily.",
      },
      {
        patientId: bob!.id,
        doctorId: marcus!.id,
        appointmentId: apptIds[6],
        medicines: [
          { medicineId: medicineIds[1], medicineName: "Metformin 500mg", dosage: "500mg", frequency: "Twice daily with meals", duration: "90 days" },
        ],
        instructions: "Take with meals to reduce gastrointestinal side effects. Monitor blood glucose before and 2 hours after meals.",
      },
    ]);
  }

  console.log("Prescriptions seeded.");

  // ---- INVOICES ----
  const existingInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.patientId, alice!.id));
  if (existingInvoices.length === 0 && apptIds.length >= 6) {
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
    await db.insert(invoicesTable).values([
      {
        patientId: alice!.id,
        appointmentId: apptIds[5],
        lineItems: [
          { description: "Cardiology Consultation", quantity: 1, unitPrice: 250, total: 250 },
          { description: "Echocardiogram", quantity: 1, unitPrice: 380, total: 380 },
        ],
        subtotal: "630",
        tax: "63",
        total: "693",
        status: "paid",
        issuedAt: twoWeeksAgo,
        paidAt: new Date(twoWeeksAgo.getTime() + 86400000),
      },
      {
        patientId: bob!.id,
        appointmentId: apptIds[6],
        lineItems: [
          { description: "General Medicine Consultation", quantity: 1, unitPrice: 150, total: 150 },
          { description: "HbA1c Blood Test", quantity: 1, unitPrice: 85, total: 85 },
        ],
        subtotal: "235",
        tax: "23.50",
        total: "258.50",
        status: "unpaid",
        issuedAt: new Date(lastWeek.getTime()),
      },
      {
        patientId: david!.id,
        appointmentId: null,
        lineItems: [
          { description: "Cardiology Consultation", quantity: 1, unitPrice: 250, total: 250 },
          { description: "Stress Echocardiogram", quantity: 1, unitPrice: 450, total: 450 },
          { description: "Cardiac Monitoring (24hr)", quantity: 1, unitPrice: 200, total: 200 },
        ],
        subtotal: "900",
        tax: "90",
        total: "990",
        status: "unpaid",
        issuedAt: new Date(now.getTime() - 3 * 86400000),
      },
    ]);
  }

  console.log("Invoices seeded.");
  console.log("Seed complete!");
}

seed().catch(e => {
  console.error("Seed failed:", e);
  process.exit(1);
});
