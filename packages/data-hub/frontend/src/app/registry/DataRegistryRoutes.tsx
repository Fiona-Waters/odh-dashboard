import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CollectionListPage from './pages/CollectionListPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import TableDetailPage from './pages/TableDetailPage';
import VolumeDetailPage from './pages/VolumeDetailPage';

const DataRegistryRoutes: React.FC = () => (
  <Routes>
    <Route index element={<CollectionListPage />} />
    <Route path=":collectionName" element={<CollectionDetailPage />} />
    <Route
      path=":collectionName/schemas/:schemaName/tables/:tableName"
      element={<TableDetailPage />}
    />
    <Route
      path=":collectionName/schemas/:schemaName/volumes/:volumeName"
      element={<VolumeDetailPage />}
    />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default DataRegistryRoutes;
