import React from 'react';
import {
  Alert,
  Bullseye,
  Button,
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  SearchInput,
  Spinner,
  TextInput,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { DatabaseIcon } from '@patternfly/react-icons';
import { useCatalogs, createCatalog, deleteCatalog, updateCatalog } from '~/app/hooks/useDataRegistry';
import type { Catalog } from '~/app/types/dataRegistry';
import CollectionCard from '~/app/registry/components/CollectionCard';
import TagInput from '~/app/registry/components/TagInput';
import { useNamespaces } from '~/app/hooks/useNamespaces';

const GRID_SPANS = { sm: 6 as const, md: 6 as const, lg: 6 as const, xl: 6 as const, xl2: 3 as const };

const CollectionListPage: React.FC = () => {
  const [catalogs, loaded, error, refresh] = useCatalogs();
  const [filter, setFilter] = React.useState('');

  const [showCreate, setShowCreate] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newComment, setNewComment] = React.useState('');
  const [newTags, setNewTags] = React.useState<Record<string, string>>({});
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [namespaces, namespacesLoaded] = useNamespaces();
  const [selectedProject, setSelectedProject] = React.useState('');

  // Edit state
  const [editingCatalog, setEditingCatalog] = React.useState<Catalog | null>(null);
  const [editComment, setEditComment] = React.useState('');
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  const resetForm = () => {
    setNewName('');
    setNewComment('');
    setNewTags({});
    setCreateError(null);
  };

  const handleDelete = (catalog: Catalog) => {
    if (!window.confirm(`Delete collection "${catalog.name}"? This cannot be undone.`)) return;
    deleteCatalog(catalog.name)
      .then(() => refresh())
      .catch((e) => alert(`Failed to delete: ${e.message}`));
  };

  const handleEdit = (catalog: Catalog) => {
    setEditingCatalog(catalog);
    setEditComment(catalog.comment || '');
    setEditError(null);
  };

  const handleSaveEdit = () => {
    if (!editingCatalog) return;
    setSavingEdit(true);
    setEditError(null);
    updateCatalog(editingCatalog.name, { description: editComment })
      .then(() => {
        setEditingCatalog(null);
        refresh();
      })
      .catch((e) => setEditError(e.message))
      .finally(() => setSavingEdit(false));
  };

  const handleCreate = () => {
    setCreating(true);
    setCreateError(null);
    createCatalog(newName, newComment || undefined, Object.keys(newTags).length > 0 ? newTags : undefined)
      .then(() => {
        setShowCreate(false);
        resetForm();
        refresh();
      })
      .catch((e) => setCreateError(e.message))
      .finally(() => setCreating(false));
  };

  const filtered = React.useMemo(() => {
    let result = catalogs;
    if (selectedProject) {
      result = result.filter((c) => c.project === selectedProject || !c.project);
    }
    if (filter) {
      const lc = filter.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(lc) ||
          (c.comment && c.comment.toLowerCase().includes(lc)),
      );
    }
    return result;
  }, [catalogs, filter, selectedProject]);

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
          titleText="Error loading collections"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>{error.message}</EmptyStateBody>
          <Button variant="link" onClick={refresh}>
            Retry
          </Button>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Toolbar>
        <ToolbarContent>
          <ToolbarGroup>
            <ToolbarItem>
              <Content component="small" style={{ fontWeight: 600, paddingRight: '8px', lineHeight: '36px' }}>
                Project
              </Content>
            </ToolbarItem>
            <ToolbarItem>
              {!namespacesLoaded ? (
                <Spinner size="md" aria-label="Loading projects" />
              ) : (
                <FormSelect
                  value={selectedProject}
                  onChange={(_e, val) => setSelectedProject(val)}
                  aria-label="Select project"
                  style={{ minWidth: '200px' }}
                >
                  <FormSelectOption key="" value="" label="All projects" />
                  {namespaces.map((ns) => (
                    <FormSelectOption
                      key={ns.metadata.name}
                      value={ns.metadata.name}
                      label={ns.metadata.name}
                    />
                  ))}
                </FormSelect>
              )}
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarItem variant="separator" />
          <ToolbarItem style={{ minWidth: '250px' }}>
            <SearchInput
              placeholder="Filter by name or description"
              value={filter}
              onChange={(_e, val) => setFilter(val)}
              onClear={() => setFilter('')}
            />
          </ToolbarItem>
          <ToolbarItem variant="separator" />
          <ToolbarItem>
            <Label color="blue">{filtered.length} collections</Label>
          </ToolbarItem>
          <ToolbarItem align={{ default: 'alignEnd' }}>
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              Create collection
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState
          headingLevel="h2"
          icon={filter ? undefined : DatabaseIcon}
          titleText={filter ? 'No matching collections' : 'No collections registered'}
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>
            {filter
              ? 'Try adjusting your filter criteria.'
              : 'Collections will appear here once they are registered in the data catalog.'}
          </EmptyStateBody>
          {filter && (
            <Button variant="link" onClick={() => setFilter('')}>
              Clear filter
            </Button>
          )}
        </EmptyState>
      ) : (
        <Grid hasGutter>
          {filtered.map((catalog: Catalog) => (
            <GridItem key={catalog.name} {...GRID_SPANS}>
              <CollectionCard catalog={catalog} onDelete={handleDelete} onEdit={handleEdit} />
            </GridItem>
          ))}
        </Grid>
      )}

      {showCreate && (
        <Modal isOpen onClose={() => { setShowCreate(false); resetForm(); }} variant="small">
          <ModalHeader title="Create collection" />
          <ModalBody>
            <Form>
              {createError && <Alert variant="danger" isInline title={createError} />}
              <FormGroup label="Name" isRequired fieldId="collection-name">
                <TextInput
                  id="collection-name"
                  value={newName}
                  onChange={(_e, v) => setNewName(v)}
                  isRequired
                />
              </FormGroup>
              <FormGroup label="Description" fieldId="collection-comment">
                <TextInput
                  id="collection-comment"
                  value={newComment}
                  onChange={(_e, v) => setNewComment(v)}
                />
              </FormGroup>
              <FormGroup label="Tags" fieldId="collection-tags">
                <TagInput tags={newTags} onChange={setNewTags} />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              onClick={handleCreate}
              isDisabled={!newName.trim() || creating}
              isLoading={creating}
            >
              Create
            </Button>
            <Button variant="link" onClick={() => { setShowCreate(false); resetForm(); }}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {editingCatalog && (
        <Modal isOpen onClose={() => setEditingCatalog(null)} variant="small">
          <ModalHeader title={`Edit "${editingCatalog.name}"`} />
          <ModalBody>
            <Form>
              {editError && <Alert variant="danger" isInline title={editError} />}
              <FormGroup label="Description" fieldId="edit-comment">
                <TextInput
                  id="edit-comment"
                  value={editComment}
                  onChange={(_e, v) => setEditComment(v)}
                />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleSaveEdit} isDisabled={savingEdit} isLoading={savingEdit}>
              Save
            </Button>
            <Button variant="link" onClick={() => setEditingCatalog(null)}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}
    </PageSection>
  );
};

export default CollectionListPage;
