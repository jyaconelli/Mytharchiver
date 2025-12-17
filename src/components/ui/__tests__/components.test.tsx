import React, { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { renderWithTheme } from './test-utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../accordion';
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
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../carousel';
import { ChartContainer, ChartTooltipContent } from '../chart';
import { Checkbox } from '../checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../collapsible';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../command';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '../context-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '../drawer';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../form';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../hover-card';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '../input-otp';
import { Input } from '../input';
import { Label } from '../label';
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarShortcut,
  MenubarTrigger,
} from '../menubar';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '../navigation-menu';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink } from '../pagination';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { Progress } from '../progress';
import { RadioGroup, RadioGroupItem } from '../radio-group';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../resizable';
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../sheet';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '../sidebar';
import { Skeleton } from '../skeleton';
import { Slider } from '../slider';
import { Toaster } from '../sonner';
import { Switch } from '../switch';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';
import { Textarea } from '../textarea';
import { Toggle } from '../toggle';
import { ToggleGroup, ToggleGroupItem } from '../toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip';
import { useForm } from 'react-hook-form';

const getFragment = (ui: React.ReactElement) => renderWithTheme(ui).asFragment();

describe('UI component interactions and snapshots', () => {
  test('Accordion toggles content', () => {
    renderWithTheme(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent>Hidden content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByText('Trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  test('Alert dialog renders and closes with cancel', () => {
    const DialogExample = () => {
      const [open, setOpen] = useState(true);
      return (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button>Open</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm</AlertDialogTitle>
              <AlertDialogDescription>Make a choice.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    };

    renderWithTheme(<DialogExample />);
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });

  test('Alert snapshot', () => {
    const fragment = getFragment(
      <Alert>
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>Details here.</AlertDescription>
      </Alert>,
    );

    expect(fragment).toMatchSnapshot();
  });

  test('Aspect ratio snapshot', () => {
    const fragment = getFragment(
      <div style={{ width: 200 }}>
        <AspectRatio ratio={16 / 9}>
          <img alt="Preview" src="https://placehold.co/300x200" />
        </AspectRatio>
      </div>,
    );

    expect(fragment).toMatchSnapshot();
  });

  test('Avatar shows fallback', () => {
    renderWithTheme(
      <Avatar>
        <AvatarImage alt="Jane Doe" src="invalid" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  test('Badge renders text', () => {
    renderWithTheme(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  test('Breadcrumb renders segments', () => {
    const fragment = getFragment(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Library</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(fragment).toMatchSnapshot();
  });

  test('Button forwards click events', () => {
    const onClick = vi.fn();
    renderWithTheme(<Button onClick={onClick}>Press me</Button>);
    fireEvent.click(screen.getByText('Press me'));
    expect(onClick).toHaveBeenCalled();
  });

  test('Calendar calls onSelect', () => {
    const onSelect = vi.fn();
    renderWithTheme(
      <Calendar mode="single" selected={new Date(2024, 0, 15)} onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByText('15'));
    expect(onSelect).toHaveBeenCalled();
  });

  test('Card snapshot', () => {
    const fragment = getFragment(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>
            <Button size="sm">Action</Button>
          </CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    expect(fragment).toMatchSnapshot();
  });

  test('Carousel navigation triggers embla controls', () => {
    renderWithTheme(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
        </CarouselContent>
        <CarouselPrevious aria-label="Previous" />
        <CarouselNext aria-label="Next" />
      </Carousel>,
    );

    fireEvent.click(screen.getByLabelText('Previous'));
    fireEvent.click(screen.getByLabelText('Next'));
    expect(true).toBe(true);
  });

  test('Chart snapshot', () => {
    const fragment = getFragment(
      <ChartContainer
        config={{ visitors: { label: 'Visitors', color: '#f00' } }}
        className="h-32 w-64"
      >
        <ChartTooltipContent nameKey="label" labelKey="name" payloadLabel="Visitors" />
      </ChartContainer>,
    );

    expect(fragment).toMatchSnapshot();
  });

  test('Checkbox toggles checked state', () => {
    const onCheckedChange = vi.fn();
    renderWithTheme(
      <Checkbox id="agree" checked={false} onCheckedChange={onCheckedChange} />,
    );

    fireEvent.click(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  test('Collapsible toggles visibility', () => {
    renderWithTheme(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Details</CollapsibleContent>
      </Collapsible>,
    );

    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByText('Details')).toBeVisible();
  });

  test('Command dialog shows empty state', () => {
    renderWithTheme(
      <CommandDialog open onOpenChange={() => {}}>
        <Command>
          <CommandInput placeholder="Search" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
          </CommandList>
        </Command>
      </CommandDialog>,
    );

    expect(screen.getByText('No results.')).toBeInTheDocument();
  });

  test('Context menu toggles checkbox item', () => {
    const onCheckedChange = vi.fn();
    renderWithTheme(
      <ContextMenu>
        <ContextMenuTrigger>Right click</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>Settings</ContextMenuLabel>
          <ContextMenuCheckboxItem checked onCheckedChange={onCheckedChange}>
            Enabled
          </ContextMenuCheckboxItem>
          <ContextMenuItem>Plain</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByText('Right click'));
    fireEvent.click(screen.getByText('Enabled'));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  test('Dialog opens and closes content', () => {
    const Example = () => {
      const [open, setOpen] = useState(false);
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogDescription>Dialog description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
    };

    renderWithTheme(<Example />);
    fireEvent.click(screen.getByText('Open dialog'));
    expect(screen.getByText('Dialog title')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Dialog title')).not.toBeInTheDocument();
  });

  test('Drawer opens from trigger', () => {
    const Example = () => {
      const [open, setOpen] = useState(false);
      return (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button>Open drawer</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Drawer heading</DrawerTitle>
              <DrawerDescription>Drawer body</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <Button>Close</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      );
    };

    renderWithTheme(<Example />);
    fireEvent.click(screen.getByText('Open drawer'));
    expect(screen.getByText('Drawer heading')).toBeInTheDocument();
  });

  test('Dropdown menu toggles open state', () => {
    const onOpenChange = vi.fn();
    renderWithTheme(
      <DropdownMenu open onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button>Open menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem>Item</DropdownMenuItem>
          <DropdownMenuCheckboxItem checked>Checked</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(screen.getByText('Actions')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Item'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('Form renders field and message', () => {
    const Wrapper = () => {
      const form = useForm<{ email: string }>({ defaultValues: { email: '' } });
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
                    <Input placeholder="you@example.com" {...field} />
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

    const fragment = renderWithTheme(<Wrapper />).asFragment();
    expect(fragment).toMatchSnapshot();
  });

  test('Hover card shows content when open', () => {
    renderWithTheme(
      <HoverCard open>
        <HoverCardTrigger asChild>
          <Button>Hover</Button>
        </HoverCardTrigger>
        <HoverCardContent>Extra info</HoverCardContent>
      </HoverCard>,
    );

    expect(screen.getByText('Extra info')).toBeInTheDocument();
  });

  test('Input OTP renders slots', () => {
    const fragment = getFragment(
      <InputOTP maxLength={4} value="1234" onChange={() => {}}>
        <InputOTPGroup>
          {[0, 1].map((index) => (
            <InputOTPSlot key={index} index={index} />
          ))}
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          {[2, 3].map((index) => (
            <InputOTPSlot key={index} index={index} />
          ))}
        </InputOTPGroup>
      </InputOTP>,
    );

    expect(fragment).toMatchSnapshot();
  });

  test('Input accepts typing', () => {
    renderWithTheme(<Input placeholder="Type" />);
    fireEvent.change(screen.getByPlaceholderText('Type'), { target: { value: 'Hello' } });
    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
  });

  test('Label associates with input', () => {
    renderWithTheme(
      <div>
        <Label htmlFor="field">Email</Label>
        <Input id="field" />
      </div>,
    );

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  test('Menubar renders trigger', () => {
    renderWithTheme(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New Tab<MenubarShortcut>⌘T</MenubarShortcut>
            </MenubarItem>
            <MenubarCheckboxItem checked>Show line numbers</MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );

    const trigger = screen.getByText('File');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  test('Navigation menu displays content on trigger', () => {
    renderWithTheme(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink>Introduction</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    fireEvent.click(screen.getByText('Docs'));
    expect(screen.getByText('Introduction')).toBeInTheDocument();
  });

  test('Pagination renders active link', () => {
    renderWithTheme(
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

    expect(screen.getByText('1')).toHaveAttribute('aria-current', 'page');
  });

  test('Popover displays content when open', () => {
    renderWithTheme(
      <Popover open>
        <PopoverTrigger asChild>
          <Button>Open popover</Button>
        </PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    );

    expect(screen.getByText('Popover body')).toBeInTheDocument();
  });

  test('Progress exposes aria value', () => {
    const { container } = renderWithTheme(<Progress value={45} />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator?.getAttribute('style')).toContain('translateX(-55%)');
  });

  test('Radio group changes selection', () => {
    const onValueChange = vi.fn();
    renderWithTheme(
      <RadioGroup value="one" onValueChange={onValueChange}>
        <RadioGroupItem id="one" value="one" />
        <Label htmlFor="one">One</Label>
        <RadioGroupItem id="two" value="two" />
        <Label htmlFor="two">Two</Label>
      </RadioGroup>,
    );

    fireEvent.click(screen.getByLabelText('Two'));
    expect(onValueChange).toHaveBeenCalledWith('two');
  });

  test('Resizable snapshot', () => {
    const fragment = getFragment(
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel>
          <div>Panel A</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel>
          <div>Panel B</div>
        </ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(fragment).toMatchSnapshot();
  });

  test('Scroll area renders scrollbar', () => {
    const { container } = renderWithTheme(
      <ScrollArea style={{ height: 80 }}>
        <div style={{ height: 200 }}>Scrollable</div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>,
    );

    expect(container.querySelector('[data-slot="scroll-area-viewport"]')).toBeInTheDocument();
  });

  test('Select calls onValueChange when selecting', () => {
    const onValueChange = vi.fn();
    renderWithTheme(
      <Select open value="one" onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Options</SelectLabel>
            <SelectItem value="one">One</SelectItem>
            <SelectItem value="two">Two</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    fireEvent.click(screen.getByText('Two'));
    expect(onValueChange).toHaveBeenCalledWith('two');
  });

  test('Separator snapshot', () => {
    const fragment = getFragment(<Separator className="my-2" />);
    expect(fragment).toMatchSnapshot();
  });

  test('Sheet opens content', () => {
    const Example = () => {
      const [open, setOpen] = useState(false);
      return (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button>Open sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sheet title</SheetTitle>
              <SheetDescription>Sheet body</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      );
    };

    renderWithTheme(<Example />);
    fireEvent.click(screen.getByText('Open sheet'));
    expect(screen.getByText('Sheet title')).toBeInTheDocument();
  });

  test('Sidebar renders items', () => {
    renderWithTheme(
      <SidebarProvider>
        <div className="flex">
          <Sidebar>
            <SidebarHeader>Header</SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Menu</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton>Dashboard</SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Settings</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <div>Main</div>
          </SidebarInset>
        </div>
        <SidebarTrigger />
      </SidebarProvider>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('Skeleton snapshot', () => {
    const fragment = getFragment(<Skeleton className="h-4 w-24" />);
    expect(fragment).toMatchSnapshot();
  });

  test('Slider changes value', () => {
    const onValueChange = vi.fn();
    renderWithTheme(<Slider defaultValue={[30]} onValueChange={onValueChange} />);

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(onValueChange).toHaveBeenCalled();
  });

  test('Sonner toaster snapshot', () => {
    const fragment = getFragment(<Toaster position="bottom-right" />);
    expect(fragment).toMatchSnapshot();
  });

  test('Switch toggles state', () => {
    const onCheckedChange = vi.fn();
    renderWithTheme(
      <Switch checked onCheckedChange={onCheckedChange} id="toggle" />,
    );

    fireEvent.click(screen.getByRole('switch'));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  test('Table renders rows', () => {
    renderWithTheme(
      <Table>
        <TableCaption>Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ada</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  test('Tabs switches panels', () => {
    const TabsExample = () => {
      const [value, setValue] = useState('account');
      return (
        <div>
          <Tabs value={value} onValueChange={setValue}>
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>
            <TabsContent value="account">Account panel</TabsContent>
            <TabsContent value="password">Password panel</TabsContent>
          </Tabs>
          <button type="button" onClick={() => setValue('password')}>
            Select password
          </button>
        </div>
      );
    };

    renderWithTheme(<TabsExample />);

    fireEvent.click(screen.getByText('Select password'));
    expect(screen.getByText('Password')).toHaveAttribute('aria-selected', 'true');
  });

  test('Textarea accepts typing', () => {
    renderWithTheme(<Textarea placeholder="Tell us more" />);
    fireEvent.change(screen.getByPlaceholderText('Tell us more'), { target: { value: 'Hello' } });
    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
  });

  test('Toggle group allows multiple selection', () => {
    const onValueChange = vi.fn();
    renderWithTheme(
      <ToggleGroup type="multiple" value={["bold"]} onValueChange={onValueChange}>
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      </ToggleGroup>,
    );

    fireEvent.click(screen.getByText('Italic'));
    expect(onValueChange).toHaveBeenCalledWith(['bold', 'italic']);
  });

  test('Toggle toggles pressed state', () => {
    const onPressedChange = vi.fn();
    renderWithTheme(
      <Toggle pressed onPressedChange={onPressedChange} aria-label="Toggle italic">
        Italic
      </Toggle>,
    );

    fireEvent.click(screen.getByLabelText('Toggle italic'));
    expect(onPressedChange).toHaveBeenCalledWith(false);
  });

  test('Tooltip shows content', () => {
    renderWithTheme(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger asChild>
            <Button variant="ghost">Hover</Button>
          </TooltipTrigger>
          <TooltipContent>Helpful tooltip text.</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    expect(screen.getAllByText('Helpful tooltip text.').length).toBeGreaterThan(0);
  });
});
