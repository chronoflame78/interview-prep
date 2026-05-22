export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  HARD: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export const LANGUAGES = [
  { key: "en", label: "English" },
  { key: "vn", label: "Vietnamese" },
  { key: "cus", label: "Custom" },
] as const;

export const PAGE_SIZE = 20;
