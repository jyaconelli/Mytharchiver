import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from './navigation-menu';

type NavigationMenuStoryProps = React.ComponentProps<typeof NavigationMenu> & {
  showIndicator?: boolean;
};

const meta: Meta<NavigationMenuStoryProps> = {
  title: 'UI/Navigation Menu',
  component: NavigationMenu,
  args: {
    viewport: true,
    showIndicator: true,
    orientation: 'horizontal',
    delayDuration: 200,
    skipDelayDuration: 300,
  },
  argTypes: {
    viewport: { control: 'boolean' },
    showIndicator: { control: 'boolean' },
    orientation: {
      control: { type: 'inline-radio' },
      options: ['horizontal', 'vertical'],
    },
    delayDuration: { control: { type: 'number', min: 0, max: 800, step: 50 } },
    skipDelayDuration: { control: { type: 'number', min: 0, max: 1000, step: 50 } },
  },
};

export default meta;

type Story = StoryObj<NavigationMenuStoryProps>;

const productLinks = [
  {
    title: 'Writer workspaces',
    href: '#workspaces',
    description: 'Organize worlds, timelines, and drafts with shared access.',
  },
  {
    title: 'Publishing',
    href: '#publishing',
    description: 'Preview, stage, and publish issues with changelog tracking.',
  },
  {
    title: 'Review flows',
    href: '#reviews',
    description: 'Request feedback from editors and track revisions by chapter.',
  },
  {
    title: 'Automation',
    href: '#automation',
    description: 'Schedule releases, auto-tag entities, and sync to Supabase.',
  },
];

const resourceLinks = [
  { label: 'Docs', href: '#docs' },
  { label: 'Templates', href: '#templates' },
  { label: 'API', href: '#api' },
  { label: 'Community', href: '#community' },
];

function MenuCard({ title, description, href }: (typeof productLinks)[number]) {
  return (
    <li>
      <NavigationMenuLink
        href={href}
        className="hover:bg-muted focus:bg-muted block h-full rounded-md border border-transparent p-3 text-left no-underline outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="text-foreground mb-1 text-sm font-medium leading-none">{title}</div>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </NavigationMenuLink>
    </li>
  );
}

function NavigationMenuDemo({ showIndicator = true, className, ...props }: NavigationMenuStoryProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <NavigationMenu
        {...props}
        className={['w-full justify-start', props.orientation === 'vertical' ? 'flex-col' : '', className]
          .filter(Boolean)
          .join(' ')}
      >
        <NavigationMenuList className={props.orientation === 'vertical' ? 'flex-col items-start' : ''}>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Product</NavigationMenuTrigger>
            <NavigationMenuContent className="md:w-[560px]">
              <ul className="grid gap-3 p-4 md:grid-cols-2">
                {productLinks.map((item) => (
                  <MenuCard key={item.title} {...item} />
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
            <NavigationMenuContent className="md:w-[360px]">
              <ul className="grid gap-2 p-4">
                {resourceLinks.map((item) => (
                  <li key={item.label}>
                    <NavigationMenuLink
                      href={item.href}
                      className="hover:bg-muted focus:bg-muted flex flex-col rounded-md p-2 text-sm font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.label}
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink
              href="#changelog"
              active
              className="hover:bg-muted focus:bg-muted rounded-md px-3 py-2 text-sm font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              Changelog
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink
              href="#pricing"
              className="hover:bg-muted focus:bg-muted rounded-md px-3 py-2 text-sm font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              Pricing
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
        {showIndicator ? <NavigationMenuIndicator /> : null}
      </NavigationMenu>
    </div>
  );
}

export const MegaMenu: Story = {
  name: 'Mega menu with viewport',
  args: {
    viewport: true,
    showIndicator: true,
  },
  render: (args) => <NavigationMenuDemo {...args} />,
};

export const InlineContent: Story = {
  name: 'Inline content (viewport disabled)',
  args: {
    viewport: false,
    showIndicator: false,
  },
  render: (args) => (
    <NavigationMenuDemo
      {...args}
      className="rounded-lg border border-border/60 bg-card/60 p-3"
    />
  ),
};

export const VerticalStacked: Story = {
  name: 'Vertical layout',
  args: {
    viewport: false,
    orientation: 'vertical',
    showIndicator: false,
  },
  render: (args) => (
    <NavigationMenuDemo
      {...args}
      className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-4"
    />
  ),
};

export const LinksOnly: Story = {
  name: 'Links only (no triggers)',
  args: {
    viewport: false,
    showIndicator: false,
    delayDuration: 0,
  },
  render: (args) => (
    <div className="mx-auto w-full max-w-3xl">
      <NavigationMenu {...args} className="w-full justify-start gap-2">
        <NavigationMenuList className="gap-2">
          <NavigationMenuItem>
            <NavigationMenuLink
              href="#collections"
              active
              className="hover:bg-accent focus:bg-accent inline-flex rounded-md px-3 py-2 text-sm font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              Collections
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              href="#authors"
              className="hover:bg-accent focus:bg-accent inline-flex rounded-md px-3 py-2 text-sm font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              Authors
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              href="#support"
              className="hover:bg-accent focus:bg-accent inline-flex rounded-md px-3 py-2 text-sm font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              Support
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              href="#status"
              className="hover:bg-accent focus:bg-accent inline-flex rounded-md px-3 py-2 text-sm font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              Status
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  ),
};
