export class Player 
{
    constructor(
        public readonly id: string, // Socket ID    
        public readonly playerName: string,
        public readonly playerIdent: string,
    )
    {
    }

    public toJSON(): object
    {
        return {
            id: this.id,
            playerName: this.playerName,
            playerIdent: this.playerIdent
        };
    }
}