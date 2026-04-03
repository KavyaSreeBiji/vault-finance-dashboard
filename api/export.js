/**
 * @file api/export.js
 * @description Vercel Serverless Function — handles CSV/JSON transaction export.
 *
 * Responds with proper Content-Disposition header so the browser
 * downloads the file with the correct filename and extension.
 *
 * POST /api/export
 * Body: { type: 'csv' | 'json', content: string }
 */
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, content } = req.body;

  if (!type || !content) {
    return res.status(400).json({ error: 'Missing type or content' });
  }

  const filename = type === 'json' ? 'transactions.json' : 'transactions.csv';
  const mimeType = type === 'json' ? 'application/json' : 'text/csv';

  res.setHeader('Content-Type', `${mimeType}; charset=utf-8`);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(content);
}
