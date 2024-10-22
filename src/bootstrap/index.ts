import { createServer } from 'http';
import express, { Express } from 'express';
import { Server } from 'socket.io';
import { RoomController } from '../controllers/RoomController';
import { RoomService } from '../services/RoomService';
import { RoomEvent } from '../events/RoomEvent';
import * as http from "node:http";
import { PlayerService } from 'src/services/PlayerService';
import { PlayerController } from 'src/controllers/PlayerController';
import { PlayerEvent } from 'src/events/PlayerEvent';

let app: Express;
let httpServer: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
let io: Server;

/**
 * Bootstrap the app
 */
export default function bootstrap()
{

    app = express();
    httpServer = createServer(app);
    io = new Server(httpServer);

    const roomService = new RoomService();
    const playerService = new PlayerService();
    const roomController = new RoomController(roomService, playerService);
    const playerController = new PlayerController(playerService);

    io.on('connection', (socket) =>
    {
        console.log(`Client connected: ${socket.id}`);

        // Rooms
        socket.on(RoomEvent.LIST_ROOMS, (request) => roomController.listRooms(socket, request.data));
        socket.on(RoomEvent.CREATE_ROOM, (request) => roomController.createRoom(socket, request.data));
        socket.on(RoomEvent.JOIN_ROOM, (request) => roomController.joinRoom(socket, request.data));
        socket.on(RoomEvent.ROOM_MEMBERS, (roomId) => roomController.broadcastRoomMembers(socket, roomId));

        socket.on(RoomEvent.ROOM_MESSAGE, (request) => roomController.broadcastRoomChatMessage(socket, request.data));
        socket.on(RoomEvent.ROOM_PLAYER_OPTIONS, (request) => roomController.broadcastRoomPlayerOptions(socket, request.data));
        socket.on(RoomEvent.ROOM_PLAYER_OPTIONS_CHANGE_RECIEVED, (request) => roomController.broadcastRoomPlayerOptionChangeRequest(socket, request.data));
        socket.on(RoomEvent.ROOM_GAME_OPTIONS, (request) => roomController.broadcastRoomGameOptions(socket, request.data));

        // Players joining the server, this will eventually be an auth flow
        socket.on(PlayerEvent.NEW_PLAYER, (request) => playerController.createPlayer(socket, request.data));

        socket.on('disconnect', () => roomController.onHandleClientDisconnecting(socket));
    });

    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () =>
    {
        console.log(`Server is running on port ${PORT}`);
    });

    return {
        roomService
    }
}

/**
 * Close the app correctly
 */
export async function close()
{
    await Promise.all([
        httpServer.close(),
        io.close()
    ]);
}