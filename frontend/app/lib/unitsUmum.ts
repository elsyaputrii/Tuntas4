// FILE: frontend/lib/unitsUmum.ts
// Daftar lengkap unit kerja Polibatam — sinkron dengan backend/constants/unitsUmum.js

export const UNIT_GROUPS = [
  {
    grup: "Umum",
    units: [
      "MANAJEMEN",
      "P4M",
      "P3M",
      "SPI",
      "UPA-PERPUS",
      "UPA-PKK",
      "UPA-PP",
      "UPA-TIK",
      "SHILAU",
      "SBAK",
      "SBUM",
      "Pokja BMN dan Pengadaan",
      "Pokja Humas dan Kerjasama",
      "Pokja Kemahasiswaan",
      "Pokja Keuangan",
      "Pokja Organisasi SDM",
      "Pokja Perencanaan",
    ],
  },
  {
    grup: "Jurusan Manajemen Bisnis",
    units: [
      "Jur. MB",
      "Prodi ABT",
      "Prodi AK",
      "Prodi AM",
      "Prodi LPI",
      "Prodi DB",
    ],
  },
  {
    grup: "Jurusan Teknik Informatika",
    units: [
      "Jur. IF",
      "Prodi AN",
      "Prodi GM",
      "Prodi IF",
      "Prodi TRM",
      "Prodi RKS",
      "Prodi TRPL",
      "Prodi TP",
      "Prodi TKO",
    ],
  },
  {
    grup: "Jurusan Teknik Mesin",
    units: [
      "Jur. MS",
      "Prodi TRKP",
      "Prodi TRPF",
      "Prodi MS",
      "Prodi PPI",
      "Prodi TPPU",
      "Prodi MET",
    ],
  },
  {
    grup: "Jurusan Teknik Elektro",
    units: [
      "Jur. EL",
      "Prodi TRE",
      "Prodi EM",
      "Prodi IN",
      "Prodi MK",
      "Prodi TRR",
      "Prodi TRPE",
    ],
  },
] as const;

// Flat list semua unit
export const ALL_UNITS = UNIT_GROUPS.flatMap((g) => g.units);

// Legacy backward compat
export const UNITS_UMUM = UNIT_GROUPS[0].units;
export type UnitUmum = (typeof UNITS_UMUM)[number];

// Format { grup, unit }[] untuk MultiSelectUnit dropdown
export const DAFTAR_UNIT_UMUM = UNIT_GROUPS.flatMap((g) =>
  g.units.map((unit) => ({ grup: g.grup, unit }))
);