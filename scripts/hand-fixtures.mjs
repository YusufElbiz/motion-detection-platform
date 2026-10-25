// Test-only procedural landmarks; never evidence of physical hand recognition.
export function handFixture({x=.5,y=.5,closed=false,rotation=0,tilt=0,scale=1}={}){
 const points=Array.from({length:21},()=>({x:0,y:0,z:0}));points[0]={x:0,y:.12,z:0};
 for(const [i,bx,by]of [[5,-.055,-.015],[9,-.018,-.035],[13,.022,-.025],[17,.055,0]]){
  points[i]={x:bx,y:by,z:0};
  for(let j=1;j<=3;j++)points[i+j]=closed?
   {x:bx,y:by+[-.05,-.045,.015][j-1],z:[-.005,-.055,-.065][j-1]}:
   {x:bx,y:by-[.065,.115,.16][j-1],z:0};
 }
 points[1]={x:-.06,y:.065,z:0};points[2]={x:-.085,y:.035,z:0};points[3]={x:-.105,y:0,z:0};points[4]={x:closed?-.03:-.12,y:closed?.015:-.035,z:closed?-.07:0};
 const r=rotation*Math.PI/180,t=tilt*Math.PI/180,aspect=4/3;
 const rotated=points.map(p=>{
  const rx=p.x*Math.cos(t)+p.z*Math.sin(t),rz=-p.x*Math.sin(t)+p.z*Math.cos(t);
  return {x:(rx*Math.cos(r)-p.y*Math.sin(r))*scale/aspect,y:(rx*Math.sin(r)+p.y*Math.cos(r))*scale,z:rz*scale/aspect};
 });
 const palm=[0,5,9,13,17].map(i=>rotated[i]);const center={x:palm.reduce((s,p)=>s+p.x,0)/5,y:palm.reduce((s,p)=>s+p.y,0)/5};
 return rotated.map(p=>({x:p.x-center.x+x,y:p.y-center.y+y,z:p.z}));
}
