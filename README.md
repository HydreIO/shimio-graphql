<h1 align=center>@hydre/graphql-yield-executor</h1>
<p align=center>
  <img src="https://img.shields.io/github/license/hydreio/graphql-websocket.svg?style=for-the-badge" />
  <a href="https://www.npmjs.com/package/@hydreio/graphql-websocket">
    <img src="https://img.shields.io/npm/v/@hydreio/graphql-websocket.svg?logo=npm&style=for-the-badge" />
  </a>
  <img src="https://img.shields.io/npm/dw/@hydreio/graphql-websocket?logo=npm&style=for-the-badge" />
  <img src="https://img.shields.io/github/workflow/status/hydreio/graphql-websocket/CI?logo=Github&style=for-the-badge" />
</p>

<h3 align=center>A more flexible approach to GraphQL operations execution</h3>

## Motivation <!-- omit in toc -->

When it comes to designing infrastructures we all come to the difficult point where
we have to find *what kind of trade-off is acceptable* in order to gain time and momentum,
which is something you only buy with experience.

Choose high-level and you'll start fast then run into limitations due to lack of control,
choose low-level and [you'll die before releasing anything](https://www.quora.com/Why-do-programmers-mostly-use-high-level-language-rather-than-a-low-level-language).

The way execution is described in the GraphQL SDL can be interpreted in different ways, thus i present
you the **[Graphql Execution definition](https://spec.graphql.org/June2018/#sec-Execution)**
tale as seen and narrated by myself.

> *The text above is just a flex to looks like i'm not another javascript dev thinking he's making something cool in his life, but i'm lying to myself this lib is just some random drunk written experimental bullshit driven by hype and capitalism*

- [Specification diff](#specification-diff)
  - [6. EXECUTION](#6-execution)
    - [6.1 Executing Requests](#61-executing-requests)
- [Too long didn't write](#too-long-didnt-write)
- [Install](#install)

## Specification diff

*which has been [inspired](https://www.youtube.com/watch?v=reK7ff2hBYs) and written while listening [lo-fi](https://www.youtube.com/watch?v=kxdgHkdAiCg)*


### 6. EXECUTION

```diff
- GraphQL generates a response from a request via execution.
+ GraphQL may generate a stream of response from a request via execution.

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
+ a stream of non exhaustive datas patch,
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
+ Each operation will be executed unless it require arguments
+ exported by another operation, the result of the request is always a stream

  ExecuteRequest(schema, document, operationName, variableValues, initialValue)
    1. Let operation be [...]
```

## Too long didn't write

let's code golf the spec

1. A GraphQL document is sent to the executor
   - it may contains some `Queries`
   - it may contains some `Mutations`
   - it may contains some `Fragments`
   - *Subscriptions doesn't exist anymore, poof gone!*
   - it may contains a `Varmap` (more on that below)
2. The executor execute every operations based on the `Varmap` which is basically client side scripting
   ```gql
   varmap {
     name: @unwind ["Bob", "Alice"]
     topic: "graphql"
   }

   query find_posts ($name: String!, $topic: String!) {
     find_author(name: $name) {
       name
       posts(topic: $topic) {
         content
       }
     }
   }
   ```
   - The varmap act like a state for all operations defined
   - The varmap can be updated by a query which @export a variables back into the `varmap` thus will reUpdate all query watching this value

## Install

```sh
npm install @hydre/graphql-websocket
```