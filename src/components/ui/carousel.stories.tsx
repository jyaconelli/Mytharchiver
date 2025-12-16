import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from './carousel';

const slides = [
  {
    title: 'Brainstorm',
    description: 'Collect myths, rumors, and lore fragments from collaborators.',
  },
  {
    title: 'Cluster',
    description: 'Group related notes and pick representative examples.',
  },
  {
    title: 'Prioritize',
    description: 'Vote on which categories need deeper research first.',
  },
  {
    title: 'Draft',
    description: 'Turn clustered insights into draft narrative summaries.',
  },
  {
    title: 'Review',
    description: 'Share drafts, comment inline, and request clarifications.',
  },
];

const meta: Meta<typeof Carousel> = {
  title: 'UI/Carousel',
  component: Carousel,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <Carousel className="relative">
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={slide.title} className="p-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>
                    {index + 1}. {slide.title}
                  </CardTitle>
                  <CardDescription>{slide.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Stays full-width and uses the default horizontal orientation.
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious aria-label="Previous slide" />
        <CarouselNext aria-label="Next slide" />
      </Carousel>
    </div>
  ),
};

export const LoopingPeek: Story = {
  render: () => (
    <div className="w-full max-w-4xl">
      <Carousel
        opts={{ loop: true, align: 'start' }}
        className="relative"
      >
        <CarouselContent className="-ml-3">
          {slides.map((slide, index) => (
            <CarouselItem
              key={slide.title}
              className="basis-3/4 p-3 md:basis-1/3"
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>
                    {index + 1}. {slide.title}
                  </CardTitle>
                  <CardDescription>{slide.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Looping enabled with multiple slides visible per snap.
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious aria-label="Previous slide" />
        <CarouselNext aria-label="Next slide" />
      </Carousel>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="w-full max-w-3xl">
      <Carousel
        orientation="vertical"
        opts={{ dragFree: true }}
        className="relative h-[520px]"
      >
        <CarouselContent className="-mt-3">
          {slides.map((slide, index) => (
            <CarouselItem
              key={slide.title}
              className="h-48 basis-1/2 p-3"
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>
                    {index + 1}. {slide.title}
                  </CardTitle>
                  <CardDescription>{slide.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Vertical orientation with drag-free scrolling.
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious aria-label="Previous slide" />
        <CarouselNext aria-label="Next slide" />
      </Carousel>
    </div>
  ),
};

export const WithExternalControls: Story = {
  render: () => {
    const [api, setApi] = React.useState<CarouselApi>();
    const [current, setCurrent] = React.useState(0);

    React.useEffect(() => {
      if (!api) return;

      const onSelect = () => setCurrent(api.selectedScrollSnap());
      api.on('select', onSelect);
      onSelect();

      return () => {
        api.off('select', onSelect);
      };
    }, [api]);

    return (
      <div className="w-full max-w-3xl space-y-4">
        <Carousel
          setApi={setApi}
          opts={{ align: 'center' }}
          className="relative"
        >
          <CarouselContent>
            {slides.map((slide, index) => (
              <CarouselItem
                key={slide.title}
                className="basis-full p-2 sm:basis-1/2 lg:basis-1/3"
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>
                      {index + 1}. {slide.title}
                    </CardTitle>
                    <CardDescription>{slide.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Demonstrates using `setApi` for custom pagination.
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious aria-label="Previous slide" />
          <CarouselNext aria-label="Next slide" />
        </Carousel>

        <div className="flex flex-wrap justify-center gap-2">
          {slides.map((_, index) => (
            <Button
              key={index}
              variant={current === index ? 'default' : 'secondary'}
              size="sm"
              onClick={() => api?.scrollTo(index)}
              disabled={!api}
            >
              {index + 1}
            </Button>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Snap {current + 1} of {slides.length}
        </p>
      </div>
    );
  },
};
