import { useMemo, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

import { ThemePreference, useThemePreference } from '../providers/ThemeProvider';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  Icon: typeof Sun;
}> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

const ORDER: ThemePreference[] = ['light', 'system', 'dark'];

export function ThemeModeSelector() {
  const { preference, setPreference } = useThemePreference();
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const current = useMemo(
    () => OPTIONS.find((option) => option.value === preference) ?? OPTIONS[1],
    [preference],
  );

  const handleClick = () => {
    const currentIndex = ORDER.indexOf(current.value);
    const nextValue = ORDER[(currentIndex + 1) % ORDER.length];
    setPreference(nextValue);
    setIsTooltipOpen(true);
  };

  return (
    <Tooltip delayDuration={100} open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Toggle theme (current: ${current.label})`}
          onClick={handleClick}
          onPointerEnter={() => setIsTooltipOpen(true)}
          onPointerLeave={() => setIsTooltipOpen(false)}
        >
          <current.Icon className="h-[1.15rem] w-[1.15rem]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {current.label}
      </TooltipContent>
    </Tooltip>
  );
}
