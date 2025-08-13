# @tstdl/base/pdf

A powerful module for generating and manipulating PDF files in Node.js. It leverages a headless browser for high-fidelity rendering of HTML and URLs to PDF and provides utilities for common operations like merging, page counting, and converting pages to images.

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
  - [Classes](#classes)
  - [Functions](#functions)

## Features

- **High-Fidelity Rendering**: Uses a headless browser to accurately render modern HTML, CSS, and JavaScript to PDF.
- **Flexible Content Sources**: Generate PDFs from raw HTML strings, web page URLs, or dynamic templates.
- **Template-Based Generation**: Integrates seamlessly with `@tstdl/templates` for complex, data-driven PDF reports and documents.
- **PDF Manipulation**:
  - Merge multiple PDF documents into a single file.
  - Get the total number of pages in a PDF.
  - Convert individual PDF pages into various image formats (JPEG, PNG, etc.).
- **Customization**: Extensive options for controlling PDF output, including page format, margins, headers, footers, and more.

## Core Concepts

### `PdfService`

The `PdfService` is the central class for generating PDFs from various sources. It manages an underlying `BrowserController` to handle headless browser instances and contexts. This architecture ensures efficient resource management, especially when generating multiple PDFs concurrently.

### Rendering Flow

When a render method is called on `PdfService`, it performs the following steps:
1.  Acquires a browser context and a new page.
2.  Loads the content (HTML, URL, or rendered template) into the page.
3.  Optionally waits for network activity to cease to ensure all resources are loaded.
4.  Uses the browser's print-to-PDF functionality to generate a PDF stream.
5.  Cleans up the browser page and context.

### `PdfTemplate` and `pdfTemplate()`

For dynamic document generation, you can use `PdfTemplate`. A template defines the structure of your document, including a `body`, and optional `header` and `footer`. The `pdfTemplate()` function is a convenient factory for creating `PdfTemplate` objects. These templates are then rendered using `PdfService.renderTemplate`, which populates them with your data before converting to PDF.

### Utility Functions

The module also provides standalone utility functions that rely on external command-line tools for their operations:
-   `getPdfPageCount` uses `qpdf`.
-   `mergePdfs` and `mergePdfsStream` use `pdfunite`.
-   `pdfToImage` uses `pdftocairo`.

These functions are highly efficient for their specific tasks but require the corresponding tools to be installed in the execution environment.

## Usage

### Prerequisites

The utility functions in this module depend on external command-line tools. Please ensure they are installed on your system and available in the `PATH`.

-   **`qpdf`**: For `getPdfPageCount`.
-   **`pdfunite`** (from `poppler-utils`): For `mergePdfs`.
-   **`pdftocairo`** (from `poppler-utils`): For `pdfToImage`.

On Debian/Ubuntu, you can install them with:
```bash
sudo apt-get update && sudo apt-get install -y qpdf poppler-utils
```

### Rendering HTML to PDF

You can easily convert a string of HTML into a PDF.

```typescript
import { PdfService } from '@tstdl/base/pdf';
import { inject } from '@tstdl/base/injector';
import { writeFile } from 'fs/promises';

const pdfService = inject(PdfService);
const htmlContent = '<h1>Hello, World!</h1><p>This is a PDF from HTML.</p>';

const pdfBytes: Uint8Array = await pdfService.renderHtml(htmlContent);

await writeFile('output.pdf', pdfBytes);
```

### Rendering a URL to PDF

Render a live webpage to a PDF by providing its URL.

```typescript
import { PdfService } from '@tstdl/base/pdf';
import { inject } from '@tstdl/base/injector';
import { writeFile } from 'fs/promises';

const pdfService = inject(PdfService);
const url = 'https://example.com';

const pdfBytes: Uint8Array = await pdfService.renderUrl(url);

await writeFile('example.pdf', pdfBytes);
```

### Rendering a Template to PDF

Define a template and pass it to the service with a context object to generate dynamic PDFs.

```typescript
import { PdfService, pdfTemplate } from '@tstdl/base/pdf';
import { inject } from '@tstdl/base/injector';
import { writeFile } from 'fs/promises';

const pdfService = inject(PdfService);

const invoiceTemplate = pdfTemplate(
  'invoice-template',
  {
    header: '<span>Invoice - Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>',
    body: '<h1>Invoice for {{ customerName }}</h1><p>Amount: ${{ amount }}</p>',
  },
  {
    displayHeaderFooter: true,
    format: 'A4',
    margin: { top: '1cm', bottom: '1cm' }
  }
);

const context = {
  customerName: 'John Doe',
  amount: 199.99
};

const pdfBytes: Uint8Array = await pdfService.renderTemplate(invoiceTemplate, context);

await writeFile('invoice.pdf', pdfBytes);
```

### Merging PDFs

Combine multiple PDF files into one. The sources can be file paths, `Uint8Array` buffers, or `ReadableStream`s.

```typescript
import { mergePdfs } from '@tstdl/base/pdf';
import { readFile, writeFile } from 'fs/promises';

const pdf1 = await readFile('file1.pdf');
const pdf2Path = 'file2.pdf';

const mergedPdf: Uint8Array = await mergePdfs([pdf1, pdf2Path]);

await writeFile('merged.pdf', mergedPdf);
```

### Getting Page Count

Quickly determine the number of pages in a PDF.

```typescript
import { getPdfPageCount } from '@tstdl/base/pdf';

const pageCount = await getPdfPageCount('my-document.pdf');
console.log(`The document has ${pageCount} pages.`); // e.g., "The document has 5 pages."
```

### Converting a PDF Page to an Image

Extract a single page from a PDF and save it as a high-quality image.

```typescript
import { pdfToImage } from '@tstdl/base/pdf';
import { writeFile } from 'fs/promises';

const imageBytes = await pdfToImage('my-document.pdf', 1, 300, 'png');

await writeFile('page-1.png', imageBytes);
```

## API Summary

### Classes

-   **`PdfService`**: The main service for PDF generation.
-   **`PdfTemplate<Context>`**: Defines a template with fields and rendering options for PDF generation.
-   **`PdfServiceRenderOptions`**: Extends standard browser PDF options with additional controls like `delay`, `locale`, and `waitForNetworkIdle`.

### Functions

-   `renderHtml(html: string, options?: PdfServiceRenderOptions): Promise<Uint8Array>`: Renders an HTML string to a PDF.
-   `renderHtmlStream(html: string, options?: PdfServiceRenderOptions): ReadableStream<Uint8Array>`: Renders an HTML string to a PDF stream.
-   `renderUrl(url: string, options?: PdfServiceRenderOptions): Promise<Uint8Array>`: Renders a URL to a PDF.
-   `renderUrlStream(url: string, options?: PdfServiceRenderOptions): ReadableStream<Uint8Array>`: Renders a URL to a PDF stream.
-   `renderTemplate(keyOrTemplate: string | PdfTemplate, context?: object, options?: PdfServiceRenderOptions): Promise<Uint8Array>`: Renders a template to a PDF.
-   `renderTemplateStream(keyOrTemplate: string | PdfTemplate, context?: object, options?: PdfServiceRenderOptions): ReadableStream<Uint8Array>`: Renders a template to a PDF stream.
-   `pdfTemplate(name: string, fields: object, options?: PdfTemplateOptions): PdfTemplate`: A factory function to create a `PdfTemplate` instance.
-   `getPdfPageCount(file: string | Uint8Array | ReadableStream<Uint8Array>): Promise<number>`: Returns the number of pages in a PDF.
-   `mergePdfs(pdfs: (string | Uint8Array | ReadableStream<Uint8Array>)[]): Promise<Uint8Array>`: Merges multiple PDFs into a single `Uint8Array`.
-   `mergePdfsStream(pdfs: (string | Uint8Array | ReadableStream<Uint8Array>)[]): Promise<ReadableStream<Uint8Array>>`: Merges multiple PDFs into a single `ReadableStream`.
-   `pdfToImage(file: string | Uint8Array | ReadableStream<Uint8Array>, page: number, size: number, format: 'png' | 'jpeg' | ...): Promise<Uint8Array>`: Converts a single PDF page to an image.