const rooms = [];  // Define rooms as a global variable

getRandomArrayEntry = function () {  // Define the function as a global function
    if (rooms.length === 0) return null;  // Handle the case where rooms is empty
    return rooms[Math.floor(Math.random() * rooms.length)];
};

module.export = {
    rooms, getRandomArrayEntry
}