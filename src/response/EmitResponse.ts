import { Socket } from "socket.io";

interface EmitSuccessResponse<T = any>
{
    event: string;
    message?: string;
    data?: T;
}

export function emitSuccess<T = any>(
    socket: Socket,
    event: string,
    data?: T,
): void
{
    const response: EmitSuccessResponse<T> = { event, data };
    socket.emit(event, response);
}

interface EmitErrorResponse<T = any>
{
    status: "error" | "validation";
    event: string;
    message?: string;
}

export function emitError<T = any>(
    socket: Socket,
    status: "error" | "validation",
    event: string,
    message?: string,
): void
{
    const response: EmitErrorResponse<T> = { status, event, message };
    socket.emit(event, response);
}
