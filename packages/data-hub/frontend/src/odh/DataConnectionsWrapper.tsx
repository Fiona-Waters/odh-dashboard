import React from 'react';
import {
  ModularArchConfig,
  DeploymentMode,
  ModularArchContextProvider,
  NotificationContextProvider,
  BrowserStorageContextProvider,
} from 'mod-arch-core';
import { URL_PREFIX } from '~/app/utilities/const';
import ConnectionsPlaceholderPage from '~/app/registry/pages/ConnectionsPlaceholderPage';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

const DataConnectionsWrapper: React.FC = () => (
  <ModularArchContextProvider config={modularArchConfig}>
    <BrowserStorageContextProvider>
      <NotificationContextProvider>
        <ConnectionsPlaceholderPage />
      </NotificationContextProvider>
    </BrowserStorageContextProvider>
  </ModularArchContextProvider>
);

export default DataConnectionsWrapper;
