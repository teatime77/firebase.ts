///<reference path="edge.ts" />
declare var Viz: any;

namespace firebase_ts {
//
let dlgSet = new Set<string>();
export function showDlg(ev : MouseEvent, dlg_id : string){    
    const dlg = $dlg(dlg_id);

    dlg.style.left = `${ev.pageX}px`;
    dlg.style.top  = ev.pageY + "px";

    dlg.showModal();

    if(!dlgSet.has(dlg_id)){
        dlgSet.add(dlg_id);
        dlg.addEventListener("click", (ev : MouseEvent)=>{
            dlg.close();
        });
    }

    // const rc = dlg.getBoundingClientRect();
    // if(document.documentElement.scrollWidth < ev.pageX + rc.width){
    //     dlg.style.left = `${document.documentElement.scrollWidth - rc.width}px`;
    // }
}


let langList : string[] = [ "ja", "en", "ko", "zh" ];
export let langIdx : number = 1;

let showSubgraph : boolean = true;

function makeImgFromNode(map_div : HTMLElement, doc : Doc, g : SVGGraphicsElement){
    if(doc.img == undefined){

        doc.img = document.createElement("img");
        doc.img.alt = doc.localTitle();
        doc.img.style.position = "absolute";

        doc.img.addEventListener("click", doc.onVizClick.bind(doc));

        firebase_ts.getThumbnailDownloadURL(doc.id).then((url:string)=>{
            doc.img!.src = url;
        });    
    }

    const bbox = g.getBoundingClientRect();

    doc.img.style.left = `${bbox.x + 2}px`;
    doc.img.style.top  = `${bbox.y + 2}px`;
    doc.img.style.width  = `${bbox.width  - 4}px`;
    doc.img.style.height = `${bbox.height - 4}px`;

    map_div.append(doc.img);
}

export class Graph {
    docs : Doc[];
    edgeMap = new Map<string, Edge>();
    sections : Section[];
    selections : Doc[] = [];

    constructor(docs : Doc[], sections : Section[], edge_map : Map<string, Edge>){
        this.docs  = docs;
        this.sections = sections;
        this.edgeMap = edge_map;
    }

    edges() : Edge[]{
        return Array.from(this.edgeMap.values());
    }

    makeViz(){
        let doc_map = new Map<string, Doc>();
        this.docs.forEach(doc => doc_map.set(`${doc.id}`, doc));

        let sec_map = new Map<string, Section>();
        this.sections.forEach(sec => sec_map.set(`s${sec.id}`, sec));

        let docLines  : string[] = [];
        let secLines  : string[] = [];
        let edgeLines : string[] = [];

        if(showSubgraph){
            this.docs.filter(doc => doc.parent == undefined).forEach(doc => doc.makeDot(docLines));
            this.sections.filter(sec => sec.parent == undefined).forEach(sec => sec.makeDot(secLines));
        }
        else{
            this.docs.forEach(doc => doc.makeDot(docLines));
        }

        this.edges().forEach(edge => edge.makeDot(edgeLines));

        const ranks : string[] = [];

        let dot = `
        digraph graph_name {
            graph [
                rankdir = "TB";
                charset = "UTF-8";
            ];
            ${docLines.join('\n')}
            ${secLines.join('\n')}
            ${edgeLines.join('\n')}
            ${ranks.join('\n')}
        }
        `;
        msg(`dot:${dot}`);

        Viz.instance().then(async function(viz:any) {

            var svg = viz.renderSVGElement(dot) as SVGSVGElement;

            svg.addEventListener("contextmenu", onMenu);
            svg.addEventListener("click", graph.onClick.bind(graph));

            const map_div = $("map-div");
            map_div.innerHTML = "";

            map_div.appendChild(svg);

            const rc = svg.getBoundingClientRect();

            map_div.style.width = `${rc.width.toFixed()}px`;
            map_div.style.height = `${rc.height.toFixed()}px`;


            const nodes = Array.from(svg.getElementsByClassName("node doc")) as SVGGElement[];
            for(const g of nodes){
                const doc = doc_map.get(g.id);
                if(doc == undefined){

                    msg(`node NG: ${g.id} [${g.textContent}]`);
                }
                else{

                    makeImgFromNode(map_div, doc, g);

                    const polygons = g.getElementsByTagName("polygon");
                    if(polygons.length == 1){
                        doc.polygon = polygons.item(0)!;
                    }
                }

                g.setAttribute("cursor", "pointer");
            }


            const edges = Array.from(svg.getElementsByClassName("edge")) as SVGGElement[];
            for(const g of edges){
                const edge = graph.edgeMap.get(g.id);
                if(edge == undefined){

                    msg(`edge NG: ${g.id} [${g.textContent}]`);
                }
                else{
                    g.addEventListener("click", edge.onEdgeClick.bind(edge));
                    g.addEventListener("contextmenu", edge.onEdgeMenu.bind(edge));

                    const paths = g.getElementsByTagName("path");
                    if(paths.length == 1){
                        edge.path = paths.item(0)!;
                    }
                    else{
                        msg(`edge no path: ${g.id} ${paths.length} [${g.textContent}]`);                        
                    }
                }

                g.setAttribute("cursor", "crosshair");
            }

            if(showSubgraph){

                for(const [id, sec] of sec_map.entries()){
                    const g = svg.getElementById(id) as SVGGElement;
                    assert(g != undefined);
                    g.addEventListener("click", sec.onSectionClick.bind(sec));
                    g.addEventListener("contextmenu", sec.onSectionMenu.bind(sec));

                    const polygons = g.getElementsByTagName("polygon");
                    if(polygons.length == 1){
                        sec.polygon = polygons.item(0)!;
                    }

                    g.setAttribute("cursor", "pointer");
                }
            }
        });
    }


