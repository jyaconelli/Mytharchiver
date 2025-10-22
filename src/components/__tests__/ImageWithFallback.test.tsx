import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { ImageWithFallback } from '../figma/ImageWithFallback';

describe('ImageWithFallback', () => {
  test('renders provided image source initially', () => {
    const { container } = render(<ImageWithFallback src="logo.png" alt="Project logo" />);

    expect(screen.getByRole('img', { name: /project logo/i })).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });

  test('renders fallback when image load fails', () => {
    const { container } = render(<ImageWithFallback src="broken.png" alt="Broken asset" />);

    const originalImage = screen.getByRole('img', { name: /broken asset/i });
    fireEvent.error(originalImage);

    const fallback = screen.getByAltText(/error loading image/i);
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveAttribute('data-original-url', 'broken.png');
    expect(container.firstChild).toMatchSnapshot();
  });
});
