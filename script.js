import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

"use strict";

const black=1;
const white=2;
const draw=3;

let turn=black;
let board=Array(125);
board.fill(0);
let history=[];

const random_table=[];
const node={};

let turn_backup;
let board_backup=Array(125);
let history_backup=[];

const bt_undo = document.getElementById('bt_undo');
const bt_clear = document.getElementById('bt_clear');
const bt_random = document.getElementById('bt_random');
const bt_cpu = document.getElementById('bt_cpu');
const board_id = document.getElementById('board_id');
const cv = document.getElementById('cv');

function select(){
    let max_value=-10000;
    let max_index;
    let lm=makeLegalMove();
    for(let i=0;i<lm.length;i++){
        move(lm[i]);
        let u=ucb();
        if(u>max_value){
            max_value=u;
            max_index=i;
        }
        undo();
    }
    move(lm[max_index]);
}

function ucb(){
    let id=get_id();
    let n=node[id].visited;
    let np=node[node[id].parent].visited;
    let wr=node[id].winrate;
    if(n==0 || np==0){
        return 10000;
    }
    else{
        let a=wr/n;
        let b=Math.sqrt(2*Math.log(np)/n);
        return a+b;
    }
}

function save_board(){
    turn_backup=turn;
    board_backup=[...board];
    history_backup=[...history];
}

function restore_board(){
    turn=turn_backup;
    board=[...board_backup];
    history=[...history_backup];
}

function get_id(){
    let id=0;
    for(let i=0;i<125;i++){
        if(board[i]==black){
            id=(id^random_table[i]);
        }
        if(board[i]==white){
            id=(id^random_table[i+125]);
        }
    }
    return id;
}

function expand(){
    let legalmove=makeLegalMove();
    for(let i=0;i<legalmove.length;i++){
        let pr=get_id();
        move(legalmove[i]);
        node[get_id()]={
            visited:0,
            winrate:0,
            parent:pr,
            expanded:false,
            root:false
        }
        on_undo();
    }
    node[get_id()].expanded=true;
}

function turnover(){
    if(turn==black){
        turn=white;}
    else{
        turn=black;
    }
}

function makeLegalMove(){
    let legalmove=[];
    for(let i=0;i<25;i++){
        for(let j=0;j<5;j++){
            if(board[i+j*25]==0){
                legalmove.push(i+j*25);
                break;
            }
        }
    }
    return legalmove;
}

