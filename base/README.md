## TypeScript Standard Library

This is a TypeScript library designed to be used as a foundation for projects by providing building blocks (modules). It's goal is to _not_ force you to use it throughout the project and it also doesn't want you to be forced to solve something in a specific way. Instead it tries to solve isolated problems with the modules which you can put together as you wish and use independently.

In addtion to the modules it also provides many utilities.

### Modules

#### [Api](/modules/api.html)

Module for creating and consuming HTTP Apis.

#### [Application](/modules/application.html)

Module for starting application modules and shutting down the app.

#### [Injector](/modules/injector.html)

Dependency Injection

#### [CSS](/modules/css.html)

CSS utils like theming.

#### [Data Structures](/modules/data_structures.html)

Observable data structures like SortedArrayList, CircularBuffer and LinkedList.

#### [Database](/modules/database.html)

Abstractions for database repositories.

##### Implementations

- [MongoDB](/modules/database_mongo.html)

#### [Disposable](/modules/disposable.html)

Disposable pattern and helpers.

#### [Distributed Loop](/modules/distributed_loop.html)

A loop which can run across a cluster of app instances.

#### [Enumerable](/modules/enumerable.html) & [AsyncEnumerable](/modules/async-enumerable.html)

Wrapper around `Iterable` & `AsyncIterable` with function like `map`, `filter` and `reduce`.

#### [Error](/modules/error.html)

Base class for custom errors and some general premade errors like `NotFoundError`.

#### [HTTP](/modules/http.html)

HTTP server and client as an abstraction over different runtimes (web, node, deno) with middleware support and other useful features.

- [Client](/modules/http_client.html)
- [Server](/modules/http_server.html)

#### [Image Service](/modules/image_service.html)

Image Service to serve images in different resolutions, rotate, etc.

##### Implementations

- [imgproxy](/modules/image_service_imgproxy.html)

#### [JSON Path](/modules/json_path.html)

Encode/decode JSON Paths.

#### [Key-Value Store](/modules/key_value_store.html)

Simple, typed key-value store. Useful for storing settings, states, etc.

##### Implementations

- [MongoDB](/modules/key_value_store_mongo.html)

#### [Lock](/modules/lock.html)

Lock resources to ensure only one instance is accessing something at the same time.

##### Implementations

- [MongoDB](/modules/lock_mongo.html)

#### [Logger](/modules/logger.html)

Logging abstraction

##### Implementations

- [noop](/modules/logger_noop.html)
- [Console](/modules/logger_console.html)

#### [Mail](/modules/mail.html)

Mail Module with support for templates, queuing and logging.

#### [Memory](/modules/memory.html)

"Low level" (as far as JavaScript supports) utils for memory management.

#### [Message Bus](/modules/message_bus.html)

Message Bus (Pub/Sub like).

##### Implementations

- [local](/modules/message_bus_local.html)
