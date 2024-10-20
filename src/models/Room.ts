export class Room
{
    private _clients: string[] = [];

    constructor(
        public readonly id: string,
        public readonly roomName: string,
        public readonly hostId: string,
        public readonly maxPlayers: number = 4
    )
    {
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
        return this._clients.length >= this.maxPlayers;
    }

    public getClientCount(): number
    {
        return this._clients.length;
    }

    public hasClient(clientId: string): boolean
    {
        return this.clients.includes(clientId);
    }

    public get clients(): ReadonlyArray<string>
    {
        return this._clients;
    }

    public toJSON(): object
    {
        return {
            id: this.id,
            roomName: this.roomName,
            hostId: this.hostId,
            maxPlayers: this.maxPlayers,
            clients: this.clients,
        };
    }
}
