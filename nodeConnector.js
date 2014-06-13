var colors = require( "colors" );

module.exports = function(config, app) {
    

    // IO socket - rozhrani pro prenos zprav
    this.io = require('socket.io').listen(app, { log: false });

    // trida udrzujici informace o spojeni
    var NODE = require("./modules/node.js")(config );

    /**
     * Event cekajici na pripojeni jineho uzlu
     */
    io.sockets.on('connection', function(socket) {

        console.log ( "Connected socket " + socket.id );

        NODE.connectedToClient ( null, null, socket );
        socket.on ( "reconnect", NODE.call ( NODE.connectedToClient, "reconnect", socket ));
        socket.on('disconnect', NODE.call ( NODE.clientDisconnected, 'disconnect', socket ));
        socket.on('getLeaderAndClientInfo', NODE.call ( NODE.sendInfoToClient, 'getLeaderAndClientInfo', socket ));
        socket.on('joinRequest', NODE.call ( NODE.handleJoinRequest, 'joinRequest', socket ));
        socket.on('scanTopology', NODE.call ( NODE.handleScanTopology, 'scanTopology', socket ));
        socket.on('leaderRequest', NODE.call ( NODE.handleLeaderElection, 'leaderRequest', socket ));

        socket.on('error', function ( err ) {
            console.log ( "SocketIO Error: " + err.toString());
        });
    });
    
    // pokud je v configu nastavena adresa dalsiho uzlu - pripoj se k nemu
    if ( config.NODE2_PORT )
        NODE.connectToNode( config );

    return this;
}