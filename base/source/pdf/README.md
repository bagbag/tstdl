# @tstdl/base/pdf

A powerful module for generating and manipulating PDF files. It leverages a headless browser for high-fidelity rendering of HTML and URLs to PDF and provides utilities for common operations like merging, page counting, and converting pages to images.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Prerequisites](#prerequisites)
  - [Rendering HTML to PDF](#rendering-html-to-pdf)
  - [Rendering a URL to PDF](#rendering-a-url-to-pdf)
  - [Rendering a Template to PDF](#rendering-a-template-to-pdf)
  - [Merging PDFs](#merging-pdfs)
  - [Getting Page Count](#getting-page-count)
  - [Converting a PDF Page to an Image](#converting-a-pdf-page-to-an-image)
- [API Summary](#api-summary)

## Features

- **High-Fidelity Rendering**: Uses a headless browser to accurately render modern HTML, CSS, and JavaScript to PDF.
- **Flexible Content Sources**: Generate PDFs from raw HTML strings, web page URLs, or dynamic templates.
- **Template-Based Generation**: Integrates seamlessly with `@tstdl/base/templates` for complex, data-driven PDF reports and documents.
- **PDF Manipulation Utilities**:
  - Merge multiple PDF documents into a single file.
  - Get the total number of pages in a PDF.
  - Convert individual PDF pages into various image formats (JPEG, PNG, SVG, etc.).
- **Stream-Based Processing**: Methods are available to work with streams for improved memory efficiency with large files.
- **Extensive Customization**: Provides a rich set of options to control PDF output, including page format, margins, headers, footers, and rendering delays.

## Core Concepts

### `PdfService`

The `PdfService` is the primary interface for generating PDFs from various sources. It manages an underlying `BrowserController` to handle headless browser instances, ensuring efficient resource management.

When a render method like `renderHtml` or `renderUrl` is called, the service performs the following steps:

1.  Acquires a browser context and a new page.
2.  Loads the content (HTML, URL, or a rendered template) into the page.
3.  Optionally waits for network activity to cease, ensuring all asynchronous resources like images and scripts are fully loaded.
4.  Applies rendering options (e.g., margins, headers, footers).
5.  Uses the browser's native print-to-PDF functionality to generate a high-quality PDF stream.
6.  Cleans up the browser page and context to release resources.

### PDF Manipulation Utilities

For common PDF manipulation tasks, the module provides standalone utility functions that are highly efficient but rely on external command-line tools:

- `getPdfPageCount` uses `qpdf`.
- `mergePdfs` and `mergePdfsStream` use `pdfunite` (from the `poppler-utils` suite).
- `pdfToImage` uses `pdftocairo` (from the `poppler-utils` suite).

This separation means you only need these external dependencies if you use the manipulation functions, not for the core PDF generation capabilities of `PdfService`.

## Usage

### Prerequisites

The PDF manipulation utility functions depend on external command-line tools. Please ensure they are installed on your system and available in the `PATH`.

- **`qpdf`**: For `getPdfPageCount`.
- **`pdfunite`** (part of `poppler-utils`): For `mergePdfs` and `mergePdfsStream`.
- **`pdftocairo`** (part of `poppler-utils`): For `pdfToImage`.

On Debian/Ubuntu, you can install them with:

```bash
sudo apt-get update && sudo apt-get install -y qpdf poppler-utils
```

### Rendering HTML to PDF

Convert a string of HTML directly into a PDF.

```typescript
import { PdfService } from '@tstdl/base/pdf';
import { inject } from '@tstdl/base/injector';
import { writeFile } from 'fs/promises';

// Get an instance of the service from the injector
const pdfService = inject(PdfService);

const htmlContent = '<h1>Hello, World!</h1><p>This is a PDF generated from an HTML string.</p>';

// Render the HTML to a byte array
const pdfBytes: Uint8Array = await pdfService.renderHtml(htmlContent, {
  format: 'A4',
  margin: { top: '2cm', bottom: '2cm' },
});

await writeFile('output.pdf', pdfBytes);
```

### Rendering a URL to PDF

Render any live webpage to a PDF by providing its URL.

```typescript
import { PdfService } from '@tstdl/base/pdf';
import { inject } from '@tstdl/base/injector';
import { writeFile } from 'fs/promises';

const pdfService = inject(PdfService);
const url = 'https://example.com';

// Render the URL to a byte array
const pdfBytes: Uint8Array = await pdfService.renderUrl(url);

await writeFile('example.pdf', pdfBytes);
```

### Rendering a Template to PDF

For dynamic documents, define a template using `@tstdl/base/templates` and render it with a context object.

```typescript
import { PdfService, pdfTemplate } from '@tstdl/base/pdf';
import { stringTemplateField } from '@tstdl/base/templates';
import { inject } from '@tstdl/base/injector';
import { writeFile } from 'fs/promises';

const pdfService = inject(PdfService);

// Define a template for an invoice
const invoiceTemplate = pdfTemplate(
  'invoice-template',
  {
    header: stringTemplateField({ template: '<span>Invoice - Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>' }),
    body: stringTemplateField({ template: '<h1>Invoice for {{ customerName }}</h1><p>Amount: {{ amount }}</p>' }),
  },
  {
    displayHeaderFooter: true,
    format: 'A4',
    margin: { top: '1cm', bottom: '1cm' },
  },
);

// Provide the data to fill in the template
const context = {
  customerName: 'John Doe',
  amount: 199.99,
};

const pdfBytes: Uint8Array = await pdfService.renderTemplate(invoiceTemplate, context);

await writeFile('invoice.pdf', pdfBytes);
```

### Merging PDFs

Combine multiple PDF files into a single document. The sources can be file paths, `Uint8Array` buffers, or `ReadableStream`s.

```typescript
import { mergePdfs } from '@tstdl/base/pdf';
import { readFile, writeFile } from 'fs/promises';

const pdfBuffer = await readFile('file1.pdf');
const pdfPath = 'file2.pdf';

const mergedPdfBytes: Uint8Array = await mergePdfs([pdfBuffer, pdfPath]);

await writeFile('merged.pdf', mergedPdfBytes);
```

### Getting Page Count

Quickly determine the number of pages in a PDF.

```typescript
import { getPdfPageCount } from '@tstdl/base/pdf';

const pageCount = await getPdfPageCount('my-document.pdf');
console.log(`The document has ${pageCount} pages.`); // e.g., "The document has 5 pages."
```

### Converting a PDF Page to an Image

Extract a single page from a PDF and convert it into an image format like PNG or JPEG.

```typescript
import { pdfToImage } from '@tstdl/base/pdf';
import { writeFile } from 'fs/promises';

// Convert the first page to a 300px wide PNG
const imageBytes = await pdfToImage('my-document.pdf', 1, 300, 'png');

await writeFile('page-1.png', imageBytes);
```

## API Summary

| Member                   | Signature                                                                                                                         | Description                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **`PdfService`**         | `class`                                                                                                                           | Main service for generating PDFs from HTML, URLs, or templates using a headless browser. |
| `renderHtml()`           | `(html: string, options?: PdfServiceRenderOptions): Promise<Uint8Array>`                                                          | Renders an HTML string to a PDF and returns it as a byte array.                          |
| `renderHtmlStream()`     | `(html: string, options?: PdfServiceRenderOptions): ReadableStream<Uint8Array>`                                                   | Renders an HTML string to a PDF stream for memory-efficient processing.                  |
| `renderUrl()`            | `(url: string, options?: PdfServiceRenderOptions): Promise<Uint8Array>`                                                           | Renders a web page from a URL to a PDF and returns it as a byte array.                   |
| `renderUrlStream()`      | `(url: string, options?: PdfServiceRenderOptions): ReadableStream<Uint8Array>`                                                    | Renders a web page from a URL to a PDF stream.                                           |
| `renderTemplate()`       | `<C>(template: string \| PdfTemplate<C>, context?: C, options?: PdfServiceRenderOptions): Promise<Uint8Array>`                    | Renders a template to a PDF and returns it as a byte array.                              |
| `renderTemplateStream()` | `<C>(template: string \| PdfTemplate<C>, context?: C, options?: PdfServiceRenderOptions): ReadableStream<Uint8Array>`             | Renders a template to a PDF stream.                                                      |
| **`pdfTemplate()`**      | `(name: string, fields: object, options?: PdfTemplateOptions): PdfTemplate`                                                       | A factory function to create a `PdfTemplate` instance for dynamic PDF generation.        |
| **`getPdfPageCount()`**  | `(file: string \| Uint8Array \| ReadableStream): Promise<number>`                                                                 | Gets the total number of pages in a PDF file. **Requires `qpdf`**.                       |
| **`mergePdfs()`**        | `(pdfs: (string \| Uint8Array \| ReadableStream)[]): Promise<Uint8Array>`                                                         | Merges multiple PDF files into one, returned as a byte array. **Requires `pdfunite`**.   |
| **`mergePdfsStream()`**  | `(pdfs: (string \| Uint8Array \| ReadableStream)[]): Promise<ReadableStream<Uint8Array>>`                                         | Merges multiple PDF files into a single PDF stream. **Requires `pdfunite`**.             |
| **`pdfToImage()`**       | `(file: string \| Uint8Array \| ReadableStream, page: number, size: number, format: 'png' \| 'jpeg' \| ...): Promise<Uint8Array>` | Converts a single page of a PDF into an image. **Requires `pdftocairo`**.                |
