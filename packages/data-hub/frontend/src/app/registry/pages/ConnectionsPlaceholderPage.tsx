import React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
import { PluggedIcon } from '@patternfly/react-icons';

const ConnectionsPlaceholderPage: React.FC = () => (
  <PageSection>
    <EmptyState
      headingLevel="h2"
      icon={PluggedIcon}
      titleText="Data connections"
      variant={EmptyStateVariant.lg}
    >
      <EmptyStateBody>
        Configure connections to external data sources such as S3 object storage,
        databases, and other storage backends. This feature is coming soon.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default ConnectionsPlaceholderPage;
