// First-person, flat-color pixel art. The canonical drawing grid is 120x90.
export const firstPersonPalette = ['#000000', '#0c2347', '#292b30', '#6b6c73', '#d6d6d0', '#ed0717', '#f8b779', '#46583b'];
export function firstPersonPixels(variant, { humanMove = 0, robotMove = 0, cocked = false, expression = 'neutral' } = {}) {
  const desktop = variant === 'desktop', width = desktop ? 240 : 120, height = desktop ? 100 : 90;
  const C = { ink:'#000000', metal:'#d6d6d0', joint:'#292b30', gray:'#6b6c73', red:'#ed0717', skin:'#f8b779', coat:'#46583b' };
  const maps = { Table:new Map(), 'T-800 endoskeleton':new Map(), 'Robot face':new Map(), 'Robot playing hand':new Map(), 'Human foreground hand':new Map(), 'Red optics':new Map() };
  const transform = (p, foreground = false, layer = '') => {
    let [x, y] = p;
    if (cocked && ['Robot playing hand', 'Human foreground hand'].includes(layer)) {
      const anchor = foreground ? 90 : 60;
      const flex = Math.max(0, Math.min(1, (anchor - y) / 13));
      x -= flex; y -= 3 * flex;
    }
    return desktop ? [Math.round(120 + (x - 60) * (foreground ? 1.8 : 1.35)), Math.round(y * 1.08)] : [Math.round(x), Math.round(y)];
  };
  const put = (layer, x, y, color) => { if (x>=0 && y>=0 && x<width && y<height) maps[layer].set(`${x},${y}`,{x,y,color}); };
  const inside = (x,y,points) => {
    let hit=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const [xi,yi]=points[i],[xj,yj]=points[j];
      if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;
    }
    return hit;
  };
  const poly = (layer, points, fill, stroke=C.ink, foreground=false, screen=false) => {
    const pts=screen?points:points.map(p=>transform(p,foreground,layer)), mask=new Set();
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
    for(let y=Math.max(0,Math.floor(Math.min(...ys)));y<=Math.min(height-1,Math.ceil(Math.max(...ys)));y++)for(let x=Math.max(0,Math.floor(Math.min(...xs)));x<=Math.min(width-1,Math.ceil(Math.max(...xs)));x++)if(inside(x+.5,y+.5,pts))mask.add(`${x},${y}`);
    for(const key of mask){const [x,y]=key.split(',').map(Number);const edge=[[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy])=>!mask.has(`${x+dx},${y+dy}`));put(layer,x,y,stroke&&edge?stroke:fill);}
  };
  const rect = (layer,x,y,w,h,fill,stroke=null,foreground=false) => poly(layer,[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],fill,stroke,foreground);
  const line = (layer,a,b,color=C.ink,size=1,foreground=false) => {
    let [x,y]=transform(a,foreground,layer);const [ex,ey]=transform(b,foreground,layer),dx=Math.abs(ex-x),dy=-Math.abs(ey-y),sx=x<ex?1:-1,sy=y<ey?1:-1;let error=dx+dy;
    for(;;){for(let oy=0;oy<size;oy++)for(let ox=0;ox<size;ox++)put(layer,x+ox,y+oy,color);if(x===ex&&y===ey)break;const e2=2*error;if(e2>=dy){error+=dy;x+=sx;}if(e2<=dx){error+=dx;y+=sy;}}
  };
  const mirror = pts => pts.map(([x,y])=>[120-x,y]);
  const R='T-800 endoskeleton', F='Robot face', P='Robot playing hand', H='Human foreground hand';
  // The near edge is below the crop: the player is seated close to the table.
  poly('Table',desktop?[[55,68],[185,68],[250,108],[-10,108]]:[[14,62],[106,62],[126,94],[-6,94]],C.gray,C.ink,false,true);

  // T-800 machinery: a shoulder beam, pectoral housings, braces and spine pistons.
  // These are angular castings and actuators, rather than a human rib cage.
  poly(R,[[42,37],[51,35],[69,35],[78,37],[77,50],[72,57],[70,63],[50,63],[48,57],[43,50]],C.joint);
  rect(R,55,30,10,10,C.joint,C.ink);
  rect(R,56,32,2,7,C.metal);rect(R,62,32,2,7,C.metal);
  rect(R,59,33,2,5,C.gray);
  line(R,[37,36],[83,36],C.metal,2);
  const chest=[[43,38],[49,37],[57,40],[57,46],[52,49],[46,47],[43,43]];
  poly(R,chest,C.metal);poly(R,mirror(chest),C.metal);
  rect(R,47,41,7,3,C.ink);rect(R,66,41,7,3,C.ink);
  rect(R,48,41,2,2,C.gray);rect(R,70,41,2,2,C.gray);
  rect(R,55,38,10,3,C.metal);rect(R,58,40,4,10,C.metal);
  const brace=[[47,48],[53,47],[57,50],[55,53],[49,51]];
  poly(R,brace,C.metal);poly(R,mirror(brace),C.metal);
  line(R,[46,49],[50,58],C.gray,2);line(R,[74,49],[70,58],C.gray,2);
  line(R,[48,50],[52,58],C.metal);line(R,[72,50],[68,58],C.metal);
  rect(R,56,51,8,12,C.ink);
  rect(R,58,52,4,11,C.gray);
  for(const y of [52,56,60])rect(R,59,y,2,2,C.metal);
  const hip=[[48,58],[53,57],[56,61],[56,63],[49,63]];
  poly(R,hip,C.metal);poly(R,mirror(hip),C.metal);

  // Articulated arms: the robot's right fist is raised on the viewer's left.
  poly(R,[[34,41],[39,40],[42,49],[44,56],[41,61],[36,59],[35,51]],C.gray);
  line(R,[35,44],[38,54],C.metal);line(R,[38,43],[41,54],C.metal);
  poly(P,[[36,56],[41,56],[44,59],[42,63],[37,63],[34,60]],C.gray);
  rect(P,38,58,2,2,C.ink);
  poly(P,[[36,60],[41,58],[33,50],[29,48],[25,52],[30,57]],C.gray);
  line(P,[29,50],[37,57],C.metal,2);line(P,[28,53],[35,59],C.metal);
  poly(P,[[25,49],[30,49],[33,53],[29,56],[25,53]],C.metal);
  poly(R,[[81,40],[86,41],[85,51],[88,57],[87,62],[82,63],[79,57],[78,49]],C.gray);
  line(R,[82,44],[81,55],C.metal);line(R,[85,44],[84,55],C.metal);
  poly(R,[[82,57],[88,60],[87,64],[78,68],[75,64],[81,60]],C.gray);
  line(R,[84,61],[77,65],C.metal,2);line(R,[84,64],[79,67],C.metal);
  rect(R,83,59,2,2,C.ink);
  for(const center of [37,83]){
    poly(R,[[center-4,35],[center+3,35],[center+5,38],[center+4,43],[center-3,44],[center-5,41],[center-5,38]],C.metal);
    rect(R,center-2,38,4,4,C.ink);rect(R,center-1,39,2,2,C.gray);
  }
  const raised=[
    '...KKKKKKK..','..KLLLLLLmK.','.KLLLLLLLmmK','.KggggggKmmK',
    '.KLLLLLLKmmK','.KggggggKmmK','.KLLLLLLmmmK','..KLLLLmmmK.',
    '...KKKmmmK..','.....KmmLK..','......KLLLK.',
  ];
  const paintPattern=(rows,left,top,layer)=>rows.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch!=='.')rect(layer,left+x,top+y,1,1,({K:C.ink,L:C.metal,m:C.metal,g:C.gray})[ch]);}));
  if (robotMove === 0) paintPattern(raised,20,40,P);
  else if (robotMove === 1) {
    poly(P,[[21,52],[18,49],[15,45],[13,42],[13,40],[15,39],[17,41],[18,43],[17,34],[18,31],[20,31],[21,34],[21,41],[21,29],[22,27],[24,27],[25,30],[25,41],[25,31],[26,29],[28,29],[29,32],[29,42],[29,36],[30,34],[32,34],[33,37],[33,47],[31,51],[29,54],[25,54]],C.metal);
    line(P,[21,34],[21,42]);line(P,[25,32],[25,42]);line(P,[29,37],[29,43]);
    for (const [x,y] of [[19,38],[23,35],[27,37],[31,41]]) rect(P,x,y,1,2,C.gray);
    line(P,[19,45],[25,48],C.gray);
  } else {
    poly(P,[[22,52],[19,49],[18,45],[20,42],[22,41],[17,31],[17,28],[19,27],[21,29],[27,40],[28,29],[29,26],[31,26],[32,29],[31,43],[33,45],[32,49],[29,53],[26,54]],C.metal);
    rect(P,20,33,1,2,C.gray);rect(P,30,32,1,2,C.gray);
    line(P,[23,44],[27,47]);line(P,[27,45],[30,45],C.gray);line(P,[27,49],[29,49],C.gray);
  }
  paintPattern(['..KKKKKKKK.','.KLLLLLmmKK','KLLLLLLmmmK','KLLKLLKLLmK','KLLKLLKLLmK','KmmKmmKmmmK','.KKKKKKKKK.'],69,64,R);

  // Narrow, machined skull with recessed lens blocks and separate jaw hardware.
  poly(F,[[54,7],[66,7],[69,10],[70,16],[70,24],[68,27],[67,33],[64,36],[56,36],[53,33],[52,27],[50,24],[50,16],[51,10]],C.metal);
  rect(F,50,13,2,9,C.gray);rect(F,68,13,2,9,C.gray);
  rect(F,50,16,1,2,C.ink);rect(F,69,16,1,2,C.ink);
  poly(F,[[53,10],[57,9],[63,9],[67,10],[67,15],[63,17],[57,17],[53,15]],C.metal,C.gray);
  const socket=[[52,18],[57,18],[58,19],[58,22],[52,22]];
  poly(F,socket,C.ink,null);poly(F,mirror(socket),C.ink,null);
  if (expression === 'victory') {
    // One lifted shutter and a half-lidded stare: controlled, mechanical confidence.
    line(F,[52,17],[57,18],C.ink);line(F,[63,19],[68,18],C.ink);
    rect('Red optics',53,19,3,1,C.red);rect('Red optics',64,20,3,1,C.red);
    rect(F,52,21,6,1,C.metal);rect(F,62,21,6,1,C.metal);
  } else if (expression === 'defeat') {
    // Angled brow plates and wider lenses make the irritated reaction readable.
    poly(F,[[51,17],[54,17],[59,20],[58,22],[54,20],[51,19]],C.ink,null);
    poly(F,[[69,17],[66,17],[61,20],[62,22],[66,20],[69,19]],C.ink,null);
    rect('Red optics',53,20,3,2,C.red);rect('Red optics',64,20,3,2,C.red);
  } else {
    rect('Red optics',54,20,2,1,C.red);rect('Red optics',64,20,2,1,C.red);
  }
  rect(F,59,18,2,7,C.metal);
  rect(F,59,25,2,3,C.ink);
  const cheek=[[52,23],[56,23],[57,27],[55,30],[53,28]];
  poly(F,cheek,C.ink,null);poly(F,mirror(cheek),C.ink,null);
  line(F,[52,25],[54,32],C.gray,2);line(F,[68,25],[66,32],C.gray,2);
  line(F,[52,25],[54,31],C.metal);line(F,[68,25],[66,31],C.metal);
  poly(F,[[54,28],[56,30],[64,30],[66,28],[67,34],[64,36],[56,36],[53,34]],C.metal);
  rect(F,55,30,10,4,C.metal);
  if (expression === 'victory') {
    line(F,[55,32],[61,32]);line(F,[61,32],[65,30]);
    for(const x of [57,60])line(F,[x,31],[x,33]);
    rect(F,56,35,8,1,C.gray);
  } else if (expression === 'defeat') {
    rect(F,55,31,10,3,C.ink);
    for(const x of [56,59,62])rect(F,x,31,2,1,C.metal);
    rect(F,54,34,12,2,C.metal);rect(F,56,36,8,1,C.gray);
  } else {
    line(F,[55,32],[64,32]);
    for(const x of [57,60,63])line(F,[x,31],[x,33]);
    rect(F,56,35,8,1,C.gray);
  }

  // A consistent wrist anchor lets the foreground hand open without sliding.
  poly(H,[[103,87],[111,85],[128,99],[110,99],[99,94]],C.coat,C.ink,true);
  const humanPoses = [
    [[86,75],[88,72],[92,72],[92,71],[96,71],[98,73],[101,74],[102,77],[102,81],[100,84],[104,87],[100,91],[95,88],[91,85],[87,83],[85,80],[85,77]],
    [[85,78],[82,73],[82,70],[84,69],[87,72],[88,73],[87,60],[88,58],[90,58],[91,60],[92,70],[92,56],[93,54],[95,54],[96,56],[96,69],[97,58],[98,56],[100,56],[101,58],[101,71],[102,63],[103,61],[105,61],[106,64],[106,78],[103,83],[104,87],[100,91],[93,87],[88,83]],
    [[86,79],[85,75],[87,72],[88,71],[84,60],[84,57],[86,56],[88,58],[94,70],[96,57],[97,55],[99,55],[100,58],[99,73],[102,75],[102,80],[100,83],[104,87],[100,91],[93,87],[88,83]],
  ];
  poly(H,humanPoses[humanMove],C.skin,C.ink,true);
  if (humanMove === 0) {
    line(H,[91,74],[91,76],C.ink,1,true);line(H,[97,75],[97,77],C.ink,1,true);
    line(H,[96,78],[94,80],C.ink,1,true);line(H,[94,80],[96,82],C.ink,1,true);
  } else if (humanMove === 2) {
    line(H,[89,76],[94,79],C.ink,1,true);line(H,[96,76],[99,77],C.ink,1,true);
  }
  return {width,height,layers:Object.entries(maps).map(([name,pixels])=>({name,pixels:[...pixels.values()]}))};
}