    async onKeyDown(ev : KeyboardEvent){        
        if(ev.key == "Escape"){
            this.clearSelections();
        }
        else if(ev.key == "Delete"){
            await this.deleteEdges();
        }
    }

    async deleteEdges(){
        const selected_edges = this.edges().filter(edge => edge.selected);
        if(selected_edges.length != 0){

            if(window.confirm("Do you really want to delete?")) {
                selected_edges.forEach(edge => this.edgeMap.delete(edge.key()));

                this.clearSelections();

                await updateGraph();
            }
        }
    }

    clearSelections(){
        this.docs.filter(doc => doc.selected).forEach(doc => doc.select(false));
        this.selections = [];
        
        this.edges().filter(edge => edge.selected).forEach(edge => edge.select(false));
    }

    addDoc(title : string, wiki : string | undefined) : Doc {
        let next_id = 1;
        for(const doc of this.docs){
            if(next_id < doc.id){
                break;
            }
            next_id++;
        }
        const doc = new Doc(next_id, title, wiki);
        this.docs.push(doc);

        this.docs.sort((a:Doc, b:Doc) => a.id - b.id);

        return doc;
    }

    addSection(title : string, wiki : string | undefined) : Section{
        let next_id = 1;
        for(const sec of this.sections){
            if(next_id < sec.id){
                break;
            }
            next_id++;
        }

        const section = new Section(next_id, title, wiki);
        this.sections.push(section);

        this.docs.filter(x => x.selected).forEach(x => x.parent = section);
        this.clearSelections();

        return section;
    }

    async removeFromSection(ev : MouseEvent){
        this.docs.filter(x => x.selected).forEach(x => x.parent = undefined);
        this.clearSelections();

        await updateGraph();
    }

    async connectEdge(ev : MouseEvent){
        if(this.selections.length < 2){
            return;
        }

        for(let i = 0; i + 1 < this.selections.length; i++){
            const [src, dst] = this.selections.slice(i, i + 2);

            if(getEdge(this.edgeMap, src, dst) == undefined){
                addEdge(this.edgeMap, src, dst);
            }
        }

        this.clearSelections();

        await updateGraph();
    }

    onClick(ev : MouseEvent){
        this.docs.filter(x => x.selected).forEach(x => x.select(false));
    }
}

export let graph : Graph;

export class Section extends MapItem {
    polygon : SVGPolygonElement | undefined;

    constructor(id: number, title : string, wiki : string | undefined){
        super(id, title, wiki);
    }

    select(selected : boolean){
        this.selected = selected;

        let color = (this.selected ? "red" : "black");

        if(this.polygon != undefined){
            this.polygon.setAttribute("stroke", color);
        }
    }

    onSectionClick(ev : MouseEvent){
        ev.stopPropagation();
        ev.preventDefault();

        if(ev.ctrlKey){

            this.select(!this.selected);
            msg(`section : ${this.title}`);
        }
    }

