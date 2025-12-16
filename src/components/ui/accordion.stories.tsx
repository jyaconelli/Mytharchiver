import type { Meta, StoryObj } from '@storybook/react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';
import { AccordionMultipleProps } from '@radix-ui/react-accordion';

const demoItems = [
  {
    value: 'item-1',
    title: 'What is Mytharchiver?',
    content:
      'Mytharchiver keeps drafts, plot points, and collaborator feedback aligned in one workspace.',
  },
  {
    value: 'item-2',
    title: 'Can I invite collaborators?',
    content: 'Yes. Share categories, review plot points, and leave comments inline.',
  },
  {
    value: 'item-3',
    title: 'How do I export results?',
    content: 'Export clustered categories and representative samples as JSON or CSV.',
  },
];

const meta: Meta<typeof Accordion> = {
  title: 'UI/Accordion',
  component: Accordion,
  argTypes: {
    type: {
      options: ['single', 'multiple'],
      control: { type: 'inline-radio' },
    },
    collapsible: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Accordion>;

export const SingleCollapsible: Story = {
  args: {
    type: 'single',
    collapsible: true,
    defaultValue: 'item-1',
  },
  render: (args) => (
    <Accordion {...args} className="w-full max-w-xl space-y-2">
      {demoItems.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};

export const SingleLockedOpen: Story = {
  args: {
    type: 'single',
    collapsible: false,
    defaultValue: 'item-1',
  },
  render: (args) => (
    <Accordion {...args} className="w-full max-w-xl space-y-2">
      {demoItems.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>
            {item.content} This variant keeps one panel open at all times.
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};

export const MultipleOpen: Story = {
  render: (args) => (
    <Accordion
      {...args as AccordionMultipleProps}
      type="multiple"
      defaultValue={['item-1', 'item-2']}
      className="w-full max-w-xl space-y-2"
    >
      {demoItems.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>
            {item.content} Multiple items can be open together in this mode.
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};

export const WithDisabledItem: Story = {
  args: {
    type: 'single',
    collapsible: true,
  },
  render: (args) => (
    <Accordion {...args} className="w-full max-w-xl space-y-2">
      {demoItems.map((item, index) => (
        <AccordionItem
          key={item.value}
          value={item.value}
          disabled={index === demoItems.length - 1}
        >
          <AccordionTrigger>
            {item.title}
            {index === demoItems.length - 1 ? ' (disabled)' : ''}
          </AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};
