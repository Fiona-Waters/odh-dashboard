export type Catalog = {
  name: string;
  comment: string | null;
  owner: string | null;
  id: string;
  created_at: number;
};

export type ColumnInfo = {
  name: string;
  type_name: string;
  comment: string;
  position: number;
};

export type TableInfo = {
  name: string;
  data_source_format: string;
  table_type: string;
  storage_location: string;
  comment: string;
  columns: ColumnInfo[] | null;
};

export type VolumeInfo = {
  name: string;
  volume_type: string;
  storage_location: string;
  comment: string;
};

export type SchemaInfo = {
  name: string;
  comment: string;
  tables: TableInfo[] | null;
  volumes: VolumeInfo[] | null;
};

export type CatalogDetail = {
  name: string;
  schemas: SchemaInfo[] | null;
  members: unknown[] | null;
};

export type FileChanged = {
  filename: string;
  action: string;
  lob?: string;
  size_bytes?: number;
  old_size?: number;
  new_size?: number;
};

export type DeltaStats = {
  deltaVersion: number;
  totalRows: number;
  rowsAdded: number;
  rowsSuperseded: number;
  operation: string;
  filesChanged?: FileChanged[];
};

export type TableVersion = {
  version: string;
  createdAt: string;
  datasetVersion?: string;
  deltaStats?: DeltaStats;
};

export type TraceInfo = {
  trace_id: string;
  timestamp: string;
  status: string;
  duration_ms: number;
  request: string;
  response?: string;
  app_name: string;
  source_docs?: string[];
};

export type MilvusStats = {
  count: number;
  source_docs: string[];
  error?: string;
};

export type RegisteredApp = {
  name: string;
  displayName: string;
  type: string;
  mlflowExperimentId?: string;
  mlflowWorkspace?: string;
  milvusCollection?: string;
  volumes: string[];
};

export type UIConfig = {
  marquezUrl: string;
  marquezApiUrl: string;
  mlflowUrl: string;
};
