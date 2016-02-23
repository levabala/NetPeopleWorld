//requiring
var http = require('http');
var url = require('url');
var fs = require('fs');
var g = require('./Scripts/graph.js');

//global variables
var dbPath = './DataBase/data.json'
var newConnections = {};
var db = {};

//functions for requests handlers 
var handFuns = {GET:{},POST:{}};
var checkFuns = {};
var systemFuns = {};

//check the database
CheckDataBaseState();

//creating a server
var server = http.createServer(listening);
server.listen(3000);

/*
*** End of preparations ***
*/

//temp variables
var code = 200;
var answer = "Successful :)";
var ip, theGraph, body, urlParsed, method;
var funObj = new g.graph();

//proccessing requests 
function listening(req,res){
    code = 200;
    answer = "Successful :)";
    urlParsed = url.parse(req.url, true);
    ip = req.connection.remoteAddress;   
    method = req.method;       
    theGraph = getGraphFromDB(ip); 
    setFunctionForGraph(theGraph);
    body = "";               
    
    /*
    console.log('--- New request from ' + ip);
    console.log('method: ' + method);
    console.log('pathname: ' + urlParsed.pathname);
    console.log('--- End');
    */
    
    req.on('readable', function(){
        body += req.read();        
    });
    req.on('end', function(){                                                           
        if (handFuns[method][urlParsed.pathname] == null){
            sendFile('./HTML/usersPage.html', res);
            return;
        }               
        
        if (urlParsed.pathname == '/takeAccessForGOD'){
            handFuns.GET['/takeAccessForGOD'](req,res,body);
            return;
        }
        
        if (getGraphFromDB(ip) == null && urlParsed.pathname != '/newUser'){            
            res.statusCode = 299;
            res.end("Autorize, please");
            return;
        }               
                       
        if (handFuns[method][urlParsed.pathname](req,res,body) == true) return;        
        
        //ending the connection       
        res.statusCode = code;
        res.end(answer);
    });    
}

//handFuns initialisation
handFuns.POST['/newUser'] = function(req,res,body){        
    var latlng;
    try{
        latlng = JSON.parse(body);
    }
    catch(e){
        console.log(e);
        code = 400;        
        return;
    }   
    var graph = new g.graph(latlng, ip, false);    
    
    if (!checkFuns.Valid(graph)){
        code = 400;
        return;
    }           
    writeToDB(graph);
    if (newConnections[ip] == null || newConnections[ip].length == null) newConnections[ip] = [];
    answer = JSON.stringify(getGraphFromDB(ip));                
};

handFuns.POST['/aboutGraph'] = function(req,res,body){    
    var graph = getGraphFromDB(body);      
    if (checkFuns['Access'](theGraph, graph)) answer = JSON.stringify(graph);
    else {
        code = 403;
        answer = 'Access denied';
    }
};

handFuns.POST['/changePrivacy'] = function(req,res,body){
    switch (body){
        case 'false':{
            body = false;
            break;
        }
        case 'true':{
            body = true;
            break;
        }         
        default:{
            code = 400;
            answer = 'Wrong state';
        }           
    }
    db.graphs[ip].public = body;
    db.changePrivacy(ip, body);
    console.log('Privacy of ' + ip + ' changed to ' + body);
};

handFuns.POST['/like'] = function(req,res,body){
    
};

handFuns.POST['/newConnection'] = function(req,res,body){
    if (body == ip){
        code = 400;
        answer = 'Connection to yourself';
        return;        
    }            
    if (theGraph.newConnection(db.graphs[body])){
        writeToDB(theGraph);    
    }
    else {
        code = 400;
        answer = 'Connection already exist';
        return
    }        
    var connectedGraph = getGraphFromDB(body);
    setFunctionForGraph(connectedGraph);
    if (connectedGraph.newConnection(theGraph))
        writeToDB(connectedGraph);            
                                  
    if (newConnections[body].length == null) newConnections[body] = [];        
                
    newConnections[body][newConnections[body].length] = ip;
    answer = JSON.stringify(connectedGraph);
};

