'use client';

import { ComponentProps } from 'react';
import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio@1.1.2';

function AspectRatio({ ...props }: ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
