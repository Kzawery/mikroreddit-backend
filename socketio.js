const io = require("socket.io-client");
export default io(`ws://localhost:3000`, {
    'reconnection': true,
    'reconnectionDelay': 500,
    'reconnectionAttempts': 10
});