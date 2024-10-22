export enum RoomEvent 
{
    CREATE_ROOM = "createRoom",
    ROOM_CREATED = "roomCreated",
    JOIN_ROOM = "joinRoom",
    LIST_ROOMS = "listRooms",
    ROOM_JOINED = "roomJoined",
    ROOM_MESSAGE = "roomMessage",
    ROOM_MEMBERS = "roomMembers",
    ROOM_USER_LEFT = "roomUserLeft",
    ROOM_PLAYER_OPTIONS = "roomPlayerOptions",
    ROOM_PLAYER_OPTIONS_CHANGE_RECIEVED = "roomPlayerOptionsChangeRecieved",
    ROOM_GAME_OPTIONS = "roomGameOptions",
}

export enum RoomErrorEvent 
{
    CREATE_ROOM_ERROR = "createRoomError",
    JOIN_ROOM_ERROR = "joinRoomError",
    ROOM_MESSAGE_ERROR = "roomMessageError",
    ROOM_MEMBERS_ERROR = "roomMembersError",
}