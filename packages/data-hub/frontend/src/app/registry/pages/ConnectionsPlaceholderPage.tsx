import React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Label,
  PageSection,
  Spinner,
  Split,
  SplitItem,
  Title,
} from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { ExternalLinkAltIcon, PluggedIcon } from '@patternfly/react-icons';
import { useConnections } from '~/app/hooks/useDataRegistry';

const ConnectionsPlaceholderPage: React.FC = () => {
  const [connections, loaded, error] = useConnections();

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
          icon={PluggedIcon}
          titleText="Error loading connections"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>{error.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  if (connections.length === 0) {
    return (
      <PageSection>
        <EmptyState
          headingLevel="h2"
          icon={PluggedIcon}
          titleText="No data connections"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>
            No Data Connections were found. Create a connection in your OpenShift AI project
            and it will appear here.
          </EmptyStateBody>
          <Button
            variant="primary"
            icon={<ExternalLinkAltIcon />}
            iconPosition="end"
            component="a"
            href="/projects"
            target="_blank"
          >
            Go to Projects
          </Button>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Split hasGutter style={{ marginBottom: '1rem' }}>
        <SplitItem isFilled>
          <Title headingLevel="h1">Data connections</Title>
        </SplitItem>
        <SplitItem>
          <Button
            variant="secondary"
            icon={<ExternalLinkAltIcon />}
            iconPosition="end"
            component="a"
            href="/projects"
            target="_blank"
          >
            Manage connections in Projects
          </Button>
        </SplitItem>
      </Split>
      <Table aria-label="Data connections" variant="compact">
        <Thead>
          <Tr>
            <Th width={15}>Name</Th>
            <Th width={20}>Display Name</Th>
            <Th width={10}>Type</Th>
            <Th width={15}>Namespace</Th>
            <Th width={20}>Endpoint</Th>
            <Th width={15}>Bucket</Th>
          </Tr>
        </Thead>
        <Tbody>
          {connections.map((c) => (
            <Tr key={`${c.namespace}/${c.name}`}>
              <Td dataLabel="Name">{c.name}</Td>
              <Td dataLabel="Display Name">{c.displayName}</Td>
              <Td dataLabel="Type">
                <Label color="blue" isCompact>
                  {c.type}
                </Label>
              </Td>
              <Td dataLabel="Namespace">
                <Button
                  variant="link"
                  isInline
                  component="a"
                  href={`/projects/${c.namespace}?section=connections`}
                  target="_blank"
                >
                  {c.namespace}
                </Button>
              </Td>
              <Td dataLabel="Endpoint">{c.endpoint || '—'}</Td>
              <Td dataLabel="Bucket">{c.bucket || '—'}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </PageSection>
  );
};

export default ConnectionsPlaceholderPage;
