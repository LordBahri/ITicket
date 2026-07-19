import type { Company } from "../types";

export interface CompanyGroup<T> {
  companyId: string;
  companyName: string;
  items: T[];
}

export interface CompanyGroupResult<T> {
  groups: CompanyGroup<T>[];
  unassigned: T[];
}

export function groupByCompany<T>(
  items: T[],
  companies: Company[],
  getCompanyId: (item: T) => string | null | undefined
): CompanyGroupResult<T> {
  const byCompany = new Map<string, T[]>();
  const unassigned: T[] = [];
  for (const item of items) {
    const id = getCompanyId(item);
    if (!id) {
      unassigned.push(item);
      continue;
    }
    const list = byCompany.get(id);
    if (list) list.push(item);
    else byCompany.set(id, [item]);
  }
  const groups = companies
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ companyId: c.id, companyName: c.name, items: byCompany.get(c.id) ?? [] }))
    .filter((g) => g.items.length > 0);
  return { groups, unassigned };
}

export interface CompanyStat {
  companyId: string;
  companyName: string;
  count: number;
}

export function companyStats<T>(
  items: T[],
  companies: Company[],
  getCompanyId: (item: T) => string | null | undefined
): { stats: CompanyStat[]; unassignedCount: number; total: number } {
  const { groups, unassigned } = groupByCompany(items, companies, getCompanyId);
  return {
    stats: groups.map((g) => ({ companyId: g.companyId, companyName: g.companyName, count: g.items.length })),
    unassignedCount: unassigned.length,
    total: items.length,
  };
}
