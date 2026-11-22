import subprocess, json, os
FPS=30
T=[0.00,1.35,2.95,4.97,6.20,7.58,8.92,10.15,10.94,13.60,14.30,15.09,16.78,18.18,19.78,21.56,22.09,23.81,24.86,27.50]
SH=[("7184",0.5,"cold"),("2170",0.3,"cold"),("1056",2,"cold"),("36555",1,"cold"),("3429",1,"cold"),("45293",2,"cold"),
    (None,0,""),("6850",2,"warm"),("17784",1,"warm"),("48525",3,"warm"),("7271",2,"warm"),("34041",1,"warm"),("9614",5,"warm"),
    ("25222",1,"warm"),("26002",1,"sepia"),(None,0,""),("3969",2,"warm"),("34007",1,"warm"),("12280",1,"cold")]
G={'cold':"colorbalance=rs=-0.12:gs=-0.02:bs=0.24:rm=-0.08:bm=0.14:rh=0.02:bh=0.04,eq=contrast=1.08:saturation=1.35:gamma=0.9",
   'warm':"colorbalance=rs=0.08:bs=-0.06:rm=0.12:gm=0.02:bm=-0.12:rh=0.08:bh=-0.08,eq=contrast=1.06:saturation=1.4:gamma=0.93",
   'sepia':"colorchannelmixer=.45:.6:.15:0:.38:.55:.13:0:.28:.42:.11,eq=contrast=1.05:gamma=0.93"}
os.makedirs('shots',exist_ok=True)
lst=open('shots/list.txt','w')
for k,(src,ss,mood) in enumerate(SH):
    a,b=round(T[k]*FPS),round(T[k+1]*FPS); n=b-a; dur=n/FPS
    out=f'shots/s{k:02d}.mp4'
    if src is None:
        cmd=['ffmpeg','-v','error','-y','-f','lavfi','-i',f'color=c=0x050505:s=1080x1350:r={FPS}:d={dur}','-frames:v',str(n)]
    else:
        Z=f"(1+0.09*exp(-7*t)+0.05*t/{dur:.3f})"
        vf=(f"fps={FPS},scale=w=-2:h='trunc(1350*1.04*{Z}/2)*2':eval=frame,"
            f"crop=1080:1350:x='(iw-1080)/2+2.5*sin(t*9.1)+1.5*sin(t*23.7)':y='(ih-1350)/2+2*sin(t*7.3+1)+1.2*sin(t*19.1)',"
            f"{G[mood]},gblur=sigma=1.6,setsar=1")
        cmd=['ffmpeg','-v','error','-y','-ss',str(ss),'-i',f'src/{src}.mp4','-vf',vf,'-frames:v',str(n),'-an']
    cmd+=['-c:v','libx264','-preset','veryfast','-crf','14','-pix_fmt','yuv420p',out]
    subprocess.run(cmd,check=True); lst.write(f"file 's{k:02d}.mp4'\n"); print(k,n,flush=True)
lst.close()
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i','shots/list.txt','-c','copy','footage.mp4'],check=True)
