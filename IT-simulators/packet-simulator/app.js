const $ = id=>document.getElementById(id);
const names=['A','B','C','D'];
const colors=['#136d60','#9a4f13','#445fa0','#973f6b'];
const messages=['こんにちは','パケット通信','ネットワーク','情報の科学'];
let model, mode, previous=0, carry=0, shown=-1;
let wires=[], badges=[], dots=[], records=[];
function svg(tag,attrs,parent=$('map'),label=''){
  const e=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [key,value] of Object.entries(attrs)) e.setAttribute(key,value);
  parent.append(e); e.textContent=label; return e;
}
function activeNode(id){return id.startsWith('R') || Number(id.slice(1))<Number($('count').value);}
function buildMap(){

  $('map').replaceChildren(); wires=[]; badges=[]; dots=[];
  for(const link of model.links){
    if(!activeNode(link.from)||!activeNode(link.to))continue;
    const a=model.nodes[link.from], b=model.nodes[link.to];
    const label=id=>id.startsWith('R')?id:(id[0]==='S'?'送信':'受信')+names[Number(id.slice(1))];
    const g=svg('g',{role:'button',tabindex:0,'aria-label':label(a.id)+' → '+label(b.id)+' 回線切断'});
    const coords={x1:a.x,y1:a.y,x2:b.x,y2:b.y};
    const line=svg('line',{...coords,'stroke-width':3},g);
    svg('line',{...coords,stroke:'transparent','stroke-width':18},g);
    const toggle=()=>{link.open=!link.open;paint();};
    g.onclick=toggle;
    g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}};
    wires.push({link,line,g});
  }
  for(const n of Object.values(model.nodes)){
    if(!activeNode(n.id)) continue;
    const router=n.id.startsWith('R'), flow=Number(n.id.slice(1));
    if(router){
      svg('rect',{x:n.x-68,y:n.y-39,width:136,height:78,rx:9,fill:'#e2eee7',stroke:'#688879'});
      svg('text',{x:n.x,y:n.y-20,fill:'#24493e'},$('map'),n.id);
      badges.push({n,group:svg('g',{}),last:null});
    }else{
      svg('rect',{x:n.x-28,y:n.y-15,width:56,height:30,rx:5,fill:colors[flow]});
      svg('text',{x:n.x,y:n.y+5,fill:'white'},$('map'),(n.id[0]==='S'?'送信':'受信')+names[flow]);
    }
  }
  dots=new Map();
}
function packetCard(parent,label,fill){
  const g=svg('g',{'pointer-events':'none'},parent);
  svg('rect',{x:-18,y:-10,width:36,height:20,rx:4,fill,stroke:'white'},g);
  svg('text',{y:5,fill:'white'},g,label);
  return g;
}
function makeTile(p){
  const tile=document.createElement('span');tile.className='tile';
  const number=document.createElement('small');number.textContent=p.index+1;
  tile.append(number,document.createTextNode(p.char));return tile;
}
function buildRecords(){
  $('pairs').replaceChildren();records=[];
  messages.slice(0,Number($('count').value)).forEach((msg,i)=>{
    const box=document.createElement('div');box.className='pair';
    const label=document.createElement('label');label.textContent='通信 '+names[i];label.style.color=colors[i];
    const input=document.createElement('input');input.value=msg;input.maxLength=24;
    input.oninput=()=>{messages[i]=input.value;setControls();};
    label.append(input);box.append(label);
    const row=document.createElement('div');
    row.className='row';
    const heading=document.createElement('b');
    heading.textContent='到着順';
    row.append(heading);
    box.append(row);
    records.push({input,row});
    $('pairs').append(box);
  });
}
function setControls(){
  $('play').textContent={ready:'送信開始',running:'一時停止',paused:'再開',done:'もう一度送信'}[mode];
  $('play').disabled=messages.slice(0,+$('count').value).some(s=>!s.trim());
  $('count').disabled=mode!=='ready';
  records.forEach(r=>r.input.disabled=mode!=='ready');
}
function paint(){
  for(const {link,line,g} of wires){
    line.setAttribute('stroke',link.open?'#91aaa0':'#b96752');
    line.setAttribute('stroke-dasharray',link.open?'none':'6 6');
    g.setAttribute('aria-pressed',String(!link.open));
  }
  for(const badge of badges){
    const labels=badge.n.queue.map(p=>names[p.flow]+(p.index+1));
    const key=labels.join(' ');
    if(key===badge.last)continue;
    badge.last=key;
    badge.group.replaceChildren();
    const visible=labels.length>6?5:6;
    labels.slice(0,6).forEach((label,i)=>{
      const overflow=i===visible;
      const card=packetCard(badge.group,overflow?'+'+(labels.length-i):label,
        overflow?'#596a62':colors[badge.n.queue[i].flow]);
      const x=badge.n.x+42-(i%3)*42;
      const y=badge.n.y-2+Math.floor(i/3)*24;
      card.setAttribute('transform','translate('+x+' '+y+')');
    });
  }
  const moving=new Set();
  for(const {link} of wires){
    const a=model.nodes[link.from], b=model.nodes[link.to];
    const x1=a.x+(a.id.startsWith('R')?69:29);
    const x2=b.x-(b.id.startsWith('R')?69:29);
    const slope=(b.y-a.y)/(b.x-a.x);
    for(const {packet,start,end} of link.flights){
      moving.add(packet);
      if(!dots.has(packet))dots.set(packet,packetCard($('map'),names[packet.flow]+(packet.index+1),colors[packet.flow]));
      const x=x1+(x2-x1)*(model.time-start)/(end-start);
      dots.get(packet).setAttribute('transform','translate('+x+' '+(a.y+slope*(x-a.x))+')');
    }
  }
  for(const [packet,card] of dots){
    if(!moving.has(packet)){card.remove();dots.delete(packet);}
  }
  if(shown!==model.received.length){
    shown=model.received.length;
    records.forEach(({row},i)=>{
      while(row.children.length>1)row.lastChild.remove();
      model.received.filter(p=>p.flow===i).forEach(p=>row.append(makeTile(p)));
    });
  }
  const blocked=mode==='running'&&!model.links.some(l=>l.flights.length)&&model.received.length<model.packets.length;
  $('status').textContent=({ready:'送信前',paused:'一時停止中',running:blocked?'回線の復旧待ち':'通信中',done:'完了'})[mode]+'　'+model.time.toFixed(1)+' 秒　受信 '+model.received.length+' 個';
}
function reset(){
  mode='ready';shown=-1;carry=0;model=new Network([],+$('count').value);buildRecords();buildMap();setControls();paint();
}
$('reset').onclick=reset;$('count').onchange=reset;
$('play').onclick=()=>{
  if(mode==='ready'||mode==='done'){
    carry=0;
    const next=new Network(messages.slice(0,+$('count').value));
    next.links.forEach((l,i)=>l.open=model.links[i].open);
    model=next;shown=-1;buildMap();
  }
  mode=mode==='running'?'paused':'running';previous=performance.now();setControls();paint();
};
function frame(now){
  if(mode==='running'){
    carry+=Math.min((now-previous)/1000,.1)*Number($('speed').value);
    while(carry>=.05){
      model.step(.05);carry-=.05;
      if(model.received.length===model.packets.length){mode='done';setControls();break;}
    }
    paint();
  }
  previous=now;requestAnimationFrame(frame);
}
reset();requestAnimationFrame(frame);
