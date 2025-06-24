import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

"use strict";

const bt_undo = document.getElementById('bt_undo');
const bt_clear = document.getElementById('bt_clear');
const bt_cpu = document.getElementById('bt_cpu');
const bt_redo = document.getElementById('bt_redo');
const board_id = document.getElementById('board_id');
const cv = document.getElementById('cv');
const progressBar = document.getElementById('progressBar'); // プログレスバー要素を取得
console.log('progressBar element:', progressBar); // ★デバッグ用ログ追加

cv.addEventListener("mousemove", onMouseMove);
cv.addEventListener("click", onClick);

bt_undo.addEventListener("click", onUndo);
bt_clear.addEventListener("click", onClear);
bt_cpu.addEventListener("click", function() {
    const wasOff = !window.mctsMode;
    window.mctsMode = !window.mctsMode;
    if (window.mctsMode) {
        bt_cpu.style.color = '#fff';
        // OFF→ON時は必ず一度だけ勝率計算・表示（計算中なら中断してから）
        if (bt_cpu.dataset.mctsRunning === '1') {
            window.mctsAbort = true;
            setTimeout(() => { onCpu(true); }, 0);
        } else {
            onCpu(true);
        }
    } else {
        bt_cpu.style.color = '';
        document.getElementById('rate_area').innerHTML = '';
        window.mctsAbort = true;
    }
});
bt_redo.addEventListener("click", onRedo);

class Board  {
    constructor() {
        this.turn = 1;
        this.black = 0n;
        this.white = 0n;
        this.history = [];
        this.redoStack = []; // 追加: リドゥ用スタック
        this.lastPos = -1; // 追加
    }

    move(k) {
        for(let i=100;i>=0;i-=25){
            if(((this.black|this.white) & (1n << BigInt(k+i)))==0n){
                if(this.turn==1){
                    this.black |= (1n << BigInt(k+i));
                    this.turn=-1;
                    this.history.push(k+i);
                }
                else{
                    this.white |= (1n << BigInt(k+i));
                    this.turn=1;
                    this.history.push(k+i);
                }
                this.lastPos = k + i; // 追加
                return true; // 手が成功したことを示す
            }
        }
        return false; // 手が失敗したことを示す (例: 列が満杯)
    }

    undo() {
        let n = this.history.pop();
        if(n === undefined) return;
        this.redoStack.push(n); // 追加: アンドゥした手をリドゥスタックに追加
        if(this.turn == 1){
            this.white &= ~(1n << BigInt(n));
            this.turn = -1;
        } else {
            this.black &= ~(1n << BigInt(n));
            this.turn = 1;
        }
        this.lastPos = this.history.length > 0 ? this.history[this.history.length - 1] : -1; // 追加
    }

    redo() {
        let n = this.redoStack.pop();
        if(n === undefined) return;
        if(this.turn == 1){
            this.black |= (1n << BigInt(n));
            this.turn = -1;
            this.history.push(n); // 追加: リドゥした手をヒストリーに追加
        } else {
            this.white |= (1n << BigInt(n));
            this.turn = 1;
            this.history.push(n); // 追加: リドゥした手をヒストリーに追加
        }
        this.lastPos = n; // 追加: 最後の手を更新
    }

    clear() {
        this.turn = 1;
        this.black = 0n;
        this.white = 0n;
        this.history = [];
        this.redoStack = []; // 追加: リドゥスタックをクリア
        this.lastPos = -1; // 追加
    }

    winCheck() {
        if (this.lastPos === undefined || this.lastPos < 0) return 0;
        // 直前に打った手で勝ったのは「直前の手番」
        // this.turnは既に切り替わっているので、-this.turnが勝者
        let bitboard = this.turn === 1 ? this.white : this.black;
        for (const pattern of WIN_PATTERNS_PER_CELL[this.lastPos]) {
            if ((bitboard & pattern) === pattern) {
                return -this.turn; // 1:黒勝ち, -1:白勝ち
            }
        }
        return 0; // 勝者なし
    }

    createLegalMoves() {
        let legalMoves = [];
        for(let i=0;i<25;i++){
            if(((this.black | this.white) & (1n << BigInt(i)))== 0n){
                legalMoves.push(i);
            }
        }
        return legalMoves;
    }

    randomMove() {
        const legalMoves = this.createLegalMoves();
        if (legalMoves.length > 0) {
            const randomIndex = Math.floor(Math.random() * legalMoves.length);
            this.move(legalMoves[randomIndex]);
        }
        // 合法手がなければ何もしない
    }

    clone() {
        const newBoard = new Board();
        newBoard.turn = this.turn;
        newBoard.black = this.black;
        newBoard.white = this.white;
        newBoard.history = [...this.history];
        newBoard.lastPos = this.lastPos;
        return newBoard;
    }