const winPatterns=[
    [0,1,2,3],
    [1,2,3,4],
    [5,6,7,8],
    [6,7,8,9],
    [10,11,12,13],
    [11,12,13,14],
    [15,16,17,18],
    [16,17,18,19],
    [20,21,22,23],
    [21,22,23,24],
    [25,26,27,28],
    [26,27,28,29],
    [30,31,32,33],
    [31,32,33,34],
    [35,36,37,38],
    [36,37,38,39],
    [40,41,42,43],
    [41,42,43,44],
    [45,46,47,48],
    [46,47,48,49],
    [50,51,52,53],
    [51,52,53,54],
    [55,56,57,58],
    [56,57,58,59],
    [60,61,62,63],
    [61,62,63,64],
    [65,66,67,68],
    [66,67,68,69],
    [70,71,72,73],
    [71,72,73,74],
    [75,76,77,78],
    [76,77,78,79],
    [80,81,82,83],
    [81,82,83,84],
    [85,86,87,88],
    [86,87,88,89],
    [90,91,92,93],
    [91,92,93,94],
    [95,96,97,98],
    [96,97,98,99],
    [100,101,102,103],
    [101,102,103,104],
    [105,106,107,108],
    [106,107,108,109],
    [110,111,112,113],
    [111,112,113,114],
    [115,116,117,118],
    [116,117,118,119],
    [120,121,122,123],
    [121,122,123,124],
    [0,5,10,15],
    [5,10,15,20],
    [1,6,11,16],
    [6,11,16,21],
    [2,7,12,17],
    [7,12,17,22],
    [3,8,13,18],
    [8,13,18,23],
    [4,9,14,19],
    [9,14,19,24],
    [25,30,35,40],
    [30,35,40,45],
    [26,31,36,41],
    [31,36,41,46],
    [27,32,37,42],
    [32,37,42,47],
    [28,33,38,43],
    [33,38,43,48],
    [29,34,39,44],
    [34,39,44,49],
    [50,55,60,65],
    [55,60,65,70],
    [51,56,61,66],
    [56,61,66,71],
    [52,57,62,67],
    [57,62,67,72],
    [53,58,63,68],
    [58,63,68,73],
    [54,59,64,69],
    [59,64,69,74],
    [75,80,85,90],
    [80,85,90,95],
    [76,81,86,91],
    [81,86,91,96],
    [77,82,87,92],
    [82,87,92,97],
    [78,83,88,93],
    [83,88,93,98],
    [79,84,89,94],
    [84,89,94,99],
    [100,105,110,115],
    [105,110,115,120],
    [101,106,111,116],
    [106,111,116,121],
    [102,107,112,117],
    [107,112,117,122],
    [103,108,113,118],
    [108,113,118,123],
    [104,109,114,119],
    [109,114,119,124],
    [0,25,50,75],
    [25,50,75,100],
    [1,26,51,76],
    [26,51,76,101],
    [2,27,52,77],
    [27,52,77,102],
    [3,28,53,78],
    [28,53,78,103],
    [4,29,54,79],
    [29,54,79,104],
    [5,30,55,80],
    [30,55,80,105],
    [6,31,56,81],
    [31,56,81,106],
    [7,32,57,82],
    [32,57,82,107],
    [8,33,58,83],
    [33,58,83,108],
    [9,34,59,84],
    [34,59,84,109],
    [10,35,60,85],
    [35,60,85,110],
    [11,36,61,86],
    [36,61,86,111],
    [12,37,62,87],
    [37,62,87,112],
    [13,38,63,88],
    [38,63,88,113],
    [14,39,64,89],
    [39,64,89,114],
    [15,40,65,90],
    [40,65,90,115],
    [16,41,66,91],
    [41,66,91,116],
    [17,42,67,92],
    [42,67,92,117],
    [18,43,68,93],
    [43,68,93,118],
    [19,44,69,94],
    [44,69,94,119],
    [20,45,70,95],
    [45,70,95,120],
    [21,46,71,96],
    [46,71,96,121],
    [22,47,72,97],
    [47,72,97,122],
    [23,48,73,98],
    [48,73,98,123],
    [24,49,74,99],
    [49,74,99,124],
    [0,6,12,18],
    [4,8,12,16],
    [1,7,13,19],
    [3,7,11,15],
    [6,12,18,24],
    [8,12,16,20],
    [5,11,17,23],
    [9,13,17,21],
    [25,31,37,43],
    [29,33,37,41],
    [26,32,38,44],
    [28,32,36,40],
    [31,37,43,49],
    [33,37,41,45],
    [30,36,42,48],
    [34,38,42,46],
    [50,56,62,68],
    [54,58,62,66],
    [51,57,63,69],
    [53,57,61,65],
    [56,62,68,74],
    [58,62,66,70],
    [55,61,67,73],
    [59,63,67,71],
    [75,81,87,93],
    [79,83,87,91],
    [76,82,88,94],
    [78,82,86,90],
    [81,87,93,99],
    [83,87,91,95],
    [80,86,92,98],
    [84,88,92,96],
    [100,106,112,118],
    [104,108,112,116],
    [101,107,113,119],
    [103,107,111,115],
    [106,112,118,124],
    [108,112,116,120],
    [105,111,117,123],
    [109,113,117,121],
    [0,30,60,90],
    [20,40,60,80],
    [5,35,65,95],
    [15,35,55,75],
    [30,60,90,120],
    [40,60,80,100],
    [25,55,85,115],
    [45,65,85,105],
    [1,31,61,91],
    [21,41,61,81],
    [6,36,66,96],
    [16,36,56,76],
    [31,61,91,121],
    [41,61,81,101],
    [26,56,86,116],
    [46,66,86,106],
    [2,32,62,92],
    [22,42,62,82],
    [7,37,67,97],
    [17,37,57,77],
    [32,62,92,122],
    [42,62,82,102],
    [27,57,87,117],
    [47,67,87,107],
    [3,33,63,93],
    [23,43,63,83],
    [8,38,68,98],
    [18,38,58,78],
    [33,63,93,123],
    [43,63,83,103],
    [28,58,88,118],
    [48,68,88,108],
    [4,34,64,94],
    [24,44,64,84],
    [9,39,69,99],
    [19,39,59,79],
    [34,64,94,124],
    [44,64,84,104],
    [29,59,89,119],
    [49,69,89,109],
    [0,26,52,78],
    [4,28,52,76],
    [1,27,53,79],
    [3,27,51,75],
    [26,52,78,104],
    [28,52,76,100],
    [25,51,77,103],
    [29,53,77,101],
    [5,31,57,83],
    [9,33,57,81],
    [6,32,58,84],
    [8,32,56,80],
    [31,57,83,109],
    [33,57,81,105],
    [30,56,82,108],
    [34,58,82,106],
    [10,36,62,88],
    [14,38,62,86],
    [11,37,63,89],
    [13,37,61,85],
    [36,62,88,114],
    [38,62,86,110],
    [35,61,87,113],
    [39,63,87,111],
    [15,41,67,93],
    [19,43,67,91],
    [16,42,68,94],
    [18,42,66,90],
    [41,67,93,119],
    [43,67,91,115],
    [40,66,92,118],
    [44,68,92,116],
    [20,46,72,98],
    [24,48,72,96],
    [21,47,73,99],
    [23,47,71,95],
    [46,72,98,124],
    [48,72,96,120],
    [45,71,97,123],
    [49,73,97,121],
    [0,31,62,93],
    [25,56,87,118],
    [5,36,67,98],
    [30,61,92,123],
    [1,32,63,94],
    [26,57,88,119],
    [6,37,68,99],
    [31,62,93,124],
    [3,32,61,90],
    [28,57,86,115],
    [8,37,66,95],
    [33,62,91,120],
    [4,33,62,91],
    [29,58,87,116],
    [9,38,67,96],
    [34,63,92,121],
    [15,36,57,78],
    [40,61,82,103],
    [20,41,62,83],
    [45,66,87,108],
    [16,37,58,79],
    [41,62,83,104],
    [21,42,63,84],
    [46,67,88,109],
    [18,37,56,75],
    [43,62,81,100],
    [23,42,61,80],
    [48,67,86,105],
    [19,38,57,76],
    [44,63,82,101],
    [24,43,62,81],
    [49,68,87,106]
];


