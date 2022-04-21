## TypeScript Standard Library

This is a TypeScript library designed to be used as a foundation for projects by providing building blocks (modules). It's goal is to _not_ force you to use it throughout the project and it also doesn't want you to be forced to solve something in a specific way. Instead it tries to solve isolated problems with the modules which you can put together as you wish and use independently.

In addtion to the modules it also provides many utilities.

### Modules

#### [Api](/modules/api.html)

Module for creating and consuming HTTP Apis.

#### [Application](/modules/application.html)

Module for starting application modules and shutting down the app.

#### [Container](/modules/container.html)

Dependency Injection

#### [Data Structures](/modules/data_structures.html)

Observable data structures like CircularBuffer and LinkedList.

#### [Database](/modules/database.html)

Abstractions for database repositories.

##### Implementations

- [MongoDB](/modules/database_mongo.html)

#### [Disposable](/modules/disposable.html)

Disposable pattern and helpers.

#### [Distributed Loop](/modules/distributed_loop.html)

A loop which can run across a cluster of app instances.

#### [Enumerable](/modules/enumerable.html)

Wrapper around `Iterable` & `AsyncIterable` with function like `map`, `filter` and `reduce`.

#### [Error](/modules/error.html)

Base class for custom errors and some general premade errors like `NotFoundError`.

#### [HTTP](/modules/http.html)

HTTP server and client as an abstraction over different runtimes (web, node, deno) with middleware support and other useful features.

- [Client](/modules/http_client.html)
- [Server](/modules/http_server.html)