    onSectionMenu(ev : MouseEvent){
        ev.stopPropagation();
        ev.preventDefault();

        $("add-section-to-section").onclick = this.addSectionToSection.bind(this);
        $("add-item-to-section").onclick = this.addItemToSection.bind(this);
        $("append-to-section").onclick = this.appendToSection.bind(this);
        showDlg(ev, "graph-section-menu-dlg");
    }

    async addItemToSection(ev : MouseEvent){
        const title = prompt();
        if(title == null){
            return;
        }

        const doc = graph.addDoc(title, undefined);
        doc.parent = this;

        await updateGraph();
    }

    async addSectionToSection(ev : MouseEvent){
        const title = prompt();
        msg(`input ${title}`);
        if(title == null){
            return;
        }
        const sec = graph.addSection(title, undefined);
        sec.parent = this;

        await updateGraph();
    }

    async appendToSection(ev : MouseEvent){
        msg(`append To Section`);
        allMapItems().filter(x => x.selected).forEach(x => x.parent = this);
        graph.clearSelections();

        await updateGraph();
    }

    makeDot(lines : string[]){
        lines.push(`subgraph cluster_${this.id} {`);
        lines.push(`    id = "s${this.id}";`);
        lines.push(`    label = "${this.localTitle()}";`);
        lines.push(`    labelloc  = "b";`);
        lines.push(`    labeljust = "l";`);
        lines.push(`    bgcolor   = "cornsilk";`);
        lines.push(`    color     = "green";`);
        lines.push(`    penwidth  = 2;`);

        graph.sections.filter(sec => sec.parent == this).forEach(sec => sec.makeDot(lines));
        const docs = graph.docs.filter(sec => sec.parent == this);
        if(docs.length == 0){
            // If there is no children, subgraph is not created.
            
            lines.push(`b${this.id}dummy [ label="dummy" style="invis" ];` );
        }
        else{
            docs.forEach(doc => doc.makeDot(lines));
        }

        lines.push(`}`);
    }
}


async function onMenu(ev : MouseEvent){
    ev.preventDefault();
    ev.stopPropagation();

    showDlg(ev, "graph-menu-dlg");
}

function setLangHandler(){
    const lang_buttons = Array.from(document.getElementsByClassName("lang")) as HTMLButtonElement[];
    for(const lang_button of lang_buttons){
        lang_button.addEventListener("click", (ev: MouseEvent)=>{
            const lang = lang_button.id.substring(5);
            langIdx = langList.indexOf(lang);
            msg(`lang:${langIdx} ${lang}`);
            if(langIdx == undefined){
                throw new MyError();
            }

            graph.makeViz();
        })

    }

}

function getSearchParams(){
    const url = new URL(window.location.href);
    const params = url.searchParams;

    const lang = params.get("lang");
    if(lang != undefined){
        const lang_idx = langList.indexOf(lang);
        if(lang_idx != -1){
            langIdx = lang_idx;
        }
    }
}

export async function bodyOnLoadGraph(){
    getSearchParams();

    setLangHandler();

    $("map-svg").style.display = "none";

/*
    const data = await fetchJson(`../data/graph.json`);

    const [docs, sections, edge_map] = makeDocsFromJson(data);

*/
}

export async function updateGraph(){
    graph.makeViz();        

    if(user == null || rootFolder == null || refId == undefined){
        throw new MyError();
    }

    const graph_obj = {
        version : 1.0,
        docs : graph.docs.map(x => x.makeObj()),
        sections : graph.sections.map(x => x.makeObj()),
        edges : graph.edges().map(x => x.makeObj())
    };

    try{
        await getDocRef("graph").set(graph_obj);
        msg(`update graph [${JSON.stringify(graph_obj, null, 4)}]`);
    }
    catch(e){
        msg(`update graph error: ${user.email} ref:${refId} ${e}`);
    }
}

export async function addGraphItem(){
    const title = prompt();
    msg(`input ${title}`);
    if(title == null){
        return;
    }
    graph.addDoc(title, undefined);
    await updateGraph();
}

export async function addGraphSection(){
    const title = prompt();
    msg(`input ${title}`);
    if(title == null){
        return;
    }
    graph.addSection(title, undefined);
    await updateGraph();
}

export async function changeDisplay(){
    showSubgraph = ! showSubgraph;
    graph.makeViz();      
}

function allMapItems() : MapItem[] {
    return (graph.docs as MapItem[]).concat(graph.sections);
}

}