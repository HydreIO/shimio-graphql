<h1 align=center>@hydre/graphql-executor</h1>
<p align=center>
  <img src="https://img.shields.io/github/license/hydreio/graphql-executor.svg?style=for-the-badge" />
  <a href="https://www.npmjs.com/package/@hydreio/graphql-executor">
    <img src="https://img.shields.io/npm/v/@hydreio/graphql-executor.svg?logo=npm&style=for-the-badge" />
  </a>
  <img src="https://img.shields.io/npm/dw/@hydreio/graphql-executor?logo=npm&style=for-the-badge" />
  <img src="https://img.shields.io/github/workflow/status/hydreio/graphql-executor/CI?logo=Github&style=for-the-badge" />
</p>

<h3 align=center>A more flexible approach to GraphQL operations execution</h3>

Graphql-executor allow a service to provide the api server with more advanced logic
thus becoming highly reactive for extremly low overhead. Acting as the lowest level it can be
used by any server implementation to provide advanced fine graining.

You must have access to a **server** to -> (**server | browser | client**) streaming ability
like (but not limited to) Websockets, gRpc, sockets, SSE..

## Motivation <!-- omit in toc -->

When it comes to designing infrastructures we all come to the difficult point where
we have to find *what kind of trade-off is acceptable* in order to gain time and momentum,
which is something you only buy with experience.

