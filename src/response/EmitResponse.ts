import { Socket } from "socket.io";

export interface EmitSuccessResponse
{
    event: string;
    data?: any;
}

export function emitSuccess(socket: Socket, response: EmitSuccessResponse): void
{
    const { event, data } = response;
    socket.emit(event, { data });
}

export function emitSuccessToRoom(roomId: string, socket: Socket, response: EmitSuccessResponse): void
{
    const { event, data } = response;
    socket.to(roomId).emit(event, { data });
}

export interface EmitErrorResponse
{
    status: "error" | "validation";
    event: string;
    message?: string;
}

export function emitError(socket: Socket, error: EmitErrorResponse): void
{
    const { event, status, message } = error;
    socket.emit(event, { status, message });
}
