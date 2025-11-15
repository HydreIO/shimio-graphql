import { inspect } from "util";
import ws from "ws";
import Client from "@hydre/shimio/client";
import Query from "../../src/query.js";

// eslint-disable-next-line no-undef
globalThis.WebSocket = ws;

const client = Client({ host: "ws://0.0.0.0:3000" });
const query = Query(client);
const END = 2000;

await client.connect();

const { listen, stop } = await query(/* GraphQL */ `
  query pang {
    ping
  }

  mutation hello {
    first: sendMessage(message: "howdy")
    then: sendMessage(message: "pls sir show vagana")
  }

  subscription hey_listen {
    onMessage
  }
`);

setTimeout(() => {
  stop(); // unsubscribe from operation
}, END);

for await (const m of listen())
  console.log("received", inspect(m, false, Infinity, true));

client.disconnect();
