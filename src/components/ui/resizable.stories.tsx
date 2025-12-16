import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './resizable';

const PanelSurface = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex h-full flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
    <span className="font-medium text-foreground">{title}</span>
    <div className="text-muted-foreground leading-relaxed">{children}</div>
  </div>
);

const meta = {
  title: 'UI/Resizable',
  component: ResizablePanelGroup,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HorizontalSplit: Story = {
  name: 'Horizontal (two panels)',
  render: () => (
    <div className="w-full max-w-5xl rounded-lg border bg-card p-4 shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="min-h-[260px]">
        <ResizablePanel defaultSize={40} minSize={20} className="p-3">
          <PanelSurface title="Sources">
            Drag the handle to adjust the space for the sidebar. This panel has a minimum width of 20%
            and starts at 40%.
          </PanelSurface>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60} minSize={40} className="p-3">
          <PanelSurface title="Editor">
            Primary content grows as the sidebar shrinks. Useful for layouts with navigation plus a main
            workspace.
          </PanelSurface>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

export const VerticalStack: Story = {
  name: 'Vertical (three panels)',
  render: () => (
    <div className="w-full max-w-3xl rounded-lg border bg-card p-4 shadow-sm">
      <ResizablePanelGroup direction="vertical" className="h-[420px]">
        <ResizablePanel defaultSize={30} minSize={20} className="p-3">
          <PanelSurface title="Header">
            Stays tall enough for filters or breadcrumbs. Resize from the bar below.
          </PanelSurface>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={45} minSize={25} className="p-3">
          <PanelSurface title="Content">
            Middle area for the main listing. With vertical direction the handle spans the full width.
          </PanelSurface>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={25} minSize={15} className="p-3">
          <PanelSurface title="Footer / Logs">
            Ideal for an output console or event feed that can be tucked away when not needed.
          </PanelSurface>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

export const CollapsibleSidebar: Story = {
  render: () => (
    <div className="w-full max-w-4xl rounded-lg border bg-card p-4 shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="h-[300px]">
        <ResizablePanel
          defaultSize={26}
          minSize={18}
          collapsedSize={10}
          collapsible
          className="p-3"
        >
          <PanelSurface title="Collapsible nav">
            This panel can collapse down to 10%. Double-click the handle or drag past the minimum to
            toggle collapse.
          </PanelSurface>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={74} minSize={50} className="p-3">
          <PanelSurface title="Canvas">
            Wide workspace that preserves at least half the layout even when the sidebar is expanded.
          </PanelSurface>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

export const NestedPanels: Story = {
  render: () => (
    <div className="w-full max-w-5xl rounded-lg border bg-card p-4 shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="h-[360px]">
        <ResizablePanel defaultSize={35} minSize={22} className="p-3">
          <PanelSurface title="Navigation">
            The left side remains independent while the right side contains its own vertical resizable
            stack.
          </PanelSurface>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65} minSize={45} className="p-3">
            <ResizablePanelGroup direction="vertical" className="h-full rounded-md border bg-background">
            <ResizablePanel defaultSize={60} minSize={35} className="p-3">
              <PanelSurface title="Document">
                Nested groups let you mix orientations - perfect for preview + details layouts.
              </PanelSurface>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={40} minSize={20} className="p-3">
              <PanelSurface title="Details">
                A compact lower panel without a grab handle icon shows the thinner bar styling.
              </PanelSurface>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};
