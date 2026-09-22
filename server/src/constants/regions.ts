// Uzbekistan's 12 viloyat + Toshkent shahri + Qoraqalpog'iston Respublikasi.
// Used both to validate/store a student's own region and to tag each
// University row, so university recommendations can prefer the student's
// own region without needing a separate lookup table.
export const REGIONS = [
  { code: "TASHKENT_CITY", nameUz: "Toshkent shahri", nameRu: "город Ташкент" },
  { code: "TASHKENT_REGION", nameUz: "Toshkent viloyati", nameRu: "Ташкентская область" },
  { code: "ANDIJAN", nameUz: "Andijon viloyati", nameRu: "Андижанская область" },
  { code: "FERGANA", nameUz: "Farg'ona viloyati", nameRu: "Ферганская область" },
  { code: "NAMANGAN", nameUz: "Namangan viloyati", nameRu: "Наманганская область" },
  { code: "SAMARKAND", nameUz: "Samarqand viloyati", nameRu: "Самаркандская область" },
  { code: "BUKHARA", nameUz: "Buxoro viloyati", nameRu: "Бухарская область" },
  { code: "NAVOI", nameUz: "Navoiy viloyati", nameRu: "Навоийская область" },
  { code: "KASHKADARYA", nameUz: "Qashqadaryo viloyati", nameRu: "Кашкадарьинская область" },
  { code: "SURKHANDARYA", nameUz: "Surxondaryo viloyati", nameRu: "Сурхандарьинская область" },
  { code: "JIZZAKH", nameUz: "Jizzax viloyati", nameRu: "Джизакская область" },
  { code: "SYRDARYA", nameUz: "Sirdaryo viloyati", nameRu: "Сырдарьинская область" },
  { code: "KHOREZM", nameUz: "Xorazm viloyati", nameRu: "Хорезмская область" },
  { code: "KARAKALPAKSTAN", nameUz: "Qoraqalpog'iston Respublikasi", nameRu: "Республика Каракалпакстан" },
] as const;

export type RegionCode = (typeof REGIONS)[number]["code"];
export const REGION_CODES = REGIONS.map((r) => r.code) as RegionCode[];
