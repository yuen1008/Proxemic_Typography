const express = require('express');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const sanitizeHtml = require('sanitize-html');
const path = require('path');
const multer = require('multer');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const WordExtractor = require('word-extractor');
const fs = require('fs/promises');
const os = require('os');
const crypto = require('crypto');
const app = express();
app.use(express.json({ limit: '20kb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
// Serve only the reader assets—not the rest of the Desktop project folder.
app.get(['/', '/index.html'], (_request, response) => response.sendFile(path.join(__dirname, 'index.html')));
app.get('/style.css', (_request, response) => response.sendFile(path.join(__dirname, 'style.css')));
app.get('/overrides.css', (_request, response) => response.sendFile(path.join(__dirname, 'overrides.css')));
app.get('/script.js', (_request, response) => response.sendFile(path.join(__dirname, 'script.js')));
function allowedURL(value) { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Please enter a public http or https URL.'); if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(url.hostname)) throw new Error('Local network addresses are not supported.'); return url; }
function cleanContent(content, baseURL) { const dom = new JSDOM(`<body>${content}</body>`, { url: baseURL }); dom.window.document.querySelectorAll('img').forEach((image) => { if (image.getAttribute('src')) image.src = new URL(image.getAttribute('src'), baseURL).href; }); return sanitizeHtml(dom.window.document.body.innerHTML, { allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption', 'h1', 'h2']), allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'title'], '*': ['class'] }, allowedSchemes: ['http', 'https', 'data'] }); }
function plainTextHTML(value) { return value.trim().split(/\n\s*\n/).filter(Boolean).map((paragraph) => `<p>${sanitizeHtml(paragraph, { allowedTags: [], allowedAttributes: {} }).replace(/\n/g, '<br>')}</p>`).join(''); }
app.post('/api/extract', async (request, response) => { try { const url = allowedURL(request.body?.url); const page = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (local Reading Room; Readability)' }, signal: AbortSignal.timeout(15000) }); if (!page.ok) throw new Error(`The page returned ${page.status}.`); const html = await page.text(); const dom = new JSDOM(html, { url: url.href }); const article = new Readability(dom.window.document).parse(); if (!article?.content) throw new Error('Could not identify the article text on this page. Try pasting text instead.'); const leadImage = dom.window.document.querySelector('meta[property="og:image"]')?.content; response.json({ title: article.title, byline: article.byline, siteName: article.siteName, excerpt: article.excerpt, content: cleanContent(article.content, url.href), leadImage, sourceUrl: url.href }); } catch (error) { response.status(400).json({ error: error.message || 'Could not extract this page.' }); } });
app.post('/api/import', upload.single('file'), async (request, response) => {
  try {
    if (!request.file) throw new Error('Choose a document first.');
    const extension = path.extname(request.file.originalname).toLowerCase();
    const title = path.basename(request.file.originalname, extension);
    let content;
    if (extension === '.pdf') content = plainTextHTML((await pdfParse(request.file.buffer)).text);
    else if (extension === '.docx') {
      const result = await mammoth.convertToHtml({ buffer: request.file.buffer }, { convertImage: mammoth.images.inline((image) => image.read('base64').then((data) => ({ src: `data:${image.contentType};base64,${data}` }))) });
      content = cleanContent(result.value, 'http://localhost');
    } else if (extension === '.doc') {
      const temporaryPath = path.join(os.tmpdir(), `reading-room-${crypto.randomUUID()}.doc`);
      await fs.writeFile(temporaryPath, request.file.buffer);
      try { const document = await new WordExtractor().extract(temporaryPath); content = plainTextHTML(document.getBody()); } finally { await fs.rm(temporaryPath, { force: true }); }
    } else throw new Error('Supported files are PDF, DOC, and DOCX.');
    if (!content) throw new Error('No readable text was found in this document.');
    response.json({ title, siteName: 'Local document', content });
  } catch (error) { response.status(400).json({ error: error.message || 'Could not read this document.' }); }
});
app.use((error, _request, response, _next) => response.status(400).json({ error: error.message || 'The local reader could not process this file.' }));
app.listen(4173, '127.0.0.1', () => console.log('Reading Room is running at http://127.0.0.1:4173'));
