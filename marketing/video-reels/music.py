import numpy as np, wave
sr=44100; D=19.0; n=int(sr*D); t=np.arange(n)/sr
out=np.zeros(n)
f=lambda m:440*2**((m-69)/12)
bpm=101; beat=60/bpm; bar=beat*4
chords=[[48,55,60,64,67],[43,55,59,62,67],[45,57,60,64,69],[41,53,57,60,65]]*3
def tone(freq,start,dur,amp,att=.01,dec=None,harm=(1,.3,.12)):
    s=int(start*sr); e=min(n,int((start+dur)*sr))
    if s>=n: return
    tt=np.arange(e-s)/sr
    w=sum(a*np.sin(2*np.pi*freq*(k+1)*tt) for k,a in enumerate(harm))
    env=np.minimum(1,tt/att)
    env*= np.exp(-tt/dec) if dec else np.minimum(1,(dur-tt)/0.4).clip(0)
    out[s:e]+=amp*w*env
nb=int(np.ceil(D/bar))
for i in range(nb):
    c=chords[i]; st=i*bar
    for m in c[1:]: tone(f(m),st,bar+.3,.05,att=.5)            # pad
    tone(f(c[0]-12),st,bar,.16,att=.02,harm=(1,.2))              # bass
    arp=[c[2],c[3],c[4],c[3]+12,c[4],c[3],c[2]+12,c[4]]
    for j,m in enumerate(arp):                                   # pluck arp (8ths)
        tone(f(m+12),st+j*beat/2,beat*1.5,.07,att=.004,dec=.25,harm=(1,.25,.06))
    if i>=1:
        for b in range(4):                                       # soft kick + shaker
            s=int((st+b*beat)*sr); L=int(.25*sr)
            if s+L<n:
                tt=np.arange(L)/sr; out[s:s+L]+=.35*np.sin(2*np.pi*(50+90*np.exp(-tt*30))*tt)*np.exp(-tt*14)
            s2=int((st+b*beat+beat/2)*sr); L2=int(.06*sr)
            if s2+L2<n: out[s2:s2+L2]+=.025*np.random.default_rng(b+i).standard_normal(L2)*np.exp(-np.arange(L2)/sr*60)
# notification ding at 7.8s
for m,dt in((88,0),(93,.12)): tone(f(m),7.8+dt,1.2,.12,att=.003,dec=.35,harm=(1,.15))
# end sparkle at CTA ~17.25
for k,m in enumerate([84,88,91,96]): tone(f(m),17.25+k*.07,1,.06,att=.003,dec=.4,harm=(1,))
# simple reverb: multi-tap feedback delay
rev=out.copy()
for d,g in((.031,.35),(.047,.3),(.073,.25),(.113,.2),(.181,.15)):
    k=int(d*sr); r=np.zeros(n); r[k:]=out[:-k]*g; rev+=r
out=rev
fi=np.minimum(1,t/.6); fo=np.minimum(1,(D-t)/1.5); out*=fi*fo
out=np.tanh(out*1.1); out=out/np.abs(out).max()*.75
st=np.stack([out,np.roll(out,int(.012*sr))*.97],1)
with wave.open('music.wav','wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((st*32767).astype('<i2').tobytes())
