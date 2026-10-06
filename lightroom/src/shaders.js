/* ============================================================
   GLSL-Shader der Entwicklungspipeline
   ============================================================ */
const VS = `#version 300 es
in vec2 aPos; uniform float uFlipY; out vec2 vUv;
void main(){ vUv = vec2(aPos.x*.5+.5, uFlipY>.5 ? .5-aPos.y*.5 : aPos.y*.5+.5); gl_Position = vec4(aPos,0.,1.); }`;
const FS_COPY = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; out vec4 o;
void main(){ o = texture(uTex, vUv); }`;
const FS_BLUR = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir; out vec4 o;
void main(){
  float w[5] = float[5](.227027,.1945946,.1216216,.054054,.016216);
  vec4 c = texture(uTex, vUv)*w[0];
  for(int i=1;i<5;i++){ c += (texture(uTex, vUv+uDir*float(i)) + texture(uTex, vUv-uDir*float(i)))*w[i]; }
  o = c;
}`;
const FS_MAIN = `#version 300 es
precision highp float; precision highp int; precision highp sampler2DArray; precision highp sampler3D;
in vec2 vUv; out vec4 outColor;
uniform sampler2D uSrc, uBlurS, uLut, uData, uGF, uGFC; uniform vec2 uKeys; uniform vec3 uAir; uniform sampler3D uProf; uniform sampler2DArray uBrush;
uniform vec2 uSrcSize, uFrameSize, uOutSize, uLine; uniform vec4 uCrop, uSub; uniform float uAngle, uPxScale, uLod, uCropEdit; uniform vec2 uFlip;
uniform vec4 uGeo; uniform vec3 uGeo2;
uniform vec4 uTone, uTone2, uPres; uniform float uSat;
uniform vec4 uMix[6]; uniform vec4 uBWM[2]; uniform float uBW;
uniform vec3 uGS,uGM,uGH,uGG; uniform vec4 uGL; uniform vec2 uGB;
uniform vec4 uSharp; uniform vec3 uNR; uniform vec4 uVig; uniform float uVigHi; uniform vec3 uGrain;
uniform vec4 uFringe; uniform vec2 uLensVig; uniform float uProfAmt, uProfOn;
uniform float uBefore, uClip; uniform vec2 uSplit, uVis; uniform int uShowMask, uMaskOnly; uniform vec4 uMaskCol;
uniform int uMaskN, uSpotN, uPointN, uRowComp, uRowSpot, uRowPoint;
const vec3 LW = vec3(.2126,.7152,.0722);
float luma(vec3 c){ return dot(c,LW); }
vec3 toLin(vec3 c){ c=max(c,0.); return mix(c/12.92, pow((c+.055)/1.055, vec3(2.4)), step(.04045,c)); }
vec3 toSrgb(vec3 c){ c=max(c,0.); return mix(c*12.92, 1.055*pow(c, vec3(1./2.4))-.055, step(.0031308,c)); }
vec3 rgb2hsl(vec3 c){
  float mx=max(c.r,max(c.g,c.b)), mn=min(c.r,min(c.g,c.b)), l=(mx+mn)*.5, h=0., s=0., d=mx-mn;
  if(d>1e-5){ s = l>.5 ? d/(2.-mx-mn) : d/(mx+mn);
    if(mx==c.r) h=(c.g-c.b)/d+(c.g<c.b?6.:0.); else if(mx==c.g) h=(c.b-c.r)/d+2.; else h=(c.r-c.g)/d+4.; h/=6.; }
  return vec3(h,s,l);
}
float h2r(float p,float q,float t){ t=fract(t); if(t<1./6.) return p+(q-p)*6.*t; if(t<.5) return q; if(t<2./3.) return p+(q-p)*(2./3.-t)*6.; return p; }
vec3 hsl2rgb(vec3 h){ if(h.y<=0.) return vec3(h.z); float q=h.z<.5?h.z*(1.+h.y):h.z+h.y-h.z*h.y, p=2.*h.z-q; return vec3(h2r(p,q,h.x+1./3.),h2r(p,q,h.x),h2r(p,q,h.x-1./3.)); }
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
vec4 D(int x, int y){ return texelFetch(uData, ivec2(x,y), 0); }
float arr8(vec4 a, vec4 b, int i){ return i<4 ? a[i] : b[i-4]; }

/* Geometrie: Rahmen → Quelle (Drehen, Perspektive, Maßstab, Versatz, Verzerrung, Spiegeln) */
vec2 frameToSrc(vec2 p){
  vec2 q=(p-.5)*uFrameSize; float c=cos(uAngle), s=sin(uAngle);
  vec2 u=vec2(c*q.x-s*q.y, s*q.x+c*q.y)/uSrcSize.y;
  u/=uGeo.z; u-=uGeo2.xy; u*=vec2(exp(-uGeo2.z), exp(uGeo2.z));
  float w=1.+uGeo.y*u.x+uGeo.x*u.y; u/=w;
  u*=1.+uGeo.w*dot(u,u);
  vec2 r=vec2(u.x*uSrcSize.y/uSrcSize.x+.5, u.y+.5);
  if(uFlip.x>.5) r.x=1.-r.x; if(uFlip.y>.5) r.y=1.-r.y;
  return r;
}

/* Reparieren, Kopieren, Rote Augen */
vec3 healAt(vec2 s, vec3 c){
  for(int i=0;i<128;i++){
    if(i>=uSpotN) break;
    vec4 a=D(0,uRowSpot+i), b=D(1,uRowSpot+i);
    float R=max(b.x*uSrcSize.y,1.); float d=length((s-a.xy)*uSrcSize)/R; if(d>=1.) continue;
    float w=1.-smoothstep(1.-max(b.y,.002),1.,d); int mode=int(b.w+.5);
    if(mode==2){ float red=c.r-max(c.g,c.b); float k=w*smoothstep(.03,.16,red); vec3 fx=vec3(min(c.g,c.b), c.g, c.b)*(1.-b.z*.6); c=mix(c,fx,k); continue; }
    vec2 off=a.zw-a.xy; vec3 sc=textureLod(uSrc, s+off, uLod).rgb;
    if(mode==0){
      float lod=max(log2(R*.3),0.); vec3 acc=vec3(0.); float ws=0.;
      for(int k=0;k<12;k++){ float an=float(k)*.5235988; vec2 pt=a.xy+vec2(cos(an),sin(an))*R*1.15/uSrcSize;
        vec3 df=textureLod(uSrc,pt,lod).rgb-textureLod(uSrc,pt+off,lod).rgb; float dd=length((s-pt)*uSrcSize)+R*.15; float ww=(1./(dd*dd))*(1.-smoothstep(.1,.28,length(df))); acc+=df*ww; ws+=ww; }
      if(ws>1e-9) sc+=acc/ws;
    }
    c=mix(c, sc, w*b.z);
  }
  return c;
}
vec3 S(vec2 s){ vec3 c=textureLod(uSrc,s,uLod).rgb; if(uSpotN>0) c=healAt(s,c); return c; }

/* Masken */
float colorMatch(vec3 c, vec3 t, float tol){ float y=luma(c), ty=luma(t); vec2 ch=vec2(c.b-y,c.r-y), th=vec2(t.b-ty,t.r-ty); float d=length(vec3((y-ty)*.55,(ch-th)*1.7)); return 1.-smoothstep(tol*.5,tol,d); }
float compVal(int ci, vec2 p, vec3 sc){
  int row=uRowComp+ci; vec4 h=D(0,row), p0=D(1,row), p1=D(2,row);
  int type=int(h.x+.5); float v=0.; vec2 P=p*uFrameSize;
  if(type==1||type==6){ v=texture(uBrush, vec3(p, h.z)).r; }
  else if(type==2){ vec2 A=p0.xy*uFrameSize, B=p0.zw*uFrameSize, dd=B-A; float t=dot(P-A,dd)/max(dot(dd,dd),1e-6); v=1.-smoothstep(0.,1.,t); }
  else if(type==3){ vec2 q=P-p0.xy*uFrameSize; float c=cos(p1.x), s=sin(p1.x); q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y); vec2 r=max(p0.zw*uFrameSize.y,vec2(1.)); float d=length(q/r); float f=clamp(p1.y,.002,1.); v=1.-smoothstep(1.-f,1.,d); }
  else if(type==4){ float L=luma(sc); float sl=max(p0.z,.001), sh=max(p0.w,.001); v=smoothstep(p0.x-sl,p0.x+.0001,L)*(1.-smoothstep(p0.y-.0001,p0.y+sh,L)); }
  else if(type==5){ float tol=mix(.05,.55,p1.w); v=colorMatch(sc,p0.rgb,tol); if(p0.w>.5) v=max(v,colorMatch(sc,p1.rgb,tol)); }
  if(h.w>.5) v=1.-v;
  return clamp(v,0.,1.);
}
float maskW(int mi, vec2 p, vec3 sc){
  vec4 h=D(0,mi); int cs=int(h.x+.5), cn=int(h.y+.5); float m=0.;
  for(int k=0;k<16;k++){ if(k>=cn) break; int ci=cs+k; float v=compVal(ci,p,sc); int op=int(D(0,uRowComp+ci).y+.5);
    if(k==0) m=v; else if(op==0) m=max(m,v); else if(op==1) m*=1.-v; else m*=v; }
  if(h.z>.5) m=1.-m;
  return clamp(m*h.w,0.,1.);
}

struct Pm { vec4 t1; vec4 t2; vec4 t3; vec4 t4; vec3 tc; };

void hueWeights(float hd, out float w[8]){
  float C[9] = float[9](0.,30.,60.,120.,180.,240.,270.,300.,360.);
  for(int i=0;i<8;i++) w[i]=0.;
  for(int i=0;i<8;i++){ if(hd>=C[i] && hd<C[i+1]){ float t=smoothstep(0.,1.,(hd-C[i])/(C[i+1]-C[i])); w[i]+=1.-t; w[(i+1)%8]+=t; } }
}
float sig(float x){ return 1./(1.+exp(-x)); }
/* an Camera-Raw-Messungen angepasste lokale Gewinnkurven (log2), abhängig von der kantenerhaltenden Basis */
float shadowsGain(float base, float sh){ float x=max(uKeys.x,-.8)-base; return sh>0. ? 2.3*pow(sh,1.1)*sig((x-3.3)/1.) : sh*2.*sig((x-3.)/1.1)*(1.-smoothstep(8.5,10.,x)); }
float highlightsGain(float base, float hl){ float x=base-uKeys.y; float k=hl<0.?.37:.2; return hl*(hl<0.?1.35:1.)*(.035*clamp(x+5.,0.,5.5)+k*max(x-.6,0.)); }
float shapeD(float d, float sc){ float x=d/sc; return d/(1.+x*x); }
float T(float x){ return texture(uLut, vec2(clamp(x*.5,0.,1.)*(511./512.)+.5/512., .25)).r; }
/* Tonkurve farbtonerhaltend: hellsten und dunkelsten Kanal kurven, mittleren interpolieren */
vec3 rgbTone(vec3 c){ float mx=max(c.r,max(c.g,c.b)), mn=min(c.r,min(c.g,c.b)); float fmx=T(mx), fmn=T(mn); if(mx-mn<1e-5) return vec3(fmx); return fmn+(fmx-fmn)*(c-mn)/(mx-mn); }
vec3 develop(vec3 c, vec3 bS, Pm P, vec2 s){
  vec3 lin = toLin(c);
  float Ls = log2(max(luma(lin),1e-4));
  vec4 gs = texture(uGF, s); vec2 gc = texture(uGFC, s).xy;
  float base = gs.x*Ls+gs.y, baseC = gc.x*Ls+gc.y;
  float dh = P.t3.z;
  if(dh!=0.){
    float dk=min(lin.r,min(lin.g,lin.b)); float darkRef=exp2(gs.z*log2(max(dk,1e-4))+gs.w); float darkN=min(darkRef/max(max(uAir.r,uAir.g),uAir.b),1.);
    if(dh>0.){ float hh=max(darkN-.02,0.); hh=hh/(hh+.2); float t=max(1.-min(dh,1.)*.62*hh,.3); vec3 J=(lin-uAir*.9)/t+uAir*.9; float Yj=luma(max(J,0.)); J=mix(vec3(Yj),J,1.+.5*(1.-t)); lin=max(J,0.); }
    else lin=mix(lin,uAir,min(-dh,1.)*.7*mix(.4,1.,darkN));
  }
  vec3 wb = vec3(exp(.35*P.t2.z), exp(-.3*P.t2.w), exp(-.35*P.t2.z)); wb /= luma(wb);
  lin *= wb*exp2(P.t1.x);
  if(uLensVig.x!=0.){ float ar=uSrcSize.x/uSrcSize.y; float r=length((s-.5)*vec2(ar,1.))/length(vec2(ar,1.)*.5); lin*=max(1.+uLensVig.x*1.3*smoothstep(mix(0.,.75,uLensVig.y),1.05,r)*r, .05); }
  lin *= exp2(shadowsGain(base,P.t1.w)+highlightsGain(base,P.t1.z));
  float gate = smoothstep(0.,.01,luma(lin));
  float detC = Ls-baseC, cl = P.t3.y;
  float clar = shapeD(detC, detC>0.?.8:1.5)*cl*(cl>0.?1.8:1.);
  float wB = 1.-.5*smoothstep(uKeys.x-2.,uKeys.x,base);
  float detT = Ls-log2(max(luma(toLin(bS)),1e-4));
  float tex = shapeD(detT,.5)*P.t3.x*1.5;
  lin *= exp2((clar*wB+tex)*gate);
  vec3 g = toSrgb(lin);
  if(uProfOn>.5){ vec3 x=clamp(g,0.,1.); vec3 pl=texture(uProf, x*(32./33.)+.5/33.).rgb; vec3 pr = uProfAmt<=1. ? mix(x,pl,uProfAmt) : mix(pl, texture(uProf, pl*(32./33.)+.5/33.).rgb, uProfAmt-1.); g = pr+(g-x); }
  g = rgbTone(g);
  float lw=P.t2.x-uTone2.x, lb=P.t2.y-uTone2.y, lc=P.t1.y-uTone.y;
  if(abs(lw)+abs(lb)+abs(lc)>1e-4){ float L=luma(g); g += lw*.25*smoothstep(.45,1.,L)+lb*.12*(1.-smoothstep(0.,.4,L)); g = .5+(g-.5)*(1.+lc*.7); }
  vec3 x = clamp(g,0.,1.)*(511./512.)+.5/512.;
  g = vec3(texture(uLut,vec2(x.r,.75)).r, texture(uLut,vec2(x.g,.75)).g, texture(uLut,vec2(x.b,.75)).b);
  float L;
  vec3 h = rgb2hsl(g); float w[8]; hueWeights(h.x*360., w);
  if(uBW<.5){
    float hs=0., ss=0., ls=0.;
    for(int i=0;i<8;i++){ hs+=w[i]*arr8(uMix[0],uMix[1],i); ss+=w[i]*arr8(uMix[2],uMix[3],i); ls+=w[i]*arr8(uMix[4],uMix[5],i); }
    if(abs(hs)+abs(ss)+abs(ls)>1e-4){ h.x=fract(h.x+hs*30./360.+1.); h.y=clamp(h.y*(1.+ss),0.,1.); h.z=clamp(h.z*(1.+ls*.5*smoothstep(0.,.4,h.y)),0.,1.); g=hsl2rgb(h); }
    if(uPointN>0){
      vec3 hh=rgb2hsl(clamp(g,0.,1.)); float mw=0.;
      for(int i=0;i<8;i++){ if(i>=uPointN) break; vec4 a=D(0,uRowPoint+i), b=D(1,uRowPoint+i);
        float dq=abs(fract(hh.x-a.x+.5)-.5), rg=mix(.025,.14,a.w);
        float pw=(1.-smoothstep(rg*.45,rg,dq))*smoothstep(.03,.14,hh.y)*(1.-smoothstep(.3+a.w*.3,.6+a.w*.4,abs(hh.y-a.y)))*(1.-smoothstep(.3+a.w*.3,.6+a.w*.4,abs(hh.z-a.z)));
        hh.x=fract(hh.x+b.x*pw+1.); hh.y=clamp(hh.y*(1.+b.y*pw),0.,1.); hh.z=clamp(hh.z+b.z*.3*pw,0.,1.); mw=max(mw,pw); }
      if(mw>1e-4) g=mix(g, hsl2rgb(hh), 1.);
    }
  } else {
    float m=0.; for(int i=0;i<8;i++) m+=w[i]*arr8(uBWM[0],uBWM[1],i);
    g = vec3(max(luma(g)*(1.+m*.9*smoothstep(0.,.5,h.y)),0.));
  }
  L = luma(g);
  float bw_ = .06+uGB.x*.36, lo = .33-uGB.y*.25, hi = .67-uGB.y*.25;
  float ws = 1.-smoothstep(lo-bw_,lo+bw_,L), wh = smoothstep(hi-bw_,hi+bw_,L), wmid = clamp(1.-ws-wh,0.,1.);
  g += uGS*ws + uGM*wmid + uGH*wh + uGG;
  g += vec3(uGL.x*ws + uGL.y*wmid + uGL.z*wh + uGL.w)*.22;
  /* Dynamik mit Hautschutz, Sättigung mit gemessenen Lightroom-Faktoren */
  float sat=P.t3.w, vib=uPres.w;
  vec3 hq=rgb2hsl(clamp(g,0.,1.));
  float mxc=max(g.r,max(g.g,g.b)), mnc=min(g.r,min(g.g,g.b)), Sv=mxc>0.?(mxc-mnc)/mxc:0.;
  float skin=1.-smoothstep(12.,38.,abs(fract(hq.x-25./360.+.5)-.5)*360.);
  float vf = vib>0. ? vib*1.5*pow(1.-clamp(Sv,0.,1.),1.25)*mix(1.,.5,skin) : vib*smoothstep(.05,.75,Sv);
  float ks = sat<0. ? (sat>=-.5 ? 1.+.96*sat : .52+1.04*(sat+.5)) : (sat<=.5 ? 1.+.9*sat : 1.45+.8*(sat-.5));
  L = luma(g); g = mix(vec3(L), g, max(ks,0.)*max(1.+vf,0.));
  if(P.t4.z!=0.){ vec3 hl=rgb2hsl(clamp(g,0.,1.)); hl.x=fract(hl.x+P.t4.z+1.); g=hsl2rgb(hl); }
  g += P.tc;
  return g;
}
void main(){
  vec2 uv = uSub.xy + vUv*uSub.zw;
  bool before = uBefore>.5 || (uSplit.x>.5 && uSplit.x<1.5 && uv.x<uSplit.y) || (uSplit.x>1.5 && uv.y<uSplit.y);
  vec4 cr = uCropEdit>.5 ? vec4(0.,0.,1.,1.) : uCrop;
  vec2 p = cr.xy + uv*cr.zw;
  vec2 s = frameToSrc(p);
  if(s.x<0.||s.y<0.||s.x>1.||s.y>1.){ outColor = vec4(.12,.12,.12,1.); return; }
  vec3 c;
  if(before){ c = textureLod(uSrc, s, uLod).rgb; }
  else {
    c = S(s);
    Pm P; P.t1=uTone; P.t2=uTone2; P.t3=vec4(uPres.xyz,uSat); P.t4=vec4(0.); P.tc=vec3(0.);
    float showM=0., onlyM=0.;
    for(int i=0;i<12;i++){ if(i>=uMaskN) break; float mw=maskW(i,p,c); if(i==uMaskOnly) onlyM=mw; if(mw<=0.) { continue; } P.t1+=mw*D(1,i); P.t2+=mw*D(2,i); P.t3+=mw*D(3,i); P.t4+=mw*D(4,i); P.tc+=mw*D(5,i).rgb; if(i==uShowMask) showM=mw; }
    if(uMaskOnly>=0){ outColor=vec4(vec3(onlyM),1.); return; }
    vec2 tx = max(uPxScale,1.)/uSrcSize;
    float nrL = clamp(uNR.x+P.t4.y,0.,1.);
    if(nrL>0.){
      vec3 acc=c; float wsum=1.; float sig=.0015+nrL*.045*(1.2-uNR.y*.7);
      for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ if(i==0&&j==0) continue; vec3 n=S(s+vec2(i,j)*tx*1.5); vec3 dd=n-c; float ww=exp(-dot(dd,dd)/sig); acc+=n*ww; wsum+=ww; }
      c = mix(c, acc/wsum, min(1., nrL*1.6));
    }
    vec3 bS = texture(uBlurS, s).rgb;
    if(uNR.z>0.){ float l=luma(c); c = l + mix(c-l, bS-luma(bS), uNR.z); }
    float Lc = luma(c);
    if(uVis.x>.5){ float e=abs(Lc-luma(bS)); outColor=vec4(vec3(1.-smoothstep(uVis.y*.06,uVis.y*.06+.015,e)),1.); return; }
    float shp = uSharp.x + P.t4.x;
    if(shp>0.){
      vec2 o = tx*uSharp.y;
      float n = (luma(S(s+vec2(o.x,0.)))+luma(S(s-vec2(o.x,0.)))+luma(S(s+vec2(0.,o.y)))+luma(S(s-vec2(0.,o.y))))*.25;
      float det = Lc-n; float edge = abs(Lc-luma(bS));
      float mk = uSharp.w>0. ? smoothstep(uSharp.w*.06, uSharp.w*.06+.03, edge) : 1.;
      det = sign(det)*max(abs(det)-(1.-uSharp.z)*.006,0.);
      c += det*shp*2.2*mk;
    }
    if(uFringe.x>0.||uFringe.z>0.){
      float edge=clamp(abs(Lc-luma(bS))*10.,0.,1.); vec3 hf=rgb2hsl(clamp(c,0.,1.));
      float dp=abs(fract(hf.x-uFringe.y+.5)-.5), dg=abs(fract(hf.x-uFringe.w+.5)-.5);
      float fw=uFringe.x*(1.-smoothstep(.05,.1,dp))+uFringe.z*(1.-smoothstep(.05,.1,dg));
      c = mix(c, vec3(luma(c)), clamp(fw*edge*smoothstep(.06,.22,hf.y),0.,1.));
    }
    c = develop(c, bS, P, s);
    if(uVig.x!=0.){
      vec2 q = (uv-.5)*2.; float ar = uOutSize.x/uOutSize.y;
      vec2 qc = q*vec2(ar,1.)/max(ar,1.);
      vec2 qq = mix(q, qc, max(uVig.z,0.)); float n = 2.+max(-uVig.z,0.)*6.;
      float dist = pow(pow(abs(qq.x),n)+pow(abs(qq.y),n), 1./n);
      float st = mix(.25,1.25,uVig.y), wd = mix(.05,1.2,uVig.w);
      float v = smoothstep(st, st+wd, dist);
      if(uVig.x<0.){ v *= 1.-uVigHi*smoothstep(.6,1.,luma(c)); c *= 1.+uVig.x*v; } else c = mix(c, vec3(1.), uVig.x*v);
    }
    if(uGrain.x>0.){
      vec2 gp = uv*vec2(uOutSize.x/uOutSize.y,1.)*1400./(.6+uGrain.y*2.4);
      float n = mix(vnoise(gp)-.5, vnoise(gp*2.7+17.)-.5, uGrain.z*.7);
      float lw = 1.-pow(abs(clamp(luma(c),0.,1.)*2.-1.),2.)*.6;
      c += n*uGrain.x*.38*lw;
    }
    if(uClip>.5){
      if(max(c.r,max(c.g,c.b))>=.998) c = vec3(1.,.15,.12);
      else if(max(c.r,max(c.g,c.b))<=.004) c = vec3(.1,.35,1.);
    }
    if(uShowMask>=0) c = mix(c, uMaskCol.rgb, showM*uMaskCol.a);
  }
  if(uSplit.x>.5 && uSplit.x<1.5 && abs(uv.x-uSplit.y)<uLine.x) c = vec3(1.);
  if(uSplit.x>1.5 && abs(uv.y-uSplit.y)<uLine.y) c = vec3(1.);
  c += (hash(gl_FragCoord.xy)-.5)/255.;
  outColor = vec4(clamp(c,0.,1.),1.);
}`;
