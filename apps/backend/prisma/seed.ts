import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding iniziale del database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('stefano', 12);
  const admin = await prisma.user.upsert({
    where: { userName: 'stefanos' },
    update: {},
    create: {
      userName: 'stefanos',
      nome: 'Stefano Solidoro',
      password: adminPassword,
      mail: 'stefano.solidoro@mgmshoes.it',
    },
  });

  // Create admin permissions (tutti i permessi abilitati)
  await prisma.permission.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      permessi: {
        riparazioni: true,
        quality: true,
        produzione: true,
        export: true,
        scm_admin: true,
        tracking: true,
        users: true,
        settings: true,
        log: true,
        dbsql: true,
        inwork: true,
      },
    },
  });


  // Create some reparti
  const reparti = ['MANOVIA 1', 'MANOVIA 2', 'ORLATURA 1', 'ORLATURA 2', 'ORLATURA 3', 'ORLATURA 4', 'ORLATURA 5', 'TAGLIO 1', 'TAGLIO 2'];
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


  // Create production phases and departments
  const productionPhases = [
    {
      nome: 'Montaggio',
      codice: 'MONT',
      colore: 'blue',
      icona: 'fa-industry',
      ordine: 1,
      reparti: [
        { nome: 'Manovia 1', codice: 'MAN1', ordine: 1 },
        { nome: 'Manovia 2', codice: 'MAN2', ordine: 2 },
      ],
    },
    {
      nome: 'Orlatura',
      codice: 'ORL',
      colore: 'green',
      icona: 'fa-cog',
      ordine: 2,
      reparti: [
        { nome: 'Orlatura 1', codice: 'ORL1', ordine: 1 },
        { nome: 'Orlatura 2', codice: 'ORL2', ordine: 2 },
        { nome: 'Orlatura 3', codice: 'ORL3', ordine: 3 },
        { nome: 'Orlatura 4', codice: 'ORL4', ordine: 4 },
        { nome: 'Orlatura 5', codice: 'ORL5', ordine: 5 },
      ],
    },
    {
      nome: 'Taglio',
      codice: 'TAG',
      colore: 'purple',
      icona: 'fa-cut',
      ordine: 3,
      reparti: [
        { nome: 'Taglio 1', codice: 'TAG1', ordine: 1 },
        { nome: 'Taglio 2', codice: 'TAG2', ordine: 2 },
      ],
    },
  ];

  for (const phaseData of productionPhases) {
    const { reparti, ...phaseInfo } = phaseData;

    const phase = await prisma.productionPhase.upsert({
      where: { codice: phaseInfo.codice },
      update: phaseInfo,
      create: phaseInfo,
    });

    for (const repartoData of reparti) {
      await prisma.productionDepartment.upsert({
        where: {
          id: await prisma.productionDepartment.findFirst({
            where: { phaseId: phase.id, codice: repartoData.codice }
          }).then(r => r?.id || 0)
        },
        update: { ...repartoData, phaseId: phase.id },
        create: { ...repartoData, phaseId: phase.id },
      });
    }
  }

  console.log('Production phases and departments seeded!');

  // Create default settings
  const settings = [
    { key: 'app_name', value: 'CoreGRE', type: 'string', group: 'general' },
    { key: 'app_version', value: '2.0.0', type: 'string', group: 'general' },
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
  console.log('  Admin: stefanos / stefano');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
