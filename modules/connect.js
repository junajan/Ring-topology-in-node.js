function ConnectStore ( g ) {
    console.log ( "Initializing Connection cache" );
    
    var cacheById = {}
    var cacheByRoomId = {}
    var cacheBySocketId = {}
    
    this.addUser = function ( socket ) {
//        
//        console.log ( " ===================== ");
//        console.dir ( socket.user );
//        console.dir ( socket.code );
        
        cacheById[socket.user.id] = socket;
    }
    
    this.connectToRoom = function ( roomId, socket ) {
        
        if ( ! cacheByRoomId[roomId] )
            cacheByRoomId[roomId] = {};
        
        if ( cacheByRoomId[socket.id] )
            delete cacheByRoomId[cacheBySocketId[socket.id]][socket.id];
            
        cacheByRoomId[roomId][socket.id] = socket;
        cacheBySocketId[socket.id] = roomId;
    }
    
    this.getSocketsInRoom = function ( roomId ) {
        
        if ( ! cacheByRoomId[roomId] )
            return {};
        
//        console.dir ( cacheByRoomId[roomId] );
        
        return cacheByRoomId[roomId];
    }
    
    this.listCache = function () {
        
        console.dir ( cacheById );
    }
    
    this.removeUser = function ( id ) {
        
        delete cacheById[id];
        return true;
    }
    
    this.removeUserBySock = function ( socket ) {
        
        return this.removeUser ( socket.user.id );
    }
    
    
    return this;
}

ConnectStore.instance = null;
module.exports = function ( DB ) {
    
    if ( ConnectStore.instance == null ) 
        ConnectStore.instance = new ConnectStore ( DB );

    return ConnectStore.instance;
}