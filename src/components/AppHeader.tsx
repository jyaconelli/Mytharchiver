import { ReactNode } from 'react';
import { ArrowLeft, Book, LogOut, Settings } from 'lucide-react';

import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type AppHeaderProps = {
  canGoBack: boolean;
  onBack: () => void;
  title: string;
  subtitle: string;
  currentUserEmail: string;
  userDisplayName?: string | null;
  onOpenManageCategories: () => void;
  onOpenManageMythemes: () => void;
  onSignOut: () => Promise<void>;
  actions?: ReactNode;
};

export function AppHeader({
  canGoBack,
  onBack,
  title,
  subtitle,
  currentUserEmail,
  userDisplayName,
  onOpenManageCategories,
  onOpenManageMythemes,
  onSignOut,
}: AppHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {canGoBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1>{title}</h1>
                <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentUserEmail && (
              <div className="text-right text-sm">
                <p className="font-medium text-gray-800 dark:text-gray-100">
                  {userDisplayName ?? 'Signed in'}
                </p>
                <p className="text-gray-500 dark:text-gray-400">{currentUserEmail}</p>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onOpenManageCategories}>
                  Manage Categories
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenManageMythemes}>Manage Mythemes</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut}>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
