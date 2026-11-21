import { Game, synchronizedDigits } from "./engine.js";

function browserApp() {
  "use strict";

  // Exact finite-dimensional rules used by Pyto Version 5.
  function finiteWinningLine(a, b, c) {
    if (a.length !== b.length || b.length !== c.length) return false;
    return [[a, b, c], [b, a, c], [c, a, b]].some(([mid, first, last]) =>
      first.some((v, i) => v !== last[i]) &&
      first.every((v, i) => v + last[i] === 2 * mid[i]));
  }
  function finiteMissingLinePositions(a, b) {
    if (a.every((v, i) => v === b[i])) return [];
    const result = new Map();
    for (const f of [(x,y) => 2*x-y, (x,y) => 2*y-x, (x,y) => (x+y)/2]) {
      const candidate = a.map((x,i) => f(x,b[i]));
      if (candidate.every(d => Number.isInteger(d) && d >= 1 && d <= 3) &&
          ![a,b].some(t => t.every((v,i) => v === candidate[i]))) {
        result.set(candidate.join(""), candidate);
      }
    }
    return [...result.values()];
  }
  class FiniteGame {
    constructor(dimensions) {
      if (![2,3,4].includes(dimensions)) throw new Error("Invalid dimension.");
      this.dimensions = dimensions;
      this.reset();
    }
    reset() {
      this.moves = [];
      this.occupied = new Set();
      this.winner = null;
      this.draw = false;
      this.winningIndices = [];
      this.threats = {X:new Map(), O:new Map()};
      this.previousThreatCounts = {X:0, O:0};
      this.threateningIndices = new Set();
    }
    get nextPlayer() { return this.moves.length % 2 ? "O" : "X"; }
    get widths() { return {white:this.dimensions, yellow:0}; }
    get threatCounts() { return {X:this.threats.X.size, O:this.threats.O.size}; }
    play(white) {
      if (this.winner || this.draw) throw new Error("Game over. Start a new game.");
      const input = String(white || "").replace(/[\s,]/g,"");
      if (!/^[123]+$/.test(input) || input.length !== this.dimensions)
        throw new Error("Enter exactly " + this.dimensions + " coordinates (1, 2, or 3).");
      const position = [...input].map(Number);
      if (this.occupied.has(input)) throw new Error("That square is already occupied.");
      this.previousThreatCounts = this.threatCounts;
      const player = this.nextPlayer, index = this.moves.length;
      const earlier = this.moves.flatMap((m,i) => m.player === player ? [i] : []);
      this.moves.push({player, position});
      this.occupied.add(input);
      for (let i=0; i<earlier.length && !this.winner; i++)
        for (let j=i+1; j<earlier.length; j++)
          if (finiteWinningLine(this.moves[earlier[i]].position,
                                this.moves[earlier[j]].position, position)) {
            this.winner = player;
            this.winningIndices = [earlier[i], earlier[j], index];
            break;
          }
      if (this.winner || this.occupied.size === 3**this.dimensions) {
        this.draw = !this.winner;
        this.threats = {X:new Map(), O:new Map()};
        this.threateningIndices.clear();
      } else {
        this.recalculateThreats();
      }
      return index;
    }
    recalculateThreats() {
      const found = {X:new Map(), O:new Map()};
      const highlighted = new Set();
      for (const player of ["X","O"]) {
        const ids = this.moves.flatMap((m,i) => m.player === player ? [i] : []);
        for (let a=0; a<ids.length; a++) for (let b=a+1; b<ids.length; b++) {
          const i=ids[a], j=ids[b];
          for (const candidate of finiteMissingLinePositions(this.moves[i].position,
                                                             this.moves[j].position)) {
            const key=candidate.join("");
            if (this.occupied.has(key)) continue;
            if (!found[player].has(key)) found[player].set(key,new Set());
            found[player].get(key).add(i);
            found[player].get(key).add(j);
            highlighted.add(i);
            highlighted.add(j);
          }
        }
      }
      this.threats=found;
      this.threateningIndices=highlighted;
    }
  }

  const finiteLessons = {
    2:[
      ["Learn the classic game","X goes first. Enter TWO digits using the 1, 2, 3 keypad, then press Go. The graphic shows where your coordinates land."],
      ["Two coordinates","The 1st digit is the column (left to right). The 2nd is the row (top to bottom). For example, (1,1) means top left and (3,3) means bottom right."],
      ["Three in a line wins","Place three Xs or three Os in a horizontal, vertical, or diagonal line. An opponent can block an incomplete line."],
      ["Eight possible lines","There are 3 rows, 3 columns and 2 diagonals. Every line follows the same coordinate pattern: stay fixed or go 1,2,3."]
    ],
    3:[
      ["Add a third dimension","Now there are THREE ordinary tic-tac-toe boards. Enter three digits using the keypad. The 3rd coordinate picks board 1, 2, or 3."],
      ["Read all three digits","The 1st coordinate is the column, the 2nd is the row, and the 3rd is the board number. (2,3,1) means column 2, row 3 on board 1."],
      ["Win between boards","Lines on one board still count. New lines can also pass through multiple boards, one square on each board."],
      ["A three-dimensional diagonal","(1,1,1), (2,2,2), (3,3,3) is a winning line. Every coordinate goes 1,2,3, just as in 2D."]
    ],
    4:[
      ["Add a fourth dimension","Now THREE groups of THREE boards make nine small boards in a 3×3 arrangement. That gives 81 possible squares."],
      ["Find the board by coordinates","The 1st digit is the square column; 2nd is its row. The 3rd digit picks the board COLUMN, and the 4th digit picks the board ROW."],
      ["Four digits identify one square","(2,3,1,2) means column 2, row 3 on the board in column 1 and row 2 of the nine-board arrangement. Enter all four digits, then press Go."],
      ["A four-dimensional diagonal","(1,1,1,1), (2,2,2,2), (3,3,3,3) form a line spanning three boards. New dimensions add ways to make lines."],
      ["The rule never changes","In EVERY dimension, a winning line either stays fixed, goes 1,2,3, or goes 3,2,1. Infinite-D extends this same idea to endless coordinates."]
    ]
  };
  const infinityLessons = [
    ["Welcome","Each move describes a position with infinitely many coordinates. Enter optional Initial Dimensions and a required repeating pattern using 1, 2, and 3. Tap Go to play X."],
    ["Repeating forever","X has placed the first mark. The yellow digits repeat forever, so the position has infinitely many coordinates. O, enter a different position."],
    ["The objective","You need three of your own marks on a single straight line in all dimensions. A line may increase in one dimension, decrease in another, and stay constant in others."],
    ["Five allowed patterns","In each dimension, the three values must be 1-2-3, 3-2-1, 1-1-1, 2-2-2, or 3-3-3. The rule must hold in every dimension."],
    ["The midpoint rule","The SAME move must be the midpoint across every changing dimension. A line can change direction between dimensions, but not which move occupies the middle."],
    ["Checking a line","Choose three marks of one player and try each as the midpoint. In every dimension, the other two digits must add up to twice the midpoint digit."],
    ["Infinity matters","Three marks might look aligned in the first few dimensions but disagree later. The same straight-line rule must continue through the entire infinite repeat."],
    ["Order is irrelevant","The midpoint is not necessarily the second mark played. It may be the first, second, or third chronologically. The computer checks all possible midpoints."],
    ["Example: a winning line","A general example of three positions that DO form a line:\n(1,3) repeating\n(2) repeating\n(3,1) repeating\nEach changing dimension has the SAME middle position: (2)."],
    ["Example: not a line","If one dimension is 1-2-3, but a second is 2-3-1 in the SAME move order, the midpoint changes. That is not a single straight line, even though both use 1, 2, 3."],
    ["Constant coordinates","Not every dimension needs to change. 1-2-3 can occur in one dimension while 2-2-2 stays unchanged in another. Both are compatible with a valid line."],
    ["About the sphere","The sphere is a visual impression, not an exact map of the infinite board. Distance reflects repeating digits' average; direction their composition. Fading and thickness suggest depth from digit order. Visual alignment does not prove a winning line."]
  ];

  const $ = id => document.getElementById(id);
  const ui = {
    title:$("gameTitle"), modeBar:$("modeBar"), upper:$("upperScroll"),
    history:$("historyTable"), historyScroll:$("historyScroller"),
    status:$("turnStatus"), warnings:$("threatStatus"), errors:$("errorStatus"),
    guideHeading:$("guideHeading"), guideBody:$("guideBody"), guideArea:$("guideArea"),
    graphic:$("gameSvg"), whiteBox:$("whiteSelect"), yellowBox:$("yellowSelect"),
    whiteValue:$("whiteValue"), yellowValue:$("yellowValue"),
    whiteCaption:$("whiteCaption"), yellowGroup:$("yellowGroup"),
    count:$("coordCount"), fieldGrid:$("fieldGrid"),
    go:$("goButton"), del:$("deleteBtn")
  };
  let mode = "2d";
  let game = new FiniteGame(2);
  let whiteEntry = "", yellowEntry = "", activeField = "white", currentError = "";
  let previousThreatCounts = {X:0,O:0}, graphicEpoch = 0;
  const svgNS = "http://www.w3.org/2000/svg";
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shaCache = new Map();
  // Web adaptation of Pyto v6: continuous SVG tapered rays, stronger front/back contrast, and four-layer sphere rendering.

  function node(tag, cls, content) {
    const n=document.createElement(tag);
    if(cls) n.className=cls;
    if(content !== undefined) n.textContent=content;
    return n;
  }
  function svgNode(name, attrs={}, text) {
    const n=document.createElementNS(svgNS,name);
    for(const [key,value] of Object.entries(attrs)) n.setAttribute(key,String(value));
    if(text!==undefined) n.textContent=text;
    return n;
  }
  function showError(message="") {
    currentError=message;
    ui.errors.textContent=message;
    renderGuide();
  }
  function switchMode(which) {
    if(!["2d","3d","4d","inf"].includes(which)) return;
    mode=which;
    game = which==="inf" ? new Game() : new FiniteGame(Number(which[0]));
    whiteEntry=""; yellowEntry=""; activeField=which==="inf"?"yellow":"white";
    previousThreatCounts={X:0,O:0};
    currentError="";
    ui.historyScroll.scrollTop=0;
    ui.historyScroll.scrollLeft=0;
    ui.upper.scrollTop=0;
    renderAll(false,false);
  }
  function selectField(field) {
    if(mode!=="inf" && field==="yellow") return;
    activeField=field;
    renderFields();
  }
  function pressDigit(value) {
    if(game.winner || game.draw) return;
    if(mode!=="inf") {
      if(whiteEntry.length < game.dimensions) whiteEntry += value;
    } else if(activeField==="white") whiteEntry+=value;
    else yellowEntry+=value;
    currentError="";
    renderFields();
    renderGuide();
    if(mode!=="inf") renderGraphic(false);
  }
  function deleteDigit() {
    if(game.winner || game.draw) return;
    if(activeField==="white") whiteEntry=whiteEntry.slice(0,-1);
    else yellowEntry=yellowEntry.slice(0,-1);
    currentError="";
    renderFields();
    renderGuide();
    if(mode!=="inf") renderGraphic(false);
  }
  function submit() {
    if(game.winner || game.draw) return;
    const finite=mode!=="inf";
    if(finite && whiteEntry.length !== game.dimensions) return;
    if(!finite && !yellowEntry) return;
    try {
      previousThreatCounts=game.threatCounts;
      game.play(whiteEntry,yellowEntry);
      whiteEntry=""; yellowEntry=""; activeField=finite?"white":"yellow";
      currentError="";
      renderAll(true,!finite?true:false);
    } catch(e) {
      showError(e.message);
      renderStatus();
    }
  }
  function renderFields() {
    const finite=mode!=="inf";
    const captions={2:"1st and 2nd Dimensions",3:"1st, 2nd and 3rd Dimensions",4:"1st, 2nd, 3rd and 4th Dimensions"};
    ui.whiteCaption.textContent=finite?captions[game.dimensions]:"Initial Dimensions";
    ui.yellowGroup.hidden=finite;
    ui.fieldGrid.classList.toggle("finite",finite);
    ui.count.hidden=!finite;
    ui.count.textContent=finite?`${whiteEntry.length} of ${game.dimensions}`:"";
    const preview=(s,defaultText="Tap to enter")=>s ? (s.length>9?"…":"")+s.slice(-9).split("").join(",") : defaultText;
    ui.whiteValue.textContent=preview(whiteEntry,finite?"Use the keypad below":"Tap to enter");
    ui.yellowValue.textContent=preview(yellowEntry);
    ui.whiteBox.classList.toggle("selected",finite || activeField==="white");
    ui.yellowBox.classList.toggle("selected",activeField==="yellow");
    ui.whiteBox.setAttribute("aria-pressed",String(finite || activeField==="white"));
    ui.yellowBox.setAttribute("aria-pressed",String(!finite && activeField==="yellow"));
    const ready = !game.winner && !game.draw && (finite?whiteEntry.length===game.dimensions:Boolean(yellowEntry));
    ui.go.disabled=!ready;
    ui.del.disabled=Boolean(game.winner || game.draw);
    document.querySelectorAll("[data-digit]").forEach(btn => btn.disabled=Boolean(game.winner || game.draw));
    ui.modeBar.querySelectorAll("[data-mode]").forEach(btn => {
      const selected=btn.dataset.mode===mode;
      btn.classList.toggle("active",selected);
      btn.setAttribute("aria-pressed",String(selected));
    });
  }
  function renderHistory(scrollLatest=false) {
    const prevLeft=ui.historyScroll.scrollLeft, prevTop=ui.historyScroll.scrollTop;
    ui.history.replaceChildren();
    const finite=mode!=="inf";
    const widths=game.widths;
    const count=finite?game.dimensions:widths.white+widths.yellow;
    const columns=["24px","36px",...Array.from({length:Math.max(1,count)},()=> "27px")].join(" ");
    function row(kind) {
      const el=node("div",`history-grid-row ${kind}`);
      el.style.gridTemplateColumns=columns;
      ui.history.append(el);
      return el;
    }
    const header=row("heading");
    header.append(node("div","smallheading","#"),node("div","smallheading","X/O"));
    if (finite) {
      const h=node("div","history-range",`Dimensions 1 - ${game.dimensions}`);
      h.style.gridColumn=`3 / span ${game.dimensions}`;
      header.append(h);
    } else {
      if(widths.white) {
        const h=node("div","history-range",widths.white<4?`D1–${widths.white}`:`Dimensions 1 - ${widths.white}`);
        h.style.gridColumn=`3 / span ${widths.white}`;
        header.append(h);
      }
      if(widths.yellow) {
        const h=node("div","history-range repeating-heading",`Dimensions ${widths.white+1} - ∞`);
        h.style.gridColumn=`${3+widths.white} / span ${widths.yellow}`;
        h.title="Repeating sequence"; header.append(h);
      }
    }
    if(!game.moves.length) {
      const noMoves=node("div","empty-history","No moves yet. X goes first.");
      ui.history.append(noMoves);
    }
    for (const [i,move] of game.moves.entries()) {
      const klass=game.winningIndices.includes(i)?"winning":
        game.threateningIndices.has(i)?`threat-${move.player.toLowerCase()}`:"";
      const r=row(klass);
      r.append(node("div","move-number",String(i+1)),node("div",`move-player ${move.player.toLowerCase()}`,move.player+":"));
      const initial=finite?move.position:synchronizedDigits(move.position,widths.white,widths.yellow).initial;
      const repeat=finite?[]:synchronizedDigits(move.position,widths.white,widths.yellow).repeating;
      initial.forEach(d => r.append(node("div","coord",String(d))));
      repeat.forEach(d => r.append(node("div","coord repeating",String(d))));
      if(!finite) r.append(node("div","ellipsis","…"));
    }
    ui.historyScroll.scrollLeft=scrollLatest?0:prevLeft;
    if(scrollLatest) requestAnimationFrame(()=>ui.historyScroll.scrollTop=ui.historyScroll.scrollHeight);
    else ui.historyScroll.scrollTop=prevTop;
  }
  function renderStatus() {
    const p=game.nextPlayer;
    if(game.winner) {
      ui.status.textContent=game.winner+" wins!";
      ui.status.className="turn-status win";
      ui.warnings.textContent="";
    } else if(game.draw) {
      ui.status.textContent="Draw!";
      ui.status.className="turn-status win";
      ui.warnings.textContent="";
    } else {
      ui.status.textContent=p+" to move";
      ui.status.className="turn-status " + p.toLowerCase();
      const counts=game.threatCounts;
      ui.warnings.textContent=["X","O"].filter(k=>counts[k]).map(k=>
        `${k}: ${counts[k]} threat${counts[k]===1?"":"s"}${counts[k]>1?" (fork)":""}`).join(" · ");
    }
    ui.errors.textContent=currentError;
  }
  function renderGuide() {
    let heading,body;
    if(currentError) [heading,body]=["Move not accepted",`${currentError} Correct the entry and try again; your turn is unchanged.`];
    else if(game.winner) [heading,body]=[game.winner+" wins!",
      mode==="inf" ? "Three positions make a straight line in every infinite dimension. Winning rows are green." :
      "Three marks form a straight line. Green highlights the winning squares in the boards and Move History."];
    else if(game.draw) [heading,body]=["Draw","All squares are occupied without a winning line. Select a game mode to play again."];
    else {
      const {X:x,O:o}=game.threatCounts;
      if (x||o) {
        const intro = x&&o?"Both players have potential winning lines.":
          `${x?"X":"O"} has ${x||o} immediate winning move${(x||o)===1?"":"s"}.`;
        [heading,body]=["Watch the threats",intro+" Colored rows in Move History show the marks that create each threat, without revealing the missing square."];
      } else if(mode==="inf") {
        if(game.moves.length>11) [heading,body] =
          game.moves.length%2===0 ?
          ["Look for a pair","Neither player currently has an immediate winning move. Look for two marks that might belong to a line with the same midpoint across every changing dimension."]:
          ["Think in dimensions","There are no immediate winning moves now. Compare matching coordinate columns in Move History, including the infinite repeating section."];
        else [heading,body]=infinityLessons[Math.min(game.moves.length,infinityLessons.length-1)];
      } else {
        const lessons=finiteLessons[game.dimensions];
        [heading,body]=lessons[Math.min(game.moves.length,lessons.length-1)];
      }
    }
    if(ui.guideHeading.textContent!==heading || ui.guideBody.textContent!==body) {
      ui.guideHeading.textContent=heading;
      ui.guideBody.textContent=body;
      ui.guideArea.scrollTop=0;
    }
  }
  function renderFiniteBoard() {
    const svg=ui.graphic, width=180, height=172, dims=game.dimensions;
    svg.replaceChildren();
    svg.setAttribute("aria-label",`${dims}D tic-tac-toe read-only board diagram`);
    const occupied=new Map(game.moves.map(m=>[m.position.join(""),m.player]));
    const winning=new Set(game.winningIndices.map(i=>game.moves[i].position.join("")));
    const selected=whiteEntry.length===dims?whiteEntry:null;
    const gap=3.5, side=Math.min((width-15-2*gap)/3,(height-18-2*gap)/3);
    function text(x,y,value,size=10) {
      svg.append(svgNode("text",{x,y,"text-anchor":"middle","font-family":"Arial, sans-serif",
        "font-weight":"700","font-size":size,fill:"#607189"},value));
    }
    function board(x,y,third=1,fourth=1) {
      const step=side/3;
      svg.append(svgNode("rect",{x,y,width:side,height:side,rx:3,fill:"#fff",stroke:"#dbe4f0","stroke-width":1}));
      for(let r=0;r<3;r++) for(let c=0;c<3;c++) {
        const coords=[c+1,r+1];
        if(dims>=3) coords.push(third);
        if(dims===4) coords.push(fourth);
        const key=coords.join("");
        const sx=x+c*step,sy=y+r*step;
        if(winning.has(key)||selected===key) svg.append(svgNode("rect",{
          x:sx+1,y:sy+1,width:step-2,height:step-2,rx:2,
          fill:winning.has(key)?"#d5f7dc":"#d7e9ff"}));
        const player=occupied.get(key);
        if(player) {
          const size=Math.max(7,Math.min(13,step*.69));
          svg.append(svgNode("text",{
            x:sx+step/2,y:sy+step/2+.5,"text-anchor":"middle","dominant-baseline":"central",
            "font-family":"Arial, sans-serif","font-weight":"700","font-size":size,
            fill:player==="X"?"#1e66da":"#d9323d"
          },player));
        }
      }
      for(const i of [1,2]) {
        svg.append(svgNode("line",{x1:x+i*step,y1:y,x2:x+i*step,y2:y+side,stroke:"#12284d","stroke-width":1.35}));
        svg.append(svgNode("line",{x1:x,y1:y+i*step,x2:x+side,y2:y+i*step,stroke:"#12284d","stroke-width":1.35}));
      }
    }
    if(dims===2) {
      board((width-side)/2,(height-side)/2);
    } else if(dims===3) {
      const g=5, total=3*side+2*g, x0=(width-total)/2,y0=(height-side)/2+7;
      for(let third=1;third<=3;third++) {
        const x=x0+(third-1)*(side+g);
        text(x+side/2,y0-7,third,10);
        board(x,y0,third);
      }
    } else {
      const x0=12+((width-15)-(3*side+2*gap))/2;
      const y0=15+((height-18)-(3*side+2*gap))/2;
      for(let third=1;third<=3;third++) {
        const x=x0+(third-1)*(side+gap);
        text(x+side/2,y0-4,third,9);
      }
      for(let fourth=1;fourth<=3;fourth++) {
        const y=y0+(fourth-1)*(side+gap);
        text(x0-8,y+side/2+3,fourth,9);
        for(let third=1;third<=3;third++)
          board(x0+(third-1)*(side+gap),y,third,fourth);
      }
    }
  }

  // SHA-256 is used to match Pyto v5's stable_fraction(canonical_cycle).
  // Only cosmetic positions depend on it. Exact wins are checked by engine.js.
  async function stableFraction(cycle) {
    if(shaCache.has(cycle)) return shaCache.get(cycle);
    const work=(async()=>{
      if(!globalThis.crypto || !crypto.subtle) {
        let h=2166136261;
        for(const c of cycle) {h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
        return (h>>>0)/4294967295;
      }
      const dig=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(cycle)));
      let first=0n;
      for(let i=0;i<8;i++) first=(first<<8n)+BigInt(dig[i]);
      return Number(first)/Number((1n<<64n)-1n);
    })();
    shaCache.set(cycle,work);
    return work;
  }
  function clamp(x,a,b) {return Math.max(a,Math.min(b,x));}
  function polar(angle,r) {
    const theta=angle*Math.PI/180;
    return {x:r*Math.cos(theta),y:-r*Math.sin(theta)};
  }
  async function spherePoints(moves,radius) {
    const result=[];
    const fractions=await Promise.all(moves.map(m=>stableFraction(m.position.cycle)));
    moves.forEach((move,index)=>{
      const cycle=move.position.cycle, fraction=fractions[index], n=cycle.length;
      const counts=[1,2,3].map(d=>[...cycle].filter(c=>Number(c)===d).length/n);
      const mean=[1,2,3].reduce((s,d,i)=>s+d*counts[i],0);
      const radiusFraction=(mean-1)/2;
      const a=[210,330,90].map(d=>d*Math.PI/180);
      const vx=counts.reduce((s,p,i)=>s+p*Math.cos(a[i]),0);
      const vy=counts.reduce((s,p,i)=>s+p*Math.sin(a[i]),0);
      const base=Math.hypot(vx,vy)<1e-11?360*fraction:Math.atan2(vy,vx)*180/Math.PI;
      let angle=((base+10*(2*fraction-1))%360+360)%360;
      let length=radiusFraction*radius;
      if(length<.01 && result.some(p=>p.displayRadius<10)) {
        angle=(angle+index*137.507764)%360;
        length=Math.min(8,radius*.045);
      }
      let xy=polar(angle,length);
      const clearance=p=>result.length?Math.min(...result.map(m=>Math.hypot(p.x-m.x,p.y-m.y))):1e8;
      if(clearance(xy)<17) {
        const candidates=[];
        for(const da of [0,3,-3,6,-6,9,-9]) for(const dr of [0,3,-3,6,-6]) {
          const rad=clamp(length+dr,0,radius), ang=angle+da;
          const p=polar(ang,rad);
          candidates.push({p,angle:ang,length:rad,clearance:clearance(p),
            valid:clearance(p)>=17,cost:Math.abs(da)+Math.abs(dr)*1.5});
        }
        candidates.sort((a,b)=>Number(b.valid)-Number(a.valid) ||
          b.clearance-a.clearance || a.cost-b.cost);
        ({angle,length}=candidates[0]); xy=candidates[0].p;
      }
      const pairs=[...cycle].map((digit,i)=>[Number(digit),Number(cycle[(i+1)%n])]);
      let winding=0;
      for(const [a,b] of pairs) {
        if((a===1&&b===2)||(a===2&&b===3)||(a===3&&b===1)) winding++;
        else if((a===2&&b===1)||(a===3&&b===2)||(a===1&&b===3)) winding--;
      }
      winding/=n;
      const depth=clamp(.70*winding+.55*(2*fraction-1),-1,1);
      result.push({index,player:move.player,x:xy.x,y:xy.y,angle,
        depth,displayRadius:length});
    });
    return result;
  }

  // Web equivalent of Pyto v6's four layers and continuous Pillow rays:
  // A single closed SVG silhouette uses a longitudinal alpha gradient,
  // instead of dozens of overlapping circular dots.
  function sphereArc(svg,cx,cy,r,front) {
    const pi=Math.PI;
    function curve(which,value) {
      const d=[];
      const steps=96;
      let active=false;
      for(let i=0;i<=steps;i++) {
        const angle=2*pi*i/steps;
        const visible=(which==="latitude"?Math.sin(angle)>=0:Math.cos(angle)>=0);
        if(visible!==front) {active=false;continue;}
        let x,y;
        if(which==="latitude") {
          const rx=r*Math.sqrt(1-value*value)*.92;
          const ry=r*(value===0?.21:.16);
          x=cx+rx*Math.cos(angle);y=cy+r*value+ry*Math.sin(angle);
        } else {
          x=cx+r*value*Math.cos(angle);y=cy+r*.96*Math.sin(angle);
        }
        if(Math.hypot(x-cx,y-cy)>r-.7) {active=false;continue;}
        d.push((active?"L":"M")+x.toFixed(2)+" "+y.toFixed(2));
        active=true;
      }
      if(d.length) svg.append(svgNode("path",{
        d:d.join(" "),fill:"none",stroke:"#5684c2",
        "stroke-width":front?.92:.70,
        "stroke-dasharray":front?"1.0 3.3":"1.0 5.0",
        "stroke-opacity":front?.26:.12
      }));
    }
    for(const lat of [-.39,0,.39])curve("latitude",lat);
    for(const factor of [.40,.72])curve("meridian",factor);
  }
  function drawSphereBase(svg,cx,cy,r) {
    const defs=svgNode("defs");
    const gradient=svgNode("radialGradient",{id:"sphereGradient",cx:"34%",cy:"23%",r:"85%"});
    gradient.append(svgNode("stop",{offset:"0%","stop-color":"#fff","stop-opacity":.94}));
    gradient.append(svgNode("stop",{offset:"65%","stop-color":"#edf5ff","stop-opacity":.79}));
    gradient.append(svgNode("stop",{offset:"100%","stop-color":"#d7e8ff","stop-opacity":.86}));
    defs.append(gradient);svg.append(defs);
    svg.append(svgNode("ellipse",{cx,cy:cy+r+3,rx:r*.52,ry:2.3,fill:"#425b7f",opacity:.10}));
    svg.append(svgNode("circle",{cx,cy,r,fill:"url(#sphereGradient)",stroke:"#8bb1db",
      "stroke-opacity":.6,"stroke-width":1}));
    svg.append(svgNode("ellipse",{cx:cx-r*.30,cy:cy-r*.38,
      rx:r*.16,ry:r*.11,fill:"white",opacity:.29}));
    sphereArc(svg,cx,cy,r,false);
    svg.append(svgNode("circle",{cx,cy,r:2.2,fill:"#7e97bc",opacity:.5}));
  }
  function drawSphereMarker(svg,x,y,point,newest,winning) {
    const front=(point.depth+1)/2;
    const size=6.75+3*front+(newest?.5:0);
    const alpha=.36+.64*front;
    const rgb=point.player==="X"?"#1e66da":"#d9323d";
    if(winning) svg.append(svgNode("circle",{cx:x,cy:y,r:size+4,
      fill:"#31cf73","fill-opacity":.11+.07*front,stroke:"#1eb55c",
      "stroke-opacity":.43+.44*front,"stroke-width":1.2}));
    if(newest) svg.append(svgNode("circle",{cx:x,cy:y,r:size+3,
      fill:rgb,"fill-opacity":.07+.10*front}));
    svg.append(svgNode("circle",{cx:x,cy:y,r:size,fill:"white",
      "fill-opacity":.64+.36*front,stroke:rgb,
      "stroke-opacity":.28+.7*front,"stroke-width":.75+.3*front}));
    svg.append(svgNode("text",{x,y:y+.3,fill:rgb,opacity:alpha,
      "font-size":10.7+3.7*front,"font-weight":700,
      "font-family":"Arial, sans-serif","text-anchor":"middle",
      "dominant-baseline":"central"},point.player));
  }
  function rayDepthProfile(depth) {
    const front=clamp((depth+1)/2,0,1);
    return {startW:2.15,tipW:.90+3.55*front,
      startA:.42+.18*front,tipA:.23+.73*front};
  }
  function rayShape(cx,cy,x,y,startW,tipW,extra=0) {
    const dx=x-cx,dy=y-cy,dist=Math.hypot(dx,dy);
    if(dist<.8)return "";
    const nx=-dy/dist,ny=dx/dist,positive=[],negative=[];
    for(let i=0;i<19;i++){
      const t=i/18, px=cx+dx*t,py=cy+dy*t;
      const half=(startW+(tipW-startW)*t+extra)/2;
      positive.push([px+nx*half,py+ny*half]);
      negative.push([px-nx*half,py-ny*half]);
    }
    const points=positive.concat(negative.reverse());
    return "M"+points.map(p=>p[0].toFixed(3)+","+p[1].toFixed(3)).join(" L")+" Z";
  }
  function drawSphereRay(svg,cx,cy,x,y,point,winning,rayId) {
    if(Math.hypot(x-cx,y-cy)<.8)return;
    const {startW,tipW,startA,tipA}=rayDepthProfile(point.depth);
    const color=point.player==="X"?"#1e66da":"#d9323d";
    const gradId="ray-"+rayId;
    const gradient=svgNode("linearGradient",{
      id:gradId,gradientUnits:"userSpaceOnUse",x1:cx,y1:cy,x2:x,y2:y
    });
    gradient.append(svgNode("stop",{offset:"0%","stop-color":color,"stop-opacity":startA}));
    gradient.append(svgNode("stop",{offset:"100%","stop-color":color,"stop-opacity":tipA}));
    const defs=svgNode("defs");defs.append(gradient);svg.append(defs);
    if(winning)svg.append(svgNode("path",{
      d:rayShape(cx,cy,x,y,startW,tipW,2.1),
      fill:"#21b15f","fill-opacity":.22
    }));
    svg.append(svgNode("path",{
      d:rayShape(cx,cy,x,y,startW,tipW),
      fill:"url(#"+gradId+")"
    }));
    // For a receding ray the marker was already drawn. The taper ends
    // precisely at the marker's center and is painted over its X/O.
  }
  let animationId=0;
  async function renderSphere(animate=false) {
    const svg=ui.graphic;
    const epoch=++graphicEpoch;
    const snapshot=game.moves.slice();
    const cx=90,cy=85,r=77;
    svg.replaceChildren();
    svg.setAttribute("aria-label","Decorative depth-styled sphere showing infinite-dimensional moves");
    drawSphereBase(svg,cx,cy,r);
    if(!snapshot.length) return;
    const points=await spherePoints(snapshot,r);
    if(epoch!==graphicEpoch || mode!=="inf") return;
    const winners=new Set(game.winningIndices);
    const newest=points.length-1;
    const sorted=[...points].sort((a,b)=>a.depth-b.depth || a.index-b.index);
    function frame(progress) {
      if(epoch!==graphicEpoch || mode!=="inf") return;
      svg.replaceChildren();
      // Strict draw order matches Pyto v6: back hemisphere, distant moves,
      // foreground grid, then near moves. Within each band sort by depth.
      drawSphereBase(svg,cx,cy,r);
      const back=sorted.filter(p=>p.depth<-.15);
      const front=sorted.filter(p=>p.depth>=-.15);
      function paint(points,behind) {
        for(const p of points) {
          const current=p.index===newest;
          const q=current?progress:1;
          if(q<=0)continue;
          const x=cx+p.x*q,y=cy+p.y*q;
          const win=winners.has(p.index);
          if(behind){
            drawSphereMarker(svg,x,y,p,current,win);
            drawSphereRay(svg,cx,cy,x,y,p,win,"back-"+p.index);
          } else {
            drawSphereRay(svg,cx,cy,x,y,p,win,"front-"+p.index);
            drawSphereMarker(svg,x,y,p,current,win);
          }
        }
      }
      paint(back,true);
      sphereArc(svg,cx,cy,r,true);
      paint(front,false);
    }
    if(animate && !reducedMotion) {
      const id=++animationId, start=performance.now();
      const tick=now=>{
        if(epoch!==graphicEpoch || id!==animationId) return;
        const t=clamp((now-start)/300,0,1);
        frame(t);
        if(t<1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } else frame(1);
  }
  function renderGraphic(animate=false) {
    if(mode==="inf") renderSphere(animate);
    else {
      graphicEpoch++;
      renderFiniteBoard();
    }
  }
  function renderAll(scrollLatest=false,animate=false) {
    renderHistory(scrollLatest);
    renderStatus();
    renderGuide();
    renderFields();
    renderGraphic(animate);
    if(scrollLatest) requestAnimationFrame(()=>ui.historyScroll.scrollTop=ui.historyScroll.scrollHeight);
  }

  ui.modeBar.querySelectorAll("[data-mode]").forEach(btn=>
    btn.addEventListener("click",()=>switchMode(btn.dataset.mode)));
  ui.whiteBox.addEventListener("click",()=>selectField("white"));
  ui.yellowBox.addEventListener("click",()=>selectField("yellow"));
  document.querySelectorAll("[data-digit]").forEach(btn=>
    btn.addEventListener("click",()=>pressDigit(btn.dataset.digit)));
  ui.del.addEventListener("click",deleteDigit);
  ui.go.addEventListener("click",submit);
  document.addEventListener("keydown",e=>{
    if(e.altKey||e.ctrlKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if(["1","2","3"].includes(e.key)) {e.preventDefault();pressDigit(e.key);}
    else if(e.key==="Backspace") {e.preventDefault();deleteDigit();}
    else if(e.key==="Enter") {e.preventDefault();submit();}
  });
  switchMode("2d");
}

browserApp();
