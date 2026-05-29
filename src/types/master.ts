export interface SystemItem {
  id: string;
  system: string;
  isActive: boolean;
}

export interface ModuleItem {
  id: string;
  module: string;
  system: string;
  systemId: number;
  isActive: boolean;
}

export interface SubModuleItem {
  id: string;
  subModule: string;
  module: string;
  moduleId: number;
  system: string;
  isActive: boolean;
}
