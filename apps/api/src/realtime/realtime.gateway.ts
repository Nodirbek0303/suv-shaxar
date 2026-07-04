import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SensorReadingPayload } from '@suv/shared';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    client.emit('connected', { message: 'Realtime connected' });
  }

  handleDisconnect(_client: Socket) {
    // no-op
  }

  emitSensorReading(payload: SensorReadingPayload) {
    this.server.emit('sensor:reading', payload);
  }

  emitLineUpdate(payload: Record<string, unknown>) {
    this.server.emit('line:update', payload);
  }
}
