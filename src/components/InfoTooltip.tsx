import { InfoIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';

interface InfoTooltipProps {
  content: ReactNode;
  label?: string;
  className?: string;
  side?: ComponentProps<typeof TooltipContent>['side'];
  align?: ComponentProps<typeof TooltipContent>['align'];
}

export function InfoTooltip({
  content,
  label = 'Show details',
  className,
  side = 'top',
  align = 'center',
}: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex size-5 items-center justify-center rounded-full border border-transparent transition hover:border-border',
            className,
          )}
        >
          <InfoIcon aria-hidden className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} align={align} className="max-w-xs leading-relaxed">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
