import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { RoomController } from './controllers/RoomController';
import { RoomService } from './services/RoomService';
import { RoomEvent } from './events/RoomEvent';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const roomService = new RoomService();
const roomController = new RoomController(roomService);

io.on('connection', (socket) =>
{
    console.log(`Client connected: ${socket.id}`);

    socket.on(RoomEvent.CREATE_ROOM, (request) => roomController.createRoom(socket, request.data));
    socket.on(RoomEvent.JOIN_ROOM, (request) => roomController.joinRoom(socket, request.data));
    socket.on(RoomEvent.ROOM_MEMBERS, (roomId) => roomController.onHandleRoomMembersRequest(socket, roomId));

    socket.on(RoomEvent.ROOM_MESSAGE, (request) => roomController.onHandleChatMessage(socket, request.data));
    socket.on(RoomEvent.ROOM_PLAYER_OPTIONS, (request) => roomController.onHandlePlayerOptions(socket, request.data));
    socket.on(RoomEvent.ROOM_GAME_OPTIONS, (request) => roomController.onHandleGameOptions(socket, request.data));

    socket.on('disconnect', () => roomController.onHandleClientDisconnecting(socket));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () =>
{
    console.log(`Server is running on port ${PORT}`);
});