import { useState } from 'react';
import { myths as initialMyths, mythemes as initialMythemes } from './data/mockData';
import { Myth, MythVariant, Mytheme, DEFAULT_CATEGORIES } from './types/myth';
import { MythList } from './components/MythList';
import { VariantSelector } from './components/VariantSelector';
import { VariantView } from './components/VariantView';
import { AddMythDialog } from './components/AddMythDialog';
import { AddVariantDialog } from './components/AddVariantDialog';
import { AddMythemeDialog } from './components/AddMythemeDialog';
import { ManageCategoriesDialog } from './components/ManageCategoriesDialog';
import { ManageMythemesDialog } from './components/ManageMythemesDialog';
import { Button } from './components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import { ArrowLeft, Book, Settings } from 'lucide-react';

export default function App() {
  const [myths, setMyths] = useState(initialMyths);
  const [mythemes, setMythemes] = useState(initialMythemes);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedMythId, setSelectedMythId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Dialog states
  const [showAddMyth, setShowAddMyth] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [showAddMytheme, setShowAddMytheme] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showManageMythemes, setShowManageMythemes] = useState(false);

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

  const handleAddMyth = (name: string, description: string) => {
    const newMyth: Myth = {
      id: `myth-${Date.now()}`,
      name,
      description,
      variants: [],
    };
    setMyths([...myths, newMyth]);
  };

  const handleAddVariant = (name: string, source: string) => {
    if (!selectedMythId) return;

    const newVariant: MythVariant = {
      id: `v${Date.now()}`,
      name,
      source,
      plotPoints: [],
    };

    setMyths(prevMyths =>
      prevMyths.map(myth =>
        myth.id === selectedMythId
          ? { ...myth, variants: [...myth.variants, newVariant] }
          : myth
      )
    );
  };

  const handleAddMytheme = (name: string, type: 'character' | 'event' | 'place' | 'object') => {
    const newMytheme: Mytheme = {
      id: `m${Date.now()}`,
      name,
      type,
    };
    setMythemes([...mythemes, newMytheme]);
  };

  const handleDeleteMytheme = (id: string) => {
    setMythemes(mythemes.filter(m => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowManageCategories(true)}>
                  Manage Categories
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowManageMythemes(true)}>
                  Manage Mythemes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              onAddMyth={() => setShowAddMyth(true)}
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
              onAddVariant={() => setShowAddVariant(true)}
            />
          </div>
        )}

        {selectedVariantId && selectedVariant && (
          <VariantView
            variant={selectedVariant}
            mythemes={mythemes}
            categories={categories}
            onUpdateVariant={handleUpdateVariant}
          />
        )}
      </main>

      {/* Dialogs */}
      <AddMythDialog
        open={showAddMyth}
        onOpenChange={setShowAddMyth}
        onAdd={handleAddMyth}
      />
      <AddVariantDialog
        open={showAddVariant}
        onOpenChange={setShowAddVariant}
        onAdd={handleAddVariant}
      />
      <AddMythemeDialog
        open={showAddMytheme}
        onOpenChange={setShowAddMytheme}
        onAdd={handleAddMytheme}
      />
      <ManageCategoriesDialog
        open={showManageCategories}
        onOpenChange={setShowManageCategories}
        categories={categories}
        onUpdateCategories={setCategories}
      />
      <ManageMythemesDialog
        open={showManageMythemes}
        onOpenChange={setShowManageMythemes}
        mythemes={mythemes}
        onDelete={handleDeleteMytheme}
        onAdd={() => {
          setShowManageMythemes(false);
          setShowAddMytheme(true);
        }}
      />

      {/* Footer with legend */}
      {selectedVariantId && (
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category, index) => {
                    const colors = [
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                      'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                      'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                      'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
                      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                      'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                    ];
                    const colorClass = colors[index % colors.length];
                    return (
                      <span key={category} className={`px-3 py-1 rounded-full ${colorClass}`}>
                        {category}
                      </span>
                    );
                  })}
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
