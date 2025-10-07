const TASK_ROOM = "task_room";

type Message = {
  event: string;
  payload: unknown;
};

const server = Bun.serve({
  async fetch(req, server) {
    const upgraded = server.upgrade(req);

    console.log("Init connection with:", server.requestIP(req));

    if (upgraded) return undefined;
  },
  websocket: {
    async open(ws) {
      console.log("Socket opened");

      ws.subscribe(TASK_ROOM);
    },
    async close(ws) {
      console.log("Socket closed");

      ws.unsubscribe(TASK_ROOM);
    },
    async message(_, message) {
      console.log("Socket message received:", message);

      try {
        message = JSON.stringify(JSON.parse(message.toString()) as Message);
      } catch {
        message = JSON.stringify({
          payload: message.toString(),
          event: "unknown",
        } as Message);

        console.log(
          "Message is not valid JSON, sending back as unknown event."
        );
      }

      const status = server.publish(TASK_ROOM, `${message}`);

      console.log("Socket message proccessed: ", status);
    },
  },
});

console.log("Listening on ws://localhost:" + server.port);
