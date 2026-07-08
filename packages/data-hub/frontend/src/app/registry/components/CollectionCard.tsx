import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
} from '@patternfly/react-core';
import { DatabaseIcon } from '@patternfly/react-icons';
import type { Catalog } from '~/app/types/dataRegistry';
import { collectionUrl } from '~/app/registry/routes';

type CollectionCardProps = {
  catalog: Catalog;
};

const CollectionCard: React.FC<CollectionCardProps> = ({ catalog }) => {
  const navigate = useNavigate();

  const formatDate = (ts: number): string => {
    if (!ts) {
      return '';
    }
    return new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card
      isFullHeight
      style={{
        border: '1px solid var(--pf-t--global--border--color--default)',
        borderRadius: 'var(--pf-t--global--border--radius--medium)',
        cursor: 'pointer',
      }}
      onClick={() => navigate(collectionUrl(catalog.name))}
      data-testid="collection-card"
    >
      <CardHeader>
        <CardTitle>
          <Flex alignItems={{ default: 'alignItemsFlexStart' }} className="pf-v6-u-mb-md">
            <FlexItem>
              <DatabaseIcon style={{ height: '40px', width: '40px', color: 'var(--pf-t--global--icon--color--brand--default)' }} />
            </FlexItem>
            <FlexItem align={{ default: 'alignRight' }}>
              {catalog.owner && (
                <Label variant="outline" isCompact>
                  {catalog.owner}
                </Label>
              )}
            </FlexItem>
          </Flex>
          <Button variant="link" isInline tabIndex={-1} style={{
            fontSize: 'var(--pf-t--global--font--size--body--default)',
            fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
          }}>
            {catalog.name}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <div style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          color: 'var(--pf-t--global--text--color--subtle)',
        }}>
          {catalog.comment || 'No description available'}
        </div>
      </CardBody>
      <CardFooter>
        <LabelGroup isCompact>
          {catalog.created_at ? (
            <Label variant="outline" isCompact>
              Created {formatDate(catalog.created_at)}
            </Label>
          ) : null}
        </LabelGroup>
      </CardFooter>
    </Card>
  );
};

export default CollectionCard;
