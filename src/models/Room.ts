import { Player, PlayerData } from "./Player";

export interface RoomData
{
    id: string;
    roomName: string;
    roomPassword: string;
    hostId: string;
    maxPlayers: number;
    roomType: RoomType;
}

export enum RoomType
{
    GameRoom,
    ChatRoom
}

export class Room
{
    private _clients: string[] = [];

    private _id!: string;
    private _roomName!: string;
    private roomPassword!: string;
    private _hostId!: string;
    private _maxPlayers!: number;
    private _roomType!: RoomType;

    constructor()
    {

    }

    public static createChatRoom(
        id: string,
        roomName: string,
        hostId: string
    ): Room
    {
        const room = new Room();
        room._id = id;
        room._roomName = roomName;
        room._roomType = RoomType.ChatRoom;
        room.addClient(hostId);
        return room;
    }

    public static createRoom(
        id: string,
        roomName: string,
        hostId: string,
        channelKey: string,
        maxPlayers: number,
        roomType: RoomType
    ): Room
    {
        const room = new Room();
        room._id = id;
        room._roomName = roomName;
        room._hostId = hostId;
        room.roomPassword = channelKey;
        room._maxPlayers = maxPlayers;
        room._roomType = roomType;

        room.addClient(hostId);

        return room;
    }

    public addClient(clientId: string): Room
    {
        if (!this.clients.includes(clientId))
        {
            this._clients.push(clientId);
        }
        return this;
    }

    public removeClient(clientId: string): void
    {
        this._clients = this._clients.filter(id => id !== clientId);
    }

    public isRoomFull(): boolean
    {
        if (this._maxPlayers != null)
        {
            return this._clients.length >= this._maxPlayers;
        }
        return false;
    }

    public getClientCount(): number
    {
        return this._clients.length;
    }

    public hasClient(clientId: string): boolean
    {
        return this.clients.includes(clientId);
    }

    public get clients(): string[]
    {
        return this._clients;
    }

    public data(): RoomData
    {
        return {
            id: this._id,
            roomName: this._roomName,
            roomPassword: this.roomPassword,
            hostId: this._hostId,
            maxPlayers: this._maxPlayers,
            roomType: this._roomType
        };
    }

    public get id(): string { return this._id; }
    public get roomName(): string { return this._roomName; }
    public get hostId(): string { return this._hostId; }
    public get maxPlayers(): number { return this._maxPlayers; }
    public get roomType(): RoomType { return this._roomType; }
}