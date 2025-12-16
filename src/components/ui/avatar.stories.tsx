import type { Meta, StoryObj } from '@storybook/react';

import { Avatar, AvatarFallback, AvatarImage } from './avatar';

type AvatarStoryProps = React.ComponentProps<typeof Avatar> & {
  src?: string;
  alt?: string;
  fallbackText?: string;
  fallbackDelay?: number;
  imageClassName?: string;
  fallbackClassName?: string;
};

const meta: Meta<AvatarStoryProps> = {
  title: 'UI/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  args: {
    src: 'https://avatars.githubusercontent.com/u/9919?v=4',
    alt: 'GitHub logo avatar',
    fallbackText: 'GH',
    fallbackDelay: 0,
  },
  argTypes: {
    src: { control: 'text' },
    alt: { control: 'text' },
    fallbackText: { control: 'text' },
    fallbackDelay: { control: 'number' },
    className: { control: 'text' },
    imageClassName: { control: 'text' },
    fallbackClassName: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<AvatarStoryProps>;

const Template = (args: AvatarStoryProps) => {
  const { src, alt, fallbackText, fallbackDelay, imageClassName, fallbackClassName, ...rest } =
    args;

  return (
    <Avatar {...rest}>
      {src ? <AvatarImage src={src} alt={alt} className={imageClassName} /> : null}
      <AvatarFallback delayMs={fallbackDelay} className={fallbackClassName}>
        {fallbackText}
      </AvatarFallback>
    </Avatar>
  );
};

export const WithImage: Story = {
  render: Template,
};

export const WithInitialsFallback: Story = {
  args: {
    src: undefined,
    fallbackText: 'MA',
    fallbackClassName: 'bg-muted text-sm font-medium',
  },
  render: Template,
};

export const BrokenImageShowsFallback: Story = {
  args: {
    src: 'https://example.com/does-not-exist.png',
    alt: 'Broken avatar',
    fallbackText: 'JS',
    fallbackDelay: 150,
    fallbackClassName: 'bg-orange-100 text-orange-700',
  },
  render: Template,
};

export const CustomSizeAndShape: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
    alt: 'Portrait avatar',
    className: 'size-16 rounded-xl ring-2 ring-primary/70',
    imageClassName: 'object-cover',
    fallbackText: 'AV',
  },
  render: Template,
};

