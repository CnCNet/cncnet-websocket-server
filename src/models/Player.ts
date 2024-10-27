export interface PlayerData 
{
    id: string;
    playerName: string;
    playerIdent: string;
}

export class Player 
{
    constructor(
        public readonly id: string, // Socket ID    
        public readonly playerName: string,
        public readonly playerIdent: string,
    )
    {
    }

    public data(): PlayerData
    {
        return {
            id: this.id,
            playerName: this.playerName,
            playerIdent: this.playerIdent
        };
    }
}