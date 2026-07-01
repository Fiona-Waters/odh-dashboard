import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Spinner,
  Split,
  SplitItem,
  TextInput,
} from '@patternfly/react-core';
import SchemaDetailPage from './SchemaDetailPage';

const API_PREFIX = '/data-hub/api/v1';

type ColumnInfo = {
  name: string;
  type_name: string;
  comment: string;
  position: number;
};

type TableInfo = {
  name: string;
  data_source_format: string;
  table_type: string;
  storage_location: string;
  comment: string;
  columns: ColumnInfo[] | null;
};

type VolumeInfo = {
  name: string;
  volume_type: string;
  storage_location: string;
  comment: string;
};

type SchemaInfo = {
  name: string;
  comment: string;
  tables: TableInfo[] | null;
  volumes: VolumeInfo[] | null;
};

type CatalogDetailData = {
  name: string;
  schemas: SchemaInfo[] | null;
  members: unknown[] | null;
};

type CatalogDetailPageProps = {
  catalogName: string;
  onBack: () => void;
};

const CatalogDetailPage: React.FC<CatalogDetailPageProps> = ({ catalogName, onBack }) => {
  const [detail, setDetail] = React.useState<CatalogDetailData | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedSchema, setSelectedSchema] = React.useState<SchemaInfo | null>(null);


  const [showCreateTable, setShowCreateTable] = React.useState(false);
  const [newTableName, setNewTableName] = React.useState('');
  const [newTableFormat, setNewTableFormat] = React.useState('DELTA');
  const [newTableLocation, setNewTableLocation] = React.useState('');
  const [newTableColumns, setNewTableColumns] = React.useState('');
  const [creatingTable, setCreatingTable] = React.useState(false);

  const [showCreateVolume, setShowCreateVolume] = React.useState(false);
  const [newVolumeName, setNewVolumeName] = React.useState('');
  const [newVolumeLocation, setNewVolumeLocation] = React.useState('');
  const [creatingVolume, setCreatingVolume] = React.useState(false);

  const [uiConfig, setUiConfig] = React.useState<{
    marquezUrl: string;
    marquezApiUrl: string;
    mlflowUrl: string;
  } | null>(null);

  React.useEffect(() => {
    fetch(`${API_PREFIX}/config`)
      .then((r) => r.json())
      .then(setUiConfig)
      .catch(() => {});
  }, []);

  const fetchDetail = React.useCallback(() => {
    setLoaded(false);
    fetch(`${API_PREFIX}/catalogs/${catalogName}/detail`)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`${r.status} ${r.statusText}`);
        }
        return r.json();
      })
      .then((data) => {
        setDetail(data);
        setLoaded(true);
      })
      .catch((e) => {
        setError(e.message);
        setLoaded(true);
      });
  }, [catalogName]);

  React.useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  React.useEffect(() => {
    if (detail?.schemas?.length && !selectedSchema) {
      setSelectedSchema(detail.schemas[0]);
    }
  }, [detail]);

  const handleCreateTable = () => {
    setError(null);
    setCreatingTable(true);
    const typeMap: Record<string, string> = {
      int: 'INT', integer: 'INT', long: 'LONG', string: 'STRING',
      double: 'DOUBLE', float: 'FLOAT', boolean: 'BOOLEAN',
      date: 'DATE', timestamp: 'TIMESTAMP',
    };
    const columns = newTableColumns.trim()
      ? newTableColumns.split(',').map((col, idx) => {
          const parts = col.trim().split(' ');
          const colName = parts[0];
          const colType = (parts[1] || 'string').toLowerCase();
          const typeName = typeMap[colType] || 'STRING';
          return {
            name: colName, type_text: typeName, type_name: typeName,
            type_json: JSON.stringify({ name: colName, type: colType, nullable: true, metadata: {} }),
            position: idx,
          };
        })
      : [];
    fetch(`${API_PREFIX}/catalogs/${catalogName}/schemas/default/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newTableName, catalog_name: catalogName, schema_name: 'default',
        table_type: 'EXTERNAL', data_source_format: newTableFormat,
        storage_location: newTableLocation || `s3://poc-underwriting/tables/${catalogName}/default/${newTableName}`,
        columns,
      }),
    })
      .then((r) => {
        if (!r.ok) {
          return r.json().then((d) => { throw new Error(d.message || r.statusText); });
        }
        return r.json();
      })
      .then(() => {
        setShowCreateTable(false);
        setNewTableName('');
        setNewTableFormat('DELTA');
        setNewTableLocation('');
        setNewTableColumns('');
        fetchDetail();
      })
      .catch((e) => setError(e.message))
      .finally(() => setCreatingTable(false));
  };

  const handleCreateVolume = () => {
    setCreatingVolume(true);
    fetch(`${API_PREFIX}/catalogs/${catalogName}/schemas/default/volumes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newVolumeName, catalog_name: catalogName, schema_name: 'default',
        volume_type: 'EXTERNAL',
        storage_location: newVolumeLocation || `s3://poc-underwriting/volumes/${catalogName}/default/${newVolumeName}`,
      }),
    })
      .then((r) => {
        if (!r.ok) {
          return r.json().then((d) => { throw new Error(d.message || r.statusText); });
        }
        return r.json();
      })
      .then(() => {
        setShowCreateVolume(false);
        setNewVolumeName('');
        fetchDetail();
      })
      .catch((e) => setError(e.message))
      .finally(() => setCreatingVolume(false));
  };

  if (!loaded) {
    return <PageSection hasBodyWrapper={false}><Spinner aria-label="Loading" /></PageSection>;
  }

  if (selectedSchema) {
    return (
      <>
        <SchemaDetailPage
          catalogName={catalogName}
          schema={selectedSchema}
          onBack={onBack}
          onRefresh={fetchDetail}
          onCreateTable={() => setShowCreateTable(true)}
          onCreateVolume={() => setShowCreateVolume(true)}
          marquezUrl={uiConfig?.marquezUrl}
          mlflowUrl={uiConfig?.mlflowUrl}
        />

        {showCreateTable ? (
          <Modal isOpen onClose={() => setShowCreateTable(false)} variant="small">
            <ModalHeader title="Create Table" />
            <ModalBody>
              <Form>
                <FormGroup label="Table name" isRequired fieldId="table-name">
                  <TextInput id="table-name" value={newTableName} onChange={(_e, v) => setNewTableName(v)} isRequired />
                </FormGroup>
                <FormGroup label="Format" fieldId="table-format">
                  <TextInput id="table-format" value={newTableFormat} onChange={(_e, v) => setNewTableFormat(v)} placeholder="DELTA" />
                </FormGroup>
                <FormGroup label="Storage location" fieldId="table-location">
                  <TextInput id="table-location" value={newTableLocation} onChange={(_e, v) => setNewTableLocation(v)} placeholder="s3://bucket/path" />
                </FormGroup>
                <FormGroup label="Columns" fieldId="table-columns" helperText="Comma-separated: name type, e.g. 'id int, name string'. Leave empty for no columns.">
                  <TextInput id="table-columns" value={newTableColumns} onChange={(_e, v) => setNewTableColumns(v)} placeholder="id int, name string, score double" />
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button variant="primary" onClick={handleCreateTable} isDisabled={!newTableName || creatingTable} isLoading={creatingTable}>Create</Button>
              <Button variant="link" onClick={() => setShowCreateTable(false)}>Cancel</Button>
            </ModalFooter>
          </Modal>
        ) : null}

        {showCreateVolume ? (
          <Modal isOpen onClose={() => setShowCreateVolume(false)} variant="small">
            <ModalHeader title="Create Volume" />
            <ModalBody>
              <Form>
                <FormGroup label="Volume name" isRequired fieldId="volume-name">
                  <TextInput id="volume-name" value={newVolumeName} onChange={(_e, v) => setNewVolumeName(v)} isRequired />
                </FormGroup>
                <FormGroup label="Storage location" fieldId="volume-location">
                  <TextInput id="volume-location" value={newVolumeLocation} onChange={(_e, v) => setNewVolumeLocation(v)} placeholder="s3://bucket/path" />
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button variant="primary" onClick={handleCreateVolume} isDisabled={!newVolumeName || creatingVolume} isLoading={creatingVolume}>Create</Button>
              <Button variant="link" onClick={() => setShowCreateVolume(false)}>Cancel</Button>
            </ModalFooter>
          </Modal>
        ) : null}
      </>
    );
  }

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Breadcrumb>
          <BreadcrumbItem>
            <Button variant="link" onClick={onBack}>Data Hub</Button>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{catalogName}</BreadcrumbItem>
        </Breadcrumb>
        <Split hasGutter>
          <SplitItem isFilled>
            <Content component="h1">{catalogName}</Content>
          </SplitItem>
          <SplitItem>
            <Button
              variant="secondary"
              component="a"
              href={`${uiConfig?.marquezUrl || ''}/lineage/dataset/${catalogName}/${detail?.schemas?.[0]?.tables?.[0]?.name ? detail.schemas[0].name + '.' + detail.schemas[0].tables[0].name : detail?.schemas?.[0]?.volumes?.[0]?.name ? detail.schemas[0].name + '.' + detail.schemas[0].volumes[0].name : 'default'}?depth=20&isFull=true`}
              target="_blank"
            >
              View all lineage
            </Button>
          </SplitItem>
        </Split>
      </PageSection>

      {error ? (
        <PageSection hasBodyWrapper={false}>
          <EmptyState headingLevel="h2" titleText="Error" variant={EmptyStateVariant.lg}>
            <EmptyStateBody>{error}</EmptyStateBody>
            <Button variant="link" onClick={() => setError(null)}>Dismiss</Button>
          </EmptyState>
        </PageSection>
      ) : null}

      <PageSection hasBodyWrapper={false}>
        <EmptyState headingLevel="h3" titleText="Loading..." variant={EmptyStateVariant.sm}>
          <EmptyStateBody>
            <Spinner aria-label="Loading" />
          </EmptyStateBody>
        </EmptyState>
      </PageSection>

      {showCreateTable ? (
        <Modal isOpen onClose={() => setShowCreateTable(false)} variant="small">
          <ModalHeader title="Create Table" />
          <ModalBody>
            <Form>
              <FormGroup label="Table name" isRequired fieldId="table-name">
                <TextInput id="table-name" value={newTableName} onChange={(_e, v) => setNewTableName(v)} isRequired />
              </FormGroup>
              <FormGroup label="Format" fieldId="table-format">
                <TextInput id="table-format" value={newTableFormat} onChange={(_e, v) => setNewTableFormat(v)} placeholder="DELTA" />
              </FormGroup>
              <FormGroup label="Storage location" fieldId="table-location">
                <TextInput id="table-location" value={newTableLocation} onChange={(_e, v) => setNewTableLocation(v)} placeholder="s3://bucket/path" />
              </FormGroup>
              <FormGroup label="Columns" fieldId="table-columns" helperText="Comma-separated: name type, e.g. 'id int, name string'. Leave empty for no columns.">
                <TextInput id="table-columns" value={newTableColumns} onChange={(_e, v) => setNewTableColumns(v)} placeholder="id int, name string, score double" />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleCreateTable} isDisabled={!newTableName || creatingTable} isLoading={creatingTable}>Create</Button>
            <Button variant="link" onClick={() => setShowCreateTable(false)}>Cancel</Button>
          </ModalFooter>
        </Modal>
      ) : null}

      {showCreateVolume ? (
        <Modal isOpen onClose={() => setShowCreateVolume(false)} variant="small">
          <ModalHeader title="Create Volume" />
          <ModalBody>
            <Form>
              <FormGroup label="Volume name" isRequired fieldId="volume-name">
                <TextInput id="volume-name" value={newVolumeName} onChange={(_e, v) => setNewVolumeName(v)} isRequired />
              </FormGroup>
              <FormGroup label="Storage location" fieldId="volume-location">
                <TextInput id="volume-location" value={newVolumeLocation} onChange={(_e, v) => setNewVolumeLocation(v)} placeholder="s3://bucket/path" />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleCreateVolume} isDisabled={!newVolumeName || creatingVolume} isLoading={creatingVolume}>Create</Button>
            <Button variant="link" onClick={() => setShowCreateVolume(false)}>Cancel</Button>
          </ModalFooter>
        </Modal>
      ) : null}
    </>
  );
};

export default CatalogDetailPage;