addEventListener("mousemove",on_mousemove);
addEventListener("click",on_click);
bt_undo.addEventListener("click",on_undo);
bt_clear.addEventListener("click",on_clear);
bt_random.addEventListener("click",on_random);
bt_cpu.addEventListener("click",on_cpu);

const scene = new THREE.Scene();
scene.background=new THREE.Color(0x006688);

const geo_plane = new THREE.BoxGeometry( 100, 100, 2 );
const geo_box= new THREE.BoxGeometry(10,10,10);
const geo_sphere= new THREE.SphereGeometry(4,12,12);
const geo_pole= new THREE.BoxGeometry(2,40,2);

const mat_plane = new THREE.MeshStandardMaterial({color:0xcccccc,side: THREE.DoubleSide});
const mat_pole = new THREE.MeshStandardMaterial({color:0xaaaaaa});
const mat_black = new THREE.MeshStandardMaterial({color:0x222222});
const mat_white = new THREE.MeshStandardMaterial({color:0xffffff});

const mesh_plane =new THREE.Mesh(geo_plane,mat_plane);
scene.add(mesh_plane);

const mesh_black = [];
const mesh_white = [];
const mesh_pole =[];
const pole_xz =[];

for(let i=0;i<25;i++){
    mesh_pole.push(new THREE.Mesh(geo_pole,mat_pole));
    mesh_pole[i].position.x=i%5*16-32;
    mesh_pole[i].position.z=Math.floor(i/5)*16-32;
    mesh_pole[i].position.y=20;
    mesh_pole[i].name=String(i);
    scene.add(mesh_pole[i]);
}

for(let i=0;i<125;i++){
    mesh_black.push(new THREE.Mesh(geo_sphere,mat_black));
    mesh_black[i].position.x=(i%25)%5*16-32;
    mesh_black[i].position.z=Math.floor((i%25)/5)*16-32;
    mesh_black[i].position.y=Math.floor(i/25)*8+4;
    
    mesh_white.push(new THREE.Mesh(geo_sphere,mat_white));
    mesh_white[i].position.x=(i%25)%5*16-32;
    mesh_white[i].position.z=Math.floor((i%25)/5)*16-32;
    mesh_white[i].position.y=Math.floor(i/25)*8+4;
}

for(let i=0;i<250;i++){
    random_table.push(Math.random()*0xffffffff);
}


/* const camera = new THREE.OrthographicCamera(-120, +120, 90, -90, 1, 1000); */
const camera = new THREE.PerspectiveCamera( 70, 400 / 300, 1, 1000 );

let ang_lon=0;
let ang_lat=30;


mesh_plane.rotation.x=-90*Math.PI/180;
mesh_plane.name="plane";

const light1 = new THREE.DirectionalLight(0xffffff, 0.4);
const light2 = new THREE.DirectionalLight(0xffffff, 0.4);
const light3 = new THREE.DirectionalLight(0xffffff, 0.4);
const light4 = new THREE.DirectionalLight(0xffffff, 0.2); // 少し弱めの光

light1.position.set(100, 100, 0);
light2.position.set(0, 100, 100);
light3.position.set(-100, 100, -100);
light4.position.set(0, -100, 0); // 下から


scene.add(light1);
scene.add(light2);
scene.add(light3);
scene.add(light4);

const renderer = new THREE.WebGLRenderer( { antialias: false,canvas: cv } );
renderer.setSize( 800, 600 );
renderer.setAnimationLoop( mainLoop );

