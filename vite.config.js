import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'export-api',
      configureServer(server) {
        server.middlewares.use('/api/export', (req, res) => {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { type, content } = JSON.parse(body);
              const filename = type === 'json' ? 'transactions.json' : 'transactions.csv';
              const mimeType = type === 'json' ? 'application/json' : 'text/csv';
              res.setHeader('Content-Type', `${mimeType}; charset=utf-8`);
              res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(content);
            } catch(e) {
              res.statusCode = 400;
              res.end('Bad request');
            }
          });
        });
      }
    }
  ],
});
