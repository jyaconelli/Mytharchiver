import { useState } from 'react';
import { myths as initialMyths, mythemes } from './data/mockData';
import { Myth, MythVariant } from './types/myth';
import { MythList } from './components/MythList';
import { VariantSelector } from './components/VariantSelector';
import { VariantView } from './components/VariantView';
import { Button } from './components/ui/button';
import { ArrowLeft, Book } from 'lucide-react';

export default function App() {
  const [myths, setMyths] = useState(initialMyths);
  const [selectedMythId, setSelectedMythId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const selectedMyth = myths.find(m => m.id === selectedMythId);
  const selectedVariant = selectedMyth?.variants.find(v => v.id === selectedVariantId);

  const handleSelectMyth = (mythId: string) => {
    setSelectedMythId(mythId);
    setSelectedVariantId(null);
  };

  const handleSelectVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
  };

  const handleUpdateVariant = (updatedVariant: MythVariant) => {
    if (!selectedMythId) return;

    setMyths(prevMyths =>
      prevMyths.map(myth =>
        myth.id === selectedMythId
          ? {
              ...myth,
              variants: myth.variants.map(v =>
                v.id === updatedVariant.id ? updatedVariant : v
              ),
            }
          : myth
      )
    );
  };

  const handleBack = () => {
    if (selectedVariantId) {
      setSelectedVariantId(null);
    } else if (selectedMythId) {
      setSelectedMythId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            {(selectedMythId || selectedVariantId) && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1>Myth Archive</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedVariant
                    ? `${selectedMyth?.name} / ${selectedVariant.name}`
                    : selectedMyth
                    ? selectedMyth.name
                    : 'Structural Taxonomy System'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedMythId && (
          <div className="space-y-6">
            <div>
              <h2>Myth Folders</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Each myth contains multiple variants with categorized plot points
              </p>
            </div>
            <MythList
              myths={myths}
              selectedMythId={selectedMythId}
              onSelectMyth={handleSelectMyth}
            />
          </div>
        )}

        {selectedMythId && !selectedVariantId && selectedMyth && (
          <div className="space-y-6">
            <div>
              <h2>{selectedMyth.name}</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {selectedMyth.description}
              </p>
            </div>
            <VariantSelector
              variants={selectedMyth.variants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={handleSelectVariant}
            />
          </div>
        )}

        {selectedVariantId && selectedVariant && (
          <VariantView
            variant={selectedVariant}
            mythemes={mythemes}
            onUpdateVariant={handleUpdateVariant}
          />
        )}
      </main>

      {/* Footer with legend */}
      {selectedVariantId && (
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Introduction
                  </span>
                  <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                    Conflict
                  </span>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    Journey
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                    Transformation
                  </span>
                  <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    Resolution
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    Aftermath
                  </span>
                </div>
              </div>
              <div>
                <h3 className="mb-3">Mytheme References</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="inline-block px-1 mx-0.5 rounded bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100">
                    Highlighted terms
                  </span>{' '}
                  in plot points are tagged mythemes (canonical characters, events, places, or objects)
                </p>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
