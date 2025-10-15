const AUTH_KEY = "auth-session";

type Message = {
  event: string;
  payload: unknown;
};

const server = Bun.serve<{ authToken: string }, never>({
  port: process.env.PORT ?? 3001,
  async fetch(req, server) {
    const cookies = new Bun.CookieMap(req.headers.get("cookie")!);

    const authToken = cookies.get(AUTH_KEY);

    if (!authToken) {
      return new Response("Unauthorized", { status: 400 });
    }

    const upgraded = server.upgrade(req, {
      data: {
        userToken: authToken,
      },
    });

    if (upgraded) return undefined;
  },
  websocket: {
    async open(ws) {
      console.log("Socket opened");

      ws.subscribe(ws.data.authToken);
    },
    async close(ws) {
      console.log("Socket closed");

      ws.unsubscribe(ws.data.authToken);
    },
    async message(ws, message) {
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

      const status = ws.publish(ws.data.authToken, message);

      console.log("Socket message proccessed: ", status);
    },
  },
});

console.log("Listening on ws://localhost:" + server.port);
