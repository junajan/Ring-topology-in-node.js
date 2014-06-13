
module.exports = function(app, global, chatrooms) {
    
    require('./static.js').add_routes(app, global, chatrooms);
    
    // exit node
    app.get('/exit', function(req, res){
        process.exit()
    });
    
    // error 404    
    app.get('*', function(req, res){
        
        res.status(404);
        res.render("basic/error404");
    });

}