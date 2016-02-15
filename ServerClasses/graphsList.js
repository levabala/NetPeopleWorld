/**
 * Created by levabala on 27.01.2016.
 */
function graphsList(){
    this.graphs = [];
    this.currentId = -1;

    //functions
    this.newAct = function(gr){
        console.log('current id: ' + this.currentId);
        if (this.graphs[this.currentId]) this.graphs[this.currentId].size ++;
        else {
            this.currentId ++;
            gr.id = this.currentId;
            this.graphs[this.currentId] = gr;
        }
    }
}

console.log('GraphList.js is required');

exports.graphsList = graphsList;