export type ServiceCategory = "hair" | "nails" | "waxing";

export interface SubService {
  id: string;
  label: string;
}

export interface ServiceConfig {
  id: ServiceCategory;
  label: string;
  subServices: SubService[];
}

export const SERVICE_OPTIONS: ServiceConfig[] = [
  {
    id: "hair",
    label: "Коса",
    subServices: [
      { id: "haircut_female", label: "Шишање Женско" },
      { id: "haircut_male", label: "Шишање Машко" },
      { id: "blowdry", label: "Фенирање" },
      { id: "hairstyle", label: "Фризура" },
      { id: "toner", label: "Прелив" },
      { id: "coloring", label: "Фарбање" },
      { id: "highlights", label: "Шатирање" },
      { id: "braids", label: "Плетенка" },
    ],
  },
  {
    id: "nails",
    label: "Нокти",
    subServices: [
      { id: "gel_natural", label: "Гел на природни" },
      { id: "extensions", label: "Надградба" },
    ],
  },
  {
    id: "waxing",
    label: "Депилација",
    subServices: [
      { id: "eyebrows", label: "Чупкање" },
      { id: "face", label: "Лице" },
      { id: "intimate", label: "Интима" },
      { id: "legs", label: "Нозе" },
      { id: "arms", label: "Раце" },
      { id: "underarms", label: "Пазуви" },
      { id: "back", label: "Грб" },
    ],
  },
];
