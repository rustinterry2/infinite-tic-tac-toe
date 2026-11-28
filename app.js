import { Game, synchronizedDigits, digitAt } from "./engine.js";

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
    ["Add infinite dimensions","Each move describes a position with infinitely many coordinates. Enter optional Initial Dimensions and a required repeating pattern using 1, 2, and 3. Tap Go to play X."],
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
    ["About the dekeract","The rotating 10D cube projects your first ten coordinates. Moves that differ only beyond dimension ten can overlap; × shows their count. Visual alignment alone does not prove a win. The game checks every infinite dimension."]
  ];

  const $ = id => document.getElementById(id);
  const ui = {
    title:$("gameTitle"), modeBar:$("modeBar"), upper:$("upperScroll"),
    history:$("historyTable"), historyScroll:$("historyScroller"),
    historyHeading:$("historyHeading"), historyStatus:$("historyStatus"),
    status:$("turnStatus"), warnings:$("threatStatus"), errors:$("errorStatus"),
    guideHeading:$("guideHeading"), guideBody:$("guideBody"), guideArea:$("guideArea"),
    graphic:$("gameSvg"), whiteBox:$("whiteSelect"), yellowBox:$("yellowSelect"),
    whiteValue:$("whiteValue"), yellowValue:$("yellowValue"),
    whiteCaption:$("whiteCaption"), yellowGroup:$("yellowGroup"),
    count:$("coordCount"), fieldGrid:$("fieldGrid"),
    go:$("goButton"), del:$("deleteBtn")
  };
  let mode = "2d";
  let tesseractFrame=null, tesseractStarted=0;
  let dekeractFrame=null, dekeractStarted=0;
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
  function placeGuideForMode(which,guide,historyScroll) {
    // Keep the original graphic grid cell reserved in 4D mode.
    // The live instructions are the last item in the history scroller.
    const heading=guide.querySelector(".guide-heading");
    historyScroll.classList.toggle("guide-at-bottom",which==="4d");
    if(which==="4d") {
      if(guide.parentElement===historyScroll) return;
      const reserved=document.createElement("div");
      reserved.className="guide-area";
      reserved.id="reserved4DGuideSpace";
      reserved.setAttribute("aria-hidden","true");
      guide.replaceWith(reserved);
      historyScroll.append(guide);
      guide.style.overflow="visible";
      guide.style.padding="8px 9px";
      // Auto top margin absorbs spare height, then collapses as moves accumulate.
      guide.style.margin="auto 4px 8px";
      heading.style.marginBottom="0";
    } else {
      const reserved=document.getElementById("reserved4DGuideSpace");
      if(!reserved) return;
      reserved.replaceWith(guide);
      guide.style.removeProperty("overflow");
      guide.style.removeProperty("padding");
      guide.style.removeProperty("margin");
      heading.style.removeProperty("margin-bottom");
    }
    guide.scrollTop=0;
  }

  function switchMode(which) {
    if(!["2d","3d","4d","inf"].includes(which)) return;
    stopTesseractAnimation();
    stopDekeractAnimation();
    mode=which;
    const titles={"2d":"Two Dimensional Tic-Tac-Toe","3d":"Three Dimensional Tic-Tac-Toe","4d":"Four Dimensional Tic-Tac-Toe",inf:"Infinite Dimensional Tic-Tac-Toe"};
    ui.title.textContent=titles[which];
    document.title=titles[which];
    dekeractStarted=performance.now();
    tesseractStarted=performance.now();
    placeGuideForMode(which,ui.guideArea,ui.historyScroll);
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
    // The empty active field tells the player whose turn it is. In ∞D
    // the two fields remain separate; only the active empty field prompts.
    const finished=Boolean(game.winner||game.draw);
    const prompt=game.winner?game.winner+" wins!":game.draw?"Draw!":game.nextPlayer+" to move. Enter coordinates.";
    function fieldValue(el,entry,isActive) {
      const showPrompt=!entry&&isActive;
      el.textContent=preview(entry,showPrompt?prompt:"Tap to enter");
      el.className=showPrompt?"turn-prompt "+(finished?"win":game.nextPlayer.toLowerCase()):"";
    }
    fieldValue(ui.whiteValue,whiteEntry,finite||activeField==="white");
    fieldValue(ui.yellowValue,yellowEntry,!finite&&activeField==="yellow");
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
    ui.historyHeading.hidden=game.moves.length===0;
    if(!game.moves.length)return;
    const finite=mode!=="inf";
    const widths=game.widths;
    const count=finite?game.dimensions:widths.white+widths.yellow;
    // Reserve an explicit final column for the infinite continuation marker.
    // Without it CSS grid auto-places the ellipsis on a second row.
    const columns=["24px","36px",...Array.from({length:Math.max(1,count)},()=> "27px"),...(!finite?["24px"]:[])].join(" ");
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
    if(game.winner) {
      ui.status.textContent=game.winner+" wins!";
      ui.status.className="turn-status win";
      ui.warnings.textContent="";
    } else if(game.draw) {
      ui.status.textContent="Draw!";
      ui.status.className="turn-status win";
      ui.warnings.textContent="";
    } else {
      ui.status.textContent="";
      ui.status.className="turn-status";
      const counts=game.threatCounts;
      ui.warnings.textContent=["X","O"].filter(k=>counts[k]).map(k=>
        `${k}: ${counts[k]} threat${counts[k]===1?"":"s"}${counts[k]>1?" (fork)":""}`).join(" · ");
    }
    ui.errors.textContent=currentError;
    ui.historyStatus.hidden=!(ui.status.textContent||ui.warnings.textContent||currentError);
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
  function render3DCube(svg, moves, winningIndices, selected) {
    // Orthographic projection of a 3 × 3 × 3 cube. The three axes
    // have equal projected scale order, but intentionally different slopes
    // so marks inside the cube remain distinguishable on a small screen.
    const project=(x,y,z)=>[78+24*x-16*y,75+3*x+7*y-24*z];
    const center=position=>project(...position.map(v=>v-.5));
    function line(a,b,attrs={}) {
      svg.append(svgNode("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],
        "stroke-linecap":"round",...attrs}));
    }
    function face(corners,attrs) {
      svg.append(svgNode("polygon",{points:corners.map(p=>project(...p).join(",")).join(" "),...attrs}));
    }

    // Lightly tint the three visible faces; interior marks remain visible.
    face([[0,0,3],[3,0,3],[3,3,3],[0,3,3]],{fill:"#e5eef9","fill-opacity":".42"});
    face([[0,3,0],[3,3,0],[3,3,3],[0,3,3]],{fill:"#dce8f7","fill-opacity":".22"});
    face([[3,0,0],[3,3,0],[3,3,3],[3,0,3]],{fill:"#cbdcf2","fill-opacity":".26"});

    // Each axis has sixteen parallel gridlines. Draw interior lines first,
    // then surface divisions, then the twelve strong exterior edges.
    const grid=[];
    for(let axis=0;axis<3;axis++) {
      const others=[0,1,2].filter(i=>i!==axis);
      for(let a=0;a<=3;a++) for(let b=0;b<=3;b++) {
        const start=[0,0,0], end=[0,0,0];
        start[others[0]]=end[others[0]]=a;
        start[others[1]]=end[others[1]]=b;
        end[axis]=3;
        const boundary=Number(a===0||a===3)+Number(b===0||b===3);
        grid.push({start,end,boundary});
      }
    }
    grid.sort((a,b)=>a.boundary-b.boundary);
    for(const {start,end,boundary} of grid) {
      line(project(...start),project(...end),{
        stroke:boundary===2?"#647b99":"#8c9fb5",
        "stroke-width":boundary===2?1.05:.65,
        "stroke-opacity":boundary===2?.9:boundary===1?.48:.23
      });
    }

    const winners=winningIndices.map(i=>moves[i]).filter(Boolean);
    const winning=new Set(winners.map(m=>m.position.join("")));
    // Highlight a complete keypad selection without revealing any threats.
    if(selected && /^[123]{3}$/.test(selected)) {
      const [x,y]=center([...selected].map(Number));
      svg.append(svgNode("circle",{cx:x,cy:y,r:5.6,fill:"#d7e9ff",
        "fill-opacity":".9",stroke:"#1e66da","stroke-width":".9"}));
    }

    // The engine supplies one winning triple, which need not be in spatial
    // order. Connect its farthest endpoints so the line passes through all
    // three marks even when the last move occupies the middle square.
    if(winners.length===3) {
      let endpoints=[], longest=-1;
      for(let i=0;i<3;i++) for(let j=i+1;j<3;j++) {
        const d=winners[i].position.reduce((sum,v,k)=>sum+(v-winners[j].position[k])**2,0);
        if(d>longest) {longest=d;endpoints=[winners[i],winners[j]];}
      }
      line(center(endpoints[0].position),center(endpoints[1].position),
        {stroke:"#229957","stroke-width":2.5,"stroke-opacity":".92"});
    }

    // Upright, high-contrast glyphs stay readable through the wireframe.
    for(const move of moves) {
      const [x,y]=center(move.position), won=winning.has(move.position.join(""));
      if(won) svg.append(svgNode("circle",{cx:x,cy:y,r:5.6,fill:"#d5f7dc",
        stroke:"#229957","stroke-width":".8"}));
      svg.append(svgNode("text",{x,y,"text-anchor":"middle","dominant-baseline":"central",
        "font-family":"Arial, sans-serif","font-size":10.5,"font-weight":"700",
        fill:move.player==="X"?"#1e66da":"#d9323d",
        stroke:"#ffffff","stroke-width":1.4,"stroke-linejoin":"round",
        "paint-order":"stroke fill"},move.player));
    }
  }

  function projectTesseract(position,phase=0) {
    // Continuous rotation through four-dimensional space. The initial
    // view remains close to the original nested-cube orientation.
    let [x,y,z,w]=position.map(v=>v-2);
    const rotate=(a,b,t)=>[a*Math.cos(t)-b*Math.sin(t),a*Math.sin(t)+b*Math.cos(t)];
    [x,w]=rotate(x,w,.16+phase);
    [z,w]=rotate(z,w,.11+.43*phase);
    [y,w]=rotate(y,w,.07+.27*phase);
    // Slightly increase perspective distance to keep every possible
    // rotated position (including marker padding) inside the fixed SVG.
    const factor=3.6/(3.6-w);
    return [90+factor*(29*x-15*y),86+factor*(4*x+9*y-31*z)];
  }

  function drawTesseract(svg,moves,winningIndices,selected,phase=0) {
    svg.replaceChildren();
    const project=p=>projectTesseract(p,phase);
    const line=(a,b,attrs)=>{const [x1,y1]=project(a),[x2,y2]=project(b);
      svg.append(svgNode("line",{x1,y1,x2,y2,"stroke-linecap":"round",...attrs}));};
    // All 108 straight lattice lines (each covers three playable cells).
    // Cube skeletons for w=1,2,3 and the eight corner connectors are
    // stronger; internal gridlines are deliberately subdued.
    const lines=[];
    for(let axis=0;axis<4;axis++){
      const other=[0,1,2,3].filter(k=>k!==axis);
      for(let i=1;i<=3;i++)for(let j=1;j<=3;j++)for(let k=1;k<=3;k++){
        const a=[1,1,1,1];[a[other[0]],a[other[1]],a[other[2]]]=[i,j,k];
        const b=a.slice();b[axis]=3;
        const strong=axis===3?other.every(d=>a[d]!==2):other.filter(d=>d!==3).every(d=>a[d]!==2);
        lines.push({a,b,axis,strong});
      }
    }
    lines.sort((a,b)=>Number(a.strong)-Number(b.strong));
    for(const l of lines){
      line(l.a,l.b,{stroke:l.axis===3?"#8875ad":"#647b99",
        "stroke-width":l.strong?1.05:.46,
        "stroke-opacity":l.strong?(l.axis===3?.65:.77):.14});
    }
    const winners=winningIndices.map(i=>moves[i]).filter(Boolean);
    const winning=new Set(winners.map(m=>m.position.join("")));
    if(winners.length===3){
      let max=-1,ends=[];
      for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
        const d=winners[i].position.reduce((s,v,k)=>s+(v-winners[j].position[k])**2,0);
        if(d>max){max=d;ends=[winners[i],winners[j]];}
      }
      line(ends[0].position,ends[1].position,{stroke:"#229957","stroke-width":2.5,"stroke-opacity":.95});
    }
    if(selected&&/^[123]{4}$/.test(selected)){
      const [cx,cy]=project([...selected].map(Number));
      svg.append(svgNode("circle",{cx,cy,r:4.9,fill:"#d7e9ff",stroke:"#1e66da","stroke-width":".8"}));
    }
    // Prioritize the most recent moves and winning marks when projections
    // overlap. The nine flat boards remain the unambiguous playing view.
    const ordered=moves.slice().sort((a,b)=>Number(winning.has(a.position.join("")))-Number(winning.has(b.position.join(""))));
    for(const m of ordered){
      const [x,y]=project(m.position),won=winning.has(m.position.join(""));
      if(won)svg.append(svgNode("circle",{cx:x,cy:y,r:5.1,fill:"#d5f7dc",stroke:"#229957","stroke-width":".75"}));
      svg.append(svgNode("text",{x,y,"text-anchor":"middle","dominant-baseline":"central",
        "font-family":"Arial, sans-serif","font-weight":"700","font-size":9.5,
        fill:m.player==="X"?"#1e66da":"#d9323d",stroke:"#fff","stroke-width":1.3,
        "stroke-linejoin":"round","paint-order":"stroke fill"},m.player));
    }
  }

  function render4DTesseract(now=performance.now()) {
    const host=document.getElementById("reserved4DGuideSpace");
    if(mode!=="4d"||!host)return;
    let svg=host.querySelector("svg");
    if(!svg){
      host.removeAttribute("aria-hidden");
      host.style.padding="0";
      host.style.display="flex";
      host.style.alignItems="center";
      host.style.justifyContent="center";
      svg=svgNode("svg",{viewBox:"0 0 180 172",role:"img","aria-label":"Four-dimensional nested cube game diagram"});
      svg.style.cssText="display:block;width:100%;height:100%;max-width:180px;max-height:172px";
      host.append(svg);
    }
    const phase=reducedMotion?0:(now-tesseractStarted)/1900;
    drawTesseract(svg,game.moves,game.winningIndices,whiteEntry,phase);
  }

  function stopTesseractAnimation(){
    if(tesseractFrame!==null)cancelAnimationFrame(tesseractFrame);
    tesseractFrame=null;
  }

  function startTesseractAnimation(){
    if(reducedMotion||tesseractFrame!==null)return;
    let last=0;
    const tick=now=>{
      if(mode!=="4d"){tesseractFrame=null;return;}
      if(now-last>=50){render4DTesseract(now);last=now;}
      tesseractFrame=requestAnimationFrame(tick);
    };
    tesseractFrame=requestAnimationFrame(tick);
  }

  function renderFiniteBoard() {
    const svg=ui.graphic, width=180, height=172, dims=game.dimensions;
    svg.replaceChildren();
    svg.setAttribute("aria-label",`${dims}D tic-tac-toe read-only board diagram`);
    const occupied=new Map(game.moves.map(m=>[m.position.join(""),m.player]));
    const winning=new Set(game.winningIndices.map(i=>game.moves[i].position.join("")));
    const selected=whiteEntry.length===dims?whiteEntry:null;
    const selectionColor=game.nextPlayer==="O"?"#ffe4e7":"#d7e9ff";
    const gap=3.5, side=Math.min((width-15-2*gap)/3,(height-18-2*gap)/3);
    function text(x,y,value,size=10) {
      svg.append(svgNode("text",{x,y,"text-anchor":"middle","font-family":"Arial, sans-serif",
        "font-weight":"700","font-size":size,fill:"#607189"},value));
    }
    function board(x,y,third=1,fourth=1) {
      const step=side/3;
      svg.append(svgNode("rect",{x,y,width:side,height:side,rx:3,fill:"#fff",stroke:"#dbe4f0","stroke-width":1}));
      for(let r=0;r<3;r++) for(let c=0;c<3;c++) {
        // Column first, row second; higher coordinates select boards.
        const coords=[c+1,r+1];
        if(dims>=3) coords.push(third);
        if(dims===4) coords.push(fourth);
        const key=coords.join("");
        const sx=x+c*step,sy=y+r*step;
        // Each entered digit narrows the matching cells by one dimension.
        // Keep the existing full-coordinate preview on the 3D cube separate.
        const partialMatch=whiteEntry.length>0&&key.startsWith(whiteEntry);
        if(winning.has(key)||partialMatch) svg.append(svgNode("rect",{
          x:sx+1,y:sy+1,width:step-2,height:step-2,rx:2,
          fill:winning.has(key)?"#d5f7dc":selectionColor}));
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
      // Keep the existing board size; reserve the upper part for the cube.
      const g=5, total=3*side+2*g, x0=(width-total)/2,y0=height-side-3;
      render3DCube(svg,game.moves,game.winningIndices,selected);
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
  function makeDekeractBasis(phase) {
    // Two orthonormal screen axes in R^10. Rotating the basis is equivalent
    // to rotating the entire hypercube before its orthographic projection.
    const u=Array.from({length:10},(_,i)=>Math.cos(Math.PI*i/10)/Math.sqrt(5));
    const v=Array.from({length:10},(_,i)=>Math.sin(Math.PI*i/10)/Math.sqrt(5));
    function spin(i,j,angle){
      const c=Math.cos(angle),s=Math.sin(angle);
      for(const row of [u,v]){
        const a=row[i],b=row[j];row[i]=a*c-b*s;row[j]=a*s+b*c;
      }
    }
    for(let i=0;i<5;i++)spin(i,i+5,phase*(.71+.19*i));
    for(let i=0;i<5;i++)spin(2*i,(2*i+3)%10,phase*(.29+.08*i));
    return [u,v];
  }

  function projectDekeract(coords,basis){
    let x=0,y=0;
    for(let i=0;i<10;i++){x+=coords[i]*basis[0][i];y+=coords[i]*basis[1][i];}
    // Norm <= sqrt(10); marker-safe radius <= 75.9 within 180 x 172.
    return [90+24*x,86+24*y];
  }

  function drawDekeract(svg,moves,winningIndices,phase=0){
    const basis=makeDekeractBasis(phase);
    const project=p=>projectDekeract(p,basis);
    const node=(tag,attrs,value)=>svgNode(tag,attrs,value);
    svg.replaceChildren();
    svg.setAttribute("aria-label","Rotating ten-dimensional hypercube; first ten coordinates of infinite-dimensional moves");
    // All 1024 vertices and 5120 edges. Bundle edges by axis into ten
    // paths instead of making thousands of DOM nodes per animation frame.
    const vertices=Array.from({length:1024},(_,n)=>project(Array.from({length:10},(_,i)=>n&(1<<i)?1:-1)));
    const colors=["#526f9c","#7563a0","#497f9c","#6589ac","#8475a9"];
    const fmt=n=>n.toFixed(1);
    for(let d=0;d<10;d++){
      const bit=1<<d,parts=[];
      for(let i=0;i<1024;i++)if(!(i&bit)){
        const a=vertices[i],b=vertices[i|bit];
        parts.push(`M${fmt(a[0])} ${fmt(a[1])}L${fmt(b[0])} ${fmt(b[1])}`);
      }
      svg.append(node("path",{d:parts.join(""),fill:"none",stroke:colors[d%colors.length],
        "stroke-width":".46","stroke-opacity":".12","stroke-linecap":"round"}));
    }
    // The first ten digits are exactly sampled from the engine's canonical
    // prefix and repeating cycle. No approximation is used to decide wins.
    const winning=new Set(winningIndices);
    const groups=new Map();
    const projected=moves.map((m,i)=>{
      const coords=Array.from({length:10},(_,d)=>digitAt(m.position,d)-2);
      const key=coords.join(",");
      if(!groups.has(key))groups.set(key,{coords,members:[]});
      const entry={m,i,coords,key};groups.get(key).members.push(entry);
      return entry;
    });
    const winners=winningIndices.map(i=>projected[i]).filter(Boolean);
    if(winners.length===3){
      let farthest=-1,ends=[];
      for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
        const a=winners[i].coords,b=winners[j].coords;
        const d=a.reduce((s,x,k)=>s+(x-b[k])**2,0);
        if(d>farthest){farthest=d;ends=[a,b];}
      }
      const a=project(ends[0]),b=project(ends[1]);
      // A legitimate infinite-dimensional win may collapse to a single
      // point if its changing coordinates occur only beyond dimension ten.
      if(Math.hypot(b[0]-a[0],b[1]-a[1])>.5)
        svg.append(node("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:"#229957",
          "stroke-width":2.6,"stroke-linecap":"round","stroke-opacity":".96"}));
    }
    // Distinct infinite coordinates can have identical first ten digits.
    // Keep their exact shared location and mark multiplicity rather than
    // inventing an offset that would misrepresent the geometry.
    const ordered=[...groups.values()].sort((a,b)=>Number(a.members.some(e=>winning.has(e.i)))-Number(b.members.some(e=>winning.has(e.i))));
    for(const g of ordered){
      const [x,y]=project(g.coords);
      const won=g.members.some(e=>winning.has(e.i));
      const xs=g.members.filter(e=>e.m.player==="X").length,os=g.members.length-xs;
      const latest=g.members[g.members.length-1].m.player;
      const group=node("g",{"aria-label":`${xs} X and ${os} O at this ten-dimensional position`});
      group.append(node("title",{},`${xs} X, ${os} O; first ten coordinates: ${g.coords.map(d=>d+2).join(",")}`));
      if(won)group.append(node("circle",{cx:x,cy:y,r:7.2,fill:"#d5f7dc",stroke:"#229957","stroke-width":1.1}));
      else if(g.members.length>1)group.append(node("circle",{cx:x,cy:y,r:6.7,fill:"#fff",stroke:"#8c9fb5","stroke-width":".8"}));
      const label=xs&&os?"X/O":latest;
      if(xs&&os){
        const t=node("text",{x,y,"text-anchor":"middle","dominant-baseline":"central","font-family":"Arial, sans-serif","font-size":8.6,"font-weight":"700",stroke:"#fff","stroke-width":1.4,"paint-order":"stroke fill"});
        t.append(node("tspan",{fill:"#1e66da"},"X"),node("tspan",{fill:"#607189"},"/"),node("tspan",{fill:"#d9323d"},"O"));
        group.append(t);
      }else group.append(node("text",{x,y,"text-anchor":"middle","dominant-baseline":"central",
        "font-family":"Arial, sans-serif","font-size":12,"font-weight":"700",
        fill:latest==="X"?"#1e66da":"#d9323d",stroke:"#fff","stroke-width":1.7,"paint-order":"stroke fill"},label));
      if(g.members.length>1)group.append(node("text",{x,y:y+9,"text-anchor":"middle","font-family":"Arial, sans-serif","font-size":7.5,"font-weight":"700",fill:"#40546f",stroke:"#fff","stroke-width":1.1,"paint-order":"stroke fill"},`×${g.members.length}`));
      svg.append(group);
    }
  }

  function renderDekeract(now=performance.now()){
    if(mode!=="inf")return;
    drawDekeract(ui.graphic,game.moves,game.winningIndices,reducedMotion?0:(now-dekeractStarted)/2100);
  }

  function stopDekeractAnimation(){
    if(dekeractFrame!==null)cancelAnimationFrame(dekeractFrame);
    dekeractFrame=null;
  }

  function startDekeractAnimation(){
    if(reducedMotion||dekeractFrame!==null)return;
    let last=0;
    const tick=now=>{
      if(mode!=="inf"){dekeractFrame=null;return;}
      if(now-last>=66){renderDekeract(now);last=now;}
      dekeractFrame=requestAnimationFrame(tick);
    };
    dekeractFrame=requestAnimationFrame(tick);
  }

  function renderGraphic(animate=false) {
    if(mode==="inf"){renderDekeract();startDekeractAnimation();}
    else {
      graphicEpoch++;
      renderFiniteBoard();
      if(mode==="4d"){render4DTesseract();startTesseractAnimation();}
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
