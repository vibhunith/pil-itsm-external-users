import { graphFetch, listItemsPath } from './client';
import { cached } from './cache';
import type { SystemItem, ModuleItem, SubModuleItem } from '@/types/master';

const SYSTEMS_LIST = process.env.SP_LIST_SYSTEMS!;
const MODULES_LIST = process.env.SP_LIST_MODULES!;
const SUBMODULES_LIST = process.env.SP_LIST_SUBMODULES!;

// Master/reference data changes very rarely — cache each list for 5 minutes
// so the cascading dropdowns don't re-fetch the full list on every call.
const TTL = 5 * 60 * 1000;

// ─── Cached raw list fetches (one SharePoint call per list per TTL window) ───

function fetchSystemsRaw(): Promise<SystemItem[]> {
  return cached('master:systems', TTL, async () => {
    const res = await graphFetch(listItemsPath(SYSTEMS_LIST, `?$expand=fields&$top=500`));
    if (!res.ok) throw new Error('Failed to fetch systems');
    const data = await res.json();
    return (data.value ?? []).map((item: { id: string; fields: Record<string, unknown> }) => ({
      id: item.id,
      system: String(item.fields.system ?? ''),
      isActive: item.fields.IsActive === true || item.fields.IsActive === 'True',
    }));
  });
}

function fetchModulesRaw(): Promise<ModuleItem[]> {
  return cached('master:modules', TTL, async () => {
    const res = await graphFetch(listItemsPath(MODULES_LIST, `?$expand=fields&$top=1000`));
    if (!res.ok) throw new Error('Failed to fetch modules');
    const data = await res.json();
    return (data.value ?? []).map((item: { id: string; fields: Record<string, unknown> }) => ({
      id: item.id,
      module: String(item.fields.module ?? ''),
      system: String(item.fields.system ?? ''),
      systemId: Number(item.fields.system_ID ?? 0),
      isActive: item.fields.IsActive === true || item.fields.IsActive === 'True',
    }));
  });
}

function fetchSubModulesRaw(): Promise<SubModuleItem[]> {
  return cached('master:submodules', TTL, async () => {
    const res = await graphFetch(listItemsPath(SUBMODULES_LIST, `?$expand=fields&$top=1000`));
    if (!res.ok) throw new Error('Failed to fetch submodules');
    const data = await res.json();
    return (data.value ?? []).map((item: { id: string; fields: Record<string, unknown> }) => ({
      id: item.id,
      subModule: String(item.fields.subModule ?? ''),
      module: String(item.fields.module ?? ''),
      moduleId: Number(item.fields.module_ID ?? 0),
      system: String(item.fields.system ?? ''),
      isActive: item.fields.IsActive === true || item.fields.IsActive === 'True',
    }));
  });
}

// ─── Public API (filters from the cached raw lists) ──────────────────────────

export async function getSystems(): Promise<SystemItem[]> {
  return fetchSystemsRaw();
}

export async function getModulesBySystemId(systemId: string): Promise<ModuleItem[]> {
  const modules = await fetchModulesRaw();
  return modules.filter((m) => String(m.systemId) === String(systemId));
}

export async function getAllModules(): Promise<ModuleItem[]> {
  try {
    return await fetchModulesRaw();
  } catch {
    return [];
  }
}

export async function getAllSubModules(): Promise<SubModuleItem[]> {
  try {
    return await fetchSubModulesRaw();
  } catch {
    return [];
  }
}

export async function getSubModulesByModule(moduleId: string): Promise<SubModuleItem[]> {
  const subModules = await fetchSubModulesRaw();
  return subModules.filter((sm) => String(sm.moduleId) === String(moduleId));
}

export async function fetchMasterLookups(): Promise<{
  systems: Map<number, string>;
  modules: Map<number, string>;
  subModules: Map<number, string>;
}> {
  const [systems, modules, subModules] = await Promise.all([
    fetchSystemsRaw(),
    fetchModulesRaw(),
    fetchSubModulesRaw(),
  ]);
  return {
    systems: new Map(systems.map((s) => [parseInt(s.id, 10), s.system])),
    modules: new Map(modules.map((m) => [parseInt(m.id, 10), m.module])),
    subModules: new Map(subModules.map((sm) => [parseInt(sm.id, 10), sm.subModule])),
  };
}