handFuns.GET['/aboutMe'] = function(req){    
    answer = JSON.stringify(theGraph);
};

handFuns.GET['/getAvailable'] = function(req){
    if (newConnections[ip] != null){
        var newConns = JSON.parse(JSON.stringify(newConnections[ip]));
        for (var c in newConns){
            newConns[c] = getGraphFromDB(newConns[c]);
        }    
    }   
    var lp = [];
    for (var d in db.public){                        
        if (theGraph.connections[db.public[d]] == null && db.public[d] != ip) lp[lp.length] = db.public[d];
    }    
    answer = JSON.stringify({
        isGraphPublic: theGraph.public,
        available: lp,
        newConnections: newConns
    });
    newConnections[ip] = [];            
};

handFuns.GET['/favicon.ico'] = function(req,res){
    sendFile('./HTML/favicon.ico', res);        
};

handFuns.GET['/takeAccessForGOD'] = function(req,res){
    sendFile('./HTML/SuperGodsPage.html',res);
    return true;
};

handFuns.GET['/restartDataBase'] = function(){
    if (ip != '127.0.0.1'){
        code = 403;
        answer = 'Access denied';
        console.log('Trying to restart the database');
        return;
    }    
    CreateDataBase();
    answer = '<h1 style=\'border-radius: 30%;padding:15px;border: solid black 3px;text-align: center;\' onclick=\'location.reload()\'>Restart Again</h1>';
};

//checkFuns initialisation
checkFuns['Valid'] = function (gr){
    if (gr == null || typeof gr != 'object' || gr.ip == null) return false;
    return true;   
};

checkFuns['Access'] = function(grA, grB){
    if (grB == null || grA == null) return false;
    if (grB.public == true || grA.connections[grB.ip] != null) return true;
    return false;   
};

//re-creating the database
function CreateDataBase(res){   
    fs.writeFileSync(dbPath, JSON.stringify(new g.graphsList()));    
    db = new g.graphsList();    
    theGraph = {};   
    //create testing graph
    var Moscow = new g.graph(new g.pos_G(37.620807, 55.753436), "Москва", true);
    writeToDB(Moscow);
    
    newConnections['Москва'] = [];
    
    console.log('DataBase was restarted...');                   
    if (!res) return;
    res.statusCode = 200;
    res.end('DataBase was restarted');            
}

//checking state
function CheckDataBaseState(){        
    //checking the database file (data.json)
    try{
        var database = require(dbPath);    
    }
    catch(e){        
        console.error('ERROR IN THE SAVED DATABASE:');
        console.error(e);
        console.error('Please, check the state of one and fix the ERROR!');
        CreateDataBase();
        return false;
    }
    
    if (database.graphs == null){
        CreateDataBase();
        return;
    }
        
    db = new g.graphsList();    
    for (var d in database.graphs){
        db.newAct(database.graphs[d]);
        newConnections[d] = [];
    }
        
    return true;
}

//adding new information to DB
function writeToDB(gr){   
    for (var p in gr.connections){
        var conn = gr.connections[p];
        conn = {
            ip: conn.ip,
            pos: conn.pos,
            connectionsCount: conn.connectionsCount,
            likes: conn.likes.length
        }        
    }            
    db.newAct(gr);        
    fs.writeFile(dbPath, JSON.stringify(db), function(err){if (err) console.error(err);});           
} 

function getGraphFromDB(ip){              
    return db.graphs[ip];      
}

function sendFile(fileName,res){
    var fileStream = fs.createReadStream(fileName);
    fileStream
        .on('error', function (e) {
            console.error(e);
            res.statusCode = 500;
            res.end('Server error');
        })
        .pipe(res);
}

function setFunctionForGraph(gr){
    if (gr != null){
        gr.newConnection = funObj.newConnection;
        gr.closeConnection = funObj.closeConnection;
        gr.newLikeFrom = funObj.newLikeFrom;
    }
    else return false;
}
