import { PlayerService } from "../services/PlayerService";
import Joi from "joi";
import { emitError, emitSuccess } from "../response/EmitResponse";
import { Socket } from "socket.io";
import { PlayerErrorEvent, PlayerEvent } from "../events/PlayerEvent";

export interface CreatePlayerRequest 
{
    playerName: string;
    playerIdent: string;
}

export class PlayerController
{
    private playerService: PlayerService;

    constructor(playerService: PlayerService)
    {
        this.playerService = playerService;
    }

    /**
     * So we can keep track of player info like username, when they join a room
     * @param socket 
     * @param request 
     * @returns 
     */
    public createPlayer(socket: Socket, request: CreatePlayerRequest): void
    {
        const validator = Joi.object<CreatePlayerRequest>({
            playerName: Joi.string().required(),
            playerIdent: Joi.string().required(),
        });

        const { error, value } = validator.validate(request);
        if (error)
        {
            return emitError(socket, {
                status: "validation",
                event: PlayerErrorEvent.NEW_PLAYER_ERROR,
                message: `Invalid player request: ${error.details[0].message}`
            });
        }

        const { playerIdent, playerName } = value as CreatePlayerRequest;
        const player = this.playerService.addPlayer(socket.id, playerName, playerIdent);

        if (player == null)
        {
            return emitError(socket, {
                status: "validation",
                event: PlayerErrorEvent.NEW_PLAYER_ERROR,
                message: `Player ${request.playerName} already exists`
            });
        }

        console.log("Player created: " + player.toJSON());

        return emitSuccess(socket, {
            event: PlayerEvent.NEW_PLAYER,
            data: player.toJSON()
        });
    }
}
