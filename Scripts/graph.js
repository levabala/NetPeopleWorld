/**
 * Created by levabala on 27.01.2016.
 */
function graph(pos, ip, publ){
    this.ip = ip;  //will be created in graphsList
    this.pos = pos;
    this.size = 1;
    this.connections = {};
    this.connectionsCount = 0;
    this.public = false;
    this.likes = [];
    this.data = {};
    this.activityTimeout = 100;

    if (publ != null) this.public = publ;

    this.newClick = function(){
        this.size ++;
    };

    this.newLikeFrom = function(ip){
        if (this.likes.indexOf(ip) == -1){
            this.likes[this.likes.length] = ip;
        }
    };

    this.newConnection = function(gr){
        if (gr == null || this.connections[gr.ip] != null) return false;
        this.connections[gr.ip] = {
            pos: gr.pos,
            connectionsCount: gr.connectionsCount,
            likes: gr.likes
        };
        this.connectionsCount++;
        return true;
    };

    this.updateConnections = function(graphs){
        for (var ip in this.connections){
            this.connections[ip].connectionsCount = graphs[ip].connectionsCount;
            this.connections[ip].pos = graphs[ip].pos;
            this.connections[ip].likes = graphs[ip].likes;
        }
    };

    this.closeConnection = function(ip){
        delete this.connections[ip];
        this.connectionsCount--;
    }        
}



function graphsList(){
    this.graphs = {};
    this.graphsCount = 0;
    this.public = [];

    //functions
    this.newAct = function(gr){
        if (this.graphs[gr.ip]) {
            this.graphs[gr.ip].size ++;
            console.log('One to ' + gr.ip + '(All: ' + this.graphs[gr.ip].size + ')');
        }
        else {
            this.graphs[gr.ip] = gr;
            this.graphsCount ++;
            if (gr.public == true) this.public[this.public.length] = gr.ip;
            console.log('New connection from ' + gr.ip);
        }
    };

    this.changePrivacy = function(ip, publ){
        if (publ == false) {
            var index = this.public.indexOf(ip);
            if (this.public.indexOf(ip) != -1){
                this.public.splice(index,1);
            }
        }
        else{
            for (var p in this.public) {
                if (this.public[p] == ip) {
                    return;
                }
            }
            this.public[this.public.length] = ip;
        }
    };        
}

function pos(x,y){
    this.x = x;
    this.y = y;        
}

function pos_G(lng,lat){
    this.lat = lat;
    this.lng = lng;       
}

exports.graphsList = graphsList;
exports.graph = graph;
exports.pos = pos;
exports.pos_G = pos_G;