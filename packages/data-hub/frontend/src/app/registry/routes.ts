const DATA_REGISTRY_BASE = '/ai-hub/data/collections';

export const dataRegistryUrl = (): string => DATA_REGISTRY_BASE;

export const collectionUrl = (name: string): string =>
  `${DATA_REGISTRY_BASE}/${encodeURIComponent(name)}`;

export const tableDetailUrl = (catalog: string, schema: string, table: string): string =>
  `${DATA_REGISTRY_BASE}/${encodeURIComponent(catalog)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}`;

export const volumeDetailUrl = (catalog: string, schema: string, volume: string): string =>
  `${DATA_REGISTRY_BASE}/${encodeURIComponent(catalog)}/schemas/${encodeURIComponent(schema)}/volumes/${encodeURIComponent(volume)}`;
