import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import * as tmi from 'tmi.js';

type ClientSocket = {
  socket: Socket;
  roomId?: string;
};

type Room = {
  tmi: tmi.Client;
  clients: Socket[];
};

@Injectable()
export class SocketService {
  private readonly logger = new Logger(SocketService.name);

  private readonly connectedClients: Map<string, ClientSocket> = new Map();
  private readonly rooms: Map<string, Room> = new Map();

  handleConnection(socket: Socket): void {
    this.connectedClients.set(socket.id, { socket });
    this.logger.log('Socket connected with id: ' + socket.id);
  }

  handleDisconnect(socket: Socket): void {
    const connectedClient = this.connectedClients.get(socket.id);

    if (connectedClient.roomId) {
      const room = this.rooms.get(connectedClient.roomId);
      const clients = room.clients.filter(
        (client) => client != connectedClient.socket,
      );

      if (clients.length > 0) {
        this.rooms.set(connectedClient.roomId, { ...room, clients });
      } else {
        room.tmi.disconnect();
        this.rooms.delete(connectedClient.roomId);
        this.logger.log(
          'Room disconnected with name: ' + room.tmi.getUsername(),
        );
      }
    }

    this.connectedClients.delete(socket.id);
    this.logger.log('Socket disconnected with id: ' + socket.id);
  }

  async handleInitialize(socket: Socket, data: any): Promise<void> {
    const roomId = data.roomId;

    if (!roomId) {
      return;
    }

    this.logger.log('Room initialize with name: ' + roomId);

    const roomIsEmpty = !this.rooms.has(roomId);

    await socket.join(roomId);

    if (roomIsEmpty) {
      const tmiClient = new tmi.Client({
        channels: [roomId],
      });

      tmiClient.connect();

      tmiClient.on(
        'chat',
        (_channel, tags: tmi.CommonUserstate, message, self) => {
          let updatedMessage = message;
          const emotes = [];

          const emotesArray = Object.entries(tags.emotes ?? {}).map(
            (entity) => {
              const range = entity[1][0].split('-');
              const start = Number(range[0]);
              const end = Number(range[1]) + 1;

              return message.substring(start, end);
            },
          );

          for (const emote in tags.emotes) {
            emotes.push(
              `https://static-cdn.jtvnw.net/emoticons/v1/${emote}/3.0`,
            );
          }

          for (const code of emotesArray ?? []) {
            updatedMessage = updatedMessage.replaceAll(code, '');
          }

          updatedMessage = updatedMessage.replace(/\s+/g, ' ').trim();

          this.emitToRoom(socket, roomId, 'message', {
            name: tags['display-name'],
            userId: tags['user-id'],
            message: updatedMessage,
            color: tags['color'],
            emotes: emotes,
          });
        },
      );

      const room = this.rooms.get(roomId);

      this.rooms.set(roomId, { ...room, tmi: tmiClient });
    }
  }

  private emitToRoom<T>(socket: Socket, roomId: string, name: string, data: T) {
    socket.emit(name, data);
    socket.broadcast.to(roomId).emit(name, data);
  }
}
