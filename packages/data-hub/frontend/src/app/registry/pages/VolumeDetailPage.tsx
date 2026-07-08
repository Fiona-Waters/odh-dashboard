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
  ClipboardCopy,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Label,
  List,
  ListItem,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, StorageDomainIcon } from '@patternfly/react-icons';
import { useMilvusStats, useTraces, useUIConfig } from '~/app/hooks/useDataRegistry';
import { dataRegistryUrl, collectionUrl } from '~/app/registry/routes';
import type { TraceInfo } from '~/app/types/dataRegistry';

const VolumeDetailPage: React.FC = () => {
  const { collectionName, schemaName, volumeName } = useParams<{
    collectionName: string;
    schemaName: string;
    volumeName: string;
  }>();
  const [stats, statsLoaded] = useMilvusStats(
    collectionName!,
    schemaName!,
    volumeName!,
  );
  const [rawTraces, tracesLoaded] = useTraces(collectionName, schemaName, volumeName);
  const [config] = useUIConfig();
  const traces = Array.isArray(rawTraces) ? rawTraces : [];

  const marquezUrl = config?.marquezUrl;
  const lineageUrl = marquezUrl
    ? `${marquezUrl}/lineage?dataset=${collectionName}.${schemaName}.${volumeName}`
    : null;

  const fullName = `${collectionName}.${schemaName}.${volumeName}`;

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
            <BreadcrumbItem isActive>{volumeName}</BreadcrumbItem>
          </Breadcrumb>
        </StackItem>

        <StackItem>
          <Title headingLevel="h1">
            <StorageDomainIcon style={{ marginRight: '0.5rem' }} />
            {volumeName}
            <Label color="green" isCompact style={{ marginLeft: '0.5rem' }}>
              Volume
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

        {/* Volume Metadata */}
        <StackItem>
          <Card>
            <CardTitle>
              <Title headingLevel="h2">Volume Metadata</Title>
            </CardTitle>
            <CardBody>
              <DescriptionList isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>Full name</DescriptionListTerm>
                  <DescriptionListDescription>
                    <ClipboardCopy isReadOnly variant="inline-compact">
                      {fullName}
                    </ClipboardCopy>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>
        </StackItem>

        {/* Vector Store Stats */}
        <StackItem>
          <Card>
            <CardTitle>
              <Title headingLevel="h2">Vector Store Stats</Title>
            </CardTitle>
            <CardBody>
              {!statsLoaded ? (
                <Bullseye>
                  <Spinner size="lg" />
                </Bullseye>
              ) : stats?.error ? (
                <EmptyState
                  headingLevel="h3"
                  titleText="Stats unavailable"
                  variant={EmptyStateVariant.sm}
                >
                  <EmptyStateBody>{stats.error}</EmptyStateBody>
                </EmptyState>
              ) : stats ? (
                <DescriptionList isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Indexed chunks</DescriptionListTerm>
                    <DescriptionListDescription>
                      {stats.count.toLocaleString()}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Source documents</DescriptionListTerm>
                    <DescriptionListDescription>
                      {stats.source_docs.length > 0 ? (
                        <List isPlain>
                          {stats.source_docs.map((doc) => (
                            <ListItem key={doc}>{doc}</ListItem>
                          ))}
                        </List>
                      ) : (
                        '—'
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              ) : (
                <EmptyState
                  headingLevel="h3"
                  titleText="No stats available"
                  variant={EmptyStateVariant.sm}
                >
                  <EmptyStateBody>
                    Milvus stats are not available for this volume.
                  </EmptyStateBody>
                </EmptyState>
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
                    No RAG query traces for this volume yet.
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

export default VolumeDetailPage;
