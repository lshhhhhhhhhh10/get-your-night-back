// Shared by rendering and held-object input so vertical motion has no sideways
// perspective drift, including when the close-up camera pulls back on mobile.
export function incidentView(kind,aspect=1){
 return {y:kind==='pencils'?1.22:kind==='vase'?1.28:.96,z:(kind==='vase'?4.40:kind==='pencils'?2.60:kind==='tin'?3.40:2.25)/Math.min(1,aspect/.95),targetY:kind==='vase'?.42:kind==='pencils'?.20:.07,targetZ:.08};
}
export function incidentDepth(p,kind,aspect){
 const c=incidentView(kind,aspect),dy=c.y-c.targetY,dz=c.z-c.targetZ;
 return ((c.y-p.y)*dy+(c.z-p.z)*dz)/Math.hypot(dy,dz);
}
