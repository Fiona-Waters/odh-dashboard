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
