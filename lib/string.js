var DIA = require('diacritics');

module.exports = {
    randPass: function ( len, keylist ) {
    
        var keylist="abcdefghijklmnopqrstuvwxyz123456789"
        var temp=''

        temp=''
        for (i=0;i<len;i++)
            temp+=keylist.charAt(Math.floor(Math.random()*keylist.length))

        return temp;
    },
    seo: function ( s ) {

        s = this.removeDiacritics(s).trim();

        var re =/[^a-zA-Z0-9-_.]/g
        s = s.replace(" ","-").replace(re,"").toLowerCase();
        
        return s;
    },
    removeDiacritics: function (s) {
        return DIA.remove ( s )
    }
}