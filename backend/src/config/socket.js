let io;

const initSocket = (server) => {
    const { Server } = require("socket.io");

    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "*",
            methods: ["GET", "POST", "PUT"]
        }
    });

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);

        socket.on("joinRoom", (roomId) => {
            if (roomId) {
                const roomStr = roomId.toString().trim();
                socket.join(roomStr);
                console.log(`Socket ${socket.id} joined room: ${roomStr}`);
            }
        });

        socket.on("leaveRoom", (roomId) => {
            if (roomId) {
                const roomStr = roomId.toString().trim();
                socket.leave(roomStr);
                console.log(`Socket ${socket.id} left room: ${roomStr}`);
            }
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) throw new Error("Socket not initialized");
    return io;
};
//module export
module.exports = { initSocket, getIO };