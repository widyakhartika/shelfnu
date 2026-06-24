import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HOLIDAYS_2025 = [
  { date: '2025-01-01', name: 'Tahun Baru 2025 Masehi', type: 'NATIONAL' },
  { date: '2025-01-27', name: 'Tahun Baru Imlek 2576 Kongzili', type: 'NATIONAL' },
  { date: '2025-01-28', name: 'Cuti Bersama Imlek', type: 'CUTI_BERSAMA' },
  { date: '2025-03-14', name: 'Hari Suci Nyepi Tahun Baru Saka 1947', type: 'NATIONAL' },
  { date: '2025-03-29', name: 'Isra Mikraj Nabi Muhammad SAW', type: 'NATIONAL' },
  { date: '2025-03-31', name: 'Hari Raya Idul Fitri 1446 H (Hari 1)', type: 'NATIONAL' },
  { date: '2025-04-01', name: 'Hari Raya Idul Fitri 1446 H (Hari 2)', type: 'NATIONAL' },
  { date: '2025-04-02', name: 'Cuti Bersama Idul Fitri', type: 'CUTI_BERSAMA' },
  { date: '2025-04-03', name: 'Cuti Bersama Idul Fitri', type: 'CUTI_BERSAMA' },
  { date: '2025-04-04', name: 'Cuti Bersama Idul Fitri', type: 'CUTI_BERSAMA' },
  { date: '2025-04-18', name: 'Wafat Isa Al Masih (Jumat Agung)', type: 'NATIONAL' },
  { date: '2025-04-20', name: 'Hari Paskah', type: 'NATIONAL' },
  { date: '2025-05-01', name: 'Hari Buruh Internasional', type: 'NATIONAL' },
  { date: '2025-05-12', name: 'Hari Raya Waisak 2569 BE', type: 'NATIONAL' },
  { date: '2025-05-29', name: 'Kenaikan Isa Al Masih', type: 'NATIONAL' },
  { date: '2025-06-01', name: 'Hari Lahir Pancasila', type: 'NATIONAL' },
  { date: '2025-06-07', name: 'Hari Raya Idul Adha 1446 H', type: 'NATIONAL' },
  { date: '2025-06-27', name: 'Tahun Baru Islam 1447 H', type: 'NATIONAL' },
  { date: '2025-08-17', name: 'Hari Kemerdekaan RI ke-80', type: 'NATIONAL' },
  { date: '2025-09-05', name: 'Maulid Nabi Muhammad SAW', type: 'NATIONAL' },
  { date: '2025-12-25', name: 'Hari Raya Natal', type: 'NATIONAL' },
  { date: '2025-12-26', name: 'Cuti Bersama Natal', type: 'CUTI_BERSAMA' },
];

const HOLIDAYS_2026 = [
  { date: '2026-01-01', name: 'Tahun Baru 2026 Masehi', type: 'NATIONAL' },
  { date: '2026-02-15', name: 'Tahun Baru Imlek 2577 Kongzili', type: 'NATIONAL' },
  { date: '2026-03-04', name: 'Hari Suci Nyepi Tahun Baru Saka 1948', type: 'NATIONAL' },
  { date: '2026-03-19', name: 'Isra Mikraj Nabi Muhammad SAW', type: 'NATIONAL' },
  { date: '2026-03-20', name: 'Hari Raya Idul Fitri 1447 H (Hari 1)', type: 'NATIONAL' },
  { date: '2026-03-21', name: 'Hari Raya Idul Fitri 1447 H (Hari 2)', type: 'NATIONAL' },
  { date: '2026-03-22', name: 'Cuti Bersama Idul Fitri', type: 'CUTI_BERSAMA' },
  { date: '2026-03-23', name: 'Cuti Bersama Idul Fitri', type: 'CUTI_BERSAMA' },
  { date: '2026-04-03', name: 'Wafat Isa Al Masih (Jumat Agung)', type: 'NATIONAL' },
  { date: '2026-05-01', name: 'Hari Buruh Internasional', type: 'NATIONAL' },
  { date: '2026-05-16', name: 'Kenaikan Isa Al Masih', type: 'NATIONAL' },
  { date: '2026-05-27', name: 'Hari Raya Idul Adha 1447 H', type: 'NATIONAL' },
  { date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE', type: 'NATIONAL' },
  { date: '2026-06-01', name: 'Hari Lahir Pancasila', type: 'NATIONAL' },
  { date: '2026-06-17', name: 'Tahun Baru Islam 1448 H', type: 'NATIONAL' },
  { date: '2026-08-17', name: 'Hari Kemerdekaan RI ke-81', type: 'NATIONAL' },
  { date: '2026-08-26', name: 'Maulid Nabi Muhammad SAW', type: 'NATIONAL' },
  { date: '2026-12-25', name: 'Hari Raya Natal', type: 'NATIONAL' },
];

async function seed() {
  const allHolidays = [...HOLIDAYS_2025, ...HOLIDAYS_2026];

  console.log(`Seeding ${allHolidays.length} public holidays...`);

  for (const h of allHolidays) {
    const date = new Date(`${h.date}T12:00:00`);
    await prisma.publicHoliday.upsert({
      where: { date },
      update: { name: h.name, type: h.type },
      create: { date, name: h.name, type: h.type },
    });
  }

  console.log('Done!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
