import { Socket } from 'socket.io';
import { Room } from '../models/Room';

export class RoomService
{
    private rooms: Map<string, Room> = new Map();

    public getRooms(): ReadonlyArray<Room>
    {
        return Array.from(this.rooms.values());
    }

    public createRoom(roomId: string, roomName: string, hostId: string, maxPlayers?: number): Room | null
    {
        if (this.rooms.has(roomId)) return null;
        const room = new Room(roomId, roomName, hostId, maxPlayers);

        room.addClient(hostId);

        this.rooms.set(roomId, room);
        return room;
    }

    public joinRoom(roomId: string, clientId: string): Room | null
    {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        room.addClient(clientId);
        return room;
    }

    public isClientInRoom(roomId: string, clientId: string): boolean
    {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        return room.hasClient(clientId);
    }

    public getClientsInRoom(roomId: string): ReadonlyArray<string> | null
    {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        return room.clients;
    }

    public getRoomsByClientId(clientId: string): ReadonlyArray<Room>
    {
        return Array.from(this.rooms.values()).filter(room => room.hasClient(clientId));
    }

    public leaveRoom(roomId: string, clientId: string): boolean
    {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.removeClient(clientId);
        if (room.getClientCount() === 0)
        {
            this.rooms.delete(roomId);
        }

        return true;
    }


    /**
     * Broadcasts a message to all clients in a room except the sender
     * @param socket 
     * @param roomId 
     * @param type 
     * @param data 
     * @returns 
     */
    public broadcastToRoom(socket: Socket, roomId: string, type: string, data: any): void
    {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const response = { type, data };
        socket.to(roomId).emit(type, response);
    }
}