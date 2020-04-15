<h1 align=center>@hydre/gql-ws-server</h1>
<p align=center>
  <img src="https://img.shields.io/github/license/HydreIO/gql-ws-server.svg?style=for-the-badge" />
  <a href="https://discord.gg/bRSpRpD">
    <img src="https://img.shields.io/discord/398114799776694272.svg?logo=discord&style=for-the-badge" />
  </a>
</p>

<h3 align=center>A light websocket-only GraphQL server</h3>

> The server is currently built on [jszmq](https://github.com/zeromq/jszmq) which is a node only implementation of the ZMQ protocol, once Websocket are [fully supported on LibZmq](https://github.com/zeromq/libzmq/issues/3581), this package will move on [zeromq.js](https://github.com/zeromq/zeromq.js) for increased performances