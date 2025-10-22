import { MythVariant } from '../types/myth';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { FileText, Plus } from 'lucide-react';

interface VariantSelectorProps {
  variants: MythVariant[];
  selectedVariantId: string | null;
  onSelectVariant: (variantId: string) => void;
  onAddVariant?: () => void;
  canEdit?: boolean;
}

export function VariantSelector({
  variants,
  selectedVariantId,
  onSelectVariant,
  onAddVariant,
  canEdit = true,
}: VariantSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-600 dark:text-gray-400">Select a variant to view:</h3>
        {canEdit && onAddVariant && (
          <Button onClick={onAddVariant} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Variant
          </Button>
        )}
      </div>
      {variants.map((variant) => (
        <Card
          key={variant.id}
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            selectedVariantId === variant.id
              ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-950'
              : ''
          }`}
          onClick={() => onSelectVariant(variant.id)}
        >
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-1 shrink-0" />
            <div className="flex-1">
              <h3>{variant.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Source: {variant.source}</p>
              <Badge variant="outline" className="mt-2">
                {variant.plotPoints.length} plot points
              </Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
