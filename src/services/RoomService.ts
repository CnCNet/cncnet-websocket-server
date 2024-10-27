import { Socket } from 'socket.io';
import { Room, RoomData, RoomType } from '../models/Room';
import { PlayerService } from './PlayerService';
import { Player, PlayerData } from '../models/Player';

export interface CreateRoomSuccessResponse 
{
    room: RoomDataWithPlayers;
    host: PlayerData;
}

export interface RoomDataWithPlayers extends RoomData
{
    players: PlayerData[];
}


export interface JoinRoomSuccessResponse 
{
    room: RoomDataWithPlayers;
    host: PlayerData;
    player: PlayerData;
}

export interface GetRoomsResponse extends RoomData
{
    players: PlayerData[];
    host: PlayerData;
}


export class RoomService
{
    private rooms: Map<string, Room> = new Map();

    constructor(private playerService: PlayerService)
    {
    }

    public getGameRooms(): GetRoomsResponse[]
    {
        let roomResponses: GetRoomsResponse[] = [];
        Array.from(this.rooms.values()).map(room =>
        {
            // @ts-ignore
            const host = this.playerService.getPlayerById(room.data().hostId);
            if (host == null)   
            {
                console.log(`Host with id ${room.data().hostId} not found`);
                throw new Error(`Host with id ${room.data().hostId} not found`);
            }

            const players = this.playerService.getRoomPlayersByIds(room.clients);
            let response: GetRoomsResponse = {
                ...room.data(),
                players,
                host: host.data()
            }
            roomResponses.push(response);
        });

        return roomResponses;
    }

    public async createGameRoom(
        hostSocket: Socket,
        roomId: string,
        roomName: string,
        channelPassword: string,
        maxPlayers: number,
        roomType: RoomType
    ): Promise<CreateRoomSuccessResponse>
    {
        if (this.rooms.has(roomId))
        {
            console.log(`Room with id ${roomId} already exists`);
            throw new Error(`Room with id ${roomId} already exists`);
        }

        await hostSocket.join(hostSocket.id);

        const host = this.playerService.getPlayerById(hostSocket.id);
        if (host == null)
        {
            console.log(`Host with id ${hostSocket.id} not found`);
            throw new Error(`Host with id ${hostSocket.id} not found`);
        }

        let room = Room.createRoom(roomId, roomName, host.id, channelPassword, maxPlayers, roomType);
        this.rooms.set(roomId, room);

        const playersInRoom: PlayerData[] = this.playerService.getRoomPlayersByIds(room?.clients);

        let roomDataWithPlayers = { ...room.data(), players: playersInRoom };

        const successResponse: CreateRoomSuccessResponse = {
            room: roomDataWithPlayers,
            host: host.data()
        };

        return successResponse;
    }

    public async joinGameRoom(socket: Socket, roomId: string): Promise<JoinRoomSuccessResponse>
    {
        const room = this.getRoomById(roomId);
        if (room == null)
        {
            throw new Error(`Room with id ${roomId} not found`);
        }

        const player: Player | null = this.playerService.getPlayerById(socket.id);
        if (player == null)
        {
            throw new Error(`Player with id ${socket.id} not found`);
        }

        const host: Player | null = this.playerService.getPlayerById(room.data().hostId);
        if (host == null)
        {
            throw new Error(`Host with id ${room.data().hostId} not found`);
        }

        await socket.join(room.data().id);
        room.addClient(player.id);

        const playersInRoom: PlayerData[] = this.playerService.getRoomPlayersByIds(room?.clients);

        let roomDataWithPlayers = { ...room.data(), players: playersInRoom };

        const successResponse: JoinRoomSuccessResponse = {
            room: roomDataWithPlayers,
            host: host.data(),
            player: player.data()
        };

        return successResponse;
    }

    public async leaveRoom(socket: Socket, roomId: string): Promise<void>
    {
        const room = this.rooms.get(roomId);
        if (room == null)
        {
            throw new Error(`Room with id ${roomId} not found`);
        }

        room.removeClient(socket.id);
        await socket.leave(room.data().id);

        if (room.getClientCount() === 0)
        {
            this.rooms.delete(roomId);
        }
    }

    public isClientInRoom(roomId: string, clientId: string): boolean
    {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        return room.hasClient(clientId);
    }

    public getRoomById(roomId: string): Room | null
    {
        return this.rooms.get(roomId) || null;
    }

    public getClientsInRoom(roomId: string): ReadonlyArray<string> | null
    {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        return room.clients;
    }

    public getRoomsByClientId(clientId: string): Room[]
    {
        return Array.from(this.rooms.values()).filter(room => room.hasClient(clientId));
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