import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Label,
  PageSection,
  Spinner,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useCatalogDetail, useUIConfig } from '~/app/hooks/useDataRegistry';
import { dataRegistryUrl, tableDetailUrl, volumeDetailUrl } from '~/app/registry/routes';
import type { TableInfo, VolumeInfo } from '~/app/types/dataRegistry';

const CollectionDetailPage: React.FC = () => {
  const { collectionName } = useParams<{ collectionName: string }>();
  const [detail, loaded, error] = useCatalogDetail(collectionName);
  const [config] = useUIConfig();
  const navigate = useNavigate();

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error || !detail) {
    return (
      <PageSection>
        <EmptyState
          headingLevel="h2"
          titleText="Collection not found"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>
            {error?.message || `Could not load collection "${collectionName}".`}
          </EmptyStateBody>
          <Button variant="link" component={(props) => <Link {...props} to={dataRegistryUrl()} />}>
            Back to collections
          </Button>
        </EmptyState>
      </PageSection>
    );
  }

  const schema = detail.schemas?.[0];
  const tables = schema?.tables || [];
  const volumes = schema?.volumes || [];
  const schemaName = schema?.name || 'default';

  const marquezUrl = config?.marquezUrl;
  const lineageUrl = marquezUrl
    ? `${marquezUrl}/lineage?namespace=${collectionName}`
    : null;

  return (
    <PageSection>
      <Stack hasGutter>
        <StackItem>
          <Breadcrumb>
            <BreadcrumbItem>
              <Link to={dataRegistryUrl()}>Data registry</Link>
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{collectionName}</BreadcrumbItem>
          </Breadcrumb>
        </StackItem>

        <StackItem>
          <Split hasGutter>
            <SplitItem isFilled>
              <Title headingLevel="h1">{collectionName}</Title>
            </SplitItem>
            {lineageUrl && (
              <SplitItem>
                <Button
                  variant="secondary"
                  icon={<ExternalLinkAltIcon />}
                  iconPosition="end"
                  component="a"
                  href={lineageUrl}
                  target="_blank"
                >
                  View lineage
                </Button>
              </SplitItem>
            )}
          </Split>
        </StackItem>

        <StackItem>
          <Card>
            <CardTitle>
              <Split hasGutter>
                <SplitItem isFilled>
                  <Title headingLevel="h2">Tables</Title>
                </SplitItem>
                <SplitItem>
                  <Label color="blue">{tables.length}</Label>
                </SplitItem>
              </Split>
            </CardTitle>
            <CardBody>
              {tables.length === 0 ? (
                <Content component="p">No tables in this collection.</Content>
              ) : (
                <Table aria-label="Tables" variant="compact">
                  <Thead>
                    <Tr>
                      <Th width={25}>Name</Th>
                      <Th width={15}>Format</Th>
                      <Th width={10}>Type</Th>
                      <Th width={35}>Storage location</Th>
                      <Th width={10}>Columns</Th>
                      <Th width={5} />
                    </Tr>
                  </Thead>
                  <Tbody>
                    {tables.map((t: TableInfo) => (
                      <Tr key={t.name}>
                        <Td dataLabel="Name">{t.name}</Td>
                        <Td dataLabel="Format">
                          <Label color="orange" isCompact>
                            {t.data_source_format || 'UNKNOWN'}
                          </Label>
                        </Td>
                        <Td dataLabel="Type">
                          <Label isCompact>{t.table_type || '—'}</Label>
                        </Td>
                        <Td dataLabel="Storage location">
                          <Content component="small">{t.storage_location || '—'}</Content>
                        </Td>
                        <Td dataLabel="Columns">{t.columns?.length ?? 0}</Td>
                        <Td isActionCell>
                          <Button
                            variant="link"
                            isInline
                            onClick={() =>
                              navigate(
                                tableDetailUrl(collectionName!, schemaName, t.name),
                              )
                            }
                          >
                            Provenance
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </StackItem>

        <StackItem>
          <Card>
            <CardTitle>
              <Split hasGutter>
                <SplitItem isFilled>
                  <Title headingLevel="h2">Volumes</Title>
                </SplitItem>
                <SplitItem>
                  <Label color="green">{volumes.length}</Label>
                </SplitItem>
              </Split>
            </CardTitle>
            <CardBody>
              {volumes.length === 0 ? (
                <Content component="p">No volumes in this collection.</Content>
              ) : (
                <Table aria-label="Volumes" variant="compact">
                  <Thead>
                    <Tr>
                      <Th width={30}>Name</Th>
                      <Th width={15}>Type</Th>
                      <Th width={45}>Storage location</Th>
                      <Th width={10} />
                    </Tr>
                  </Thead>
                  <Tbody>
                    {volumes.map((v: VolumeInfo) => (
                      <Tr key={v.name}>
                        <Td dataLabel="Name">{v.name}</Td>
                        <Td dataLabel="Type">
                          <Label color="green" isCompact>
                            {v.volume_type || '—'}
                          </Label>
                        </Td>
                        <Td dataLabel="Storage location">
                          <Content component="small">{v.storage_location || '—'}</Content>
                        </Td>
                        <Td isActionCell>
                          <Button
                            variant="link"
                            isInline
                            onClick={() =>
                              navigate(
                                volumeDetailUrl(collectionName!, schemaName, v.name),
                              )
                            }
                          >
                            Provenance
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default CollectionDetailPage;
