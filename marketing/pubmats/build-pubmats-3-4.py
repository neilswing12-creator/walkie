SPARK='<svg viewBox="-10 -10 20 20"><path d="M0-10C1-2 2-1 10 0C2 1 1 2 0 10C-1 2-2 1-10 0C-2-1-1-2 0-10Z" fill="currentColor"/></svg>'
ARROW='<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
def head(t): return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{t}</title>
<!-- Walkie.run campaign · editable source. Render: node render.cjs (see README.md). -->
<link rel="stylesheet" href="parts/app.css"><link rel="stylesheet" href="campaign.css"></head><body>
'''
def brand(n): return f'  <div class="p-brand"><img src="parts/app-icon.png" alt=""><b>Walkie<i>.run</i></b></div><div class="p-step">{n} / 04</div>\n'
def foot(cta): return f'''  <div class="p-foot"><span class="cta">{cta} {ARROW}</span><div class="p-meta">walkie.run<small>Early preview · Walk · Run · Ride</small></div></div>
  <div class="p-grain"></div>
</div><script src="campaign.js"></script></body></html>
'''
def sp(x,y,w,c): return f'<span class="p-spark" style="left:{x}px;top:{y}px;width:{w}px;color:{c}">{SPARK}</span>'
import random; random.seed(7)
def cpos():
    while True:
        x, y = random.randint(560, 1040), random.randint(400, 640)
        if not (660 < x < 860 and 470 < y < 700): return x, y
CP=[cpos() for _ in range(22)]
conf=''.join(f'<span style="position:absolute;left:{CP[i][0]}px;top:{CP[i][1]}px;width:{random.choice([10,12,14])}px;height:{random.choice([18,22])}px;border-radius:4px;background:{random.choice(["#F2B84B","#F28DAA","#6B8FD6","#5DBE9A","#A08BE0"])};transform:rotate({random.randint(-70,70)}deg);opacity:.9;z-index:4"></span>' for i in range(22))
def ROW(r,pet,name,pts,me=False,up=""):
    bg='background:linear-gradient(90deg,#EAF2FC,#F4F8FE);box-shadow:inset 0 0 0 2px #A9C5ED' if me else ''
    return f'''<div style="display:flex;align-items:center;gap:12px;padding:7px 12px;border-radius:18px;{bg}">
      <b style="width:26px;font:600 20px Fredoka;color:#8592A6;text-align:center">{r}</b>
      <span style="position:relative;width:46px;height:46px;flex:none;border-radius:50%;background:#EEF2F8;overflow:hidden;box-shadow:inset 0 0 0 2px #fff"><span data-part="{pet}" class="f0" style="position:absolute;left:-15px;top:-8px;width:76px"></span></span>
      <span style="flex:1;font:800 18px Nunito">{name}</span><span style="font:800 13px Nunito;color:#3E9F69">{up}</span><span style="font:600 19px Fredoka;color:#425A7C">{pts}</span></div>'''
p3=head("Walkie.run — 03 Leaderboard & community")+f'''<div class="pm">
  <div class="bg" style="background:radial-gradient(110% 90% at 85% 5%,#FFFFFF 0%,#F2EEFD 40%,#E6E8FA 70%,#DCE7F8 100%)"></div>
  <div class="p-glow" style="width:640px;height:520px;left:440px;top:380px;background:radial-gradient(circle,#FFE29A 0%,rgba(255,216,130,.5) 42%,rgba(255,216,130,0) 70%)"></div>
  <div class="p-glow" style="width:460px;height:380px;left:-140px;top:640px;background:rgba(160,139,224,.28)"></div>
  <div class="p-bokeh" style="width:76px;height:76px;left:960px;top:150px"></div><div class="p-bokeh" style="width:40px;height:40px;left:640px;top:170px"></div>
{brand("03")}
  <div style="position:absolute;left:60px;top:150px;width:640px;z-index:15">
    <span class="p-kicker" style="color:#6853D5">✦ Leaderboards &amp; friends</span>
    <h1 style="margin-top:22px">Move together.<br><em>Compete together.</em></h1>
    <p class="p-lead" style="margin-top:20px;width:480px">Challenge your friends, climb the weekly boards and see how your country moves.</p>
  </div>
  {conf}
  <div style="position:absolute;left:470px;top:0;width:560px;height:100%;z-index:3">
    <div style="position:absolute;left:0;bottom:200px;width:170px;height:135px;border-radius:22px 22px 8px 8px;background:linear-gradient(180deg,#E9EEF6,#C9D3E2);box-shadow:0 26px 40px -24px rgba(37,52,80,.6),inset 0 3px 0 #fff;display:grid;place-items:center;font:600 64px Fredoka;color:#8D9AAD">2</div>
    <div style="position:absolute;left:185px;bottom:200px;width:190px;height:200px;border-radius:24px 24px 8px 8px;background:linear-gradient(180deg,#FFE7A3,#F2B84B);box-shadow:0 30px 46px -24px rgba(200,140,40,.75),inset 0 3px 0 #FFF6D6;display:grid;place-items:center;font:600 84px Fredoka;color:#fff;text-shadow:0 3px 0 rgba(180,120,20,.35)">1</div>
    <div style="position:absolute;left:390px;bottom:200px;width:170px;height:100px;border-radius:22px 22px 8px 8px;background:linear-gradient(180deg,#F7D7C2,#E0A98A);box-shadow:0 26px 40px -24px rgba(150,90,60,.6),inset 0 3px 0 #FFF1E6;display:grid;place-items:center;font:600 56px Fredoka;color:#fff">3</div>
    <div class="p-char f1" data-part="p2" style="left:-15px;bottom:320px;width:200px"></div>
    <div class="p-char f0" data-part="p1" style="left:165px;bottom:382px;width:230px;filter:drop-shadow(0 0 30px rgba(255,220,130,.8))"></div>
    <div class="p-char f0" data-part="p3" style="left:378px;bottom:285px;width:195px"></div>
  </div>
  <div class="p-card" style="left:60px;top:478px;width:400px;padding:16px 16px 12px">
    <div style="display:flex;gap:6px;padding:4px;background:#F1F4F9;border-radius:99px">
      <span style="flex:1;text-align:center;padding:9px 0;border-radius:99px;font:800 14px Nunito;color:#7A889E">Friends</span>
      <span style="flex:1;text-align:center;padding:9px 0;border-radius:99px;font:800 14px Nunito;color:#7A889E">Global</span>
      <span style="flex:1;text-align:center;padding:9px 0;border-radius:99px;font:800 14px Nunito;color:#fff;background:#242B35">Country</span></div>
    <div style="display:flex;justify-content:space-between;margin:14px 6px 6px"><span class="p-label">This week · Philippines</span><span class="p-label">Points</span></div>
    {ROW(4,"pet_corgi","Bea","2,310")}{ROW(5,"pet_fox","Migs","2,145")}{ROW(6,"pet_cat","Ana","1,980")}{ROW(7,"heroWalkie","You","1,940",True,"▲ 3")}
  </div>
  <span class="p-sample" style="left:300px;top:466px">Sample leaderboard</span>
  <div class="p-chips" style="position:absolute;left:60px;top:872px;z-index:15">
    <span class="p-chip"><span class="ic" data-part="icon_friends"></span>Compete with friends</span>
    <span class="p-chip"><span class="ic" data-part="icon_leaderboard"></span>Global leaderboards</span>
    <span class="p-chip"><span class="ic" data-part="icon_podium"></span>Country rankings</span>
  </div>
  {sp(700,380,34,"#F2B84B")}{sp(1000,330,24,"#fff")}{sp(560,520,20,"#A08BE0")}{sp(960,520,22,"#F2B84B")}
{foot("Find your pack")}'''
open('walkie-pubmat-03-leaderboard-community.html','w').write(p3)

def STAT(ic,lab,val,unit=""):
    u=f'<span style="font:700 16px Nunito;color:#7A889E;margin-left:4px">{unit}</span>' if unit else ''
    return f'<div style="display:flex;align-items:center;gap:12px"><span style="width:46px;height:46px;flex:none" data-part="icon_{ic}"></span><div><div class="p-num" style="font-size:30px">{val}{u}</div><div class="p-label" style="margin-top:5px;font-size:11.5px">{lab}</div></div></div>'
def MODE(ic,lab,on=False):
    st='background:#242B35;color:#fff' if on else ''
    return f'<span class="p-chip" style="{st}"><span class="ic" data-part="icon_{ic}"></span>{lab}</span>'
PACE="7'05&quot;"
p4=head("Walkie.run — 04 Fitness tracking")+f'''<div class="pm">
  <div class="bg" style="background:radial-gradient(110% 90% at 12% 8%,#FFFFFF 0%,#EAF7F1 38%,#E3EEFA 72%,#D8E5F8 100%)"></div>
  <div class="p-glow" style="width:520px;height:460px;left:-120px;top:560px;background:rgba(93,190,154,.25)"></div>
  <div class="p-glow" style="width:520px;height:460px;left:600px;top:80px;background:rgba(107,143,214,.22)"></div>
{brand("04")}
  <div style="position:absolute;left:60px;top:150px;width:420px;z-index:15">
    <span class="p-kicker" style="color:#2C9A8F">✦ Walk · Run · Cycle</span>
    <h1 style="margin-top:22px">Every move<br><em>counts.</em></h1>
    <p class="p-lead" style="margin-top:20px;width:400px">Track your route, see your stats and earn rewards along the way.</p>
    <div class="p-chips" style="margin-top:26px;width:410px">{MODE("walk","Walk")}{MODE("run","Run",True)}{MODE("bike","Cycle")}</div>
  </div>
  <div class="p-card" style="left:500px;top:136px;width:520px;height:600px;padding:12px;border-radius:38px;z-index:3">
    <div style="position:relative;width:100%;height:100%;border-radius:28px;overflow:hidden;background:url(parts/map.png) 46% 52% / 128% auto no-repeat">
      <div style="position:absolute;left:14px;top:14px;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.94);padding:10px 16px 10px 10px;border-radius:99px;box-shadow:0 10px 20px -12px rgba(37,52,80,.5)"><span style="width:36px;height:36px" data-part="icon_run"></span><div><b style="font:600 18px Fredoka">Outdoor run</b><div style="font:700 12.5px Nunito;color:#7A889E">Rizal Park · Intramuros · Manila</div></div></div>
      <span class="p-sample" style="right:14px;top:24px">Sample</span>
      <span style="position:absolute;right:10px;bottom:46px;font:600 9.5px Nunito;color:#5b6577;background:rgba(255,255,255,.8);padding:2px 6px;border-radius:6px">© OpenFreeMap © OpenMapTiles © OpenStreetMap contributors</span>
    </div>
  </div>
  <div class="p-card" style="left:430px;top:690px;width:590px;padding:22px 26px;z-index:12">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px 16px">
      {STAT("distance","Distance","3.58","km")}{STAT("history","Time","25:22")}{STAT("goal","Avg pace",PACE,"/km")}
      {STAT("steps","Steps (est.)","3,254")}{STAT("calories","Calories (est.)","269","kcal")}{STAT("reward","Walkie points","+175")}
    </div>
  </div>
  <svg style="position:absolute;left:30px;top:640px;z-index:4" width="140" height="160" viewBox="0 0 140 160"><g stroke="#A9C5ED" stroke-width="7" stroke-linecap="round"><line x1="20" y1="40" x2="110" y2="40"/><line x1="0" y1="80" x2="96" y2="80"/><line x1="30" y1="120" x2="118" y2="120"/></g></svg>
  <div class="p-char f2" data-part="runWalkie" style="left:70px;top:500px;width:400px;z-index:8;filter:drop-shadow(0 22px 20px rgba(37,52,80,.2))"></div>
  {sp(450,560,28,"#5DBE9A")}{sp(470,430,18,"#F2B84B")}
{foot("Start moving with Walkie")}'''
open('walkie-pubmat-04-fitness-tracking.html','w').write(p4)
