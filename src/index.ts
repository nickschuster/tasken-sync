import { SHA256, sql, SQL } from "bun";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase64url, encodeHexLowerCase } from "@oslojs/encoding";

const AUTH_KEY = "auth-session";

type Message = {
  event: string;
  payload: unknown;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DB connection not configured!");
}

const db = new SQL(process.env.DATABASE_URL);

const server = Bun.serve<{ userId: string }, never>({
  port: process.env.PORT ?? 3001,
  async fetch(req, server) {
    const cookies = new Bun.CookieMap(req.headers.get("cookie")!);

    const authToken = cookies.get(AUTH_KEY);

    if (!authToken) {
      return new Response("Unauthorized", { status: 400 });
    }

    const sessionId = encodeHexLowerCase(
      sha256(new TextEncoder().encode(authToken))
    );

    const [session] = await db`
      SELECT user_id FROM session 
      WHERE id = ${sessionId}
    `;

    if (!session) {
      return new Response("Forbidden", { status: 400 });
    }

    const upgraded = server.upgrade(req, {
      data: {
        userId: session.user_id,
      },
    });

    if (upgraded) return undefined;
  },
  websocket: {
    async open(ws) {
      console.log("Socket opened");

      ws.subscribe(ws.data.userId);
    },
    async close(ws) {
      console.log("Socket closed");

      ws.unsubscribe(ws.data.userId);
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

      const status = ws.publish(ws.data.userId, message);

      console.log("Socket message proccessed: ", status);
    },
  },
});

console.log("Listening on ws://localhost:" + server.port);
