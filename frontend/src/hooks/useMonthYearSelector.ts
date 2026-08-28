import { useState } from "react";

/**
 * Single source of truth for "which month/year is selected" state.
 * Always numbers internally — convert to string only where a <Select>
 * component needs it (Select.value expects a string).
 */
export function useMonthYearSelector(defaultMonth?: number, defaultYear?: number) {
  const now = new Date();
  const [month, setMonth] = useState<number>(defaultMonth ?? now.getMonth() + 1);
  const [year, setYear] = useState<number>(defaultYear ?? now.getFullYear());

  return {
    month,
    year,
    setMonth,
    setYear,
    // Convenience string versions for <Select> components that only accept strings.
    monthStr: String(month),
    yearStr: String(year),
    setMonthStr: (v: string) => setMonth(Number(v)),
    setYearStr: (v: string) => setYear(Number(v)),
  };
}

/**
 * Generates a list of selectable years around a center point.
 * e.g. getYearRange(5, 2) -> 5 years, starting 2 years before the current year.
 */
export function getYearRange(count: number, offsetBefore: number, centerYear?: number): number[] {
  const base = centerYear ?? new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => base - offsetBefore + i);
}
