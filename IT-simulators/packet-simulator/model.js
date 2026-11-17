class Network {
  constructor(messages, count=messages.length) {
    this.time = 0;
    this.nodes = {};
    this.links = [];
    this.packets = [];
    const node = (id,x,y) => this.nodes[id] = {id,x,y,queue:[]};
    const link = (from,to,sendTime,travelTime) => this.links.push({
      from,to,sendTime,travelTime,open:true,nextSend:0,flights:[]
    });
    const split=count>=3;
    node('R1',320,split?95:180);
    if(split)node('R6',320,265);
    node('R5',900,180);
    for(let i=0;i<count;i++){
      const y=180+(i-(count-1)/2)*80;
      node('S'+i,45,y);
      node('D'+i,1175,y);
      link('S'+i,i<2?'R1':'R6',.55,1.45);
      link('R5','D'+i,.8,1.4);
    }
    [60,180,300].forEach((y,i)=>{
      const id='R'+(i+2);
      node(id,610,y);
      if(!split || i<2)link('R1',id,1.35,[2.8,.75,1.6][i]);
      if(split && i>0)link('R6',id,1.35,[2.8,.75,1.6][i]);
      link(id,'R5',1,[2.8,.75,1.6][i]);
    });
    messages.forEach((message,flow)=>Array.from(message).forEach((char,index)=>{
      const packet={char,index,flow,arrival:null};
      this.packets.push(packet);
      this.nodes['S'+flow].queue.push(packet);
    }));
    this.received=[];
  }
  canReach(id,target){
    return id===target || this.links.some(link=>link.open && link.from===id && this.canReach(link.to,target));
  }
  step(dt){
    this.time+=dt;
    for(const link of this.links){
      while(link.flights.length && link.flights[0].end<=this.time+1e-9){
        const {packet}=link.flights.shift();
        if(link.to==='D'+packet.flow){
          packet.arrival=this.time;
          this.received.push(packet);
        }else this.nodes[link.to].queue.push(packet);
      }
    }
    for(const node of Object.values(this.nodes)){
      for(let i=0;i<node.queue.length;){
        const p=node.queue[i];
        const choices=this.links.filter(l=>l.from===node.id && l.open && l.nextSend<=this.time+1e-9 && this.canReach(l.to,'D'+p.flow));
        if(!choices.length){i++;continue;}
        const link=choices[0];
        node.queue.splice(i,1);
        link.nextSend=this.time+link.sendTime;
        link.flights.push({packet:p,start:this.time,end:link.nextSend+link.travelTime});
      }
    }
  }
}
