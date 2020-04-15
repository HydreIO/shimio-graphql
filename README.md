<h1 align=center>@hydre/gql-ws-server</h1>
<p align=center>
  <img src="https://img.shields.io/github/license/HydreIO/gql-ws-server.svg?style=for-the-badge" />
  <a href="https://www.npmjs.com/package/@hydre/gql-ws-server">
    <img src="https://img.shields.io/npm/v/@hydre/gql-ws-server.svg?logo=npm&style=for-the-badge" />
  </a>
  <img src="https://img.shields.io/npm/dw/@hydre/gql-ws-server.svg?color=%239C27B0&style=for-the-badge" />
  <a href="https://discord.gg/bRSpRpD">
    <img src="https://img.shields.io/discord/398114799776694272.svg?logo=discord&style=for-the-badge" />
  </a>
</p>

<h3 align=center>A light websocket-only GraphQL server</h3>

> The server is currently built on [jszmq](https://github.com/zeromq/jszmq) which is a node only implementation of the ZMQ protocol, once Websocket are [fully supported on LibZmq](https://github.com/zeromq/libzmq/issues/3581), this package will move on [zeromq.js](https://github.com/zeromq/zeromq.js) for increased performances

## Motivation

There is a problem in my whole developer career i never solved, it is to understand why do peoples write overcomplex things
when in facts it's so simple.. (this and why peoples use safari)

So i made this Graphql server, it's **very** simple as it **have** to be and doesn't do extra stuff like inviting you to a barmitzvah

*insult peoples for doing complex stuff, use zmq instead of simple ws* (shrug intensifies)