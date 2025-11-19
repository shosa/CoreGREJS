import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { userName: 'admin' },
    update: {},
    create: {
      userName: 'admin',
      nome: 'Amministratore',
      password: adminPassword,
      mail: 'admin@coregre.local',
      adminType: 'admin',
      themeColor: 'blue',
    },
  });

  // Create admin permissions
  await prisma.permission.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      permessi: {
        riparazioni: true,
        qualita: true,
        produzione: true,
        export: true,
        scm_admin: true,
        tracking: true,
        mrp: true,
        users: true,
        settings: true,
      },
    },
  });

  // Create operator user
  const operatorPassword = await bcrypt.hash('operator123', 12);
  const operator = await prisma.user.upsert({
    where: { userName: 'operatore' },
    update: {},
    create: {
      userName: 'operatore',
      nome: 'Operatore Test',
      password: operatorPassword,
      mail: 'operatore@coregre.local',
      adminType: 'operator',
      themeColor: 'green',
    },
  });

  // Create operator permissions
  await prisma.permission.upsert({
    where: { userId: operator.id },
    update: {},
    create: {
      userId: operator.id,
      permessi: {
        riparazioni: true,
        qualita: true,
        produzione: true,
        export: false,
        scm_admin: false,
        tracking: true,
        mrp: false,
        users: false,
        settings: false,
      },
    },
  });

  // Create some reparti
  const reparti = ['Montaggio', 'Cucitura', 'Finissaggio', 'Controllo Qualità', 'Magazzino'];
  for (const nome of reparti) {
    await prisma.reparto.upsert({
      where: { id: reparti.indexOf(nome) + 1 },
      update: {},
      create: {
        nome,
        codice: nome.substring(0, 3).toUpperCase(),
        attivo: true,
        ordine: reparti.indexOf(nome),
      },
    });
  }

  // Create some linee
  const linee = ['Linea 1', 'Linea 2', 'Linea 3'];
  for (const nome of linee) {
    await prisma.linea.upsert({
      where: { id: linee.indexOf(nome) + 1 },
      update: {},
      create: {
        nome,
        codice: `L${linee.indexOf(nome) + 1}`,
        attivo: true,
        ordine: linee.indexOf(nome),
      },
    });
  }

  // Create quality departments
  const departments = ['Controllo Entrata', 'Controllo Processo', 'Controllo Finale'];
  for (const nome of departments) {
    await prisma.qualityDepartment.upsert({
      where: { id: departments.indexOf(nome) + 1 },
      update: {},
      create: {
        nome,
        codice: `CQ${departments.indexOf(nome) + 1}`,
        attivo: true,
        ordine: departments.indexOf(nome),
      },
    });
  }

  // Create defect types
  const defects = [
    { nome: 'Difetto estetico', gravita: 2 },
    { nome: 'Difetto funzionale', gravita: 4 },
    { nome: 'Difetto critico', gravita: 5 },
    { nome: 'Non conformità materiale', gravita: 3 },
  ];
  for (const defect of defects) {
    await prisma.qualityDefectType.upsert({
      where: { id: defects.indexOf(defect) + 1 },
      update: {},
      create: {
        nome: defect.nome,
        codice: `DEF${defects.indexOf(defect) + 1}`,
        gravita: defect.gravita,
        attivo: true,
      },
    });
  }

  // Create available widgets
  const widgets = [
    { name: 'stats-riparazioni', title: 'Riparazioni Aperte', icon: 'fa-tools', category: 'stats' },
    { name: 'stats-quality', title: 'Controlli QC', icon: 'fa-check-circle', category: 'stats' },
    { name: 'stats-ddt', title: 'DDT in Bozza', icon: 'fa-file-export', category: 'stats' },
    { name: 'stats-scm', title: 'Lanci SCM', icon: 'fa-truck', category: 'stats' },
    { name: 'chart-produzione', title: 'Produzione Giornaliera', icon: 'fa-chart-bar', category: 'charts' },
    { name: 'activity-log', title: 'Attività Recenti', icon: 'fa-history', category: 'activity' },
  ];
  for (const widget of widgets) {
    await prisma.availableWidget.upsert({
      where: { name: widget.name },
      update: {},
      create: widget,
    });
  }

  // Create default settings
  const settings = [
    { key: 'app_name', value: 'CoreGRE', type: 'string', group: 'general' },
    { key: 'app_version', value: '1.0.0', type: 'string', group: 'general' },
    { key: 'company_name', value: 'MGM Shoes', type: 'string', group: 'company' },
    { key: 'timezone', value: 'Europe/Rome', type: 'string', group: 'general' },
    { key: 'date_format', value: 'dd/MM/yyyy', type: 'string', group: 'general' },
  ];
  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('Database seeded successfully!');
  console.log('');
  console.log('Default users:');
  console.log('  Admin: admin / admin123');
  console.log('  Operator: operatore / operator123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
