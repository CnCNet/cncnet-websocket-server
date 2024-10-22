import { Player } from "../models/Player";

export class PlayerService
{
    private players: Map<string, Player> = new Map();

    public addPlayer(id: string, name: string, ident: string): Player | null
    {
        // Check if player already exists
        if (this.players.has(id) || this.players.has(ident) || this.players.has(name))
        {
            return null;
        }
        let newPlayer = new Player(id, name, ident);
        this.players.set(id, newPlayer);
        return newPlayer;
    }

    public getPlayerById(id: string): Player | null
    {
        return this.players.get(id) || null;
    }

    public getRoomPlayersByIds(socketIds: string[]): Player[]
    {
        return socketIds.map(id => this.players.get(id))
            .filter(player => player !== null) as Player[];
    }
}