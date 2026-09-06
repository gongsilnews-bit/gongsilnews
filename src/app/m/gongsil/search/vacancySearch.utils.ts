import { FilterState, VacancyRecord } from "./vacancySearch.types";

export function hasRegionFilter(filters: Pick<FilterState, "sido" | "sigungu" | "dong">): boolean {
  return Boolean(filters.sido || filters.sigungu || filters.dong);
}

export function getVacancySearchPool<T extends VacancyRecord>(
  vacancies: T[],
  allVacancies: T[] | undefined,
  filters: Pick<FilterState, "sido" | "sigungu" | "dong">
): T[] {
  if (!hasRegionFilter(filters) && allVacancies && allVacancies.length > 0) {
    return allVacancies;
  }

  if (vacancies.length > 0) {
    return vacancies;
  }

  return allVacancies || [];
}