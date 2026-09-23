import { createServer as createHttpServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { createServer as createNetServer, type Socket } from "node:net";
import type { TlsOptions } from "node:tls";

export interface DualStackServer {
  listen(port: number, host: string, listening: () => void): void;
  close(callback: (err?: Error) => void): void;
  on(event: "error", listener: (err: Error) => void): void;
}

export function createHttpsWithHttpRedirect(
  tlsOptions: TlsOptions,
  handler: (req: IncomingMessage, res: ServerResponse) => void,
  httpsPort: number,
): DualStackServer {
  const httpServer = createHttpServer((req, res) => {
    const hostHeader = req.headers.host || `localhost:${httpsPort}`;
    const host = hostHeader.replace(/\]$/, "").includes(":") && !hostHeader.startsWith("[")
      ? hostHeader
      : hostHeader.replace(/:\d+$/, `:${httpsPort}`);
    const location = `https://${host}${req.url || "/"}`;
    res.writeHead(301, { Location: location, "Cache-Control": "no-store" });
    res.end();
  });
  const httpsServer = createHttpsServer(tlsOptions, handler);

  const mux = createNetServer((socket: Socket) => {
    const onError = (): void => {
      socket.destroy();
    };
    socket.once("error", onError);
    socket.once("data", (buffer: Buffer) => {
      socket.pause();
      socket.unshift(buffer);
      const first = buffer[0];
      const isTls = first === 0x16 || first === 0x80;
      const target = isTls ? httpsServer : httpServer;
      target.emit("connection", socket);
      process.nextTick(() => socket.resume());
    });
  });

  return {
    listen(port, host, listening) {
      mux.listen(port, host, listening);
    },
    close(callback) {
      httpsServer.close();
      httpServer.close();
      mux.close(callback);
    },
    on(event, listener) {
      mux.on(event, listener);
    },
  };
}

export function asNodeServer(server: DualStackServer | Server): Pick<Server, "close"> {
  return server as Pick<Server, "close">;
}
