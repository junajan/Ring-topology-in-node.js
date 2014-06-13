function SetCookie(cookieName,cookieValue,nDays) {
    
    var today = new Date();
    var expire = new Date();
    if (nDays==null || nDays==0) nDays=1;
    expire.setTime(today.getTime() + 3600000*24*nDays);
    document.cookie = cookieName+"="+escape(cookieValue)
}


function smileToggle () {

    if ( $(".smile_board").is(":visible") )
        $(".smile_board").fadeOut ();
    else
        $(".smile_board").fadeIn ();
}
    
function delCookie(name) {
    document.cookie = name + '=; expires=Thu, 01-Jan-70 00:00:01 GMT; path=/';
} 

function setActualDate ( target, format ) {
    if ( format == undefined ) 
        format = "d.mm.yyyy HH:MM";

    $(target).val (  dateFormat( new Date(), format) );
}
    
function getParameterByName(name, url)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(url);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}


function isOnScreenBottom ( padding ) {

    if ( padding == undefined )
        padding = 40;
    
    return ($(window).scrollTop() > $(document).height() - $(window).height() - padding );
}

function jsonDecode ( json ) {
    
    try {
        return jQuery.parseJSON( json );
        
    } catch(err) {
        
        return undefined;
    }
}

function closeFancybox () {
    
    $.fancybox.close();
}

function isUndefined ( c ) {
    
    return typeof c === "undefined";
}

function showErrors ( formId, res ) {
    form = $("#"+formId);
    
    form.find(".error").fadeOut().remove();
    
    $.each ( res,
    function ( key, val ) {

        msg = val;
        if ( $.isArray( val ) )
            msg = val[0]
        
        form.find("#"+key).after("<div style='display: none;' class='error error_"+key+"'>"+msg+"</div>");
        form.find(".error").fadeIn();
    });
    
    return true;
}

function showValid ( formId, res, reset ) {
    var form = $("#"+formId);
    
    form.find(".error, .valid").remove();
//    form.find(".valid").remove();
    
    if ( reset == true )
        form[0].reset();
    
     if ( typeof res == "number" )
         return true;
     
     msg = res;
        if ( $.isArray( res ) )
            msg = res[0]
        
    if ( res.msg)
        form.append( "<div class='valid'>"+res.msg+"</div>" );
    return true;
}


function processResponse ( id, res ) {
    
    if ( ! isUndefined( res.error ) ) {
        
        showErrors ( id, res.error )
        return false;
    } else if ( ! isUndefined( res.valid ) ) {
        
        showValid ( id, res.valid );
        return true;
    }
}

function setAjaxForm ( id, callbacks ) {
    
     $('#'+id).ajaxForm({
         dataType: 'json',
         success: function( resOrig ) { 
             res = processResponse ( id, resOrig );
             if ( callbacks != undefined ) {
                 
                 if ( res && callbacks.valid != undefined )
                     callbacks.valid ( resOrig.valid );
                 
                 if ( ! res && callbacks.error != undefined )
                     callbacks.error ( resOrig.error );
             }
         }
    });
}

function connectCallback ( d, toSend, socket ) {

  connected = d;
  $.event.trigger({
    type: "connected",
    time: new Date()
  });
  
  if ( ! d ) 
      return alert ( "Connection failed :-(" );
  else if ( Number ( d ) == 1 ) 
      console.log ( "Connected to server as visitor");
  else 
      console.log ( "Connected to server as user");

    if ( toSend ) 
      socket.emit ( toSend.evName, toSend.data );
}

function refreshTriggers () {
    
  $(".ajax").click(function ( ev ) {

    alert ( $(this).attr("alt") );
    $.get( $(this).attr("href"), function () {
      window.location = document.URL;
    });

    ev.preventDefault();
    return false;
  });
}

$(document).ready(function() {
    

    refreshTriggers();
});