    randomPlayout() {
        let boardCopy = this.clone();
        while (true) {
            const winner = boardCopy.winCheck();
            if (winner !== 0) return winner; // 1:黒勝ち, -1:白勝ち
            const moves = boardCopy.createLegalMoves();
            if (moves.length === 0) return 0; // 引き分け
            const idx = Math.floor(Math.random() * moves.length);
            boardCopy.move(moves[idx]);
        }
    }
};

const board = new Board();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x006688);

const geoPlane = new THREE.BoxGeometry(100, 2, 100);
const geoSphere = new THREE.SphereGeometry(4, 12, 12);
const geoPole = new THREE.CylinderGeometry(1, 1, 40, 24);

const matPlane = new THREE.MeshStandardMaterial({ color: 0xcccccc });
const matPole = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
const matBlack = new THREE.MeshStandardMaterial({ color: 0x222222 });
const matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });

const meshPlane = new THREE.Mesh(geoPlane, matPlane);
scene.add(meshPlane);

const meshBlack = [];
const meshWhite = [];
const meshPole = [];
const meshPoleLabels = [];

for (let i = 0; i < 25; i++) {
    meshPole.push(new THREE.Mesh(geoPole, matPole));
    meshPole[i].name = String(i);
    // --- 番号ラベルの追加（やや大きめフォント・スプライトは8,8,1のまま） ---
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 48px sans-serif'; // フォントサイズをやや大きく
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(i.toString(), 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(8, 8, 1); // スプライトサイズはそのまま
    meshPoleLabels.push(sprite);
}

for (let i = 0; i < 125; i++) {
    meshBlack.push(new THREE.Mesh(geoSphere, matBlack));
    meshWhite.push(new THREE.Mesh(geoSphere, matWhite));
}

for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
        
        let poleId = i + j * 5;
        let mx= i * 16 - 32;
        let mz= j * 16 - 32;
        
        meshPole[poleId].position.x = mx;
        meshPole[poleId].position.z = mz;
        meshPole[poleId].position.y = 20;
        scene.add(meshPole[poleId]);
        // --- ラベルの位置調整と追加 ---
        meshPoleLabels[poleId].position.x = mx;
        meshPoleLabels[poleId].position.z = mz;
        meshPoleLabels[poleId].position.y = 42; // ポールの上に表示
        scene.add(meshPoleLabels[poleId]);
        
        for (let k = 0; k < 5; k++) {
            let meshId = i + j * 5 + k * 25;
            let my= (5 - k) * 8 - 4;

            meshBlack[meshId].position.x = mx;
            meshBlack[meshId].position.z = mz;
            meshBlack[meshId].position.y = my;

            meshWhite[meshId].position.x = mx;
            meshWhite[meshId].position.z = mz;
            meshWhite[meshId].position.y = my;
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

function drawStones() {
    for(let i=0;i<125;i++){
        scene.remove(meshBlack[i]);
        scene.remove(meshWhite[i]);
    }
    for(let i=0;i<125;i++){
        if(board.black & (1n << BigInt(i))){
            scene.add(meshBlack[i]);
        }
        if(board.white & (1n << BigInt(i))){
            scene.add(meshWhite[i]);
        }
    }
    // 手番表示を追加
    if (board_id) {
        board_id.innerText = (board.turn === 1 ? "Black" : "White");
    }
    // 勝利判定
    const winner = board.winCheck();
    if (winner !== 0) {
        board_id.innerText = winner === 1 ? "Black wins!" : "White wins!";
    }
    // UNDO/REDOボタンの有効・無効制御
    if (bt_undo) bt_undo.disabled = (board.history.length === 0);
    if (bt_redo) bt_redo.disabled = (board.redoStack.length === 0);
}

function onMouseMove(e){
    if(e.buttons>0){
        ang_lon+=e.movementX/2;
        ang_lat+=e.movementY/2;
        if(ang_lat>90) ang_lat=90;
        if(ang_lat<-90) ang_lat=-90;
        if(ang_lon>360) ang_lon-=360;
        if(ang_lon<-360) ang_lon+=360;
    }
}

function requestMctsRecalc() {
    if (bt_cpu.dataset.mctsRunning === '1') {
        window.mctsAbort = true;
        window.mctsRecalcPending = true;
    } else {
        onCpu(true);
    }
}

function onClick(e){
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
            board.move(j);
            drawStones();
            if (window.mctsMode) {
                requestMctsRecalc();
            } else {
                document.getElementById('rate_area').innerHTML = '';
            }
        }
    }
}

function onUndo(){
    board.undo();
    drawStones();
    if (window.mctsMode) {
        requestMctsRecalc();
    } else {
        document.getElementById('rate_area').innerHTML = '';
    }
}

function onRedo(){
    board.redo();
    drawStones();
    if (window.mctsMode) {
        requestMctsRecalc();
    } else {
        document.getElementById('rate_area').innerHTML = '';
    }
}

