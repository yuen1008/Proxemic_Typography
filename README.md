# Proxemic Typography — Reading Room

A local, proximity-aware reading tool for students working through long course readings: public library articles, research essays, newsletters, and documents.

The project responds to a small but common reading posture: when dense digital text becomes difficult, readers often move closer, lean forward, and lose the support of their chair. Rather than warning the reader, this tool enlarges and loosens the page so the text can meet them where they are.

## Start locally

1. Double-click `Start Local Server.command`.
2. The project opens at `http://127.0.0.1:4173`.
3. Keep the Terminal window open while using the reader. Press `Control-C` in that window to stop it.

The first launch installs the required open-source packages. The server binds only to `127.0.0.1`; it is not deployed or accessible on the local network.

## Reading workflow

- **Open a course link** — Paste a public HTML article, research essay, or newsletter URL. Mozilla Readability extracts its main text and available images.
- **Open a local document** — Upload `.txt`, `.md`, `.html`, `.pdf`, `.docx`, or `.doc`.
- **Paste text** — Paste notes or an excerpt directly into the reader.

Links that require a university-library login or paywall cannot be fetched directly. Download those materials first and upload the file instead.

## Manual controls

Use **Manual controls** in the reader to:

- choose Literata, Atkinson Hyperlegible, or Source Serif 4;
- change text size and line spacing;
- switch between soft paper and high-contrast paper;
- edit an imported title and text in place.

Google Fonts is linked from the controls for further font exploration. Manual controls remain usable when camera sensing is disabled.

## Personal comfort range

Camera sensing is optional and uses MediaPipe Face Detection in the browser. No camera frame is stored or uploaded.

If camera sensing is enabled, calibration captures three face-size signals:

1. **Upright reading position** — torso supported and shoulders relaxed.
2. **Closest readable limit** — the nearest position at which the text is still easy to read.
3. **Supported-backrest position** — leaning back into the chair.

This creates a *personal comfort range*, not a medical assessment or a universal “healthy distance.” As the reader approaches their personal close limit, the page enlarges text, increases line spacing, warms the paper color, and eventually offers a quiet pause prompt.

## Research framing

Viewing distance is not a single universal number. OSHA suggests that a screen is generally viewed at about 50–100 cm, with the torso upright and supported, while acknowledging that text size and workstation setup matter. In a laboratory study of 24 participants, Rempel et al. found that viewing distance, character size, visual comfort, and head/torso posture interact; they did **not** produce a two-point formula for a medically optimal distance.

This project therefore treats proximity as a gentle, self-defined interaction signal—not a diagnosis.

- [OSHA: computer workstation monitor guidance](https://www.osha.gov/etools/computer-workstations/components/monitors)
- [Rempel et al. (2007), *Human Factors*](https://pubmed.ncbi.nlm.nih.gov/17915601/)
- [Jaschinski (2002), individual differences in preferred display distance](https://pubmed.ncbi.nlm.nih.gov/11913842/)

## Technology

- Frontend: HTML, CSS, and vanilla JavaScript
- Local server: Node.js + Express, bound to `127.0.0.1`
- Web article extraction: [Mozilla Readability](https://github.com/mozilla/readability)
- Document import: Mammoth (DOCX), pdf-parse (PDF), Word Extractor (DOC)
- Camera signal: [MediaPipe Tasks Vision](https://www.npmjs.com/package/@mediapipe/tasks-vision)

## Privacy and limits

- Imported files are processed on the local server running on the reader's own computer.
- Webcam processing runs in-browser and does not save or upload images.
- The face bounding-box size is an approximate proximity proxy; it is not a physical distance measurement.
- The local server exposes only its reader assets, not other files in this folder.
