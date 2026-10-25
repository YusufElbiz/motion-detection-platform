export class PipelineMetrics {
  private samples:{capture:number;received:number;model:number;interval:number}[]=[];
  skippedBusy=0;
  skippedRate=0;
  reset(){this.samples=[];this.skippedBusy=this.skippedRate=0;}
  record(capture:number,received:number,model:number){
    const previous=this.samples.at(-1);
    this.samples.push({capture,received,model,interval:previous?capture-previous.capture:0});
    if(this.samples.length>120)this.samples.shift();
  }
  snapshot(now:number){
    const recent=this.samples.filter(s=>now-s.received<=2000),last=this.samples.at(-1);
    const sorted=recent.map(s=>s.model).sort((a,b)=>a-b);
    return {p95ModelMs:sorted.length?sorted[Math.ceil(sorted.length*.95)-1]:0,landmarkAgeMs:last?Math.max(0,now-last.capture):null,lastResultAgeMs:last?last.received-last.capture:0,sampleIntervalMs:last?.interval??0,skippedBusy:this.skippedBusy,skippedRate:this.skippedRate};
  }
}