function onClear(){
    board.clear();
    drawStones();
    if (window.mctsMode) {
        requestMctsRecalc();
    } else {
        document.getElementById('rate_area').innerHTML = '';
    }
}

function onRandom(){}

async function onCpu(autoOnlyRate = false) {
    if (!window.mctsMode) return;
    if (bt_cpu.dataset.mctsRunning === '1') return;
    bt_cpu.dataset.mctsRunning = '1';
    window.mctsAbort = false;

    console.log('onCpu function called');
    if (!progressBar) {
        console.error('progressBar element not found in onCpu');
    }
    if (!bt_cpu) {
        console.error('bt_cpu element not found');
        return;
    }

    if (progressBar) {
        progressBar.value = 0;
        console.log('progressBar value reset to 0. Current style:', progressBar.style.cssText);
    }

    // --- 定跡の確認 (1手目と2手目) ---
    // const totalMoves = board.history.length;
    // let bookMove = -1; // 定跡手がない場合は -1

    // if (totalMoves === 0 && board.turn === 1) { // CPUが先手(黒)の初手
    //     bookMove = 12; // 常に12の列に打つ
    //     console.log("Opening book: CPU's first move (Black) -> 12");
    // } else if (totalMoves === 1 && board.turn === -1) { // CPUが後手(白)の初手 (相手が1手打った後)
    //     const opponentFirstMove = board.history[0] % 25; // 相手の初手 (0-24の列番号)
    //     if (opponentFirstMove === 12) {
    //         bookMove = 6; // 相手の初手が12なら、6の列に打つ
    //         console.log("Opening book: CPU's first move (White) after opponent played 12 -> 6");
    //     } else {
    //         bookMove = 12; // 相手の初手が12以外なら、12に打つ
    //         console.log(`Opening book: CPU's first move (White) after opponent played ${opponentFirstMove} -> 12`);
    //     }
    // }

    // if (bookMove !== -1) {
    //     // 定跡手が合法か一応確認 (特に2手目で12が埋まっている場合など)
    //     // Board.move は不正な手なら false を返すので、それで判定も可能
    //     const success = board.move(bookMove);
    //     if (success) {
    //         drawStones();
    //         if (progressBar) {
    //             progressBar.value = 100;
    //         }
    //         bt_cpu.disabled = false;
    //         console.log("Played from opening book.");
    //         return; // 定跡を使ったのでMCTSは実行しない
    //     } else {
    //         console.log(`Opening book move ${bookMove} was illegal. Proceeding to MCTS.`);
    //         // 定跡手が打てなかった場合はMCTSへ
    //     }
    // }
    // --- 定跡の確認ここまで ---

    const iterations = 10000000; // シミュレーション回数を1000万回に
    const rootNode = new MCTSNode(board.clone());

    // ブラウザが progressBar.value = 0 の状態を描画するのを待つ
    await new Promise(resolve => setTimeout(resolve, 0));

    console.log('MCTS processing started');
    for (let i = 0; i < iterations; i++) {
        let node = rootNode;
        let currentBoardState = rootNode.boardState.clone();

        // 1. 選択 (Selection)
        while (node.untriedMoves.length === 0 && node.children.length > 0) {
            if (node.boardState.winCheck() !== 0) break;
            node = node.selectChild();
            currentBoardState.move(node.move);
        }

        // 2. 展開 (Expansion)
        let expandedNode = node;
        if (node.boardState.winCheck() === 0 && node.untriedMoves.length > 0) {
            const move = node.untriedMoves[Math.floor(Math.random() * node.untriedMoves.length)];
            currentBoardState.move(move);
            expandedNode = node.addChild(move, currentBoardState.clone());
        }

        // 3. シミュレーション (Simulation)
        let winner = expandedNode.boardState.winCheck();
        if (winner === 0) {
            let simulationBoard = expandedNode.boardState.clone();
            winner = simulationBoard.randomPlayout();
        }

        // 4. バックプロパゲーション (Backpropagation)
        let backpropNode = expandedNode;
        while (backpropNode !== null) {
            backpropNode.update(winner);
            backpropNode = backpropNode.parent;
        }

        // プログレスバーの値を更新
        if (progressBar && ((i % 100 === 0) || i === iterations - 1)) {
            progressBar.value = ((i + 1) / iterations) * 100;
            // ブラウザに描画の機会を与えるために、イベントループに制御を一時的に戻す
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // 進捗表示（1000回ごと）
        if (i % 1000 === 0) {
            let resultText = 'Candidate Moves Win Rate<br>';
            if (rootNode.children.length === 0) {
                resultText += 'No legal moves';
            } else {
                // 勝率順にソートし、上位5件のみ表示
                const sorted = rootNode.children.slice().sort((a, b) => {
                    const rateA = a.visits > 0 ? a.wins / a.visits : 0;
                    const rateB = b.visits > 0 ? b.wins / b.visits : 0;
                    return rateB - rateA;
                }).slice(0, 5);
                for (const child of sorted) {
                    const move = child.move;
                    const visits = child.visits;
                    const wins = child.wins;
                    const rate = visits > 0 ? (wins / visits) : 0;
                    resultText += `Move ${move}: Win Rate ${(rate * 100).toFixed(1)}% (Visits ${visits})<br>`;
                }
            }
            document.getElementById('rate_area').innerHTML = resultText;
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        if (window.mctsAbort) break;
    }
    console.log('MCTS processing finished');

    let bestMoveMCTS = null;
    let maxVisits = -1;
    for (const child of rootNode.children) {
        if (child.visits > maxVisits) {
            maxVisits = child.visits;
            bestMoveMCTS = child.move;
        }
    }

    // 手を進める処理
    if (!autoOnlyRate) {
        if (bestMoveMCTS !== null) {
            board.move(bestMoveMCTS);
            drawStones();
        } else {
            console.log("CPU: No legal moves found by MCTS.");
            board.randomMove();
            drawStones();
        }
    }

    // --- MCTS計算終了後、候補手の勝率を表示 ---
    let resultText = 'Candidate Moves Win Rate<br>';
    if (rootNode.children.length === 0) {
        resultText += 'No legal moves';
    } else {
        // 勝率順にソートし、上位5件のみ表示
        const sorted = rootNode.children.slice().sort((a, b) => {
            const rateA = a.visits > 0 ? a.wins / a.visits : 0;
            const rateB = b.visits > 0 ? b.wins / b.visits : 0;
            return rateB - rateA;
        }).slice(0, 5);
        for (const child of sorted) {
            const move = child.move;
            const visits = child.visits;
            const wins = child.wins;
            const rate = visits > 0 ? (wins / visits) : 0;
            resultText += `Move ${move}: Win Rate ${(rate * 100).toFixed(1)}% (Visits ${visits})<br>`;
        }
    }
    document.getElementById('rate_area').innerHTML = resultText;
    delete bt_cpu.dataset.mctsRunning;
    // 再計算待ちフラグが立っていれば、1回だけ再計算
    if (window.mctsRecalcPending) {
        window.mctsRecalcPending = false;
        onCpu(true);
    }
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

class MCTSNode {
    constructor(boardState, parent = null, move = null) {
        this.boardState = boardState; // Boardオブジェクトのスナップショット (cloneされたもの)
        this.parent = parent;         // 親ノード
        this.move = move;             // このノードに至るための手 (親からの遷移)
        this.children = [];           // 子ノードの配列
        this.wins = 0;                // このノードを経由して勝利した回数
        this.visits = 0;              // このノードを訪問した回数
        this.untriedMoves = boardState.createLegalMoves(); // まだ試していない合法手
    }

    // UCT (Upper Confidence Bound 1 applied to Trees) スコアを計算
    // C は探索パラメータ (sqrt(2) などがよく使われる)
    uctValue(C = Math.sqrt(2)) {
        if (this.visits === 0) {
            return Infinity; // 未訪問のノードを優先
        }
        // this.parent.visits が必要
        const exploitationTerm = this.wins / this.visits;
        const explorationTerm = C * Math.sqrt(Math.log(this.parent.visits) / this.visits);
        return exploitationTerm + explorationTerm;
    }

    selectChild() {
        // UCT値が最も高い子ノードを選択
        let selected = this.children[0];
        let bestValue = -Infinity;
        for (const child of this.children) {
            const uct = child.uctValue();
            if (uct > bestValue) {
                bestValue = uct;
                selected = child;
            }
        }
        return selected;
    }

    addChild(move, childBoardState) {
        const childNode = new MCTSNode(childBoardState, this, move);
        this.untriedMoves = this.untriedMoves.filter(m => m !== move);
        this.children.push(childNode);
        return childNode;
    }

    update(result) {
        this.visits++;
        // result は現在のノードの手番から見た結果 (1:勝ち, 0:引き分け, -1:負け)
        // Board.winCheck() の結果 (1:黒勝ち, -1:白勝ち) と手番を考慮して調整が必要
        // 例えば、現在のノードの手番が黒(1)で、結果が黒勝ち(1)なら +1
        // 現在のノードの手番が黒(1)で、結果が白勝ち(-1)なら -1 (または0)
        // ここでは簡単のため、プレイアウト結果がノードの手番の勝利なら1を加算
        if (this.boardState.turn === -result) { // プレイアウト結果の手番が勝った場合
             this.wins++;
        } else if (result === 0) { // 引き分けの場合
            this.wins += 0.5; // 引き分けを0.5としてカウントする場合
        }
    }
}

// 初期化時にも手番を表示
drawStones();