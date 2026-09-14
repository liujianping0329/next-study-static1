#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from urllib.request import Request, urlopen
from urllib.parse import urlencode, quote
import json, re, sys

ROOT=Path('public/study/market')
INDEX=ROOT/'index.html'
JST=ZoneInfo('Asia/Tokyo')
NOW=datetime.now(JST)
TODAY=NOW.strftime('%Y-%m-%d')
RUN_HOUR=NOW.hour

LOCATIONS={
 '錦糸町（墨田區）':(35.6967,139.8144),
 '渋谷':(35.6595,139.7005),
 '桑名（三重縣桑名市）':(35.0622,136.6838),
}
SYMBOLS=[
 ('S&P 500','^GSPC'),('QQQM','QQQM'),('日經 225','^N225'),('台灣加權','^TWII'),
]
FX=[('USD/JPY','JPY=X'),('CNY/JPY','CNYJPY=X'),('TWD/JPY','TWDJPY=X')]

def get_json(url):
    req=Request(url,headers={'User-Agent':'Mozilla/5.0 dashboard-refresh/1.0','Accept':'application/json,text/plain,*/*'})
    with urlopen(req,timeout=30) as r:return json.load(r)

def wdesc(code):
    code=int(code)
    if code==0:return '晴'
    if code in (1,2):return '多雲時晴'
    if code==3:return '陰'
    if code in (45,48):return '霧'
    if code in (51,53,55,56,57):return '毛毛雨'
    if code in (61,63):return '小雨'
    if code in (65,66,67,82):return '強雨'
    if code in (71,73,75,77,85,86):return '雪'
    if code in (80,81):return '陣雨'
    if code in (95,96,99):return '雷雨'
    return '陰'

def weather_for(lat,lon):
    hourly=['temperature_2m','relative_humidity_2m','precipitation_probability','precipitation','wind_speed_10m','weather_code','uv_index']
    daily=['temperature_2m_max','temperature_2m_min','precipitation_probability_max','wind_speed_10m_max']
    q=urlencode({'latitude':lat,'longitude':lon,'hourly':','.join(hourly),'daily':','.join(daily),'timezone':'Asia/Tokyo','forecast_days':8,'wind_speed_unit':'kmh'})
    j=get_json('https://api.open-meteo.com/v1/forecast?'+q)
    h=j['hourly']; times=h['time']
    bydate={}
    rows=[]
    include_tomorrow=RUN_HOUR>=18
    tomorrow=(NOW.date().fromordinal(NOW.date().toordinal()+1)).isoformat()
    for i,ts in enumerate(times):
        d,hm=ts.split('T'); hh=int(hm[:2])
        bydate.setdefault(d,[]).append(i)
        if d==TODAY and hh>=RUN_HOUR:
            rows.append([hh,h['temperature_2m'][i],h['relative_humidity_2m'][i],h['precipitation_probability'][i],h['precipitation'][i],h['wind_speed_10m'][i],wdesc(h['weather_code'][i]),h['uv_index'][i],d])
        elif include_tomorrow and d==tomorrow:
            rows.append([hh,h['temperature_2m'][i],h['relative_humidity_2m'][i],h['precipitation_probability'][i],h['precipitation'][i],h['wind_speed_10m'][i],wdesc(h['weather_code'][i]),h['uv_index'][i],d])
    if not rows: raise RuntimeError('no hourly weather rows')
    d=j['daily']; outdaily=[]
    weekdays='一二三四五六日'
    for k,date in enumerate(d['time'][:7]):
        ids=bydate.get(date,[])
        hum=round(sum(h['relative_humidity_2m'][i] for i in ids if h['relative_humidity_2m'][i] is not None)/max(1,sum(1 for i in ids if h['relative_humidity_2m'][i] is not None))) if ids else None
        uvs=[h['uv_index'][i] for i in ids if h['uv_index'][i] is not None]
        uv=round(max(uvs),1) if uvs else None
        codes=[h['weather_code'][i] for i in ids if h['weather_code'][i] is not None]
        # use the most severe observed forecast code in the day for a concise label
        severe=max(codes,key=lambda x:({95:9,96:10,99:11,65:8,82:8,61:6,63:6,80:6,81:6,51:5,53:5,55:5,71:7,73:7,75:7,85:7,86:7}.get(int(x),1))) if codes else 3
        dt=datetime.strptime(date,'%Y-%m-%d')
        outdaily.append([dt.strftime('%m/%d'),weekdays[dt.weekday()],wdesc(severe),round(d['temperature_2m_max'][k]),round(d['temperature_2m_min'][k]),d['precipitation_probability_max'][k],round(d['wind_speed_10m_max'][k]),hum,uv])
    return {'hourly':rows,'daily':outdaily}

