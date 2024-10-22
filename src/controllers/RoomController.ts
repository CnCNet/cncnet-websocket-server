import { Socket } from 'socket.io';
import { RoomService } from '../services/RoomService';
import Joi from "joi";
import { emitError, emitSuccess, EmitSuccessResponse, emitSuccessToRoom } from '../response/EmitResponse';
import { RoomErrorEvent, RoomEvent } from '../events/RoomEvent';
import { PlayerService } from '../services/PlayerService';
import { Player } from '../models/Player';

export interface ListRoomRequest 
{
    channel: string; // @TODO: think #cncnet-yr, #cncnet-dta, etc.
}

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

export class RoomController
{
    constructor(private roomService: RoomService, private playerService: PlayerService)
    {
    }

    public listRooms(socket: Socket, request: ListRoomRequest): void
    {
        const rooms = this.roomService.getRooms();
        const roomData = rooms.map(room =>
        {
            const host = this.playerService.getPlayerById(room.hostId);
            const players = this.playerService.getRoomPlayersByIds(room.clients);
            return { ...room.toJSON(), players, host };
        });

        console.log("List Rooms Response: ", roomData);
        return emitSuccess(socket, {
            event: RoomEvent.LIST_ROOMS,
            data: roomData
        });
    }

    public createRoom(socket: Socket, request: CreateRoomRequest): void
    {
        const validator = Joi.object<CreateRoomRequest>({
            id: Joi.string().required(),
            roomName: Joi.string().required(),
            maxPlayers: Joi.number().integer().min(1).max(8).optional(),
        });

        const { error, value } = validator.validate(request);
        if (error)
        {
            return emitError(socket, {
                status: "validation",
                event: RoomErrorEvent.CREATE_ROOM_ERROR,
                message: `Invalid room options: ${error.details[0].message}`
            });
        }

        const { id, roomName, maxPlayers } = value as CreateRoomRequest;
        let room = this.roomService.createRoom(id, roomName, socket.id, maxPlayers);

        if (room)
        {
            socket.join(id);
            room = room.addClient(socket.id);

            const host = this.playerService.getPlayerById(socket.id);
            const players = this.playerService.getRoomPlayersByIds(room?.clients);
            const successResponse = { ...room.toJSON(), players: players, host: host };


            console.log("Create Room Response: ", successResponse);

            return emitSuccess(socket, {
                event: RoomEvent.ROOM_CREATED,
                data: successResponse
            });
        }
        else
        {
            return emitError(socket, {
                status: "validation",
                event: RoomErrorEvent.CREATE_ROOM_ERROR,
                message: `Room ${id} already exists`
            });
        }
    }

    public joinRoom(socket: Socket, request: JoinRoomRequest): void 
    {
        const validator = Joi.object<JoinRoomRequest>({
            id: Joi.string().required(),
        });

        const { error, value } = validator.validate(request);
        if (error)
        {
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.JOIN_ROOM_ERROR,
                message: `Invalid join room request: ${error.details[0].message}`
            });
        }

        const { id } = value as JoinRoomRequest;
        const room = this.roomService.joinRoom(id, socket.id);

        if (room !== null)
        {
            socket.join(id);

            const player: Player | null = this.playerService.getPlayerById(socket.id);

            const host: Player | null = this.playerService.getPlayerById(room.hostId);
            const players: Player[] = this.playerService.getRoomPlayersByIds(room?.clients);
            const roomWithPlayers = { ...room.toJSON(), players, host };

            const successResponse: EmitSuccessResponse = {
                event: RoomEvent.ROOM_JOINED,
                data: {
                    room: roomWithPlayers,
                    player: player?.toJSON(),
                }
            };

            console.log("Player joined", player);

            // Notify all clients in the room that a new user has joined
            emitSuccessToRoom(id, socket, successResponse)

            // Notify the client that they have joined the room
            return emitSuccess(socket, successResponse);
        }
        else
        {
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.JOIN_ROOM_ERROR,
                message: `Room ${id} does not exist`
            });
        }
    }

    public broadcastRoomChatMessage(socket: Socket, data: { roomId: string, message: string }): void
    {
        const { roomId, message } = data;

        if (!this.roomService.isClientInRoom(roomId, socket.id))
        {
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.ROOM_MESSAGE_ERROR,
                message: `You are not in room ${roomId}`
            });
        }

        // Player who sent the message
        const player = this.playerService.getPlayerById(socket.id);
        if (player == null)
            return;

        this.roomService.broadcastToRoom(socket, roomId, RoomEvent.ROOM_MESSAGE, { sender: socket.id, message, roomId, player: player.toJSON() });
    }

    public broadcastRoomPlayerOptions(socket: Socket, data: { roomId: string, message: string }): void
    {
        const { roomId, message } = data;

        if (!this.roomService.isClientInRoom(roomId, socket.id))
        {
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.ROOM_MESSAGE_ERROR,
                message: `You are not in room ${roomId}`
            });
        }

        this.roomService.broadcastToRoom(socket, roomId, RoomEvent.ROOM_PLAYER_OPTIONS, { sender: socket.id, message, roomId });
    }

    public broadcastRoomPlayerOptionChangeRequest(socket: Socket, data: { roomId: string, message: string }): void
    {
        const { roomId, message } = data;

        if (!this.roomService.isClientInRoom(roomId, socket.id))
        {
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.ROOM_MESSAGE_ERROR,
                message: `You are not in room ${roomId}`
            });
        }

        // Get player who requested the change
        const player = this.playerService.getPlayerById(socket.id);
        if (player == null)
            return;

        // Although we could limit this to the room host limit this to the host, 
        // we'll broadcast it to all clients for now and let the client check for now.
        this.roomService.broadcastToRoom(socket, roomId, RoomEvent.ROOM_PLAYER_OPTIONS_CHANGE_RECIEVED, {
            sender: socket.id,
            message,
            roomId,
            player: player.toJSON()
        });
    }

    public broadcastRoomGameOptions(socket: Socket, data: { roomId: string, message: string }): void
    {
        const { roomId, message } = data;

        if (!this.roomService.isClientInRoom(roomId, socket.id))
        {
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.ROOM_MESSAGE_ERROR,
                message: `You are not in room ${roomId}`
            });
        }

        this.roomService.broadcastToRoom(socket, roomId, RoomEvent.ROOM_GAME_OPTIONS, { sender: socket.id, message, roomId });
    }

    public broadcastRoomMembers(socket: Socket, roomId: string): void
    {
        const clients = this.roomService.getClientsInRoom(roomId);
        if (clients === null)
        {
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.ROOM_MEMBERS_ERROR,
                message: `Room ${roomId} does not exist`
            });
        }

        return emitSuccess(socket, {
            event: RoomEvent.ROOM_MEMBERS,
            data: {
                roomId: roomId,
                clients: clients
            }
        });
    }

    public onHandleClientDisconnecting(socket: Socket): void
    {
        const rooms = this.roomService.getRoomsByClientId(socket.id);
        rooms.forEach(({ id }) =>
        {
            this.roomService.leaveRoom(id, socket.id);

            // Notify all clients in the room that the user has left
            emitSuccessToRoom(id, socket, {
                event: RoomEvent.ROOM_USER_LEFT,
                data: {
                    playerId: socket.id,
                    roomId: id
                }
            });
        });
    }
}
