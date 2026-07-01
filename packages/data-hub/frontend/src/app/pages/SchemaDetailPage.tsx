import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
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
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Split,
  TextInput,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, DatabaseIcon, FolderIcon, EyeIcon, TrashIcon, PlusCircleIcon, PencilAltIcon } from '@patternfly/react-icons';
import VolumeProvenancePage from './VolumeProvenancePage';
import TableProvenancePage from './TableProvenancePage';

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

type SchemaDetailPageProps = {
  catalogName: string;
  schema: {
    name: string;
    comment: string;
    tables: TableInfo[] | null;
    volumes: VolumeInfo[] | null;
  };
  onBack: () => void;
  onRefresh?: () => void;
  onCreateTable?: () => void;
  onCreateVolume?: () => void;
  marquezUrl?: string;
  mlflowUrl?: string;
};

const API_PREFIX = '/data-hub/api/v1';

const SchemaDetailPage: React.FC<SchemaDetailPageProps> = ({
  catalogName,
  schema,
  onBack,
  onRefresh,
  onCreateTable,
  onCreateVolume,
  marquezUrl = '',
  mlflowUrl = '',
}) => {
  const [selectedVolume, setSelectedVolume] = React.useState<VolumeInfo | null>(null);
  const [selectedTable, setSelectedTable] = React.useState<TableInfo | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);

  const [editingTable, setEditingTable] = React.useState<TableInfo | null>(null);
  const [editTableDesc, setEditTableDesc] = React.useState('');
  const [editTableFormat, setEditTableFormat] = React.useState('');
  const [editTableLocation, setEditTableLocation] = React.useState('');
  const [editTableColumns, setEditTableColumns] = React.useState('');
  const [savingTable, setSavingTable] = React.useState(false);

  const [editingVolume, setEditingVolume] = React.useState<VolumeInfo | null>(null);
  const [editVolumeComment, setEditVolumeComment] = React.useState('');
  const [editVolumeLocation, setEditVolumeLocation] = React.useState('');
  const [savingVolume, setSavingVolume] = React.useState(false);

  React.useEffect(() => {
    fetch(`${API_PREFIX}/admin`)
      .then((r) => r.json())
      .then((data) => setIsAdmin(data.isAdmin === true))
      .catch(() => {});
  }, []);

  const handleDelete = (type: string, name: string) => {
    if (!window.confirm(`Delete ${type} "${name}"?`)) {
      return;
    }
    const url =
      type === 'table'
        ? `${API_PREFIX}/catalogs/${catalogName}/schemas/${schema.name}/tables/${name}`
        : type === 'volume'
          ? `${API_PREFIX}/catalogs/${catalogName}/schemas/${schema.name}/volumes/${name}`
          : '';
    if (url) {
      fetch(url, { method: 'DELETE' }).then(() => onRefresh ? onRefresh() : onBack());
    }
  };

  const openEditTable = (t: TableInfo) => {
    setEditingTable(t);
    setEditTableDesc(t.comment || '');
    setEditTableFormat(t.data_source_format || '');
    setEditTableLocation(t.storage_location || '');
    setEditTableColumns(
      t.columns
        ? t.columns.sort((a, b) => a.position - b.position).map((c) => `${c.name} ${c.type_name}`).join(', ')
        : ''
    );
  };

  const handleUpdateTable = () => {
    if (!editingTable) return;
    setSavingTable(true);
    const body: Record<string, unknown> = { description: editTableDesc };
    if (editTableFormat !== (editingTable.data_source_format || '')) {
      body.data_source_format = editTableFormat;
    }
    if (editTableLocation !== (editingTable.storage_location || '')) {
      body.location = editTableLocation;
    }
    const origCols = editingTable.columns
      ? editingTable.columns.sort((a, b) => a.position - b.position).map((c) => `${c.name} ${c.type_name}`).join(', ')
      : '';
    if (editTableColumns !== origCols && editTableColumns.trim()) {
      const fields = editTableColumns.split(',').map((col, idx) => {
        const parts = col.trim().split(' ');
        return { id: idx + 1, name: parts[0], required: false, type: (parts[1] || 'string').toLowerCase() };
      });
      body.schema = { type: 'struct', 'schema-id': 0, fields };
    }
    fetch(`${API_PREFIX}/catalogs/${catalogName}/schemas/${schema.name}/tables/${editingTable.name}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) {
          return r.text().then((txt) => {
            console.error('Update table failed:', r.status, txt);
            alert(`Failed to update table: ${r.status} ${txt}`);
          });
        }
        setEditingTable(null);
        if (onRefresh) onRefresh();
      })
      .catch((err) => {
        console.error('Update table error:', err);
        alert(`Failed to update table: ${err.message}`);
      })
      .finally(() => setSavingTable(false));
  };

  const openEditVolume = (v: VolumeInfo) => {
    setEditingVolume(v);
    setEditVolumeComment(v.comment || '');
    setEditVolumeLocation(v.storage_location || '');
  };

  const handleUpdateVolume = () => {
    if (!editingVolume) return;
    setSavingVolume(true);
    const body: Record<string, unknown> = { comment: editVolumeComment };
    if (editVolumeLocation !== (editingVolume.storage_location || '')) {
      body.storage_location = editVolumeLocation;
    }
    fetch(`${API_PREFIX}/catalogs/${catalogName}/schemas/${schema.name}/volumes/${editingVolume.name}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) {
          return r.text().then((txt) => {
            console.error('Update volume failed:', r.status, txt);
            alert(`Failed to update volume: ${r.status} ${txt}`);
          });
        }
        setEditingVolume(null);
        if (onRefresh) onRefresh();
      })
      .catch((err) => {
        console.error('Update volume error:', err);
        alert(`Failed to update volume: ${err.message}`);
      })
      .finally(() => setSavingVolume(false));
  };

  if (selectedTable) {
    return (
      <TableProvenancePage
        catalogName={catalogName}
        schemaName={schema.name}
        tableName={selectedTable.name}
        tableFormat={selectedTable.data_source_format}
        marquezUrl={marquezUrl}
        mlflowUrl={mlflowUrl}
        onBack={() => setSelectedTable(null)}
      />
    );
  }

  if (selectedVolume) {
    return (
      <VolumeProvenancePage
        catalogName={catalogName}
        schemaName={schema.name}
        volume={selectedVolume}
        marquezUrl={marquezUrl}
        mlflowUrl={mlflowUrl}
        onBack={() => setSelectedVolume(null)}
      />
    );
  }

  return (
  <>
    <PageSection hasBodyWrapper={false}>
      <Breadcrumb>
        <BreadcrumbItem>
          <Button variant="link" onClick={onBack}>
            Data Hub
          </Button>
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{catalogName}</BreadcrumbItem>
      </Breadcrumb>
      <Stack hasGutter>
        <StackItem>
          <Split hasGutter>
            <SplitItem isFilled>
              <Content component="h1">{catalogName}</Content>
            </SplitItem>
            {onCreateTable ? (
              <SplitItem>
                <Button variant="primary" icon={<PlusCircleIcon />} onClick={onCreateTable}>Add table</Button>
              </SplitItem>
            ) : null}
            {onCreateVolume ? (
              <SplitItem>
                <Button variant="secondary" icon={<PlusCircleIcon />} onClick={onCreateVolume}>Add volume</Button>
              </SplitItem>
            ) : null}
            <SplitItem>
              <Button
                variant="secondary"
                component="a"
                href={`${marquezUrl}/lineage/dataset/${catalogName}/${schema.name}.${schema.tables?.[0]?.name || schema.volumes?.[0]?.name || 'default'}?depth=10`}
                target="_blank"
              >
                View lineage
              </Button>
            </SplitItem>
          </Split>
        </StackItem>
      </Stack>
    </PageSection>

    <PageSection hasBodyWrapper={false}>
      <Stack hasGutter>
        <StackItem>
          <Content component="h2">
            <DatabaseIcon /> Tables ({schema.tables?.length || 0})
          </Content>
        </StackItem>
        <StackItem>
          {!schema.tables || schema.tables.length === 0 ? (
            <EmptyState headingLevel="h3" titleText="No tables" variant={EmptyStateVariant.sm}>
              <EmptyStateBody>No tables in this schema yet.</EmptyStateBody>
            </EmptyState>
          ) : (
            <Stack hasGutter>
              {schema.tables.map((t) => (
                <StackItem key={t.name}>
                  <Card>
                    <CardTitle>
                      <Split hasGutter>
                        <SplitItem isFilled>
                          <Content component="h3">{t.name}</Content>
                        </SplitItem>
                        <SplitItem>
                          <Flex>
                            <FlexItem>
                              <Label color="orange" isCompact>
                                {t.data_source_format}
                              </Label>
                            </FlexItem>
                            <FlexItem>
                              <Label isCompact>{t.table_type}</Label>
                            </FlexItem>
                            {isAdmin ? (
                              <FlexItem>
                                <Button
                                  variant="plain"
                                  aria-label={`Edit table ${t.name}`}
                                  onClick={() => openEditTable(t)}
                                >
                                  <PencilAltIcon />
                                </Button>
                              </FlexItem>
                            ) : null}
                            {isAdmin ? (
                              <FlexItem>
                                <Button
                                  variant="plain"
                                  aria-label={`Delete table ${t.name}`}
                                  onClick={() => handleDelete('table', t.name)}
                                >
                                  <TrashIcon />
                                </Button>
                              </FlexItem>
                            ) : null}
                          </Flex>
                        </SplitItem>
                      </Split>
                    </CardTitle>
                    <CardBody>
                      <Stack hasGutter>
                        {t.comment ? (
                          <StackItem>
                            <Content component="p">{t.comment}</Content>
                          </StackItem>
                        ) : null}

                        <StackItem>
                          <DescriptionList isHorizontal>
                            {t.storage_location ? (
                              <DescriptionListGroup>
                                <DescriptionListTerm>Storage location</DescriptionListTerm>
                                <DescriptionListDescription>
                                  <ClipboardCopy isReadOnly variant="inline-compact">
                                    {t.storage_location}
                                  </ClipboardCopy>
                                </DescriptionListDescription>
                              </DescriptionListGroup>
                            ) : null}
                            <DescriptionListGroup>
                              <DescriptionListTerm>Full name</DescriptionListTerm>
                              <DescriptionListDescription>
                                <ClipboardCopy isReadOnly variant="inline-compact">
                                  {catalogName}.{schema.name}.{t.name}
                                </ClipboardCopy>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </StackItem>

                        {t.columns && t.columns.length > 0 ? (
                          <StackItem>
                            <Content component="h4">Columns</Content>
                            <DescriptionList isHorizontal columnModifier={{ default: '2Col' }}>
                              {t.columns
                                .sort((a, b) => a.position - b.position)
                                .map((c) => (
                                  <DescriptionListGroup key={c.name}>
                                    <DescriptionListTerm>
                                      {c.name}{' '}
                                      <Label isCompact color="grey">
                                        {c.type_name}
                                      </Label>
                                    </DescriptionListTerm>
                                    <DescriptionListDescription>
                                      {c.comment || '—'}
                                    </DescriptionListDescription>
                                  </DescriptionListGroup>
                                ))}
                            </DescriptionList>
                          </StackItem>
                        ) : null}

                        <StackItem>
                          <Flex>
                            <FlexItem>
                              <Button
                                variant="link"
                                icon={<EyeIcon />}
                                onClick={() => setSelectedTable(t)}
                              >
                                View Provenance
                              </Button>
                            </FlexItem>
                            <FlexItem>
                              <Button
                                variant="link"
                                icon={<ExternalLinkAltIcon />}
                                component="a"
                                href={`${marquezUrl}/lineage/dataset/${catalogName}/${schema.name}.${t.name}`}
                                target="_blank"
                              >
                                Lineage
                              </Button>
                            </FlexItem>


                          </Flex>
                        </StackItem>
                      </Stack>
                    </CardBody>
                  </Card>
                </StackItem>
              ))}
            </Stack>
          )}
        </StackItem>

        <StackItem>
          <Content component="h2">
            <FolderIcon /> Volumes ({schema.volumes?.length || 0})
          </Content>
        </StackItem>
        <StackItem>
          {!schema.volumes || schema.volumes.length === 0 ? (
            <EmptyState headingLevel="h3" titleText="No volumes" variant={EmptyStateVariant.sm}>
              <EmptyStateBody>No volumes in this schema yet.</EmptyStateBody>
            </EmptyState>
          ) : (
            <Stack hasGutter>
              {schema.volumes.map((v) => (
                <StackItem key={v.name}>
                  <Card>
                    <CardTitle>
                      <Split hasGutter>
                        <SplitItem isFilled>
                          <Content component="h3">{v.name}</Content>
                        </SplitItem>
                        <SplitItem>
                          <Label color="green" isCompact>
                            {v.volume_type}
                          </Label>
                        </SplitItem>
                        {isAdmin ? (
                          <SplitItem>
                            <Button
                              variant="plain"
                              aria-label={`Edit volume ${v.name}`}
                              onClick={() => openEditVolume(v)}
                            >
                              <PencilAltIcon />
                            </Button>
                          </SplitItem>
                        ) : null}
                        {isAdmin ? (
                          <SplitItem>
                            <Button
                              variant="plain"
                              aria-label={`Delete volume ${v.name}`}
                              onClick={() => handleDelete('volume', v.name)}
                            >
                              <TrashIcon />
                            </Button>
                          </SplitItem>
                        ) : null}
                      </Split>
                    </CardTitle>
                    <CardBody>
                      <Stack hasGutter>
                        {v.comment ? (
                          <StackItem>
                            <Content component="p">{v.comment}</Content>
                          </StackItem>
                        ) : null}
                        <StackItem>
                          <DescriptionList isHorizontal>
                            {v.storage_location ? (
                              <DescriptionListGroup>
                                <DescriptionListTerm>Storage location</DescriptionListTerm>
                                <DescriptionListDescription>
                                  <ClipboardCopy isReadOnly variant="inline-compact">
                                    {v.storage_location}
                                  </ClipboardCopy>
                                </DescriptionListDescription>
                              </DescriptionListGroup>
                            ) : null}
                            <DescriptionListGroup>
                              <DescriptionListTerm>Full name</DescriptionListTerm>
                              <DescriptionListDescription>
                                <ClipboardCopy isReadOnly variant="inline-compact">
                                  {catalogName}.{schema.name}.{v.name}
                                </ClipboardCopy>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </StackItem>
                        <StackItem>
                          <Flex>
                            <FlexItem>
                              <Button
                                variant="link"
                                icon={<EyeIcon />}
                                onClick={() => setSelectedVolume(v)}
                              >
                                View Provenance
                              </Button>
                            </FlexItem>
                            <FlexItem>
                              <Button
                                variant="link"
                                icon={<ExternalLinkAltIcon />}
                                component="a"
                                href={`${marquezUrl}/lineage/dataset/${catalogName}/${schema.name}.${v.name}`}
                                target="_blank"
                              >
                                Lineage
                              </Button>
                            </FlexItem>


                          </Flex>
                        </StackItem>
                      </Stack>
                    </CardBody>
                  </Card>
                </StackItem>
              ))}
            </Stack>
          )}
        </StackItem>



      </Stack>
    </PageSection>

    {editingTable ? (
      <Modal isOpen onClose={() => setEditingTable(null)} variant="medium">
        <ModalHeader title={`Edit table: ${editingTable.name}`} />
        <ModalBody>
          <Form>
            <FormGroup label="Description" fieldId="edit-table-desc">
              <TextInput id="edit-table-desc" value={editTableDesc} onChange={(_e, v) => setEditTableDesc(v)} />
            </FormGroup>
            <FormGroup label="Format" fieldId="edit-table-format">
              <TextInput id="edit-table-format" value={editTableFormat} onChange={(_e, v) => setEditTableFormat(v)} placeholder="parquet" />
            </FormGroup>
            <FormGroup label="Storage location" fieldId="edit-table-location">
              <TextInput id="edit-table-location" value={editTableLocation} onChange={(_e, v) => setEditTableLocation(v)} placeholder="s3://bucket/path" />
            </FormGroup>
            <FormGroup label="Columns (comma-separated: name type)" fieldId="edit-table-columns">
              <TextInput id="edit-table-columns" value={editTableColumns} onChange={(_e, v) => setEditTableColumns(v)} placeholder="id int, name string, score float" />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={handleUpdateTable} isDisabled={savingTable} isLoading={savingTable}>Save</Button>
          <Button variant="link" onClick={() => setEditingTable(null)}>Cancel</Button>
        </ModalFooter>
      </Modal>
    ) : null}

    {editingVolume ? (
      <Modal isOpen onClose={() => setEditingVolume(null)} variant="small">
        <ModalHeader title={`Edit volume: ${editingVolume.name}`} />
        <ModalBody>
          <Form>
            <FormGroup label="Comment" fieldId="edit-volume-comment">
              <TextInput id="edit-volume-comment" value={editVolumeComment} onChange={(_e, v) => setEditVolumeComment(v)} />
            </FormGroup>
            <FormGroup label="Storage location" fieldId="edit-volume-location">
              <TextInput id="edit-volume-location" value={editVolumeLocation} onChange={(_e, v) => setEditVolumeLocation(v)} placeholder="s3://bucket/path" />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={handleUpdateVolume} isDisabled={savingVolume} isLoading={savingVolume}>Save</Button>
          <Button variant="link" onClick={() => setEditingVolume(null)}>Cancel</Button>
        </ModalFooter>
      </Modal>
    ) : null}
  </>
  );
};

export default SchemaDetailPage;
