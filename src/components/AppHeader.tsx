import { ReactNode } from 'react';
import { ArrowLeft, LogOut, Settings } from 'lucide-react';

import logoUrl from '../assets/logo.png';

import { ThemeModeSelector } from './ThemeModeSelector';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

type AppHeaderProps = {
  canGoBack: boolean;
  onBack: () => void;
  title: string;
  subtitle: string;
  currentUserEmail: string;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
  onOpenManageCategories: () => void;
  onOpenManageMythemes: () => void;
  onSignOut: () => Promise<void>;
  actions?: ReactNode;
  canManageCategories: boolean;
};

export function AppHeader({
  canGoBack,
  onBack,
  title,
  subtitle,
  currentUserEmail,
  userDisplayName,
  userAvatarUrl,
  onOpenManageCategories,
  onOpenManageMythemes,
  onSignOut,
  canManageCategories,
}: AppHeaderProps) {
  const resolvedDisplayName = userDisplayName?.trim() || 'Signed in';
  const avatarFallbackSource =
    (userDisplayName || currentUserEmail || 'Myth Archive')
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join('') || 'MA';

  return (
    <header className="bg-gray-300 dark:bg-gray-800 border-b border-gray-500 dark:border-gray-700 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {canGoBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="Myth Archive logo" className="h-9 w-9" />
              <div>
                <h1 className="font-display">{title}</h1>
                <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentUserEmail && (
              <>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-indigo-100 bg-white text-sm font-medium text-indigo-600 dark:border-indigo-900/40 dark:bg-gray-900 dark:text-indigo-300">
                    <AvatarImage
                      src={userAvatarUrl && userAvatarUrl.trim() ? userAvatarUrl : undefined}
                      alt={resolvedDisplayName}
                    />
                    <AvatarFallback>{avatarFallbackSource}</AvatarFallback>
                  </Avatar>
                  <div className="text-right text-sm">
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {resolvedDisplayName}
                    </p>
                    <p className="text-gray-500 font-robot dark:text-gray-400">{currentUserEmail}</p>
                  </div>
                </div>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
