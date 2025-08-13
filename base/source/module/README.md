# Application Modules (`@tstdl/base/module`)

This module provides a lightweight but powerful framework for building modular, service-based applications. It establishes a clear contract for components (`Module`) with managed lifecycles, state tracking, and integrated metric reporting.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
  - [The Module Interface](#the-module-interface)
  - [Lifecycle and State](#lifecycle-and-state)
  - [Metrics and Reporting](#metrics-and-reporting)
- [Usage](#usage)
  - [Creating a Custom Module](#creating-a-custom-module)
  - [Using Pre-built Modules](#using-pre-built-modules)
  - [Running and Stopping Modules](#running-and-stopping-modules)
  - [Reporting Metrics](#reporting-metrics)
- [API Summary](#api-summary)

## Features

- **Modular Architecture**: Decompose your application into independent, reusable modules.
- **Managed Lifecycle**: Each module has a defined `run()` and `stop()` lifecycle, managed by the framework.
- **State Tracking**: Modules have an explicit state (`Running`, `Stopped`, `Erroneous`).
- **Graceful Shutdown**: Built-in support for graceful shutdown via `CancellationSignal`.