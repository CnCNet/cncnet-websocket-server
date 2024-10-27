import { Socket, Server } from 'socket.io';
import { GetRoomsResponse, JoinRoomSuccessResponse, RoomDataWithPlayers, RoomService, UserLeftResponse } from '../services/RoomService';
import Joi from "joi";
import { emitError, emitSuccess, EmitSuccessResponse, emitSuccessToRoom } from '../response/EmitResponse';
import { RoomErrorEvent, RoomEvent } from '../events/RoomEvent';
import { PlayerService } from '../services/PlayerService';
import { Player, PlayerData } from '../models/Player';
import { channel } from 'diagnostics_channel';
import { Room, RoomData, RoomType } from '../models/Room';
import { join } from 'path';

export interface ListRoomRequest 
{
    channel: string; // @TODO: think #cncnet-yr, #cncnet-dta, etc.
}

export interface CreateRoomRequest
{
    id: string;
    roomName: string;
    roomPassword?: string;
    maxPlayers?: number;
}

export interface JoinRoomRequest 
{
    id: string;
}

export class RoomController
{
    constructor(
        private roomService: RoomService,
        private playerService: PlayerService)
    {
    }

    public async joinMainChat(socket: Socket, chatRoomId: string, chatRoomName: string): Promise<void>
    {
        // Create chat rooms if it doesn't exist
        let room = this.roomService.getRoomById(chatRoomId);
        if (room == null)
        {
            await this.handleCreateRoomRequest(socket, chatRoomId, chatRoomName, 5000, chatRoomId, RoomType.ChatRoom);
        }

        return this.joinRoom(socket, { id: chatRoomId });
    }

    private async handleCreateRoomRequest(
        socket: Socket,
        id: string,
        roomName: string,
        maxPlayers: number,
        roomPassword: string,
        roomType: RoomType
    ): Promise<void>
    {
        let response = await this.roomService.createGameRoom(
            socket,
            id,
            roomName,
            roomPassword,
            maxPlayers ?? 4,
            roomType
        );

        if (response)
        {
            console.log("Room created: ", response);
            return emitSuccess(socket, {
                event: RoomEvent.ROOM_CREATED,
                data: response
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

    /**
     * 
     * @param socket 
     * @param request: @see CreateRoomRequest
     * @returns 
     */
    public async createRoom(socket: Socket, request: CreateRoomRequest): Promise<void>
    {
        try
        {
            console.log("Create Room Request: ", request);

            const validator = Joi.object<CreateRoomRequest>({
                id: Joi.string().required(),
                roomName: Joi.string().required(),
                roomPassword: Joi.string().optional(),
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

            const { id, roomName, maxPlayers, roomPassword } = value as CreateRoomRequest;
            await this.handleCreateRoomRequest(
                socket,
                id,
                roomName,
                maxPlayers ?? 4,
                roomPassword ?? "",
                RoomType.GameRoom
            );
        }
        catch (error)
        {
            console.log("Error creating room: ", error);
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.CREATE_ROOM_ERROR,
                message: `An error occurred while creating the room`
            });
        }
    }

    public async joinRoom(socket: Socket, request: JoinRoomRequest): Promise<void> 
    {
        try
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
            const response = await this.roomService.joinGameRoom(socket, id);

            if (response)
            {
                emitSuccessToRoom(id, socket, {
                    event: RoomEvent.ROOM_JOINED,
                    data: response
                });

                return emitSuccess(socket, {
                    event: RoomEvent.ROOM_JOINED,
                    data: response
                });
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
        catch (error)
        {
            console.log("Error joining room: ", error);
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.JOIN_ROOM_ERROR,
                message: `An error occurred while joining the room`
            });
        }
    }

    public listRooms(socket: Socket, request: ListRoomRequest): void
    {
        try
        {
            const rooms = this.roomService.getGameRooms();

            return emitSuccess(socket, {
                event: RoomEvent.LIST_ROOMS,
                data: rooms
            });
        }
        catch (error)
        {
            console.log("Error listing rooms: ", error);
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.LIST_ROOM_ERROR,
                message: `An error occurred while listing the rooms`
            });
        }
    }

    public broadcastRoomChatMessage(socket: Socket, data: { roomId: string, message: string }): void
    {
        try
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
            {
                emitError(socket, {
                    status: "error",
                    event: RoomErrorEvent.ROOM_MESSAGE_ERROR,
                    message: `You are not in room ${roomId}`
                });
                return;
            }

            this.roomService.broadcastToRoom(socket, roomId,
                RoomEvent.ROOM_MESSAGE, {
                sender: socket.id,
                message: message,
                roomId: roomId,
                player: player.data()
            });
        }
        catch (error)
        {
            console.log("Error broadcasting room chat message: ", error);
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.ROOM_MESSAGE_ERROR,
                message: `An error occurred while broadcasting the message`
            });
        }
    }

    public broadcastRoomPlayerOptions(socket: Socket, data: { roomId: string, message: string }): void
    {
        try
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
        catch (error)
        {
            console.log("Error broadcasting room player options: ", error);
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.ROOM_MESSAGE_ERROR,
                message: `An error occurred while broadcasting the message`
            });
        }
    }

    public broadcastRoomPlayerOptionChangeRequest(socket: Socket, data: { roomId: string, message: string }): void
    {
        try
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
                player: player.data()
            });
        }
        catch (error)
        {
            console.log("Error broadcasting room player option change request: ", error);
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.ROOM_MESSAGE_ERROR,
                message: `An error occurred while broadcasting the message`
            });
        }
    }

    public broadcastRoomGameOptions(socket: Socket, data: { roomId: string, message: string }): void
    {
        try
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
        catch (error)
        {
            console.log("Error broadcasting room game options: ", error);
            return emitError(socket, {
                status: "error",
                event: RoomErrorEvent.ROOM_MESSAGE_ERROR,
                message: `An error occurred while broadcasting the message`
            });
        }
    }

    public async onHandleClientDisconnecting(socket: Socket): Promise<void>
    {
        try
        {
            const rooms = this.roomService.getRoomsByClientId(socket.id);

            for (const { id } of rooms)
            {
                try
                {
                    // Await the asynchronous call to leaveRoom properly.
                    await this.roomService.leaveRoom(socket, id);

                    const room = this.roomService.getRoomById(id);
                    const players = this.playerService.getRoomPlayersByIds(room?.clients ?? []);
                    const player = this.playerService.getPlayerById(socket.id)?.data();

                    if (room)
                    {
                        let roomWithPlayers: RoomDataWithPlayers = {
                            ...room.data(),
                            players,
                        };

                        // Notify all clients in the room that the user has left
                        emitSuccessToRoom(id, socket, {
                            event: RoomEvent.ROOM_USER_LEFT,
                            data: {
                                room: roomWithPlayers,
                                player: player
                            }
                        });
                    }
                }
                catch (error)
                {
                    console.log("Error leaving room: ", error);
                }
            }
        }
        catch (error)
        {
            console.log("Error leaving room: ", error);
        }
    }
}
