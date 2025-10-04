const server = Bun.serve({
  async fetch(req, server) {
    const upgraded = server.upgrade(req, { data: { createdAt: Date.now() } });

    if (upgraded) return undefined;
  },
  websocket: {
    async open(ws) {
      console.log("Open", ws.data);
    },
    async close(ws) {
      console.log("Closed", ws.data);
    },
    async message(ws, message) {
      console.log("Message received:", message, ws.data);
    },
  },
});

console.log("Listening on ws://localhost:" + server.port);
