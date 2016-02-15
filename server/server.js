/**
 * Created by levabala on 27.01.2016.
 */
var g = require('../ServerClasses/graph.js');

var http = require('http');
var url = require('url');
var fs = require('fs');
var list = new g.graphsList();
var chat = [];

list.newAct(new g.graph(new g.pos_G(37.620807, 55.753436), "Москва", true));
list.newAct(new g.graph(new g.pos_G(37.162711, 56.732692), "Юрик", true));
list.newAct(new g.graph(new g.pos_G(37.170196, 56.738337), "Деда", true));
list.newAct(new g.graph(new g.pos_G(37.192457, 56.747355), "ИЧ", true));
list.newAct(new g.graph(new g.pos_G(37.150865, 56.732117), "БВ", true));
list.newAct(new g.graph(new g.pos_G(37.142387, 56.75571), "ЛБ", true));
list.newAct(new g.graph(new g.pos_G(37.124728, 56.730929), "Ленин", true));
list.newAct(new g.graph(new g.pos_G(-104.272750, 58.243445), "Где-то_В_Центре_Канады", true));
list.newAct(new g.graph(new g.pos_G(-32.321851, 54.723689), "Посередине_Атлантического_океана", true));


var server = http.createServer(function(req, res) {
    var urlParsed = url.parse(req.url, true);
    var ip = req.connection.remoteAddress;
    var body = '';

    switch (urlParsed.pathname){
        case '/getAvailable':{
            if (list.graphs[ip] == null){
                res.statusCode = 400;
                res.end("You are not logged in");
                return;
            }
            res.statusCode = 200;
            res.end(JSON.stringify({available: list.public, isGraphPublic: list.graphs[ip].public}));
            break;
        }
        case '/aboutGraph':{
            req.on('readable', function(){
                body += req.read();
            });
            req.on('end', function() {
                var Graph = list.graphs[body];
                console.log(body)
                if (typeof Graph == 'undefined'){
                    res.statusCode = 404;
                    res.end('No such graph');
                    return;
                }
                if (body != ip && !Graph.public && list.graphs[ip].connections[body] == null){
                    res.statusCode = 5;
                    res.end('No permissions');
                    return;
                }
                var connections = (JSON.parse(JSON.stringify(Graph.connections)));
                safeConnections(Graph.connections);
                res.statusCode = 200;
                res.end(JSON.stringify(Graph));
                Graph.connections = connections;

            });
            break;
        }
        case '/updating':{
            //fill the graph the final data (information about connections)
            var Graph = list.graphs[ip];
            if (Graph == null || typeof Graph == 'undefined') {
                res.statusCode = 200;
                res.end('{}');
                return;
            }

            Graph.updateConnections(list.graphs);

            var connections = (JSON.stringify(Graph.connections));
            connections = JSON.parse(connections);
            safeConnections(Graph.connections);

            res.statusCode = 200;
            res.end(JSON.stringify({graph: Graph, available: list.public}));
            Graph.connections = connections;

            break;
        }
        case '/getChatHistory':{
            res.statusCode = 200;
            res.end(JSON.stringify(chat));
            break;
        }
        case '/message':{
            req.on('readable', function(){
                body += req.read();
            });
            req.on('end', function() {
                chat[chat.length] = {
                    owner: ip,
                    message: body
                };
                res.statusCode = 200;
                res.end('Successfully');
            });
            break;
        }
        case '/newConnection':{
            req.on('readable', function(){
                body += req.read();
            });
            req.on('end', function() {
                if (list.graphs[body] == null || typeof list.graphs[ip] == 'undefined') {
                    console.warn('WRONG CONNECTION');
                    res.statusCode = 401;
                    res.end('Fault');
                }
                else if (body == ip){
                    console.warn('THE CONNECTION TO ITSELF');
                    res.statusCode = 402;
                    res.end('You try to connect to yourself');
                }
                else if (typeof list.graphs[ip] != 'undefined' && list.graphs[ip].connections[body] != null){
                    console.warn('THE CONNECTION ALREADY EXIST');
                    res.statusCode = 403;
                    res.end('The connection already exist');
                }
                else {
                    list.graphs[ip].newConnection(list.graphs[body]);
                    list.graphs[body].newConnection(list.graphs[ip]);
                    console.log("Connection from " + ip + ' to ' + body);
                    res.statusCode = 200;
                    res.end(JSON.stringify(list.graphs[body]));
                }
            });
            break;
        }
        case '/closeConnection':{
            req.on('readable', function(){
                body += req.read();
            });
            req.on('end', function() {
                if (list.graphs[ip].connections[body] != null){
                    list.graphs[ip].closeConnection(body);
                    res.statusCode = 200;
                    res.end('Deleted');
                }
                else {
                    res.statusCode = 204;
                    res.end('No such connection');
                }
            });
            break;
        }
        case '/newUser':{
            req.on('readable', function(){
                body += req.read();
            });
            req.on('end', function(){
                body = JSON.parse(body);
                var latitude = body.latitude;
                var longitude = body.longitude;

                var gr = new g.graph(new g.pos(longitude, latitude), ip);

                list.newAct(gr);
                res.statusCode = 200;
                res.end('Request accepted');
            });
            break;
        }
        case '/newUser_G':{
            req.on('readable', function(){
                body += req.read();
            });
            req.on('end', function(){
                body = JSON.parse(body);

                var latitude = body.lat;
                var longitude = body.lng;
                var gr = new g.graph(new g.pos_G(longitude,latitude), ip);

                list.newAct(gr);
                res.statusCode = 200;
                res.end('Request accepted');
            });
            break;
        }
        case '/changePrivacy':{
            req.on('readable', function(){
                body += req.read();
            });
            req.on('end', function() {
                if (list.graphs[ip] == null){
                    res.statusCode = 400;
                    res.end("You are not logged in");
                    return;
                }
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
                        res.statusCode = 403;
                        res.end('Wrong state');
                    }
                }
                list.graphs[ip].public = body;
                list.changePrivacy(ip, body);
                console.log('Privacy of ' + ip + ' changed to ' + body);

                res.statusCode = 200;
                res.end('Successfully');
            });
            break;
        }
        case '/favicon.ico':{  //отсылаем фавикон браузеру
            res.statusCode = 200;
            sendFile('./favicon.ico', res);
            break;
        }
        case '/':{
            sendFile('../googleMapsTesting.html', res);
            break;
        }
        case '/TakeAccessForCreator':{
            sendFile('../googleMapsTesting_GOD.html', res);
            break;
        }
        case'/google330abf1111c96b01.html':{
            console.log('sending google key');
            sendFile('./google330abf1111c96b01.html', res);
            break;
        }
    }
});


server.listen(3000);//,'192.168.3.2');


//console.log('Server running on port 192.168.3.2:9898');

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

function safeConnections(connections){
    for (var c in connections){
        delete connections[c].connections;
    }
}