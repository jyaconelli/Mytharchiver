import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination';

type PaginationStoryArgs = {
  totalPages: number;
  currentPage: number;
  condensed: boolean;
  size: React.ComponentProps<typeof PaginationLink>['size'];
  disablePrev?: boolean;
  disableNext?: boolean;
  className?: string;
};

const meta: Meta<PaginationStoryArgs> = {
  title: 'UI/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
  },
  args: {
    totalPages: 7,
    currentPage: 3,
    condensed: false,
    size: 'icon',
    disablePrev: false,
    disableNext: false,
  },
  argTypes: {
    totalPages: { control: { type: 'number', min: 1, max: 30, step: 1 } },
    currentPage: { control: { type: 'number', min: 1, max: 30, step: 1 } },
    condensed: { control: 'boolean' },
    size: {
      control: { type: 'inline-radio' },
      options: ['icon', 'sm', 'default', 'lg'],
    },
    disablePrev: { control: 'boolean' },
    disableNext: { control: 'boolean' },
    className: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const buildPageList = (totalPages: number, currentPage: number, condensed: boolean) => {
  if (!condensed || totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, 2, totalPages, totalPages - 1, currentPage]);
  pages.add(currentPage - 1);
  pages.add(currentPage + 1);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
};

const PaginationPreview = ({
  totalPages,
  currentPage,
  condensed,
  size,
  disablePrev,
  disableNext,
  className,
}: PaginationStoryArgs) => {
  const pages = React.useMemo(
    () => buildPageList(totalPages, currentPage, condensed),
    [condensed, currentPage, totalPages],
  );

  let lastPage = 0;

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={disablePrev || currentPage <= 1}
            className={
              disablePrev || currentPage <= 1 ? 'pointer-events-none opacity-50' : undefined
            }
          />
        </PaginationItem>
        {pages.map((page) => {
          const items = [];
          if (page - lastPage > 1) {
            items.push(
              <PaginationItem key={`ellipsis-${page}`}>
                <PaginationEllipsis />
              </PaginationItem>,
            );
          }

          items.push(
            <PaginationItem key={page}>
              <PaginationLink href="#" size={size} isActive={page === currentPage}>
                {page}
              </PaginationLink>
            </PaginationItem>,
          );

          lastPage = page;
          return items;
        })}
        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={disableNext || currentPage >= totalPages}
            className={
              disableNext || currentPage >= totalPages ? 'pointer-events-none opacity-50' : undefined
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export const Default: Story = {
  args: {
    totalPages: 7,
    currentPage: 3,
    condensed: false,
    size: 'icon',
  },
  render: (args) => <PaginationPreview {...args} />,
};

export const CondensedWithEllipsis: Story = {
  name: 'Condensed with ellipsis',
  args: {
    totalPages: 18,
    currentPage: 9,
    condensed: true,
    size: 'icon',
  },
  render: (args) => <PaginationPreview {...args} />,
};

export const SizeVariants: Story = {
  args: {
    totalPages: 5,
    currentPage: 2,
    condensed: false,
    size: 'sm',
  },
  render: (args) => (
    <div className="flex flex-col gap-4">
      <PaginationPreview {...args} size="sm" />
      <PaginationPreview {...args} size="default" />
      <PaginationPreview {...args} size="lg" />
    </div>
  ),
};

export const DisabledEdges: Story = {
  args: {
    totalPages: 4,
    currentPage: 1,
    condensed: false,
    disablePrev: true,
    disableNext: false,
  },
  render: (args) => <PaginationPreview {...args} />,
};
