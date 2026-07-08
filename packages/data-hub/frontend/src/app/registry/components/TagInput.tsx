import React from 'react';
import {
  Button,
  Label,
  LabelGroup,
  Split,
  SplitItem,
  TextInput,
} from '@patternfly/react-core';

type TagInputProps = {
  tags: Record<string, string>;
  onChange: (tags: Record<string, string>) => void;
};

const TagInput: React.FC<TagInputProps> = ({ tags, onChange }) => {
  const [tagKey, setTagKey] = React.useState('');
  const [tagValue, setTagValue] = React.useState('');

  const handleAdd = () => {
    const k = tagKey.trim();
    const v = tagValue.trim();
    if (!k || !v) return;
    onChange({ ...tags, [k]: v });
    setTagKey('');
    setTagValue('');
  };

  const handleRemove = (key: string) => {
    const next = { ...tags };
    delete next[key];
    onChange(next);
  };

  return (
    <>
      <Split hasGutter>
        <SplitItem isFilled>
          <TextInput
            id="tag-key"
            value={tagKey}
            onChange={(_e, v) => setTagKey(v)}
            placeholder="Key"
            aria-label="Tag key"
          />
        </SplitItem>
        <SplitItem isFilled>
          <TextInput
            id="tag-value"
            value={tagValue}
            onChange={(_e, v) => setTagValue(v)}
            placeholder="Value"
            aria-label="Tag value"
          />
        </SplitItem>
        <SplitItem>
          <Button variant="secondary" isDisabled={!tagKey.trim() || !tagValue.trim()} onClick={handleAdd}>
            Add
          </Button>
        </SplitItem>
      </Split>
      {Object.keys(tags).length > 0 && (
        <LabelGroup style={{ marginTop: '0.5rem' }}>
          {Object.entries(tags).map(([k, v]) => (
            <Label key={k} color="blue" isCompact onClose={() => handleRemove(k)}>
              {k}: {v}
            </Label>
          ))}
        </LabelGroup>
      )}
    </>
  );
};

export default TagInput;
