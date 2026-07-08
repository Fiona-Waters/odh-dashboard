import React from 'react';
import type {
  Catalog,
  CatalogDetail,
  TableVersion,
  MilvusStats,
  TraceInfo,
  UIConfig,
} from '~/app/types/dataRegistry';

const API_PREFIX = '/data-hub/api/v1';

type FetchState<T> = [T, boolean, Error | null, () => void];

function useBffFetch<T>(
  url: string | null,
  initial: T,
  extract?: (json: Record<string, unknown>) => T,
): FetchState<T> {
  const [data, setData] = React.useState<T>(initial);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = React.useCallback(() => setRefreshKey((k) => k + 1), []);

  React.useEffect(() => {
    if (!url) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    setError(null);

    fetch(url)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`${r.status} ${r.statusText}`);
        }
        return r.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(extract ? extract(json) : json);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e);
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url, refreshKey]);

  return [data, loaded, error, refresh];
}

export const useCatalogs = (): FetchState<Catalog[]> =>
  useBffFetch<Catalog[]>(`${API_PREFIX}/catalogs`, [], (json) => (json.catalogs ?? []) as Catalog[]);

export const useCatalogDetail = (
  catalogName: string | undefined,
): FetchState<CatalogDetail | null> =>
  useBffFetch<CatalogDetail | null>(
    catalogName ? `${API_PREFIX}/catalogs/${catalogName}/detail` : null,
    null,
  );

export const useTableVersions = (
  catalogName: string,
  schemaName: string,
  tableName: string,
): FetchState<TableVersion[]> =>
  useBffFetch<TableVersion[]>(
    `${API_PREFIX}/catalogs/${catalogName}/schemas/${schemaName}/tables/${tableName}/versions`,
    [],
    (json) => (json.versions ?? []) as TableVersion[],
  );

export const useMilvusStats = (
  catalogName: string,
  schemaName: string,
  volumeName: string,
): FetchState<MilvusStats | null> =>
  useBffFetch<MilvusStats | null>(
    `${API_PREFIX}/catalogs/${catalogName}/schemas/${schemaName}/volumes/${volumeName}/milvus-stats`,
    null,
  );

export const useTraces = (
  catalogName?: string,
  schemaName?: string,
  assetName?: string,
): FetchState<TraceInfo[]> =>
  useBffFetch<TraceInfo[]>(
    catalogName && schemaName && assetName
      ? `${API_PREFIX}/traces?catalog=${catalogName}&schema=${schemaName}&asset=${assetName}`
      : null,
    [],
    (json) => (json.traces ?? []) as TraceInfo[],
  );

export const useUIConfig = (): FetchState<UIConfig | null> =>
  useBffFetch<UIConfig | null>(`${API_PREFIX}/config`, null);

// --- Mutation helpers (not hooks — plain async fetch wrappers) ---

export async function createCatalog(
  name: string,
  comment?: string,
  properties?: Record<string, string>,
): Promise<void> {
  const resp = await fetch(`${API_PREFIX}/catalogs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, comment, properties }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.message || body.error?.message || `${resp.status} ${resp.statusText}`);
  }
}

export async function createTable(
  catalogName: string,
  schemaName: string,
  table: {
    name: string;
    data_source_format?: string;
    storage_location?: string;
    columns?: { name: string; type_name: string }[];
  },
): Promise<void> {
  const resp = await fetch(`${API_PREFIX}/catalogs/${catalogName}/schemas/${schemaName}/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: table.name,
      catalog_name: catalogName,
      schema_name: schemaName,
      table_type: 'EXTERNAL',
      data_source_format: table.data_source_format || 'DELTA',
      storage_location: table.storage_location,
      columns: table.columns || [],
    }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.message || body.error?.message || `${resp.status} ${resp.statusText}`);
  }
}

export async function createVolume(
  catalogName: string,
  schemaName: string,
  volume: {
    name: string;
    storage_location?: string;
    comment?: string;
    properties?: Record<string, string>;
  },
): Promise<void> {
  const resp = await fetch(`${API_PREFIX}/catalogs/${catalogName}/schemas/${schemaName}/volumes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: volume.name,
      catalog_name: catalogName,
      schema_name: schemaName,
      volume_type: 'EXTERNAL',
      storage_location: volume.storage_location,
      comment: volume.comment,
      properties: volume.properties,
    }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.message || body.error?.message || `${resp.status} ${resp.statusText}`);
  }
}

async function mutate(url: string, method: string, body?: unknown): Promise<void> {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if (!resp.ok) {
    const b = await resp.json().catch(() => ({}));
    throw new Error(b.message || b.error?.message || `${resp.status} ${resp.statusText}`);
  }
}

export const deleteCatalog = (name: string) =>
  mutate(`${API_PREFIX}/catalogs/${name}`, 'DELETE');

export const deleteTable = (catalogName: string, schemaName: string, tableName: string) =>
  mutate(`${API_PREFIX}/catalogs/${catalogName}/schemas/${schemaName}/tables/${tableName}`, 'DELETE');

export const deleteVolume = (catalogName: string, schemaName: string, volumeName: string) =>
  mutate(`${API_PREFIX}/catalogs/${catalogName}/schemas/${schemaName}/volumes/${volumeName}`, 'DELETE');

export const updateCatalog = (name: string, properties: Record<string, string>) =>
  mutate(`${API_PREFIX}/catalogs/${name}/properties`, 'POST', { updates: properties });

export const updateTable = (
  catalogName: string,
  schemaName: string,
  tableName: string,
  body: Record<string, unknown>,
) => mutate(`${API_PREFIX}/catalogs/${catalogName}/schemas/${schemaName}/tables/${tableName}/update`, 'POST', body);

export const updateVolume = (
  catalogName: string,
  schemaName: string,
  volumeName: string,
  body: Record<string, unknown>,
) => mutate(`${API_PREFIX}/catalogs/${catalogName}/schemas/${schemaName}/volumes/${volumeName}/update`, 'POST', body);
