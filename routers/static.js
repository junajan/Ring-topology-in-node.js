var fs = require('fs');

var async = require("async");  
var trim = require("../lib/trim.js");  

exports.add_routes = function (app, g) {
  
    app.get("/", function(req, res){

        data = {
            config          : g.NODE.NODE.globalConfig,
            defaultConfig   : g.NODE.NODE.defaultConfig,
            UID             : g.NODE.NODE.UID,
            LEFT_NODE       : g.NODE.NODE.LEFT_NODE,
            RIGHT_NODE      : g.NODE.NODE.RIGHT_NODE,
            TOPOLOGY        : g.NODE.NODE.TOPOLOGY_INFO,
            LEADER          : g.NODE.NODE.LEADER
        }

        // console.dir ( data.RIGHT_NODE );

        return res.render("basic/index", data );  
    });

    app.get("/refresh", function(req, res){
        
        g.NODE.NODE.startScanTopology();
        res.send ("OK");
    });

    app.get("/leader-election", function(req, res){
        
        g.NODE.NODE.startLeaderElection();
        res.send ("OK");
    });
    
    app.get("/promenna", function(req, res){
        
        return res.render("basic/promenna");  
    });

    app.post("/promenna-write", function(req, res){
        
        c = g.NODE.NODE.setVariable ( req.body.name, req.body.value, function ( c ) {

            if ( c ) 
                text = "Proměnná byla zapsána.";
            else
                text = "Při zapisování došlo k chybě.";

            res.format({
              html: function(){
                res.send( text );
              },
              json: function(){
                res.send({ result: c });
              }
            });
        });
    });

    app.post("/promenna-read", function(req, res){

        c = g.NODE.NODE.getVariable ( req.body.name, function ( c ) {

            text = ( c !== false ) ? "Hodnota: " + c : "Proměnná zde není";

            res.format({
              html: function(){
                res.send( text );
              },
              json: function(){
                res.send({ value: c });
              }
            });
        });
    });

    app.post("/promenna-local-write", function(req, res){
        
        c = g.NODE.NODE.setLocalVariable ( req.body.name, req.body.value );
        if ( c ) 
            text = "Proměnná byla zapsána.";
        else
            text = "Při zapisování došlo k chybě.";

        res.format({
          html: function(){
            res.send( text );
          },
          json: function(){
            res.send({ result: c });
          }
        });
    });

    app.post("/promenna-local-delete", function(req, res){
        
        c = g.NODE.NODE.setLocalVariable ( req.body.name, req.body.value );
        if ( c ) 
            text = "Proměnná byla smazána.";
        else
            text = "Proměnná nebyla nalezena.";

        res.format({
          html: function(){
            res.send( text );
          },
          json: function(){
            res.send({ result: c });
          }
        });
    });

    app.post("/promenna-local-read", function(req, res){

        c = g.NODE.NODE.getLocalVariable ( req.body.name );

        text = ( c !== false ) ? "Hodnota: " + c : "Proměnná zde není";

        res.format({
          html: function(){
            res.send( text );
          },
          json: function(){
            res.send({ value: c });
          }
        });
    });

    app.get("/nastroje", function(req, res){
    	
        return res.render("basic/nastroje");  
    });

    app.get("/help", function(req, res){
    	
        return res.render("basic/help");  
    });

    app.get( "/seznam-promennych", function ( req, res ) {

        data = g.NODE.NODE.variableList;
        return res.render("basic/variable_list", data );
    });
};
