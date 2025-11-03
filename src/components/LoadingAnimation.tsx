import loadingGif from '../assets/loading.gif';

import { cn } from './ui/utils';

type LoadingAnimationProps = {
  message?: string;
  className?: string;
  size?: number;
};

export function LoadingAnimation({
  message = 'Loading…',
  className,
  size = 64,
}: LoadingAnimationProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center text-sm text-gray-600 dark:text-gray-300',
        className,
      )}
    >
      <img
        src={loadingGif}
        alt="Loading"
        style={{ width: size, height: size }}
        className="select-none"
        role="status"
        draggable={false}
      />
      {message ? <p>{message}</p> : null}
    </div>
  );
}
