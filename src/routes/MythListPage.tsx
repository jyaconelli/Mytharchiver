import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { MythList } from '../components/MythList';
import { AddMythDialog } from '../components/AddMythDialog';
import { useArchive } from './ArchiveLayout';

export function MythListPage() {
  const { myths, addMyth } = useArchive();
  const navigate = useNavigate();
  const [showAddMyth, setShowAddMyth] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2>Myth Folders</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Each myth contains multiple variants with categorized plot points
        </p>
      </div>
      <MythList
        myths={myths}
        selectedMythId={null}
        onSelectMyth={(mythId) => navigate(`/myths/${mythId}`)}
        onAddMyth={() => setShowAddMyth(true)}
      />
      <AddMythDialog
        open={showAddMyth}
        onOpenChange={setShowAddMyth}
        onAdd={async (name, description, contributorInstructions) => {
          await addMyth(name, description, contributorInstructions);
        }}
      />
    </div>
  );
}