def yahoo_series(label,symbol):
    url='https://query1.finance.yahoo.com/v8/finance/chart/'+quote(symbol,safe='')+'?range=1y&interval=1d&includePrePost=false&events=div%2Csplits'
    j=get_json(url)['chart']['result'][0]
    ts=j['timestamp']; close=j['indicators']['quote'][0]['close']; meta=j.get('meta',{})
    tzname=meta.get('exchangeTimezoneName') or 'UTC'
    try:tz=ZoneInfo(tzname)
    except Exception:tz=timezone.utc
    pts=[]
    for t,c in zip(ts,close):
        if c is None:continue
        dt=datetime.fromtimestamp(t,timezone.utc).astimezone(tz)
        pts.append((dt,float(c)))
    if len(pts)<2:raise RuntimeError('not enough finance points '+symbol)
    lastdt,last=pts[-1]; prev=pts[-2][1]
    m=pts[-26:]
    monthly=[]
    buckets={}
    for dt,c in pts:
        key=(dt.isocalendar().year,dt.isocalendar().week); buckets[key]=(dt,c)
    weekly=list(buckets.values())[-53:]
    fmt=lambda x:[x[0].strftime('%m/%d'),round(x[1],4)]
    return {'name':label,'last':round(last,4),'prev':round(prev,4),'asof':lastdt.strftime('%m/%d'),'m':[fmt(x) for x in m],'y':[fmt(x) for x in weekly]}

def build_data():
    w={name:weather_for(lat,lon) for name,(lat,lon) in LOCATIONS.items()}
    s=[yahoo_series(n,sym) for n,sym in SYMBOLS]
    f=[yahoo_series(n,sym) for n,sym in FX]
    return {'date':TODAY,'updated':NOW.strftime('%Y-%m-%d %H:%M JST'),'w':w,'s':s,'f':f}

