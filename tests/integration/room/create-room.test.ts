import ioc from "socket.io-client";
import bootstrap, { close } from "../../../src/bootstrap";
import {Socket} from "socket.io-client";
import {RoomErrorEvent, RoomEvent} from "../../../src/events/RoomEvent";
import {CreateRoomRequest} from "../../../src/controllers/RoomController";
import {RoomService} from "../../../src/services/RoomService";

async function connectClient(): Promise<Socket> {
    return new Promise((resolve, reject) => {
        const client = ioc('http://localhost:3000');
        client.on('connect', () => resolve(client))
        setTimeout(() => {
            reject()
        }, 1000)
    });
}

describe('create room', () => {
    let roomService: RoomService;

    beforeAll(() => {
        // run server
        ({ roomService } = bootstrap());
    })

    afterAll(async () => {
        // close server
        await close()
    })

    test('test create empty room', (done) => {
        connectClient().then((client) => {
            // try to create a room
            client.emit(RoomEvent.CREATE_ROOM, {
                data: {
                    id: 'test-01',
                    roomName: 'Test 01',
                    maxPlayers: 8
                } as CreateRoomRequest
            })

            client.on(RoomEvent.ROOM_CREATED, (e) => {
                //console.log(e)
                expect(e.event).toBe(RoomEvent.ROOM_CREATED)
                expect(e.data.id).toBe('test-01')
                expect(e.data.roomName).toBe('Test 01')
                expect(e.data.maxPlayers).toBe(8)

                client.close()
                done();
            })
        })
    })

    test('test create room with invalid request', (done) => {

        connectClient().then((client) => {
            // try to create a room with an invalid body
            client.emit(RoomEvent.CREATE_ROOM, {
                data: {
                    identifier: 'test-03',
                    name: 'Test 03',
                    max: 8
                }
            })

            // listen for response
            client.on(RoomErrorEvent.CREATE_ROOM_ERROR, (e) => {
                //console.log(e)
                expect(e.message.startsWith('Invalid room options:')).toBeTruthy()

                client.close()
                done();
            })
        })
    })

    test('test create room when already exists', (done) => {

        connectClient().then((client) => {
            // fake create a room
            roomService.createRoom('test-02', 'Test 02', 'fakeHostId', 8);

            // try to create a room with a used id
            client.emit(RoomEvent.CREATE_ROOM, {
                data: {
                    id: 'test-02',
                    roomName: 'Test 02',
                    maxPlayers: 8
                } as CreateRoomRequest
            })

            // listen for response
            client.on(RoomErrorEvent.CREATE_ROOM_ERROR, (e) => {
                //console.log(e)
                expect(e.message).toBe(`Room test-02 already exists`)

                client.close()
                done();
            })
        })
    })
})