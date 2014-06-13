var config = {
    local: {
        mode: 'local',
        port: 3333
    },
    production: {
        mode: 'production',
        port: 8080
    }
}

function getLayout ( req, defLayout ) {
    
    if ( req.xhr )
        return ! req.xhr;
    
    if ( defLayout == null )
        config.defLayout = "frame/frame";
    
    return config.defLayout; 
}

module.exports = function(express, app, mode) {
    
    app.use( require('express-ejs-layouts'));
    app.use( express.static('./public'));
    app.use(express.bodyParser({uploadDir:'./data/files/'}));
     
    app.use(express.cookieParser());
    app.use(express.logger('dev'));

    var FileStore = require('connect-session-file');
    app.use(express.session({
        secret: '00d45f8f66b383569d8036e4cc4d5f68',
        store: new FileStore({path:'./data/session', useAsync:true})
    }));
    
    app.use(function (req, res, next) {
        app.set("layout",  getLayout( req ));
        next();
    });
    
    app.engine('html', require('ejs-locals'));

    app.set('views', './view');
    app.set('view engine', 'html');
    app.set("layout",  "frame/frame");
    
    return config[mode || process.argv[2] || 'local'] || config.local;
}