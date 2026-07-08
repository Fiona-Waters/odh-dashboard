import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Label,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  ExpandableRowContent,
} from '@patternfly/react-table';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useTableVersions, useTraces, useUIConfig } from '~/app/hooks/useDataRegistry';
import { dataRegistryUrl, collectionUrl } from '~/app/registry/routes';
import type { TableVersion, TraceInfo } from '~/app/types/dataRegistry';

const TableDetailPage: React.FC = () => {
  const { collectionName, schemaName, tableName } = useParams<{
    collectionName: string;
    schemaName: string;
    tableName: string;
  }>();
  const [rawVersions, versionsLoaded] = useTableVersions(
    collectionName!,
    schemaName!,
    tableName!,
  );
  const [rawTraces, tracesLoaded] = useTraces(collectionName, schemaName, tableName);
  const [config] = useUIConfig();
  const versions = Array.isArray(rawVersions) ? rawVersions : [];
  const traces = Array.isArray(rawTraces) ? rawTraces : [];
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());

  const toggleRow = (idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const marquezUrl = config?.marquezUrl;
  const lineageUrl = marquezUrl
    ? `${marquezUrl}/lineage?dataset=${collectionName}.${schemaName}.${tableName}`
    : null;

  return (
    <PageSection>
      <Stack hasGutter>
        <StackItem>
          <Breadcrumb>
            <BreadcrumbItem>
              <Link to={dataRegistryUrl()}>Data registry</Link>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <Link to={collectionUrl(collectionName!)}>{collectionName}</Link>
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{tableName}</BreadcrumbItem>
          </Breadcrumb>
        </StackItem>

        <StackItem>
          <Title headingLevel="h1">
            {tableName}
            <Label color="orange" isCompact style={{ marginLeft: '0.5rem' }}>
              Table
            </Label>
          </Title>
        </StackItem>

        {lineageUrl && (
          <StackItem>
            <Button
              variant="secondary"
              icon={<ExternalLinkAltIcon />}
              iconPosition="end"
              component="a"
              href={lineageUrl}
              target="_blank"
            >
              View in Marquez
            </Button>
          </StackItem>
        )}

        {/* Version History */}
        <StackItem>
          <Card>
            <CardTitle>
              <Title headingLevel="h2">Version History</Title>
            </CardTitle>
            <CardBody>
              {!versionsLoaded ? (
                <Bullseye>
                  <Spinner size="lg" />
                </Bullseye>
              ) : versions.length === 0 ? (
                <EmptyState
                  headingLevel="h3"
                  titleText="No versions found"
                  variant={EmptyStateVariant.sm}
                >
                  <EmptyStateBody>
                    Version history will appear here once data is ingested.
                  </EmptyStateBody>
                </EmptyState>
              ) : (
                <Table aria-label="Version history" variant="compact">
                  <Thead>
                    <Tr>
                      <Th />
                      <Th>Version</Th>
                      <Th>Operation</Th>
                      <Th>Total Rows</Th>
                      <Th>Added</Th>
                      <Th>Superseded</Th>
                      <Th>Timestamp</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {versions.map((v: TableVersion, idx: number) => {
                      const isExpanded = expandedRows.has(idx);
                      const delta = v.deltaStats;
                      return (
                        <React.Fragment key={v.version}>
                          <Tr>
                            <Td
                              expand={
                                delta?.filesChanged
                                  ? {
                                      rowIndex: idx,
                                      isExpanded,
                                      onToggle: () => toggleRow(idx),
                                    }
                                  : undefined
                              }
                            />
                            <Td dataLabel="Version">
                              <Label isCompact>
                                {delta ? `v${delta.deltaVersion}` : v.version}
                              </Label>
                            </Td>
                            <Td dataLabel="Operation">
                              {delta?.operation || '—'}
                            </Td>
                            <Td dataLabel="Total Rows">
                              {delta?.totalRows?.toLocaleString() ?? '—'}
                            </Td>
                            <Td dataLabel="Added">
                              {delta?.rowsAdded?.toLocaleString() ?? '—'}
                            </Td>
                            <Td dataLabel="Superseded">
                              {delta?.rowsSuperseded?.toLocaleString() ?? '—'}
                            </Td>
                            <Td dataLabel="Timestamp">
                              {v.createdAt
                                ? new Date(v.createdAt).toLocaleString()
                                : '—'}
                            </Td>
                          </Tr>
                          {delta?.filesChanged && isExpanded && (
                            <Tr isExpanded>
                              <Td colSpan={7}>
                                <ExpandableRowContent>
                                  <DescriptionList isHorizontal isCompact>
                                    {delta.filesChanged.map((f) => (
                                      <DescriptionListGroup key={f.filename}>
                                        <DescriptionListTerm>
                                          {f.filename}
                                        </DescriptionListTerm>
                                        <DescriptionListDescription>
                                          <Label
                                            isCompact
                                            color={
                                              f.action === 'add'
                                                ? 'green'
                                                : f.action === 'remove'
                                                  ? 'red'
                                                  : 'blue'
                                            }
                                          >
                                            {f.action}
                                          </Label>
                                          {f.lob && (
                                            <Label isCompact style={{ marginLeft: '0.25rem' }}>
                                              {f.lob}
                                            </Label>
                                          )}
                                        </DescriptionListDescription>
                                      </DescriptionListGroup>
                                    ))}
                                  </DescriptionList>
                                </ExpandableRowContent>
                              </Td>
                            </Tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </Tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </StackItem>

        {/* Recent Query Traces */}
        <StackItem>
          <Card>
            <CardTitle>
              <Title headingLevel="h2">Recent Query Traces</Title>
            </CardTitle>
            <CardBody>
              {!tracesLoaded ? (
                <Bullseye>
                  <Spinner size="lg" />
                </Bullseye>
              ) : traces.length === 0 ? (
                <EmptyState
                  headingLevel="h3"
                  titleText="No traces found"
                  variant={EmptyStateVariant.sm}
                >
                  <EmptyStateBody>
                    No RAG query traces for this table yet.
                  </EmptyStateBody>
                </EmptyState>
              ) : (
                <Stack hasGutter>
                  {traces.map((t: TraceInfo) => (
                    <StackItem key={t.trace_id}>
                      <Card isCompact>
                        <CardBody>
                          <DescriptionList isHorizontal isCompact>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Query</DescriptionListTerm>
                              <DescriptionListDescription>
                                {t.request}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>App</DescriptionListTerm>
                              <DescriptionListDescription>
                                {t.app_name}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Duration</DescriptionListTerm>
                              <DescriptionListDescription>
                                {t.duration_ms}ms
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Status</DescriptionListTerm>
                              <DescriptionListDescription>
                                <Label
                                  isCompact
                                  color={t.status === 'OK' ? 'green' : 'red'}
                                >
                                  {t.status}
                                </Label>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </CardBody>
                      </Card>
                    </StackItem>
                  ))}
                </Stack>
              )}
            </CardBody>
          </Card>
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default TableDetailPage;
