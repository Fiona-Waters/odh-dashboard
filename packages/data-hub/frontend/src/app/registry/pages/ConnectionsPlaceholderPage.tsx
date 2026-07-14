import React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Label,
  PageSection,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { PluggedIcon } from '@patternfly/react-icons';
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
            No Data Connections were found. Create a Data Connection in your OpenShift AI
            project to see it listed here.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Title headingLevel="h1" style={{ marginBottom: '1rem' }}>
        Data connections
      </Title>
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
                <Label color="grey" isCompact>
                  {c.namespace}
                </Label>
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
