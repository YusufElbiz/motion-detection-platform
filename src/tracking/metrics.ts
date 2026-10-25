export class TrackingMetrics {
  private camera: number[]=[];
  private inference: {time:number;latency:number}[]=[];
  reset(){this.camera=[];this.inference=[];}
  cameraFrame(time:number){this.camera.push(time);this.trim(time);}
  inferenceFrame(time:number,latency:number){this.inference.push({time,latency});this.trim(time);}
  private trim(now:number){this.camera=this.camera.filter(t=>now-t<=2000);this.inference=this.inference.filter(t=>now-t.time<=2000);}
  snapshot(now:number){
    this.trim(now);
    const rate=(times:number[])=>times.length<2?0:(times.length-1)*1000/(times[times.length-1]-times[0]);
    return {cameraFps:rate(this.camera),inferenceFps:rate(this.inference.map(i=>i.time)),latencyMs:this.inference.length?this.inference.reduce((sum,i)=>sum+i.latency,0)/this.inference.length:0};
  }
}