function mainLoop( ) {
    camera.position.x = 120*Math.cos(ang_lon*Math.PI/180)*Math.cos(ang_lat*Math.PI/180);
    camera.position.z = 120*Math.sin(ang_lon*Math.PI/180)*Math.cos(ang_lat*Math.PI/180);
    camera.position.y = 120*Math.sin(ang_lat*Math.PI/180);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    renderer.render( scene, camera );
}

function move(n){
    history.push(n);
    board[n]=turn;
    turnover();
}

function draw_stones(){
    
    for(let i=0;i<125;i++){
        scene.remove(mesh_black[i]);
        scene.remove(mesh_white[i]);
    }
    
    for(let i=0;i<125;i++){
        if(board[i]==black){
            scene.add(mesh_black[i]);
        }
        if(board[i]==white){
            scene.add(mesh_white[i]);
        }
    }
}

function on_mousemove(e){
    if(e.buttons>0){
        ang_lon+=e.movementX;
        ang_lat+=e.movementY;
        console.log(ang_lon,ang_lat);
        if(ang_lat>90) ang_lat=90;
        if(ang_lat<-90) ang_lat=-90;
        if(ang_lon>360) ang_lon-=360;
        if(ang_lon<-360) ang_lon+=360;
    }
}

function on_click(e){
    const raycaster = new THREE.Raycaster();
    const vector = new THREE.Vector2(
      (e.offsetX / 800) * 2 - 1,
      (e.offsetY / 600) * (-2) + 1
    );
    
    raycaster.setFromCamera(vector, camera);
    
    const intersects = raycaster.intersectObjects(scene.children);
    
    if (intersects.length) {
        let o_name= intersects[0].object.name;
        let j=Number(o_name);
        if(j>=0 && j<25 && o_name!=""){
            for(let i=0;i<125;i+=25){
                if(board[i+j]==0){
                    move(i+j);
                    draw_stones();
                    break;
                }
            }
        }
    }
    board_id.innerText="id:"+get_id();
}

function undo(){
    let n;
    n=history.pop();
    board[n]=0;
    turnover();
}

function on_undo(){
    undo();
    draw_stones();
}


function clear_board(){
    turn=black;
    history.splice(0);
    board.fill(0);
}

function on_clear(){
    clear_board();
    draw_stones();
}

function random_move(){
    let legalmove=makeLegalMove();
    let length=legalmove.length
    if(length>0){
        let randomIndex = Math.floor(Math.random()*length);
        move(legalmove[randomIndex]);
    }
}

function on_random(){
    random_move();
    draw_stones();
}

function playout(){
    let wc;
    save_board();
    while(win_check()==0){
        random_move();
    }
    wc=win_check();
    restore_board();
    return wc;
}

function win_check(){
    for(let i=0;i<winPatterns.length;i++){
        if(board[winPatterns[i][0]]==black
            && board[winPatterns[i][1]]==black
            && board[winPatterns[i][2]]==black
            && board[winPatterns[i][3]]==black
        ){
            return black;
        }
        if(board[winPatterns[i][0]]==white
            && board[winPatterns[i][1]]==white
            && board[winPatterns[i][2]]==white
            && board[winPatterns[i][3]]==white
        ){
            return white;
        }
     }
     return 0;
}

function backup(wc){
    let wr;
    if(wc==black){
        wr=1.0;
    }
    else if(wc==white){
        wr=0.0;
    }
    else if(wc==draw){
        wr=0.5;
    }
    while(node[get_id()].root==false){
        node[get_id()].visited++;
        if(turn==black){
            node[get_id()].winrate+=(1.0-wr);
        }
        else{
            node[get_id()].winrate+=wr;
        }
        undo();
    }
    node[get_id()].winrate+=(1.0-wr);
    node[get_id()].visited++;
}

function on_cpu(){
    document.body.style.cursor = 'not-allowed';
    node[get_id()]={
        visited:0,
        winrate:0,
        expanded:false,
        root:true
    };
    for(let i=0;i<10000;i++){
        while(node[get_id()].visited>5 && win_check()==0){
            if(node[get_id()].expanded==false){
                expand();
            }
            select();
        }
        backup(playout());
    }
    console.log(get_id(),node[get_id()]);
    let lm=makeLegalMove();
    let max_value=0;
    let max_index;
    for(let i=0;i<lm.length;i++){
        move(lm[i]);
        console.log(get_id(),node[get_id()]);
        if(node[get_id()].visited>max_value){
            max_index=i;
            max_value=node[get_id()].visited;
        }
        undo();
    }
    move(lm[max_index]);
    draw_stones();
    document.body.style.cursor = 'default';

}