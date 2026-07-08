import React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Grid,
  GridItem,
  Label,
  PageSection,
  SearchInput,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { DatabaseIcon } from '@patternfly/react-icons';
import { useCatalogs } from '~/app/hooks/useDataRegistry';
import type { Catalog } from '~/app/types/dataRegistry';
import CollectionCard from '~/app/registry/components/CollectionCard';

const GRID_SPANS = { sm: 6 as const, md: 6 as const, lg: 6 as const, xl: 6 as const, xl2: 3 as const };

const CollectionListPage: React.FC = () => {
  const [catalogs, loaded, error, refresh] = useCatalogs();
  const [filter, setFilter] = React.useState('');

  const filtered = React.useMemo(() => {
    if (!filter) {
      return catalogs;
    }
    const lc = filter.toLowerCase();
    return catalogs.filter(
      (c) =>
        c.name.toLowerCase().includes(lc) ||
        (c.comment && c.comment.toLowerCase().includes(lc)),
    );
  }, [catalogs, filter]);

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error) {
    return (
      <PageSection>
        <EmptyState
          headingLevel="h2"
          titleText="Error loading collections"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>{error.message}</EmptyStateBody>
          <Button variant="link" onClick={refresh}>
            Retry
          </Button>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem variant="search-filter">
            <SearchInput
              placeholder="Filter by name or description"
              value={filter}
              onChange={(_e, val) => setFilter(val)}
              onClear={() => setFilter('')}
            />
          </ToolbarItem>
          <ToolbarItem variant="separator" />
          <ToolbarItem>
            <Label color="blue">{catalogs.length} collections</Label>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState
          headingLevel="h2"
          icon={filter ? undefined : DatabaseIcon}
          titleText={filter ? 'No matching collections' : 'No collections registered'}
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>
            {filter
              ? 'Try adjusting your filter criteria.'
              : 'Collections will appear here once they are registered in the data catalog.'}
          </EmptyStateBody>
          {filter && (
            <Button variant="link" onClick={() => setFilter('')}>
              Clear filter
            </Button>
          )}
        </EmptyState>
      ) : (
        <Grid hasGutter>
          {filtered.map((catalog: Catalog) => (
            <GridItem key={catalog.name} {...GRID_SPANS}>
              <CollectionCard catalog={catalog} />
            </GridItem>
          ))}
        </Grid>
      )}
    </PageSection>
  );
};

export default CollectionListPage;
