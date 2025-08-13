# @tstdl/base/ai

A powerful and flexible TypeScript wrapper for Google's Generative AI (Gemini) models, designed for building robust AI-powered applications. It provides a unified interface for both Google AI and Vertex AI, simplifying content generation, function calling, and file management.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Configuration](#configuration)
  - [Basic Generation](#basic-generation)
  - [Streaming Generation](#streaming-generation)
  - [Structured JSON Output](#structured-json-output)
  - [Function Calling](#function-calling)
  - [Conversational Sessions](#conversational-sessions)
  - [File Processing](#file-processing)
- [API Summary](#api-summary)

## Features

- **Unified API:** Seamlessly switch between Google Generative AI and Vertex AI endpoints with a single configuration.
- **Content Generation:** Simple and streaming APIs for text and multi-modal content generation.
- **Structured JSON Output:** Enforce JSON output that conforms to your defined schemas.
- **Robust Function Calling:** Define functions with schemas and handlers, with automatic execution of function calls from the model.
- **Conversational State:** `AiSession` class for easily managing multi-turn conversation history.
- **File Management:** Asynchronous file uploading and processing for use in multi-modal prompts, with support for Google's File API and Google Cloud Storage (for Vertex).
- **Resilience:** Built-in retry logic with exponential backoff for handling transient network errors.
- **Type-Safe:** Heavily typed to ensure correctness and improve developer experience.

## Core Concepts

### `AiService`
The `AiService` is the main entry point for all interactions. It's a singleton service that handles all communication with the Google AI or Vertex AI backend. You use it for one-off generation tasks, function calls, and file processing.

### `AiSession`
For conversational AI, `AiSession` is a stateful wrapper around `AiService`. It automatically maintains the history of user messages and model responses, making it easy to build multi-turn dialogues without manually managing the `contents` array.

### File Management (`AiFileService`)
Before you can use files (images, documents) in your prompts, they must be uploaded to the appropriate Google service. `AiService` abstracts this process via `processFile()` and `processFiles()`. It handles uploading to either the Generative AI File API or a Google Cloud Storage bucket (for Vertex AI) and takes care of waiting until the file is in an `ACTIVE` state and ready for use.

### Function Calling
This module provides a powerful abstraction for function calling. You can define a set of available functions using `defineFunctions`. Each function can have a `description` and a `parameters` schema. When you call `aiService.callFunctions()`, the service sends these declarations to the model. The model can then choose to "call" one or more of these functions by returning a JSON object with the function name and arguments. `AiService` automatically parses this response, and if your function declaration includes a `handler`, it will execute it with the parsed parameters.

### Structured Output (JSON Mode)
By providing a `generationSchema` in a `generate` request, you can instruct the model to return its response as a JSON object that conforms to your schema. The service automatically handles setting the correct `responseMimeType` and `responseSchema` and will parse and validate the JSON output for you.

## Usage

### Configuration

First, configure the service with your API key. This is typically done in your application's entry point.

```typescript
import { configureAiService } from '@tstdl/base/ai';

configureAiService({
  apiKey: process.env.GOOGLE_API_KEY
});
```

For Vertex AI, provide the project details:

```typescript
import { configureAiService } from '@tstdl/base/ai';

configureAiService({
  vertex: {
    project: 'your-gcp-project-id',
    location: 'us-central1',
    bucket: 'your-gcs-bucket-for-files' // Required for file uploads
  },
  keyFile: './path/to/your-credentials.json'
});
```

### Basic Generation

To generate content, inject `AiService` and call the `generate` method.

```typescript
import { inject } from '@tstdl/base/injector';
import { AiService } from '@tstdl/base/ai';

const aiService = inject(AiService);

const result = await aiService.generate({
  model: 'gemini-2.5-flash',
  contents: [{
    role: 'user',
    parts: [{ text: 'Explain the importance of TypeScript in modern web development.' }]
  }]
});

console.log(result.text); // The generated text content.
console.log(result.usage.total); // Total tokens used.
```

### Streaming Generation

For long-running generations, you can stream the response.

```typescript
import { inject } from '@tstdl/base/injector';
import { AiService } from '@tstdl/base/ai';

const aiService = inject(AiService);

const stream = aiService.generateStream({
  model: 'gemini-2.5-flash',
  contents: [{
    role: 'user',
    parts: [{ text: 'Write a short story about a friendly robot.' }]
  }]
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```

### Structured JSON Output

You can force the model to output a JSON object that matches your schema.

```typescript
import { inject } from '@tstdl/base/injector';
import { object, string, array } from '@tstdl/base/schema';
import { AiService } from '@tstdl/base/ai';

const aiService = inject(AiService);

const recipeSchema = object({
  name: string(),
  ingredients: array(string()),
  steps: array(string())
});

const result = await aiService.generate({
  model: 'gemini-2.5-flash',
  generationSchema: recipeSchema,
  contents: [{
    role: 'user',
    parts: [{ text: 'Provide a simple recipe for pancakes.' }]
  }]
});

// result.json is fully typed according to recipeSchema
console.log('Recipe:', result.json.name);
result.json.ingredients.forEach((ingredient) => console.log(`- ${ingredient}`));
```

### Function Calling

Define functions and let the model call them to get structured data or perform actions.

```typescript
import { inject } from '@tstdl/base/injector';
import { object, string } from '@tstdl/base/schema';
import { AiService, defineFunctions } from '@tstdl/base/ai';

// Mock weather API
async function getCurrentWeather(location: string): Promise<any> {
  console.log(`Fetching weather for ${location}...`);
  if (location.toLowerCase().includes('tokyo')) {
    return { temperature: 28, unit: 'C', condition: 'Sunny' };
  }
  return { temperature: 18, unit: 'C', condition: 'Cloudy' };
}

const aiService = inject(AiService);

const functions = defineFunctions({
  get_weather: {
    description: 'Get the current weather for a specific location.',
    parameters: object({ location: string() }),
    handler: async (params) => getCurrentWeather(params.location)
  }
});

const { result: functionResults } = await aiService.callFunctions({
  functions,
  contents: [{
    role: 'user',
    parts: [{ text: 'What is the weather like in Tokyo?' }]
  }]
});

// The handler result is available on the function call result
const weather = functionResults[0].handlerResult;
console.log(`The weather in Tokyo is ${weather.temperature}°${weather.unit} and ${weather.condition}.`);
```

### Conversational Sessions

Use `AiSession` to easily manage multi-turn conversations.

```typescript
import { inject } from '@tstdl/base/injector';
import { AiService } from '@tstdl/base/ai';

const aiService = inject(AiService);
const session = aiService.createSession();

console.log('You: What is the capital of France?');
let response = await session.generate({
  contents: [{ role: 'user', parts: [{ text: 'What is the capital of France?' }] }]
});
console.log('AI:', response.text);

console.log('\nYou: And what is its population?');
// The session automatically includes the previous messages
response = await session.generate({
  contents: [{ role: 'user', parts: [{ text: 'And what is its population?' }] }]
});
console.log('AI:', response.text);
```

### File Processing

Upload files to use them in multi-modal prompts.

```typescript
import { readFileSync } from 'node:fs';
import { inject } from '@tstdl/base/injector';
import { AiService, type FileInput } from '@tstdl/base/ai';

const aiService = inject(AiService);

// Create a Blob from a file buffer
const imageBlob: FileInput = new Blob([readFileSync('./my-image.png')], { type: 'image/png' });

// Or provide a path directly (only works in Node.js environments)
const docPath: FileInput = { path: './my-document.pdf', mimeType: 'application/pdf' };

// Process the file (uploads it to Google's service)
const imagePart = await aiService.processFile(imageBlob);

// Use the processed file in a prompt
const result = await aiService.generate({
  model: 'gemini-2.5-pro',
  contents: [{
    role: 'user',
    parts: [
      { text: 'What is in this image?' },
      imagePart // Use the file part here
    ]
  }]
});

console.log(result.text);
```

## API Summary

### Top-Level Functions

| Function | Arguments | Returns | Description |
| --- | --- | --- | --- |
| `configureAiService` | `options: AiServiceOptions` | `void` | Configures the AI services. Must be called before injecting `AiService`. |
| `defineFunctions` | `declarations: T` | `T` | A type-safe helper to define a set of functions for the model to call. |
| `defineFunction` | `declaration: T` | `T` | A type-safe helper to define a single function with inferred parameter types. |

### `AiService`

The primary service for all AI interactions.

| Method | Arguments | Returns | Description |
| --- | --- | --- | --- |
| `createSession` | | `AiSession` | Creates a new stateful conversational session. |
| `generate` | `request: GenerationRequest<S>` | `Promise<GenerationResult<S>>` | Generates content from the model and waits for the full response. |
| `generateStream` | `request: GenerationRequest<S>` | `AsyncGenerator<GenerationResult<S>>` | Generates content as a stream, yielding partial results. |
| `callFunctions` | `options: CallFunctionsOptions<T>` | `Promise<SpecializedGenerationResult<...>>` | Prompts the model to call one or more functions and executes their handlers. |
| `callFunctionsStream` | `options: CallFunctionsOptions<T>` | `SpecializedGenerationResultGenerator<...>` | A streaming version of `callFunctions`. |
| `processFile` | `fileInput: FileInput` | `Promise<FileContentPart>` | Uploads and processes a single file for use in prompts. |
| `processFiles` | `fileInputs: FileInput[]` | `Promise<FileContentPart[]>` | Uploads and processes multiple files in parallel. |

### `AiSession`

Manages the state for a multi-turn conversation.

| Method | Arguments | Returns | Description |
| --- | --- | --- | --- |
| `addContent` | `content: OneOrMany<Content>` | `void` | Adds content to the session history without generating a response. |
| `generate` | `request: GenerationRequest` | `Promise<GenerationResult>` | Generates a response, automatically adding the new content and the model's reply to the history. |
| `callFunctions` | `options: CallFunctionsOptions<T>` | `Promise<SpecializedGenerationResult<...>>` | Calls functions, automatically adding content and function results to the history. |
