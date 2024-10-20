import { Socket } from 'socket.io';
import { RoomService } from '../services/RoomService';
import Joi from "joi";
import { emitError, emitSuccess } from '../response/EmitResponse';
import { RoomErrorEvent, RoomEvent } from '../events/RoomEvent';

export interface CreateRoomRequest
{
    id: string;
    roomName: string;
    maxPlayers?: number;
}

export interface JoinRoomRequest 
{
    id: string;
}

export const createRoomSchema = Joi.object<CreateRoomRequest>({
    id: Joi.string().required(),
    roomName: Joi.string().required(),
    maxPlayers: Joi.number().integer().min(1).max(8).optional(),
});

export const joinRoomSchema = Joi.object<JoinRoomRequest>({
    id: Joi.string().required(),
});

export class RoomController
{
    private roomService: RoomService;

    constructor(roomService: RoomService)
    {
        this.roomService = roomService;
    }

    public createRoom(socket: Socket, request: CreateRoomRequest): void
    {
        const { error, value } = createRoomSchema.validate(request);
        if (error)
        {
            return emitError(socket, "validation", RoomErrorEvent.CREATE_ROOM_ERROR, `Invalid room options: ${error.details[0].message}`);
        }

        const { id, roomName, maxPlayers } = value as CreateRoomRequest;
        let room = this.roomService.createRoom(id, roomName, socket.id, maxPlayers);

        if (room)
        {
            room = room.addClient(socket.id);
            socket.join(id);
            return emitSuccess(socket, RoomEvent.ROOM_CREATED, room.toJSON());
        }
        else
        {
            return emitError(socket, "validation", RoomErrorEvent.CREATE_ROOM_ERROR, `Room ${id} already exists`);
        }
    }

    public joinRoom(socket: Socket, request: JoinRoomRequest): void 
    {
        const { error, value } = joinRoomSchema.validate(request);
        if (error)
        {
            return emitError(
                socket,
                "error",
                RoomErrorEvent.JOIN_ROOM_ERROR,
                `Invalid join room request: ${error.details[0].message}`
            );
        }

        const { id } = value as JoinRoomRequest;
        const room = this.roomService.joinRoom(id, socket.id);

        if (room !== null)
        {
            socket.join(id);

            // Notify all clients in the room that a new user has joined
            socket.to(id).emit(RoomEvent.ROOM_JOINED, socket.id);

            // Notify the client that they have joined the room
            return emitSuccess(socket, RoomEvent.ROOM_JOINED, { id: room.id, hostId: room.hostId });
        }
        else
        {
            return emitError(socket, "error", "joinRoomError", `Room ${id} does not exist`);
        }
    }

    public onHandleChatMessage(socket: Socket, data: { roomId: string, message: string }): void
    {
        const { roomId, message } = data;

        if (!this.roomService.isClientInRoom(roomId, socket.id))
        {
            return emitError(socket, "error", RoomErrorEvent.ROOM_MESSAGE_ERROR, `You are not part of room ${roomId}`);
        }

        this.roomService.broadcastToRoom(socket, roomId, RoomEvent.ROOM_MESSAGE, { sender: socket.id, message, roomId });
    }

    public onHandlePlayerOptions(socket: Socket, data: { roomId: string, message: string }): void
    {
        const { roomId, message } = data;

        if (!this.roomService.isClientInRoom(roomId, socket.id))
        {
            return emitError(socket, "error", RoomErrorEvent.ROOM_MESSAGE_ERROR, `You are not part of room ${roomId}`);
        }

        this.roomService.broadcastToRoom(socket, roomId, RoomEvent.ROOM_PLAYER_OPTIONS, { sender: socket.id, message, roomId });
    }

    public onHandleGameOptions(socket: Socket, data: { roomId: string, message: string }): void    
    {
        const { roomId, message } = data;

        if (!this.roomService.isClientInRoom(roomId, socket.id))
        {
            return emitError(socket, "error", RoomErrorEvent.ROOM_MESSAGE_ERROR, `You are not part of room ${roomId}`);
        }

        this.roomService.broadcastToRoom(socket, roomId, RoomEvent.ROOM_GAME_OPTIONS, { sender: socket.id, message, roomId });
    }

    public onHandleRoomMembersRequest(socket: Socket, roomId: string): void
    {
        const clients = this.roomService.getClientsInRoom(roomId);
        if (!clients)
        {
            return emitError(socket, "error", RoomErrorEvent.ROOM_MESSAGE_ERROR, `Room ${roomId} does not exist`);
        }

        return emitSuccess(socket, RoomEvent.ROOM_MEMBERS, {
            roomId: roomId,
            clients: clients
        });
    }

    public onHandleClientDisconnecting(socket: Socket): void
    {
        const rooms = this.roomService.getRoomsByClientId(socket.id);
        rooms.forEach(({ id }) =>
        {
            this.roomService.leaveRoom(id, socket.id);

            // Notify all clients in the room that the user has left
            socket.to(id).emit("userLeft", { clientId: socket.id, roomId: id });
        });

        // Notify the client that disconnected that they have left all rooms
        return emitSuccess(socket, "userLeft", {
            clientId: socket.id
        });
    }
}