Choose high-level and you'll start fast then run into limitations due to lack of control,
choose low-level and [you'll die before releasing anything](https://www.quora.com/Why-do-programmers-mostly-use-high-level-language-rather-than-a-low-level-language).

The way execution is described in the GraphQL SDL can be interpreted in different ways, thus i present
you the **[Graphql Execution definition](https://spec.graphql.org/June2018/#sec-Execution)**
tale as seen and narrated by myself, by trading off a stateless ecosystem.

> *The text above is irrelevant and just a flex to looks like i'm not another javascript dev thinking he's making something cool in his life, but i'm lying to myself this lib is just some random drunk written experimental bullshit driven by hype, capitalism and soviet isotopes*

- [Installation](#installation)
- [Specification diff](#specification-diff)
  - [6. EXECUTION](#6-execution)
    - [6.1 Executing Requests](#61-executing-requests)
- [How it works](#how-it-works)
- [What Graphql-executor is not](#what-graphql-executor-is-not)
- [Should i use it in production ?](#should-i-use-it-in-production-)
- [Exemple](#exemple)
  - [Server](#server)
  - [Client](#client)
- [Usage](#usage)
  - [For servers](#for-servers)
  - [For tools maker](#for-tools-maker)

## Installation

```sh
npm install @hydre/graphql-executor
```

## Specification diff

*which has been [inspired](https://www.youtube.com/watch?v=reK7ff2hBYs) and written while listening [lo-fi](https://www.youtube.com/watch?v=kxdgHkdAiCg)*


### 6. EXECUTION

```diff
- GraphQL generates a response from a request via execution.
+ GraphQL may generate a response, a stream of response
+ or nothing from a request via execution.

A request for execution consists of a few pieces of information:

* The schema to use, typically solely provided by the GraphQL service.
- * A Document which must contain GraphQL OperationDefinition
+ * A Document which may contain some Graphql OperationDefinitions
  and may contain FragmentDefinition.
- * Optionally: The name of the Operation in the Document to execute.
- * Optionally: Values for any Variables defined by the Operation.
+ * Optionally: Values for some Variables defined by the Operation.
* An initial value corresponding to the root type being executed.
  Conceptually, an initial value represents the “universe” of data available
  via a GraphQL Service. It is common for a GraphQL Service to always
  use the same initial value for every request.

Given this information, the result of ExecuteRequest() produces
- the response, to be formatted according to the Response section below.
+ maybe a response, maybe a stream of non exhaustive datas patch,
+ maybe a pack of beer or an infinity stone, we don't know..
+ to be formatted according to the Response section below.
```

#### 6.1 Executing Requests

```diff
To execute a request, the executor must have a parsed Document
- and a selected operation name to run
- if the document defines multiple operations,
- otherwise the document is expected to only contain a single operation.
- The result of the request is determined by the result of executing
- this operation according to the “Executing Operations” section below.
+ which can contains multiple operations and fragments.
+ Each operation will be executed or awaited if it require arguments
+ exported by another operation, the result of the request will respect the
+ type definitions but will not be known ahead of time

  ExecuteRequest(schema, document, operationName, variableValues, initialValue)
    1. Let operation be [...]

+ Too long didn't write lol
```

## How it works

let's code golf the spec

1. A GraphQL document is sent to the executor
   - it may contains some `Queries`
   - it may contains some `Mutations`
   - it may contains some `Fragments`
   - it may contains some `Subscription`
2. Operations are resolved in parallel or sequencially when `exported` arguments are required
3. Execution order inside an operation doesn't change, still parallel for queries and sequencial for mutations
4. Each Mutation and Query resolvers can expose 3 functions, all optionals
   - `build` which allow native query transforms, can be thinked of as a better dataLoader
     - the result is stored in the rootValue of every operations under a `Symbol`
     - `build` can be a value, or a function which return a `value`, a `promise`, an `iterator` or an `asyncIterator`
     - in case of an iterator, it will buffer until completion
     - *if none is supplied, the defaultBuildResolver is used*
   - `resolve` which allow server side optimistic result or vanilla resolving as per the spec
     - `resolve` can be a value, or a function which return a `value`, a `promise`, an `iterator` or an `asyncIterator`
     - in case of an iterator, it will buffer until completion
     - *if none is supplied, the defaultResolver is used*
   - `subscribe` which allow `@live` directive support and return a stream of `patchs`
     - `subscribe` must be a function which return an `asyncIterator`
     - this time every iterated value is sent back in the main stream as a patch
     - each nested `asyncIterator` is asynchronously piped into the parent
     - *if none is supplied, the defaultSubscriptionResolver is used*
5. Each Subscription keep the original behavior, by calling `subscribe()` on the top layer
   then `resolve()` for nested selections. Only difference is as per our new spec it inherits the `build` result
6. Processing :
   1. Let `pid` be the reference to the current process
      - used to handle any kinds of disconnection or ressource cleaning
      - used as root reference in the main stream
      - **used to receive varmap update from the client** *(such reactive 🐶 wow)*
   2. Let `varmap` be the cached query Variables
   3. Let `export_varmap` be the reference of all `@export` variables
   4. Let `reactive_ops` be the operations not satisfied by `varmap`
   5. Fail fast if any `reactive_ops` will never be satisfied by `export_varmap`
      - could be missing or cyclic dependencies
   6. Let `satisfied_ops` be the operations satisfied by `varmap`
   8. Execute each `satisfied_ops` in parallel
       - Each operation using variables are removed and inserted into `reactive_ops`
       - All others are freed
       - `subscribe()` remain active until finished, restarted by a `varmap` update, or closed by a `pid` kill
   9.  Each time the `@export` directive is triggered, `varmap` is updated
       - this is basically client side scripting and come with caveats that'll need to be adressed
   10. Pull newly satisfied operations by `varmap` from `reactive_ops` to `satisfied_ops`
   11. While `satisfied_ops` is not empty, go to **7.**
   12. All done
       - `pid` run in the background and update queries by watching `varmap`
       - `pid` can be killed by the server or a client request
       - `streams` are fully handled in the background and can kill `pid` on any non GraphQL error

## What Graphql-executor is not

Graphql-executor is not a Graphql server, it's basically a function and must be used
by servers in replacement of the [Graphql-js](https://github.com/graphql/graphql-js)
`execute` function. Graphql-executor tightly follow Graphql-js implementation and use it
underneath at a lower level to provide a different way of executing request.

## Should i use it in production ?

The code is really light and we use it in production at @usidy it's pretty close to the official graphql implementation, your concerns should tend more on the conceptual design of such an experimental draft
as we have yet to observe every issues

## Exemple

### Server

### Client


## Usage

### For servers

### For tools maker