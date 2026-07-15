import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Alert,
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
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  SearchInput,
  Spinner,
  Split,
  SplitItem,
  Stack,
  StackItem,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { ExternalLinkAltIcon, PencilAltIcon, TrashIcon } from '@patternfly/react-icons';
import { useCatalogDetail, useUIConfig, useConnections, createTable, createVolume, deleteTable, deleteVolume, updateTable, updateVolume } from '~/app/hooks/useDataRegistry';
import { dataRegistryUrl, tableDetailUrl, volumeDetailUrl } from '~/app/registry/routes';
import type { TableInfo, VolumeInfo } from '~/app/types/dataRegistry';
import TagInput from '~/app/registry/components/TagInput';

const INTERNAL_PROPS = new Set(['format', 'table_type', '_catalog_managed', 'asset_type', 'location', 'volume_type', 'comment', 'connection-ref']);

function userProps(props?: Record<string, string>): Record<string, string> {
  if (!props) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!INTERNAL_PROPS.has(k)) out[k] = v;
  }
  return out;
}

const CollectionDetailPage: React.FC = () => {
  const { collectionName } = useParams<{ collectionName: string }>();
  const [detail, loaded, error, refresh] = useCatalogDetail(collectionName);
  const [config] = useUIConfig();
  const [connections] = useConnections();
  const navigate = useNavigate();

  // Create Table state
  const [showCreateTable, setShowCreateTable] = React.useState(false);
  const [newTableName, setNewTableName] = React.useState('');
  const [newTableFormat, setNewTableFormat] = React.useState('DELTA');
  const [newTableLocation, setNewTableLocation] = React.useState('');
  const [newTableColumns, setNewTableColumns] = React.useState('');
  const [newTableConnectionRef, setNewTableConnectionRef] = React.useState('');
  const [creatingTable, setCreatingTable] = React.useState(false);
  const [tableError, setTableError] = React.useState<string | null>(null);

  // Create Volume state
  const [showCreateVolume, setShowCreateVolume] = React.useState(false);
  const [newVolumeName, setNewVolumeName] = React.useState('');
  const [newVolumeLocation, setNewVolumeLocation] = React.useState('');
  const [newVolumeComment, setNewVolumeComment] = React.useState('');
  const [newVolumeTags, setNewVolumeTags] = React.useState<Record<string, string>>({});
  const [newVolumeConnectionRef, setNewVolumeConnectionRef] = React.useState('');
  const [creatingVolume, setCreatingVolume] = React.useState(false);
  const [volumeError, setVolumeError] = React.useState<string | null>(null);

  // Edit Table state
  const [editingTable, setEditingTable] = React.useState<TableInfo | null>(null);
  const [editTableDescription, setEditTableDescription] = React.useState('');
  const [editTableFormat, setEditTableFormat] = React.useState('');
  const [editTableLocation, setEditTableLocation] = React.useState('');
  const [editTableConnectionRef, setEditTableConnectionRef] = React.useState('');
  const [savingTable, setSavingTable] = React.useState(false);
  const [editTableError, setEditTableError] = React.useState<string | null>(null);

  // Edit Volume state
  const [editingVolume, setEditingVolume] = React.useState<VolumeInfo | null>(null);
  const [editVolumeComment, setEditVolumeComment] = React.useState('');
  const [editVolumeLocation, setEditVolumeLocation] = React.useState('');
  const [editVolumeTags, setEditVolumeTags] = React.useState<Record<string, string>>({});
  const [editVolumeConnectionRef, setEditVolumeConnectionRef] = React.useState('');
  const [savingVolume, setSavingVolume] = React.useState(false);
  const [editVolumeError, setEditVolumeError] = React.useState<string | null>(null);

  const resetTableForm = () => {
    setNewTableName('');
    setNewTableFormat('DELTA');
    setNewTableLocation('');
    setNewTableColumns('');
    setNewTableConnectionRef('');
    setTableError(null);
  };

  const resetVolumeForm = () => {
    setNewVolumeName('');
    setNewVolumeLocation('');
    setNewVolumeComment('');
    setNewVolumeTags({});
    setNewVolumeConnectionRef('');
    setVolumeError(null);
  };

  // Search filters
  const [tableFilter, setTableFilter] = React.useState('');
  const [volumeFilter, setVolumeFilter] = React.useState('');

  const schema = detail?.schemas?.[0];
  const tables = schema?.tables || [];
  const volumes = schema?.volumes || [];
  const schemaName = schema?.name || 'default';

  const filteredTables = React.useMemo(() => {
    if (!tableFilter) return tables;
    const lc = tableFilter.toLowerCase();
    return tables.filter(
      (t) => t.name.toLowerCase().includes(lc) || (t.comment && t.comment.toLowerCase().includes(lc)),
    );
  }, [tables, tableFilter]);

  const filteredVolumes = React.useMemo(() => {
    if (!volumeFilter) return volumes;
    const lc = volumeFilter.toLowerCase();
    return volumes.filter(
      (v) => v.name.toLowerCase().includes(lc) || (v.comment && v.comment.toLowerCase().includes(lc)),
    );
  }, [volumes, volumeFilter]);

  const handleCreateTable = () => {
    setCreatingTable(true);
    setTableError(null);

    const typeMap: Record<string, string> = {
      int: 'INT', integer: 'INT', long: 'LONG', string: 'STRING',
      double: 'DOUBLE', float: 'FLOAT', boolean: 'BOOLEAN',
      date: 'DATE', timestamp: 'TIMESTAMP',
    };
    const columns = newTableColumns.trim()
      ? newTableColumns.split(',').map((col) => {
          const parts = col.trim().split(' ');
          const colName = parts[0];
          const colType = (parts[1] || 'string').toLowerCase();
          return { name: colName, type_name: typeMap[colType] || 'STRING' };
        })
      : [];

    const properties: Record<string, string> = {};
    if (newTableConnectionRef) {
      properties['connection-ref'] = newTableConnectionRef;
    }

    createTable(collectionName!, schemaName, {
      name: newTableName,
      data_source_format: newTableFormat,
      storage_location: newTableLocation || `s3://poc-underwriting/tables/${collectionName}/default/${newTableName}`,
      columns,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
    })
      .then(() => {
        setShowCreateTable(false);
        resetTableForm();
        refresh();
      })
      .catch((e) => setTableError(e.message))
      .finally(() => setCreatingTable(false));
  };

  const handleCreateVolume = () => {
    setCreatingVolume(true);
    setVolumeError(null);

    const volumeProps = { ...newVolumeTags };
    if (newVolumeConnectionRef) {
      volumeProps['connection-ref'] = newVolumeConnectionRef;
    }

    createVolume(collectionName!, schemaName, {
      name: newVolumeName,
      storage_location: newVolumeLocation || `s3://poc-underwriting/volumes/`,
      comment: newVolumeComment || undefined,
      properties: Object.keys(volumeProps).length > 0 ? volumeProps : undefined,
    })
      .then(() => {
        setShowCreateVolume(false);
        resetVolumeForm();
        refresh();
      })
      .catch((e) => setVolumeError(e.message))
      .finally(() => setCreatingVolume(false));
  };

  const handleDeleteTable = (name: string) => {
    if (!window.confirm(`Delete table "${name}"? This cannot be undone.`)) return;
    deleteTable(collectionName!, schemaName, name)
      .then(() => refresh())
      .catch((e) => alert(`Failed to delete: ${e.message}`));
  };

  const handleDeleteVolume = (name: string) => {
    if (!window.confirm(`Delete volume "${name}"? This cannot be undone.`)) return;
    deleteVolume(collectionName!, schemaName, name)
      .then(() => refresh())
      .catch((e) => alert(`Failed to delete: ${e.message}`));
  };

  const openEditTable = (t: TableInfo) => {
    setEditingTable(t);
    setEditTableDescription(t.comment || '');
    setEditTableFormat(t.data_source_format || '');
    setEditTableLocation(t.storage_location || '');
    setEditTableConnectionRef(t.properties?.['connection-ref'] || '');
    setEditTableError(null);
  };

  const handleSaveTable = () => {
    if (!editingTable) return;
    setSavingTable(true);
    setEditTableError(null);
    const properties: Record<string, string> = {};
    if (editTableConnectionRef) {
      properties['connection-ref'] = editTableConnectionRef;
    }
    updateTable(collectionName!, schemaName, editingTable.name, {
      comment: editTableDescription,
      data_source_format: editTableFormat,
      storage_location: editTableLocation,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
    })
      .then(() => { setEditingTable(null); refresh(); })
      .catch((e) => setEditTableError(e.message))
      .finally(() => setSavingTable(false));
  };

  const openEditVolume = (v: VolumeInfo) => {
    setEditingVolume(v);
    setEditVolumeComment(v.comment || '');
    setEditVolumeLocation(v.storage_location || '');
    setEditVolumeTags(userProps(v.properties));
    setEditVolumeConnectionRef(v.properties?.['connection-ref'] || '');
    setEditVolumeError(null);
  };

  const handleSaveVolume = () => {
    if (!editingVolume) return;
    setSavingVolume(true);
    setEditVolumeError(null);
    const props = { ...editVolumeTags };
    if (editVolumeConnectionRef) {
      props['connection-ref'] = editVolumeConnectionRef;
    }
    updateVolume(collectionName!, schemaName, editingVolume.name, {
      comment: editVolumeComment,
      'storage-location': editVolumeLocation,
      properties: Object.keys(props).length > 0 ? props : undefined,
    })
      .then(() => { setEditingVolume(null); refresh(); })
      .catch((e) => setEditVolumeError(e.message))
      .finally(() => setSavingVolume(false));
  };

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

        {/* Tables */}
        <StackItem>
          <Card>
            <CardTitle>
              <Split hasGutter>
                <SplitItem isFilled>
                  <Title headingLevel="h2">Tables</Title>
                </SplitItem>
                <SplitItem>
                  <SearchInput
                    placeholder="Filter tables"
                    value={tableFilter}
                    onChange={(_e, val) => setTableFilter(val)}
                    onClear={() => setTableFilter('')}
                    style={{ width: '200px' }}
                  />
                </SplitItem>
                <SplitItem>
                  <Label color="blue">{tables.length}</Label>
                </SplitItem>
                <SplitItem>
                  <Button variant="secondary" size="sm" onClick={() => setShowCreateTable(true)}>
                    Register table
                  </Button>
                </SplitItem>
              </Split>
            </CardTitle>
            <CardBody>
              {tables.length === 0 ? (
                <Content component="p">No tables in this collection.</Content>
              ) : filteredTables.length === 0 ? (
                <Content component="p">No tables match your filter.</Content>
              ) : (
                <Table aria-label="Tables" variant="compact">
                  <Thead>
                    <Tr>
                      <Th width={15}>Name</Th>
                      <Th width={10}>Description</Th>
                      <Th width={10}>Format</Th>
                      <Th width={10}>Type</Th>
                      <Th width={15}>Storage location</Th>
                      <Th width={10}>Connection</Th>
                      <Th width={5}>Columns</Th>
                      <Th width={15}>Tags</Th>
                      <Th width={10} />
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredTables.map((t: TableInfo) => {
                      const tags = userProps(t.properties);
                      const connectionRef = t.properties?.['connection-ref'];
                      return (
                        <Tr key={t.name}>
                          <Td dataLabel="Name">{t.name}</Td>
                          <Td dataLabel="Description">
                            <Content component="small">{t.comment || '—'}</Content>
                          </Td>
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
                          <Td dataLabel="Connection">
                            {connectionRef ? (
                              <Label color="cyan" isCompact>{connectionRef}</Label>
                            ) : '—'}
                          </Td>
                          <Td dataLabel="Columns">{t.columns?.length ?? 0}</Td>
                          <Td dataLabel="Tags">
                            {Object.keys(tags).length > 0 ? (
                              <LabelGroup>
                                {Object.entries(tags).map(([k, v]) => (
                                  <Label key={k} color="blue" isCompact>{k}: {v}</Label>
                                ))}
                              </LabelGroup>
                            ) : '—'}
                          </Td>
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
                            {' '}
                            <Button variant="plain" size="sm" onClick={() => openEditTable(t)}>
                              <PencilAltIcon />
                            </Button>
                            {' '}
                            <Button variant="plain" isDanger size="sm" onClick={() => handleDeleteTable(t.name)}>
                              <TrashIcon />
                            </Button>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </StackItem>

        {/* Volumes */}
        <StackItem>
          <Card>
            <CardTitle>
              <Split hasGutter>
                <SplitItem isFilled>
                  <Title headingLevel="h2">Volumes</Title>
                </SplitItem>
                <SplitItem>
                  <SearchInput
                    placeholder="Filter volumes"
                    value={volumeFilter}
                    onChange={(_e, val) => setVolumeFilter(val)}
                    onClear={() => setVolumeFilter('')}
                    style={{ width: '200px' }}
                  />
                </SplitItem>
                <SplitItem>
                  <Label color="green">{volumes.length}</Label>
                </SplitItem>
                <SplitItem>
                  <Button variant="secondary" size="sm" onClick={() => setShowCreateVolume(true)}>
                    Register volume
                  </Button>
                </SplitItem>
              </Split>
            </CardTitle>
            <CardBody>
              {volumes.length === 0 ? (
                <Content component="p">No volumes in this collection.</Content>
              ) : filteredVolumes.length === 0 ? (
                <Content component="p">No volumes match your filter.</Content>
              ) : (
                <Table aria-label="Volumes" variant="compact">
                  <Thead>
                    <Tr>
                      <Th width={15}>Name</Th>
                      <Th width={10}>Description</Th>
                      <Th width={10}>Type</Th>
                      <Th width={20}>Storage location</Th>
                      <Th width={10}>Connection</Th>
                      <Th width={20}>Tags</Th>
                      <Th width={15} />
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredVolumes.map((v: VolumeInfo) => {
                      const tags = userProps(v.properties);
                      const connectionRef = v.properties?.['connection-ref'];
                      return (
                        <Tr key={v.name}>
                          <Td dataLabel="Name">{v.name}</Td>
                          <Td dataLabel="Description">
                            <Content component="small">{v.comment || '—'}</Content>
                          </Td>
                          <Td dataLabel="Type">
                            <Label color="green" isCompact>
                              {v.volume_type || '—'}
                            </Label>
                          </Td>
                          <Td dataLabel="Storage location">
                            <Content component="small">{v.storage_location || '—'}</Content>
                          </Td>
                          <Td dataLabel="Connection">
                            {connectionRef ? (
                              <Label color="cyan" isCompact>{connectionRef}</Label>
                            ) : '—'}
                          </Td>
                          <Td dataLabel="Tags">
                            {Object.keys(tags).length > 0 ? (
                              <LabelGroup>
                                {Object.entries(tags).map(([k, val]) => (
                                  <Label key={k} color="blue" isCompact>{k}: {val}</Label>
                                ))}
                              </LabelGroup>
                            ) : '—'}
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
                            {' '}
                            <Button variant="plain" size="sm" onClick={() => openEditVolume(v)}>
                              <PencilAltIcon />
                            </Button>
                            {' '}
                            <Button variant="plain" isDanger size="sm" onClick={() => handleDeleteVolume(v.name)}>
                              <TrashIcon />
                            </Button>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </StackItem>
      </Stack>

      {/* Create Table Modal */}
      {showCreateTable && (
        <Modal isOpen onClose={() => { setShowCreateTable(false); resetTableForm(); }} variant="small">
          <ModalHeader title="Register table" />
          <ModalBody>
            <Form>
              {tableError && <Alert variant="danger" isInline title={tableError} />}
              <FormGroup label="Table name" isRequired fieldId="table-name">
                <TextInput id="table-name" value={newTableName} onChange={(_e, v) => setNewTableName(v)} isRequired />
              </FormGroup>
              <FormGroup label="Format" fieldId="table-format">
                <TextInput id="table-format" value={newTableFormat} onChange={(_e, v) => setNewTableFormat(v)} placeholder="DELTA" />
              </FormGroup>
              <FormGroup label="Connection" fieldId="table-connection">
                <FormSelect id="table-connection" value={newTableConnectionRef} onChange={(_e, v) => setNewTableConnectionRef(v)}>
                  <FormSelectOption value="" label="None — use S3 location" />
                  {connections.map((c) => (
                    <FormSelectOption key={c.name} value={c.name} label={c.displayName || c.name} />
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Storage location (S3 URI)" fieldId="table-location">
                <TextInput id="table-location" value={newTableLocation} onChange={(_e, v) => setNewTableLocation(v)} placeholder="s3://bucket/path" />
              </FormGroup>
              <FormGroup label="Columns (comma-separated: name type)" fieldId="table-columns">
                <TextInput id="table-columns" value={newTableColumns} onChange={(_e, v) => setNewTableColumns(v)} placeholder="id int, name string, score double" />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleCreateTable} isDisabled={!newTableName.trim() || creatingTable} isLoading={creatingTable}>Create</Button>
            <Button variant="link" onClick={() => { setShowCreateTable(false); resetTableForm(); }}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Edit Volume Modal */}
      {editingVolume && (
        <Modal isOpen onClose={() => setEditingVolume(null)} variant="small">
          <ModalHeader title={`Edit "${editingVolume.name}"`} />
          <ModalBody>
            <Form>
              {editVolumeError && <Alert variant="danger" isInline title={editVolumeError} />}
              <FormGroup label="Connection" fieldId="edit-vol-connection">
                <FormSelect id="edit-vol-connection" value={editVolumeConnectionRef} onChange={(_e, v) => setEditVolumeConnectionRef(v)}>
                  <FormSelectOption value="" label="None — use S3 location" />
                  {connections.map((c) => (
                    <FormSelectOption key={c.name} value={c.name} label={c.displayName || c.name} />
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Storage location (S3 URI)" fieldId="edit-vol-location">
                <TextInput id="edit-vol-location" value={editVolumeLocation} onChange={(_e, v) => setEditVolumeLocation(v)} />
              </FormGroup>
              <FormGroup label="Description" fieldId="edit-vol-comment">
                <TextInput id="edit-vol-comment" value={editVolumeComment} onChange={(_e, v) => setEditVolumeComment(v)} />
              </FormGroup>
              <FormGroup label="Tags" fieldId="edit-vol-tags">
                <TagInput tags={editVolumeTags} onChange={setEditVolumeTags} />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleSaveVolume} isDisabled={savingVolume} isLoading={savingVolume}>Save</Button>
            <Button variant="link" onClick={() => setEditingVolume(null)}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Edit Table Modal */}
      {editingTable && (
        <Modal isOpen onClose={() => setEditingTable(null)} variant="small">
          <ModalHeader title={`Edit "${editingTable.name}"`} />
          <ModalBody>
            <Form>
              {editTableError && <Alert variant="danger" isInline title={editTableError} />}
              <FormGroup label="Description" fieldId="edit-table-description">
                <TextInput id="edit-table-description" value={editTableDescription} onChange={(_e, v) => setEditTableDescription(v)} />
              </FormGroup>
              <FormGroup label="Format" fieldId="edit-table-format">
                <TextInput id="edit-table-format" value={editTableFormat} onChange={(_e, v) => setEditTableFormat(v)} />
              </FormGroup>
              <FormGroup label="Connection" fieldId="edit-table-connection">
                <FormSelect id="edit-table-connection" value={editTableConnectionRef} onChange={(_e, v) => setEditTableConnectionRef(v)}>
                  <FormSelectOption value="" label="None — use S3 location" />
                  {connections.map((c) => (
                    <FormSelectOption key={c.name} value={c.name} label={c.displayName || c.name} />
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Storage location (S3 URI)" fieldId="edit-table-location">
                <TextInput id="edit-table-location" value={editTableLocation} onChange={(_e, v) => setEditTableLocation(v)} />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleSaveTable} isDisabled={savingTable} isLoading={savingTable}>Save</Button>
            <Button variant="link" onClick={() => setEditingTable(null)}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Create Volume Modal */}
      {showCreateVolume && (
        <Modal isOpen onClose={() => { setShowCreateVolume(false); resetVolumeForm(); }} variant="small">
          <ModalHeader title="Register volume" />
          <ModalBody>
            <Form>
              {volumeError && <Alert variant="danger" isInline title={volumeError} />}
              <FormGroup label="Volume name" isRequired fieldId="volume-name">
                <TextInput id="volume-name" value={newVolumeName} onChange={(_e, v) => setNewVolumeName(v)} isRequired />
              </FormGroup>
              <FormGroup label="Connection" fieldId="volume-connection">
                <FormSelect id="volume-connection" value={newVolumeConnectionRef} onChange={(_e, v) => setNewVolumeConnectionRef(v)}>
                  <FormSelectOption value="" label="None — use S3 location" />
                  {connections.map((c) => (
                    <FormSelectOption key={c.name} value={c.name} label={c.displayName || c.name} />
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Storage location (S3 URI)" fieldId="volume-location">
                <TextInput id="volume-location" value={newVolumeLocation} onChange={(_e, v) => setNewVolumeLocation(v)} placeholder="s3://bucket/path" />
              </FormGroup>
              <FormGroup label="Description" fieldId="volume-comment">
                <TextInput id="volume-comment" value={newVolumeComment} onChange={(_e, v) => setNewVolumeComment(v)} />
              </FormGroup>
              <FormGroup label="Tags" fieldId="volume-tags">
                <TagInput tags={newVolumeTags} onChange={setNewVolumeTags} />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleCreateVolume} isDisabled={!newVolumeName.trim() || creatingVolume} isLoading={creatingVolume}>Create</Button>
            <Button variant="link" onClick={() => { setShowCreateVolume(false); resetVolumeForm(); }}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}
    </PageSection>
  );
};

export default CollectionDetailPage;
