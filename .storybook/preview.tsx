import type { Preview } from '@storybook/react-vite';
import { BrowserRouter } from 'react-router-dom';

import '../src/index.css';
import { ThemeProvider } from '../src/providers/ThemeProvider';

const preview: Preview = {
  decorators: [
    (Story) => (
      <BrowserRouter>
        <ThemeProvider>
          <div className="min-h-screen bg-background text-foreground p-6">
            <Story />
          </div>
        </ThemeProvider>
      </BrowserRouter>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;
