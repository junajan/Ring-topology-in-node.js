var colors = require( "colors" );
var LOG_EVENTS = true;
var LOG = true;
var LOG_EDGES = true;


function t () {

    d = new Date();

    hour = ("0" + d.getHours()).slice(-2);
    min = ("0" + d.getMinutes()).slice(-2);
    sec = ("0" + d.getSeconds()).slice(-2);
    milli = (d.getMilliseconds()+"000").substring(0,3);

    return "["+hour+":"+ min + ":"+ sec +"." + milli +"] ";
}

function logMessage ( text ) {

    if ( LOG )
        console.log ( t().white+text );
}

function logEvent ( evName, d ) {

    if ( LOG_EVENTS )
        logMessage ( "EVENT: "+ evName + " | DATA: " + JSON.stringify ( d ));
}

/**
 * Node will process communication to join ring topology
 */
function Node ( config ) {

    ioClient = require("socket.io-client");
    globalConfig = config;

    // info o topologii
    TOPOLOGY_INFO = null;
    TOPOLOGY_REQUEST = false;

    // ulozime si defaultni config
    defaultConfig =JSON.parse(JSON.stringify(globalConfig));

    NODE_OBJECT = this;
    CLIENT_SOCK = null;

    this.UID = UID = config.UID;
    LEFT_NODE  = null;
    RIGHT_NODE = null;

    LEADER = null;
    LEADER_PARTICIPANT = false;

    variableList = {
    }

    this.call = function ( f, evName, socket ) {
        return function(d, cb) {

            // try { 

                logEvent ( evName, d );

                if (_.isFunction(d)) {
                    cb = d;
                    d = null;
                }

                logEvent(evName, d);

                if ( ! _.isFunction ( cb ) )
                    cb = function () {}

                if (_.isFunction(f))
                    f(d, cb, socket, evName );

            // } catch ( e ) {

            //     logMessage ( ("ERROR: " + e ).red );
            // }
        }
    }

    /**
     * Pripojeni uzlu k dalsimu
     */
    connectToNode = this.connectToNode = function ( config ) {

        logMessage( ("Connecting to left node " + config.NODE2_ADDRESS+":"+config.NODE2_PORT).yellow );
        globalConfig = config;

        CLIENT_SOCK = require("socket.io-client").connect( 
                config.NODE2_ADDRESS+":"+config.NODE2_PORT 
                ,{'force new connection':true}
            );

        NODE_OBJECT.connectedToServer ( null, null, CLIENT_SOCK, "ev" );
        // sock.on('connect', NODE_OBJECT.call ( NODE_OBJECT.connectedToServer, "connect", CLIENT_SOCK ) );
        
        // zadost o zjisteni IP a PORTu klienta
        CLIENT_SOCK.on ( "getAddress", function ( data, cb ) {
            cb ( config.LOCAL_ADDRESS, config.LOCAL_PORT );
        });

        CLIENT_SOCK.on('reconnect', NODE_OBJECT.call ( NODE_OBJECT.connectedToServer, "reconnect", CLIENT_SOCK ) );
        CLIENT_SOCK.on('disconnect', NODE_OBJECT.call ( NODE_OBJECT.serverDisconnected, "disconnect", CLIENT_SOCK ) );
    }

    this.connectedToClient = function (data, cb, socket) {

        // pokud se chce pripojit dalsi uzel,
        // odpoj ten zprava a napoj ho misto nej
        this.forceDisconnectRightSide ();

        RIGHT_NODE = socket;
        socket.emit ( "getAddress", {}, function ( host, port ) {

            socket.host = host;
            socket.port = port;
        });

        logMessage ( "Client has just connected".yellow );
    }

    this.sendInfoToClient = function (data, cb, socket) {

        d = {
            S_ID: socket.id,
            LEADER: LEADER
        }

        cb ( d );
    }

    this.connectedToServer = function (data, cb, socket, name ) {
        logMessage ( "CONNECTED - name: "+ name)
        if ( LEFT_NODE ) {

            LEFT_NODE.disconnect();
            LEFT_NODE = null;
        }

        socket.emit("getLeaderAndClientInfo", null, function ( d ) {
            LEFT_NODE = socket;
            socket.id = d.S_ID;
            LEADER = d.LEADER;
            logMessage ( "Connected to server".yellow );

            // kdyz jsme pripojeni - oscannuj topologii
            startScanTopology();
        });
    }

    this.clientDisconnected = function (data, cb, socket) {

        RIGHT_NODE = null;
        logMessage ( "Client has just disconnected".yellow );
    }

    this.serverDisconnected = function (data, cb, socket) {

        LEFT_NODE = null;
        logMessage ( "Server has just disconnected.\nClient will try to reconnect automaticaly".yellow );
    }

    this.handleScanTopology = function ( data, cb, socket ) {

        logMessage ( "Forwarding scan request" );

        ip = config.LOCAL_ADDRESS;
        port = config.LOCAL_PORT;

        if ( data.list[0].IP == ip && data.list[0].PORT == port ) {

            logMessage ( "Returning back scan request" );

            data.end = new Date().getTime();
            data.complete = true;
            TOPOLOGY_INFO = data;
            cb ( data );
        }
        else {

            nodeItem = {
                IP  : ip,
                PORT: port,
                DATE: (new Date).getTime()
            }

            data.list.push ( nodeItem );

            // pokud neni levy uzel, nastav complete tag na false a posli zpet odpoved
            if ( ! LEFT_NODE ) {

                data.end = new Date().getTime();

                cb ( data );
            } else {

                LEFT_NODE.emit ( "scanTopology", data, function ( data ) {

                    TOPOLOGY_INFO = data;
                    cb ( data );
                });
            }
        }
    }

    this.handleLeaderElection = function ( data, cb, socket ) {

        ip = config.LOCAL_ADDRESS;
        port = config.LOCAL_PORT;

        // leader election dorazilo k uzlu s nejvetsim UID
        if ( data.UID == this.UID ) {

            logMessage ( "Returning back leader election" );
            data.end = new Date().getTime();
            cb ( data );
        }
        else {

            // pokud neni levy uzel zrus zpravy
            if ( ! LEFT_NODE )
                return;

            // pokud jiz probiha elekce a prisla dalsi zprava, zrus ji
            if ( data.UID < this.UID && LEADER_PARTICIPANT )
                return;

            LEADER_PARTICIPANT = true;
            logMessage ( "Forwarding leader election message" );

            // pokud je UID navrhovaneho leadera mensi jak aktualniho uzlu
            // zvol ho jako lepsiho leadera
            if ( data.UID < this.UID ) {

                data.UID = this.UID;
                data.PORT = config.LOCAL_PORT;
                data.ADDR = config.LOCAL_ADDRESS;
            }

            // odesli zpravu dal doprava
            LEFT_NODE.emit ( "leaderRequest", data, function ( data ) {
                // pri vraceni callbacku z dalsiho uzlu
                // se odhlas z procesu selekce leadera
                // a uloz si aktualniho leadera
                
                logMessage ( "Leader elected - " + JSON.stringify ( data ));

                LEADER_PARTICIPANT = false;
                LEADER = data;
                cb ( data );
            });
        }
    }

    /**
     * Vypis info o spojeni prave a leve strany uzlu
     */
    this.showNodeConnections = function () {

        if ( LEFT_NODE ) {

            if ( ! LEFT_NODE.id )
                log = "CONNECTING";
            else
                log = LEFT_NODE.id;
        } else
            log = "NULL";
        
        log += " <==> ME <==> ";
        
        if ( RIGHT_NODE ) {
            log += RIGHT_NODE.id
        } else
            log += "NULL";

        logMessage ( " CONNECT INFO: " + log);
    }

    this.handleJoinRequest = function ( d, cb ) {

        // zvysime counter at vime velikost site
        d.CNT++;
        
        if ( d.PORT == config.LOCAL_PORT && d.ADDR == config.LOCAL_ADDRESS )
            return false;

        // pokud mame levou stranu
        if ( LEFT_NODE ) {
            
            // preposleme pozadavek dal
            LEFT_NODE.emit ( "joinRequest", d );

        } else {

            logMessage ( " Request for join from " + d.ADDR+":"+d.PORT );

            config.NODE2_PORT = d.PORT;
            config.NODE2_ADDRESS = d.ADDR;

            // jinak se pripojime k zadateli
            this.connectToNode ( config );
        }
    }

    /**
     * Pokud nema uzel spojeni z prave strany, posli request na druhou stranu hada,
     * aby se napojil do kurhu
     */
    this.handleDisconnectedRightSide = function () {

        if ( RIGHT_NODE ) 
            return false;

        if ( ! LEFT_NODE && config.NODE2_PORT ) {
            logMessage ( "Trying to connect to "+ config.NODE2_ADDRESS + ":" + config.NODE2_PORT );

            connectToNode ( config );
            return false;
        }

        if ( ! LEFT_NODE ) 
            return false;

        logMessage ( "Sending request for connection to the left" );

        request = {
            ADDR: config.LOCAL_ADDRESS,
            PORT: config.LOCAL_PORT,
            CNT : 0
        }

        LEFT_NODE.emit ( "joinRequest", request );
    }

    startLeaderElection = this.startLeaderElection = function ( cb ) {
        logMessage ( "Starting leader election" );

        data = {
            start: new Date().getTime(),
            UID: this.UID,
            PORT: config.LOCAL_PORT,
            ADDR: config.LOCAL_ADDRESS
        }

        if ( LEFT_NODE ) {
            
            LEFT_NODE.emit ( "leaderRequest", data, function ( data ) {
                logMessage ( "Leader elected - " + JSON.stringify ( data ) );

                LEADER = data;
                LEADER_PARTICIPANT = false;

                // pokud chceme provest nejakou akci potom, co se zvoli leader - proved ji
                if ( _.isFunction ( cb ) )
                    cb ();
            });
        }
    }
    
    setVariable = this.setVariable = function ( name, value, callback ) {

        logMessage ("Setting global variable to leader: " + name + " = " + value );

        if ( ! LEADER )
            // pokud jeste nebyl zvoleny leader - zapis
            startLeaderElection ( function () {
                // az dobehne volebni proces - zeptej se ho na 
                writeExternalVariable ( LEADER.ADDR, LEADER.PORT, name, value, function ( data, offline ) {

                    if ( offline === 1 ) 
                        startLeaderElection();

                    if ( data )
                        logMessage ( "Leader has written variable " + name );
                    else
                        logMessage ( "Leader has returned error" );

                    callback ( data );
                });
            });
        else
            // pokud je nastaveny leader - zeptej se ho
            writeExternalVariable ( LEADER.ADDR, LEADER.PORT, name, value, function ( data, offline) {

                if ( offline === 1 ) 
                    startLeaderElection ();
            
                if ( data )
                    logMessage ( "Leader has written variable " + name );
                else
                    logMessage ( "Leader has returned error" );

                callback ( data );
            });
    }
    
    readExternalVariable = function ( addr, port, name, cb ) {

        logMessage ( "Reading external variable from ("+addr+":"+port+"): " + name );

        request = require('request-json');
        var client = request.newClient('http://'+addr+':'+port+'/');
        var data = {
            name: name
        };

        client.post('/promenna-local-read', data, function(err, res, body) {
            if ( ! err && res.statusCode == 200 ) {
                
                return cb ( body.value );

            } else if ( err && err.code == "ECONNREFUSED") {

                return cb ( false, 1 )
            }
            cb ( false );
        });
    }

    writeExternalVariable = function ( addr, port, name, value, cb ) {

        logMessage ( "Writing external variable to ("+addr+":"+port+"): " + name + " = " + value );

        request = require('request-json');
        var client = request.newClient('http://'+addr+':'+port+'/');
        var data = {
            name: name,
            value: value
        };

        client.post('/promenna-local-write', data, function(err, res, body) {
            if ( ! err && res.statusCode == 200 ) {
                
                if ( body.result ) 
                    return cb ( body.result );

            } else if ( err && err.code == "ECONNREFUSED") {

                return cb ( false, 1 )
            }

            return cb ( false );
        });
    }

    getVariable = this.getVariable = function ( name, callback ) {

        logMessage ("Reading global variable: " + name );

        // pokud vime, kde promennou hledat..
        if ( variableList[name] && variableList[name].local ) {
            callback ( variableList[name].value );

        // pokud vime, ze je jinde - zeptame se uzlu, ktery ji ma
        } else if ( variableList[name] && ! variableList[name].local ) {

            readExternalVariable ( variableList[name].ADDR, variableList[name].PORT, name, function ( data, offline ) {

                if ( data )
                    logMessage ( "Node ("+variableList[name].ADDR+":"+variableList[name].PORT+") has variable " + name + " = " + data );
                else
                    logMessage ( "Node ("+variableList[name].ADDR+":"+variableList[name].PORT+") does not have variable " + name );

                callback ( data );
            });

        // pokud nevime, kde hledat - posledni moznost je zeptat se loadera
        } else {

            // pokud neni zvolen leader - spust volebni proces
            // a rekni, ze nebyla nalezena (novy leader nema poneti o jiz nastavenych promennych)
            if ( ! LEADER ) 
                startLeaderElection ( function () {
                    // az dobehne volebni proces - zeptej se ho na 
                    readExternalVariable ( LEADER.ADDR, LEADER.PORT, name, function ( data, offline ) {

                        if ( offline === 1 ) 
                            startLeaderElection ();

                        if ( data )
                            logMessage ( "Leader does not have variable: " + name );
                        else
                            logMessage ( "Leader has returned variable: " + name + " = " + data );

                        callback ( data );
                    });
                });
            else
                // pokud je nastaveny leader - zeptej se ho
                readExternalVariable ( LEADER.ADDR, LEADER.PORT, name, function ( data, offline ) {
                    
                    if ( offline === 1 ) 
                        startLeaderElection ();

                    logMessage ( "Odpoved leadera na promennou " + name + " = " + data );
                    callback ( data );
                });
        }
    }

    setLocalVariable = this.setLocalVariable = function ( name, value ) {

        logMessage ("Setting local variable: " +name+ " = " + value );

        data = {
            local: true,
            value: value,
            date: + new Date
        }

        variableList[name] = data;
        return true;
    }

    getLocalVariable = this.getLocalVariable = function ( name ) {

        logMessage ("Reading local variable: " +name );

        if ( variableList[name] && variableList[name].local )
            return variableList[name].value;

        return false;
    }

    /**
     * Disconnect klienta zprava
     */
    this.forceDisconnectRightSide = function () {

        if ( RIGHT_NODE ) {
            logMessage ( "Disconnecting client from right".yellow );

            RIGHT_NODE.disconnect();
            RIGHT_NODE = null;
        }
    }

    startScanTopology = this.startScanTopology = function () {

        console.log ( "Start scanning topology" );
        data = {
            start: new Date().getTime(),
            complete: false,
            nodesCount: 1,
            list: [
                { 
                    IP  : config.LOCAL_ADDRESS,
                    PORT: config.LOCAL_PORT,
                    DATE: (new Date).getTime()
                }
            ]
        }

        if ( LEFT_NODE ) {
            
            TOPOLOGY_REQUEST = true;
            LEFT_NODE.emit ( "scanTopology", data, function ( data ) {
                
                TOPOLOGY_REQUEST = false;
                console.log ( "Topology scanned" );

            });
        }
    }


    setInterval ( this.handleDisconnectedRightSide, 2000 );

    if ( LOG_EDGES )
        setInterval ( this.showNodeConnections, 2000 );

    return this;
}

Node.instance = null;
module.exports = function ( DB ) {
    
    if ( Node.instance == null ) 
        Node.instance = new Node ( DB );

    return Node.instance;
}