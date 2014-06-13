var colors = require( "colors" );
/**
 * Connector will handle and store connected socket.io clients
 * @param {[type]} g [description]
 */
function Connector ( g ) {

    var C_LOG = true;
    var cons = {}

    this.garbageCollectorInterval = 3000;
    this.garbageCollectorId       = null;

    /**
     * Init connector
     */
    this.init = function () {
        this.log ( "Initializing Connection cache" );

        this.runGarbageUserCollector();
    }

    /**
     * Call funct for calling socket events
     * @param  {function} f      Function to call
     * @param  {bool} auth       Is needed for authorization
     * @param  {string} evName   Event name
     * @return {function}        function which will call event
     */ 
    this.call = function ( socket, f, auth, evName, testConnection ) {

        obj = this;
        if ( _.isUndefined ( testConnection ) )
            testConnection = true;

        /**
         * Call function of event
         * @param  {object}   d  Object with data
         * @param  {Function} cb callback function
         */
        return function(d, cb) {

            try { 

                obj.log ( evName, d );

                if (_.isFunction(d)) {
                    cb = d;
                    d = null;
                }

                obj.logEvent(evName, d);

                // pokud neni pripojen a event je jen pro pripojene, vrat a reconnect
                if ( testConnection && ! obj.isConnected ( socket ) ) 
                    return obj.sendReconnect ( socket, {
                        evName: evName,
                        data: d
                    });
                
                if ( auth && ( ! socket.user || ! socket.user.id )) {
                    obj.log ( "Unauthorized request - " + evName );
                    return false;
                }

                if ( ! _.isFunction ( cb ) )
                    cb = function () {}

                if (_.isFunction(f))
                    f(d, cb, socket, evName );

            } catch ( e ) {

                console.log ( ("ERROR: " + e ).red );
            }
        }
    }

    /**
     * Will log to console
     * @param  {string} str String to log
     * @return {bool}   False
     */
    log = this.log = function ( str ) {
        
        if (C_LOG)
            console.log("CONNECTOR: " + str);
        return false;
    }

    /**
     * Log event
     * @param  {string} evName Event name
     * @param  {Object} data   Data
     * @return {bool}          False
     */
    this.logEvent = function ( evName, data ) {
        return this.log ( "Event("+evName+") called with data: "+ JSON.stringify ( data ) );
    }

    /**
     * Do garbage work
     * @param  {Object} obj Calling object
     * @return {Bool}       True
     */
    this.garbageCollector = function ( obj )  {
        obj.garbageCollector.count = ++obj.garbageCollector.count || 1;
        // obj.log ( "Garbage collector " + obj.garbageCollector.count );
        return true;
    }

    /**
     * Will start garbage collector and remove dead users
     */
    this.runGarbageUserCollector = function () {
        this.log ( "Starting garbage collector." );
        this.garbageCollectorId = setInterval ( this.garbageCollector, this.garbageCollectorInterval, this );
    }

    /**
     * Is socket connected to connector?
     * @param  {socket}   socket Socket
     * @return {Boolean}  True or false
     */
    isConnected = this.isConnected = function ( socket ) {

        return ! _.isUndefined ( socket.user );
    }

    this.sendReconnect = function ( socket, data ) {
        if ( data && ! _.isUndefined ( data.evName ))
            this.log("Client not connected for " + data.evName + " ... reconnecting");
        else
            this.log ( "Sending connect request to client" );

        console.log ( " ===================== " );
        socket.emit("reconnectClient", data );
    }

    /**
     * Is socket stored in connect list?
     * @param  {socket}  socket Socket
     * @return {Boolean}        is stored
     */
    this.isSocketStored = function ( socket ) {
        if ( ! _.isString ( socket )) 
            socket = socket.id;

        return ! _.isUndefined ( socket );
    }

    /**
     * Connect socket
     * @param  {Object}   data   Data for connection
     * @param  {Function} cb     Callback func
     * @param  {Object}   socket Socket
     */
    this.connectSocket = function(data, cb, socket) {
        // log("Connecting client with data: " + JSON.stringify(data));

        if (isConnected(socket))
            return cb(socket.user);

        user = {
            id: 0 // not logged
        }
        socket.dead = false;
        
        // socket zaregistruj jako anonymni
        addSocketToList ( cb, socket, user, null );
    }

    /**
     * Disconnect socket, remove from list
     * @param  {Object}   data   null
     * @param  {Function} cb     null
     * @param  {object}   socket Socket to disconnect
     */
    this.disconnect = function ( data, cb, socket ) {
        this.log ( "disconnecting socket with id = " + socket.id  );
        delete cons[socket.id];
    }

    addSocketToList = this.addSocketToList = function ( cb, socket, user, code ) {

        socket.user = user;
        socket.code = code;

        cons[socket.id] = socket;
        
        if ( cb )
            cb ( 1 );
    }

    this.listConnections = function () {

        for ( i in cons )
            console.log ( "Connected ID: " + cons[i].id + " with user ID: " + cons[i].user.id );
    }

    this.init();    
    return this;
}

Connector.instance = null;
module.exports = function ( DB ) {
    
    if ( Connector.instance == null ) 
        Connector.instance = new Connector ( DB );

    return Connector.instance;
}