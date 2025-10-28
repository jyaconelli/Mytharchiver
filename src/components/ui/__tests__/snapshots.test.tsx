import React from 'react';
import { render } from '@testing-library/react';
import { beforeAll, describe, expect, test, vi } from 'vitest';

vi.mock('embla-carousel-react@8.6.0', () => {
  const api = {
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    canScrollPrev: vi.fn(() => true),
    canScrollNext: vi.fn(() => true),
    on: vi.fn(),
    off: vi.fn(),
  };

  const useEmblaCarousel = () => {
    const ref = vi.fn();
    return [ref, api] as const;
  };

  return {
    __esModule: true,
    default: useEmblaCarousel,
  };
});

vi.mock('vaul@1.1.2', () => {
  const createComponent =
    (dataSlot: string, element: keyof JSX.IntrinsicElements = 'div') =>
    ({
      children,
      asChild,
      ...props
    }: React.HTMLAttributes<HTMLElement> & { asChild?: boolean }) => {
      const elementProps = { 'data-vaul-slot': dataSlot, ...props };
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, elementProps);
      }
      return React.createElement(element, elementProps, children);
    };

  const DrawerRoot = ({
    children,
    onOpenChange: _onOpenChange,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { onOpenChange?: (open: boolean) => void }) => {
    return React.createElement('div', { 'data-vaul-slot': 'root', ...props }, children);
  };

  return {
    __esModule: true,
    Drawer: {
      Root: DrawerRoot,
      Trigger: createComponent('trigger', 'button'),
      Portal: createComponent('portal'),
      Overlay: createComponent('overlay'),
      Content: createComponent('content'),
      Close: createComponent('close', 'button'),
      Title: createComponent('title', 'h2'),
      Description: createComponent('description', 'p'),
    },
  };
});

vi.mock('recharts@2.15.2', () => {
  const createComponent =
    (name: string, element: keyof JSX.IntrinsicElements = 'div') =>
    ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
      React.createElement(element, { [`data-recharts-${name}`]: true, ...props }, children);

  const ResponsiveContainer = ({
    children,
    ...rest
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { 'data-recharts-responsive-container': true, ...rest }, children);

  return {
    __esModule: true,
    ResponsiveContainer,
    Tooltip: createComponent('tooltip'),
    Legend: createComponent('legend'),
  };
});

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('sonner', () => ({
  Toaster: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { 'data-sonner-toaster': true, ...props }, children),
}));

beforeAll(() => {
  const listeners: Array<() => void> = [];

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: (event: 'change', handler: () => void) => {
        if (event === 'change') {
          listeners.push(handler);
        }
      },
      removeEventListener: (event: 'change', handler: () => void) => {
        if (event === 'change') {
          const index = listeners.indexOf(handler);
          if (index >= 0) {
            listeners.splice(index, 1);
          }
        }
      },
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });

  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    value: 1024,
  });

  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  // @ts-expect-error: jsdom global augmentation for tests.
  global.ResizeObserver = ResizeObserver;

  vi.spyOn(Math, 'random').mockReturnValue(0.5);

  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
    writable: true,
    value: vi.fn(),
  });
});

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '../alert';
import { AspectRatio } from '../aspect-ratio';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';
import { Badge } from '../badge';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../breadcrumb';
import { Button } from '../button';
import { Calendar } from '../calendar';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../carousel';
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
} from '../chart';
import { Checkbox } from '../checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../collapsible';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '../command';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '../drawer';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../form';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../hover-card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '../input-otp';
import { Input } from '../input';
import { Label } from '../label';
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubTrigger,
  MenubarTrigger,
} from '../menubar';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '../navigation-menu';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink } from '../pagination';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../popover';
import { Progress } from '../progress';
import {
  RadioGroup,
  RadioGroupItem,
} from '../radio-group';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../resizable';
import { ScrollArea, ScrollBar } from '../scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../select';
import { Separator } from '../separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../sheet';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '../sidebar';
import { Skeleton } from '../skeleton';
import { Slider } from '../slider';
import { Toaster } from '../sonner';
import { Switch } from '../switch';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../tabs';
import { Textarea } from '../textarea';
import {
  Toggle,
} from '../toggle';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '../toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../tooltip';

import { useForm } from 'react-hook-form';

