import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';

import App from './App';
import './index.css';
import { ThemeProvider } from './providers/ThemeProvider';

export async function render(url: string) {
  return renderToString(
    <StaticRouter location={url}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StaticRouter>,
  );
}
