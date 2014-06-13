/**
 * Aplikace realizujici kruhovou topologii
 * pro vymenu zprav a realizaci sdilene promenne
 * 
 * Autor: Bc. Jan Juna
 * jeezaa@seznam.cz
 */

var ip = require("ip");
var colors = require( "colors" );
var express = require("express");
var app = express();
var config = require('./config/config')(express, app);

events = new require('events').EventEmitter;
common = require("./lib/common");
_ = require('underscore');
DEBUG = true;

function isNumeric(str){
    return /^\d+$/.test(str);
}


nodeConfig = {
	LOCAL_IP_LONG : ip.toLong ( ip.address() ),
	UID : 0,
	LOCAL_ADDRESS : ip.address(),
	LOCAL_PORT	  : 0,
	NODE2_PORT    : 0,
	NODE2_ADDRESS : 0
}

// ====================================
// ======== Parsovani vstupu ==========
// ====================================
if ( process.argv.length < 3 ) {

	common.printHelp ( process.argv );
	process.exit(1);
}

index = 2;
if ( isNumeric ( process.argv[index] ) ) {

	nodeConfig.LOCAL_PORT = parseInt(process.argv[index]);
} else {
	
	nodeConfig.LOCAL_ADDRESS = process.argv[index];
	if ( process.argv.length < index + 1 ) {

		common.printHelp ( process.argv );
		process.exit(1);
	}

	nodeConfig.LOCAL_PORT = parseInt(process.argv[++index]);
}

if ( process.argv.length == index + 3 ) {

	nodeConfig.NODE2_ADDRESS = process.argv[++index];
	nodeConfig.NODE2_PORT    = parseInt(process.argv[++index]);
} else if ( process.argv.length > 4 ) {

	common.printHelp ( process.argv );
	process.exit(1);
}


// ======= Kdyz mame i lokalni IP, doplnime automaticky UID
nodeConfig.UID = ip.toLong ( "255.255.255.255" ) + ip.toLong ( ip.address() ) * nodeConfig.LOCAL_PORT;

if ( DEBUG )
	console.dir ( nodeConfig );

// listen on port
console.log( ("Starting node on port " + nodeConfig.LOCAL_ADDRESS + ":" + nodeConfig.LOCAL_PORT).yellow );
appListen = app.listen( nodeConfig.LOCAL_PORT, "0.0.0.0" );

// init chat node 
var nodeConnector = require(__dirname + "/nodeConnector.js")(nodeConfig, appListen );
global["NODE"] = nodeConnector;

// set routers for web access
var routers = require(__dirname + "/routers/routers.js")(app, global);
