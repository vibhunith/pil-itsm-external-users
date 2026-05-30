import { graphFetch, listItemsPath } from './client';
import type { SystemItem, ModuleItem, SubModuleItem } from '@/types/master';

const SYSTEMS_LIST = process.env.SP_LIST_SYSTEMS!;
const MODULES_LIST = process.env.SP_LIST_MODULES!;
const SUBMODULES_LIST = process.env.SP_LIST_SUBMODULES!;

// Cache master lookups for 5 minutes — they change very rarely
let masterCache: {
  data: { systems: Map<number, string>; modules: Map<number, string>; subModules: Map<number, string> };
  expiresAt: number;
} | null = null;

export async function getSystems(): Promise<SystemItem[]> {
  const query = `?$expand=fields&$top=500`;
  const res = await graphFetch(listItemsPath(SYSTEMS_LIST, query));
  if (!res.ok) throw new Error('Failed to fetch systems');

  const data = await res.json();
  return (data.value ?? [])
    .map((item: { id: string; fields: Record<string, unknown> }) => ({
      id: item.id,
      system: String(item.fields.system ?? ''),
      isActive: item.fields.IsActive === true || item.fields.IsActive === 'True',
    }))
    .filter((s: SystemItem) => !s.isActive === false || true); // return all, let UI filter if needed
}

export async function getModulesBySystemId(systemId: string): Promise<ModuleItem[]> {
  // Filter by system_ID (numeric lookup) — system name text field is not returned by Graph
  const query = `?$expand=fields&$top=1000`;
  const res = await graphFetch(listItemsPath(MODULES_LIST, query));
  if (!res.ok) throw new Error('Failed to fetch modules');

  const data = await res.json();
  return (data.value ?? [])
    .map((item: { id: string; fields: Record<string, unknown> }) => ({
      id: item.id,
      module: String(item.fields.module ?? ''),
      system: String(item.fields.system ?? ''),
      systemId: Number(item.fields.system_ID ?? 0),
      isActive: item.fields.IsActive === true || item.fields.IsActive === 'True',
    }))
    .filter((m: ModuleItem) => String(m.systemId) === String(systemId));
}

export async function getAllModules(): Promise<ModuleItem[]> {
  const query = `?$expand=fields&$top=1000`;
  const res = await graphFetch(listItemsPath(MODULES_LIST, query));
  if (!res.ok) return [];
  const data = await res.json();
  return (data.value ?? []).map((item: { id: string; fields: Record<string, unknown> }) => ({
    id: item.id,
    module: String(item.fields.module ?? ''),
    system: String(item.fields.system ?? ''),
    systemId: Number(item.fields.system_ID ?? 0),
    isActive: item.fields.IsActive === true || item.fields.IsActive === 'True',
  }));
}

export async function getAllSubModules(): Promise<SubModuleItem[]> {
  const query = `?$expand=fields&$top=1000`;
  const res = await graphFetch(listItemsPath(SUBMODULES_LIST, query));
  if (!res.ok) return [];
  const data = await res.json();
  return (data.value ?? []).map((item: { id: string; fields: Record<string, unknown> }) => ({
    id: item.id,
    subModule: String(item.fields.subModule ?? ''),
    module: String(item.fields.module ?? ''),
    moduleId: Number(item.fields.module_ID ?? 0),
    system: String(item.fields.system ?? ''),
    isActive: item.fields.IsActive === true || item.fields.IsActive === 'True',
  }));
}

export async function fetchMasterLookups(): Promise<{
  systems: Map<number, string>;
  modules: Map<number, string>;
  subModules: Map<number, string>;
}> {
  if (masterCache && masterCache.expiresAt > Date.now()) return masterCache.data;

  const [systems, modules, subModules] = await Promise.all([
    getSystems(),
    getAllModules(),
    getAllSubModules(),
  ]);
  const data = {
    systems: new Map(systems.map((s) => [parseInt(s.id, 10), s.system])),
    modules: new Map(modules.map((m) => [parseInt(m.id, 10), m.module])),
    subModules: new Map(subModules.map((sm) => [parseInt(sm.id, 10), sm.subModule])),
  };
  masterCache = { data, expiresAt: Date.now() + 5 * 60 * 1000 };
  return data;
}

export async function getSubModulesByModule(moduleId: string): Promise<SubModuleItem[]> {
  // Fetch all submodules and filter client-side — fields/module_ID may not be indexed
  const query = `?$expand=fields&$top=1000`;
  const res = await graphFetch(listItemsPath(SUBMODULES_LIST, query));
  if (!res.ok) throw new Error('Failed to fetch submodules');

  const data = await res.json();
  return (data.value ?? [])
    .map((item: { id: string; fields: Record<string, unknown> }) => ({
      id: item.id,
      subModule: String(item.fields.subModule ?? ''),
      module: String(item.fields.module ?? ''),
      moduleId: Number(item.fields.module_ID ?? 0),
      system: String(item.fields.system ?? ''),
      isActive: item.fields.IsActive === true || item.fields.IsActive === 'True',
    }))
    .filter((sm: SubModuleItem) => String(sm.moduleId) === String(moduleId));
}
