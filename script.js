import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

"use strict";

const bt_undo = document.getElementById('bt_undo');
const bt_clear = document.getElementById('bt_clear');
const bt_random = document.getElementById('bt_random');
const bt_cpu = document.getElementById('bt_cpu');
const board_id = document.getElementById('board_id');
const cv = document.getElementById('cv');

addEventListener("mousemove",on_mousemove);
addEventListener("click",on_click);

bt_undo.addEventListener("click",on_undo);
bt_clear.addEventListener("click",on_clear);
bt_random.addEventListener("click",on_random);
bt_cpu.addEventListener("click",on_cpu);

class Board  {
    constructor() {
        this.turn = 1; // 1 for black, -1 for white
        this.black = 0n;
        this.white = 0n;
    }
};

const board= new Board();
const history = [];

const scene = new THREE.Scene();
scene.background=new THREE.Color(0x006688);

const geo_plane = new THREE.BoxGeometry( 100, 2, 100 );
const geo_sphere= new THREE.SphereGeometry(4,12,12);
const geo_pole= new THREE.CylinderGeometry(1, 1, 40, 24);

const mat_plane = new THREE.MeshStandardMaterial({color:0xcccccc,side: THREE.DoubleSide});
const mat_pole = new THREE.MeshStandardMaterial({color:0xaaaaaa});
const mat_black = new THREE.MeshStandardMaterial({color:0x222222});
const mat_white = new THREE.MeshStandardMaterial({color:0xffffff});

const mesh_plane =new THREE.Mesh(geo_plane,mat_plane);
scene.add(mesh_plane);

const mesh_black = [];
const mesh_white = [];
const mesh_pole =[];

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
    mesh_white.push(new THREE.Mesh(geo_sphere,mat_white));
}

for(let i=0;i<5;i++){
    for(let j=0;j<5;j++){
        for(let k=0;k<5;k++){
            let mesh_id = i + j * 5 + k * 25;
            mesh_black[mesh_id].position.x=i*16-32;
            mesh_black[mesh_id].position.z=j*16-32;
            mesh_black[mesh_id].position.y=(5-k)*8-4;
            
            mesh_white[mesh_id].position.x=i*16-32;
            mesh_white[mesh_id].position.z=j*16-32;
            mesh_white[mesh_id].position.y=(5-k)*8-4;
        }
    }
}

const camera = new THREE.PerspectiveCamera( 70, 400 / 300, 1, 1000 );

let ang_lon=0;
let ang_lat=30;

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

function move(k){
    for(let i=100;i>=0;i-=25){
        if(((board.black|board.white) & (1n << BigInt(k+i)))==0n){
            if(board.turn==1){
                board.black |= (1n << BigInt(k+i));
                board.turn=-1;
                history.push(k+i);
            }
            else{
                board.white |= (1n << BigInt(k+i));
                board.turn=1;
                history.push(k+i);
            }
            return k+i
        }
    }
    return -1; // 無効な手
}

function draw_stones(){
    for(let i=0;i<125;i++){
        scene.remove(mesh_black[i]);
        scene.remove(mesh_white[i]);
    }
    for(let i=0;i<125;i++){
        if(board.black & (1n << BigInt(i))){
            scene.add(mesh_black[i]);
        }
        if(board.white & (1n << BigInt(i))){
            scene.add(mesh_white[i]);
        }
    }
    // 手番表示を追加
    if (board_id) {
        board_id.innerText = (board.turn === 1 ? "Black" : "White");
    }
}

function on_mousemove(e){
    if(e.buttons>0){
        ang_lon+=e.movementX/2;
        ang_lat+=e.movementY/2;
        //console.log(ang_lon,ang_lat);
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
            let last_pos=move(j);
            draw_stones();
            if(win_check(last_pos)) {
                board_id.innerText = (board.turn === -1 ? "Black" : "White") + " wins!";
            }
        }
    }
}

function undo(){
    let n;
    n=history.pop();
    if(n===undefined) return;
    if(board.turn==1){
        board.white &= ~(1n << BigInt(n));
        board.turn=-1;
    }
    else{
        board.black &= ~(1n << BigInt(n));
        board.turn=1;
    }
}

function on_undo(){
    undo();
    draw_stones();
}


function clear_board(){
    board.turn=1;
    board.black=0n;
    board.white=0n;
    history.splice(0);
}

function on_clear(){
    clear_board();
    draw_stones();
}

function createLegalMoves(){
    let legalMoves = [];
    for(let i=0;i<25;i++){
        if(((board.black | board.white) & (1n << BigInt(i)))== 0n){
            legalMoves.push(i);
        }
    }
    console.log("Legal Moves:", legalMoves);
    return legalMoves;
}

function random_move(){
    let legalmove=createLegalMoves();
    let length=legalmove.length
    let last_pos = -1; // 最後の手を記録する変数
    if(length>0){
        let randomIndex = Math.floor(Math.random()*length);
        last_pos=move(legalmove[randomIndex]);
        return last_pos;
    }
    return -1; // もし合法手がなければ-1を返す
}

function on_random(){
    let last_pos = random_move();
    if(win_check(last_pos)) {
        board_id.innerText = (board.turn === -1 ? "Black" : "White") + " wins!";
    }
    draw_stones();
}

function win_check(last_pos) {
    let bitboard = board.turn === -1 ? board.black : board.white;
    for (const pattern of WIN_PATTERNS_PER_CELL[last_pos]) {
        if ((bitboard & pattern) === pattern) {
            return true;
        }
    }
    return false;
}

function on_cpu(){

}



// --- 勝ちパターン生成（各セルごとに、そのセルを含むパターンのみ保持） ---
function generateWinPatternsPerCell() {
    const size = 5;
    const directions = [
        [1, 0, 0],  // x方向
        [0, 1, 0],  // y方向
        [0, 0, 1],  // z方向
        [1, 1, 0],  // x+y
        [1, 0, 1],  // x+z
        [0, 1, 1],  // y+z
        [1, 1, 1],  // x+y+z
        [1, -1, 0], // x-y
        [1, 0, -1], // x-z
        [0, 1, -1], // y-z
        [1, -1, 1], // x-y+z
        [1, 1, -1], // x+y-z
        [1, -1, -1] // x-y-z
    ];
    // 125個のセルごとに配列を用意
    const patternsPerCell = Array(125).fill(0).map(() => []);
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            for (let z = 0; z < size; z++) {
                for (const [dx, dy, dz] of directions) {
                    let cells = [];
                    for (let k = 0; k < 4; k++) {
                        let nx = x + dx * k;
                        let ny = y + dy * k;
                        let nz = z + dz * k;
                        if (
                            nx >= 0 && nx < size &&
                            ny >= 0 && ny < size &&
                            nz >= 0 && nz < size
                        ) {
                            cells.push(nx + ny * size + nz * size * size);
                        }
                    }
                    if (cells.length === 4) {
                        // ビットボード化
                        let pattern = 0n;
                        for (const idx of cells) {
                            pattern |= (1n << BigInt(idx));
                        }
                        // このパターンに含まれる全セルに追加
                        for (const idx of cells) {
                            patternsPerCell[idx].push(pattern);
                        }
                    }
                }
            }
        }
    }
    return patternsPerCell;
}

// グローバルで一度だけ生成
const WIN_PATTERNS_PER_CELL = generateWinPatternsPerCell();

console.log(WIN_PATTERNS_PER_CELL[0]); // 例としてセル0のパターンを表示

// 初期化時にも手番を表示
draw_stones();