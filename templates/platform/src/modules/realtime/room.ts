import type { DurableObjectStateLike, Env } from '../../platform/env';

type SocketAttachment = {
  userId: string;
  roomId: string;
  connectedAt: number;
};

type HibernatingWebSocket = WebSocket & {
  serializeAttachment(value: SocketAttachment): void;
  deserializeAttachment(): SocketAttachment | null;
};

type WebSocketPairValue = {
  0: WebSocket;
  1: HibernatingWebSocket;
};

type WebSocketResponseInit = ResponseInit & { webSocket: WebSocket };

const WebSocketPairConstructor = (globalThis as unknown as {
  WebSocketPair: new () => WebSocketPairValue;
}).WebSocketPair;

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function attachment(socket: WebSocket): SocketAttachment | null {
  const candidate = socket as HibernatingWebSocket;
  return typeof candidate.deserializeAttachment === 'function'
    ? candidate.deserializeAttachment()
    : null;
}

function safeMessage(value: string) {
  if (new TextEncoder().encode(value).byteLength > 16 * 1024) {
    throw new Error('realtime message exceeds 16KB');
  }
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('realtime message must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

export class RealtimeRoom {
  constructor(
    private readonly state: DurableObjectStateLike,
    _env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const roomId = request.headers.get('x-realtime-room-id') ?? url.searchParams.get('roomId');
    if (!roomId) return json({ error: 'room id is required' }, 400);

    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      const sockets = this.state.getWebSockets();
      const sequence = await this.state.storage.get<number>('sequence') ?? 0;
      return json({ roomId, connections: sockets.length, sequence });
    }

    const userId = request.headers.get('x-realtime-user-id');
    if (!userId) return json({ error: 'authenticated user id is required' }, 401);
    const pair = new WebSocketPairConstructor();
    const client = pair[0];
    const server = pair[1];
    const connectedAt = Date.now();
    server.serializeAttachment({ userId, roomId, connectedAt });
    this.state.acceptWebSocket(server, [`room:${roomId}`, `user:${userId}`]);
    server.send(JSON.stringify({
      type: 'realtime.connected',
      roomId,
      userId,
      connectedAt,
      sequence: await this.state.storage.get<number>('sequence') ?? 0,
    }));
    await this.broadcast({ type: 'realtime.presence.joined', roomId, userId, connectedAt }, server);

    const init: WebSocketResponseInit = { status: 101, webSocket: client };
    return new Response(null, init);
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    const info = attachment(socket);
    if (!info) {
      socket.close(1011, 'socket attachment missing');
      return;
    }
    try {
      const text = typeof message === 'string'
        ? message
        : new TextDecoder().decode(message);
      const payload = safeMessage(text);
      const sequence = (await this.state.storage.get<number>('sequence') ?? 0) + 1;
      await this.state.storage.put('sequence', sequence);
      await this.broadcast({
        type: 'realtime.message',
        roomId: info.roomId,
        userId: info.userId,
        sequence,
        sentAt: Date.now(),
        payload,
      });
    } catch (error) {
      socket.send(JSON.stringify({
        type: 'realtime.error',
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  async webSocketClose(socket: WebSocket, code: number, reason: string) {
    const info = attachment(socket);
    if (info) {
      await this.broadcast({
        type: 'realtime.presence.left',
        roomId: info.roomId,
        userId: info.userId,
        code,
        reason,
        disconnectedAt: Date.now(),
      }, socket);
    }
  }

  webSocketError(socket: WebSocket, error: unknown) {
    const info = attachment(socket);
    console.error(JSON.stringify({
      type: 'realtime_socket_error',
      roomId: info?.roomId ?? null,
      userId: info?.userId ?? null,
      error: error instanceof Error ? error.message : String(error),
    }));
    socket.close(1011, 'realtime socket error');
  }

  private async broadcast(payload: Record<string, unknown>, exclude?: WebSocket) {
    const serialized = JSON.stringify(payload);
    const sockets = this.state.getWebSockets();
    for (const socket of sockets) {
      if (socket === exclude) continue;
      try {
        socket.send(serialized);
      } catch (error) {
        console.error(JSON.stringify({
          type: 'realtime_broadcast_error',
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    }
  }
}