describe('UI component snapshots', () => {
  test('Accordion', () => {
    const { asFragment } = render(
      <Accordion type="single" value="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Accordion Item 1</AccordionTrigger>
          <AccordionContent>Accordion Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Alert dialog', () => {
    const { asFragment } = render(
      <AlertDialog open onOpenChange={() => {}}>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stay calm</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Alert', () => {
    const { asFragment } = render(
      <Alert>
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>Something went wrong, please try again.</AlertDescription>
      </Alert>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Aspect ratio', () => {
    const { asFragment } = render(
      <div style={{ width: 200 }}>
        <AspectRatio ratio={16 / 9}>
          <img alt="Preview" src="https://placehold.co/300x200" />
        </AspectRatio>
      </div>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Avatar', () => {
    const { asFragment } = render(
      <Avatar>
        <AvatarImage alt="Jane Doe" src="https://placehold.co/64x64" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Badge', () => {
    const { asFragment } = render(<Badge variant="secondary">Beta</Badge>);
    expect(asFragment()).toMatchSnapshot();
  });

  test('Breadcrumb', () => {
    const { asFragment } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Library</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Data</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Button', () => {
    const { asFragment } = render(<Button variant="outline">Outline Button</Button>);
    expect(asFragment()).toMatchSnapshot();
  });

  test('Calendar', () => {
    const { asFragment } = render(
      <Calendar
        mode="single"
        selected={new Date('2024-01-15T00:00:00.000Z')}
        onSelect={() => {}}
        defaultMonth={new Date('2024-01-01T00:00:00.000Z')}
      />,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Card', () => {
    const { asFragment } = render(
      <Card>
        <CardHeader>
          <CardTitle>Sample card</CardTitle>
          <CardDescription>A short description.</CardDescription>
          <CardAction>
            <Button size="sm">Action</Button>
          </CardAction>
        </CardHeader>
        <CardContent>Body content goes here.</CardContent>
        <CardFooter>
          <Button variant="secondary">Footer button</Button>
        </CardFooter>
      </Card>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Carousel', () => {
    const { asFragment } = render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Chart', () => {
    const payload = [
      {
        dataKey: 'visitors',
        name: 'Visitors',
        value: 120,
        color: '#ff0000',
        payload: { visitors: 'Visitors' },
      },
    ];

    const { asFragment } = render(
      <ChartContainer config={{ visitors: { label: 'Visitors', color: '#ff0000' } }}>
        <>
          <div>Mock Chart Body</div>
          <ChartTooltipContent active payload={payload} label="visitors" />
          <ChartLegendContent payload={payload} />
        </>
      </ChartContainer>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Checkbox', () => {
    const { asFragment } = render(<Checkbox checked onCheckedChange={() => {}} id="accept" />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('Collapsible', () => {
    const { asFragment } = render(
      <Collapsible open>
        <CollapsibleTrigger asChild>
          <Button variant="ghost">Toggle</Button>
        </CollapsibleTrigger>
        <CollapsibleContent>Collapsible content</CollapsibleContent>
      </Collapsible>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Command', () => {
    const { asFragment } = render(
      <CommandDialog open title="Palette" description="Quick actions">
        <Command>
          <CommandInput placeholder="Type a command" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem>
                Create new file <CommandShortcut>⌘+N</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Settings">
              <CommandItem>Preferences</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Context menu', () => {
    const { asFragment } = render(
      <ContextMenu open modal={false}>
        <ContextMenuTrigger asChild>
          <Button variant="ghost">Right click me</Button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>
            New Tab<ContextMenuShortcut>⌘T</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem inset>New Window</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuLabel inset>Share</ContextMenuLabel>
            <ContextMenuItem>Email link</ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>More options</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Copy link</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuRadioGroup value="preview">
            <ContextMenuRadioItem value="preview">Preview</ContextMenuRadioItem>
            <ContextMenuRadioItem value="full">Full</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuCheckboxItem checked>Include screenshot</ContextMenuCheckboxItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Dialog', () => {
    const { asFragment } = render(
      <Dialog open onOpenChange={() => {}}>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogDescription>Dialog description text.</DialogDescription>
          </DialogHeader>
          <div>Dialog body content.</div>
          <DialogFooter>
            <Button variant="secondary">Close</Button>
            <Button>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Drawer', () => {
    const { asFragment } = render(
      <Drawer open onOpenChange={() => {}}>
        <DrawerTrigger asChild>
          <Button>Open Drawer</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Drawer title</DrawerTitle>
            <DrawerDescription>Supporting description.</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">Drawer content body</div>
          <DrawerFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Save</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Dropdown menu', () => {
    const { asFragment } = render(
      <DropdownMenu open>
        <DropdownMenuTrigger asChild>
          <Button>Open menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Tools</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              Edit<DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem inset>Duplicate</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Email</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>Use shortcuts</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="compact">
            <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Form', () => {
    const Wrapper = () => {
      const form = useForm<{ email: string }>({
        defaultValues: { email: 'test@example.com' },
      });

      return (
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormDescription>We will never share your email.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      );
    };

    const { asFragment } = render(<Wrapper />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('Hover card', () => {
    const { asFragment } = render(
      <HoverCard open>
        <HoverCardTrigger asChild>
          <Button variant="link">Hover me</Button>
        </HoverCardTrigger>
        <HoverCardContent>Additional information appears here.</HoverCardContent>
      </HoverCard>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Input OTP', () => {
    const { asFragment } = render(
      <InputOTP maxLength={6} value="123456" onChange={() => {}}>
        <InputOTPGroup>
          {[0, 1, 2].map((index) => (
            <InputOTPSlot key={index} index={index} />
          ))}
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          {[3, 4, 5].map((index) => (
            <InputOTPSlot key={index} index={index} />
          ))}
        </InputOTPGroup>
      </InputOTP>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Input', () => {
    const { asFragment } = render(<Input placeholder="Type here" />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('Label', () => {
    const { asFragment } = render(<Label htmlFor="field">Email</Label>);
    expect(asFragment()).toMatchSnapshot();
  });

  test('Menubar', () => {
    const { asFragment } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New Tab<MenubarShortcut>⌘T</MenubarShortcut>
            </MenubarItem>
            <MenubarSub>
              <MenubarSubTrigger>Share</MenubarSubTrigger>
              <MenubarContent>
                <MenubarItem>Email link</MenubarItem>
              </MenubarContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarGroup>
              <MenubarLabel inset>Views</MenubarLabel>
              <MenubarRadioGroup value="default">
                <MenubarRadioItem value="default">Default</MenubarRadioItem>
                <MenubarRadioItem value="compact">Compact</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarGroup>
            <MenubarCheckboxItem checked>Show status bar</MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Navigation menu', () => {
    const { asFragment } = render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                Introduction
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              Documentation
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Pagination', () => {
    const { asFragment } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="#" isActive>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Popover', () => {
    const { asFragment } = render(
      <Popover open>
        <PopoverTrigger asChild>
          <Button variant="outline">Open popover</Button>
        </PopoverTrigger>
        <PopoverContent>This is a popover</PopoverContent>
      </Popover>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Progress', () => {
    const { asFragment } = render(<Progress value={45} />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('Radio group', () => {
    const { asFragment } = render(
      <RadioGroup value="option-1" onValueChange={() => {}}>
        <RadioGroupItem id="option-1" value="option-1" />
        <Label htmlFor="option-1">Option 1</Label>
        <RadioGroupItem id="option-2" value="option-2" />
        <Label htmlFor="option-2">Option 2</Label>
      </RadioGroup>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Resizable', () => {
    const { asFragment } = render(
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel>
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel>
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Scroll area', () => {
    const { asFragment } = render(
      <ScrollArea style={{ height: 80 }}>
        <div style={{ height: 200 }}>Scrollable content</div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Select', () => {
    const { asFragment } = render(
      <Select value="option-1" onValueChange={() => {}}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Options</SelectLabel>
            <SelectItem value="option-1">Option 1</SelectItem>
            <SelectItem value="option-2">Option 2</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Separator', () => {
    const { asFragment } = render(<Separator />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('Sheet', () => {
    const { asFragment } = render(
      <Sheet open onOpenChange={() => {}}>
        <SheetTrigger asChild>
          <Button>Open sheet</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet title</SheetTitle>
            <SheetDescription>Some extra context</SheetDescription>
          </SheetHeader>
          <div className="p-4">Sheet body content</div>
          <SheetFooter>
            <Button>Submit</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Sidebar', () => {
    const { asFragment } = render(
      <SidebarProvider defaultOpen>
        <div className="flex">
          <Sidebar>
            <SidebarHeader>
              <SidebarInput placeholder="Search" />
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Section</SidebarGroupLabel>
                <SidebarGroupAction aria-label="Add shortcut">
                  <span>+</span>
                </SidebarGroupAction>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton isActive>Dashboard</SidebarMenuButton>
                      <SidebarMenuAction aria-label="More options">⋮</SidebarMenuAction>
                      <SidebarMenuBadge>4</SidebarMenuBadge>
                    </SidebarMenuItem>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton href="#">Reports</SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarSeparator />
              <SidebarMenu>
                <SidebarMenuSkeleton />
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="sm">Settings</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
          <SidebarRail />
          <SidebarInset>
            <div className="p-4">Main content</div>
          </SidebarInset>
        </div>
        <SidebarTrigger />
      </SidebarProvider>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Skeleton', () => {
    const { asFragment } = render(<Skeleton className="h-4 w-24" />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('Slider', () => {
    const { asFragment } = render(<Slider defaultValue={[30]} />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('Sonner toaster', () => {
    const { asFragment } = render(<Toaster position="bottom-right" />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('Switch', () => {
    const { asFragment } = render(<Switch checked onCheckedChange={() => {}} id="toggle" />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('Table', () => {
    const { asFragment } = render(
      <Table>
        <TableCaption>A basic table example.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ada Lovelace</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Footer content</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Tabs', () => {
    const { asFragment } = render(
      <Tabs value="account" onValueChange={() => {}}>
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="account">Account settings panel</TabsContent>
        <TabsContent value="password">Password panel</TabsContent>
      </Tabs>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Textarea', () => {
    const { asFragment } = render(<Textarea placeholder="Tell us more..." />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('Toggle group', () => {
    const { asFragment } = render(
      <ToggleGroup type="multiple" value={['bold']}>
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
        <ToggleGroupItem value="underline">Underline</ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Toggle', () => {
    const { asFragment } = render(
      <Toggle aria-label="Toggle italic" pressed>
        Italic
      </Toggle>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('Tooltip', () => {
    const { asFragment } = render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger asChild>
            <Button variant="ghost">Hover</Button>
          </TooltipTrigger>
          <TooltipContent>Helpful tooltip text.</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    expect(asFragment()).toMatchSnapshot();
  });
});
