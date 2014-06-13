var colors = require('colors');

exports.printHelp = function ( arg ) {

  console.log ( "Bad param count".red );
  console.log ( "Usage: "+ arg[1] + "[node_address] node_port [other_node_address other_node_port]");
  console.log ( "   node_address        - can by used for different networks");
  console.log ( "   node_port           - on which port should node run");
  console.log ( "   other_node_address  - ip to connect on start");
  console.log ( "   other_node_port     - port to connect on start");
}

exports.createLocals = function (req, res, next) {
    res.locals = {
      req: req,
      res: res,
      sess: req.session,
      DIR  : __dirname + "/../",
      ADDR: req.url.replace(/\/*$/, "")+"/"
    };

    next();
}
     
    
exports.getDefaultConfig = function () {

    return {
        color       : 3,
        smer_vypisu : 0,
        sysmsg      : 0
    }
}

exports.clearInData = function ( d, fields, useNull ) {

    if ( typeof fields === 'object')
        fields = Object.keys( fields );

    for ( i in d )
        if ( useNull == undefined && d[i] == null )
            delete d[i];

        else if(fields.indexOf(i) == -1)
            delete d[i];

    return d;
}

exports.mergeConfig = function (c1, c2) {

    for ( i in c1 )
        c2[i] = c1[i];

    return c2;
}