def patch_html(t,D):
    ds=json.dumps(D,ensure_ascii=False,separators=(',',':'))
    t=re.sub(r'var D=\{.*?\};\nconst J=', 'var D='+ds+';\nconst J=', t, count=1, flags=re.S)
    t=re.sub(r'<title>\d{4}-\d{2}-\d{2}｜',f'<title>{TODAY}｜',t,count=1)
    t=re.sub(r'<h1>\d{4}-\d{2}-\d{2}｜',f'<h1>{TODAY}｜',t,count=1)
    stamp=NOW.strftime('%m/%d %H:%M JST')+'｜手機單屏版'
    t=re.sub(r'(<div id="releaseBanner"><b>天氣・股市・匯率</b><span>).*?(</span>)',lambda m:m.group(1)+stamp+m.group(2),t,count=1,flags=re.S)
    # Date-aware current-row matching and explicit next-day marker at 00:00+ rows.
    old="function C(){clock.textContent='現在 '+J.f.format(new Date())+' JST　｜　資料更新 '+D.updated;let h=+J.h.format(new Date());document.querySelectorAll('tr[data-h]').forEach(x=>x.classList.toggle('now',+x.dataset.h===h));requestAnimationFrame(P)}"
    new="function C(){clock.textContent='現在 '+J.f.format(new Date())+' JST　｜　資料更新 '+D.updated;let now=new Date(),h=+J.h.format(now),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);document.querySelectorAll('tr[data-h]').forEach(x=>x.classList.toggle('now',+x.dataset.h===h&&x.dataset.day===day));requestAnimationFrame(P)}"
    if old in t:t=t.replace(old,new,1)
    # Replace renderer whether old or already date-aware.
    pat=r"function H\(\)\{hourly\.innerHTML=.*?;C\(\)\}"
    renderer="""function H(){hourly.innerHTML=Object.entries(D.w).map(([n,v])=>`<div class=\"lc\"><div class=\"lh\"><b>${n}</b><span>${v.daily[0][2]}</span></div><div class=\"hw\"><table><thead><tr><th>時刻</th><th>天氣</th><th>氣溫</th><th>濕度</th><th>降雨率</th><th>雨量</th><th>UV</th></tr></thead><tbody>${v.hourly.map(x=>{let[h,t,hu,pop,p,w,z,uv,day]=x,next=day&&day!==D.date,mark=next&&h===0?`<small class=\"daymark\">${day.slice(5)}</small><br>`:'';return`<tr class=\"${next?'nextday':''}\" data-day=\"${day||D.date}\" data-h=\"${h}\" data-t=\"${t}\" data-p=\"${p||0}\" data-w=\"${w||0}\" data-z=\"${z}\"><td>${mark}${String(h).padStart(2,'0')}:00</td><td>${W(z)}<div style=\"font-size:7px;color:#64748b\">${z}${w>32?' '+w.toFixed(0)+'km/h':''}</div></td><td>${Number(t).toFixed(1)}°</td><td>${fmt(hu,'%')}</td><td>${fmt(pop,'%')}</td><td>${p?p+' mm':''}</td><td><span class=\"uvb ${uv==null?'low':uv<=2?'low':uv<=5?'mid':'high'}\">☀<small>${uv==null?'—':uv}</small></span></td></tr>`}).join('')}</tbody></table></div></div>`).join('');C()}"""
    t,n=re.subn(pat,lambda m:renderer,t,count=1,flags=re.S)
    if n!=1:raise RuntimeError('hourly renderer patch failed')
    css='<style id="nextday-rule">.nextday{background:rgba(248,250,252,.46)}.daymark{display:inline-block;font-size:6px;color:#64748b;font-weight:800;line-height:1}</style>'
    if 'nextday-rule' not in t:t=t.replace('</head>',css+'</head>',1)
    return t

def qa(t,D):
    bad=['DecompressionStream','atob(','XMLHttpRequest','document.write(']
    for x in bad:
        if x in t:raise RuntimeError('forbidden loader token '+x)
    if re.search(r'\bfetch\s*\(',t):raise RuntimeError('runtime fetch remains')
    header='<th>時刻</th><th>天氣</th><th>氣溫</th><th>濕度</th><th>降雨率</th><th>雨量</th><th>UV</th>'
    if header not in t:raise RuntimeError('7-column header missing')
    if 'class="uvb ' not in t or '☀<small>' not in t:raise RuntimeError('UV badge missing')
    if 'w>32&&!sn' not in t:raise RuntimeError('wind threshold rule missing')
    if RUN_HOUR>=18:
        for name,v in D['w'].items():
            rows=v['hourly']; pairs=[(r[8],r[0]) for r in rows]
            if (TODAY,23) not in pairs:raise RuntimeError(name+' missing 23:00')
            tomorrow=(NOW.date().fromordinal(NOW.date().toordinal()+1)).isoformat()
            if (tomorrow,0) not in pairs:raise RuntimeError(name+' missing next-day 00:00')
            a=pairs.index((TODAY,23)); b=pairs.index((tomorrow,0))
            if b!=a+1:raise RuntimeError(name+' 23→00 not contiguous')
    for name,v in D['w'].items():
        if not v['hourly'] or len(v['daily'])<7:raise RuntimeError('weather incomplete '+name)
    if len(D['s'])!=4 or len(D['f'])!=3:raise RuntimeError('market/fx count wrong')


def main():
    base=INDEX.read_text(encoding='utf-8')
    D=build_data(); out=patch_html(base,D); qa(out,D)
    INDEX.write_text(out,encoding='utf-8')
    daily=ROOT/f'{TODAY}.html';daily.write_text(out,encoding='utf-8')
    if INDEX.read_bytes()!=daily.read_bytes():raise RuntimeError('index/daily mismatch')
    print('OK',D['updated'],'hourly', {k:len(v['hourly']) for k,v in D['w'].items()})

if __name__=='__main__':
    try:main()
    except Exception as e:
        print('FAIL:',repr(e),file=sys.stderr);sys.exit(1)
