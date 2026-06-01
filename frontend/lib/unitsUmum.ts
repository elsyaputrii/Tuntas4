// Unit bagian Umum — sinkron dengan backend/constants/unitsUmum.js
export const UNITS_UMUM = [
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
] as const;

export type UnitUmum = (typeof UNITS_UMUM)[number];

export const DAFTAR_UNIT_UMUM = UNITS_UMUM.map((unit) => ({
  grup: "Umum" as const,
  unit,
}));
