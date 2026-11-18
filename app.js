const GUA=window.GUA;
/* ===== 基础常量 ===== */
const DZWX={'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
const ZHI_IDX={'子':0,'丑':1,'寅':2,'卯':3,'辰':4,'巳':5,'午':6,'未':7,'申':8,'酉':9,'戌':10,'亥':11};
const ZHI_NAMES=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GAN_NAMES=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const LIUSHEN=['龙','雀','勾','蛇','白','玄'];
const SHENG={'金':'水','水':'木','木':'火','火':'土','土':'金'};
const KE={'金':'木','木':'土','土':'水','水':'火','火':'金'};
const CHONG={0:6,6:0,1:7,7:1,2:8,8:2,3:9,9:3,4:10,10:4,5:11,11:5};
const LIUQIN_ALL=['父母','兄弟','子孙','妻财','官鬼'];
const yaoNames=['初爻','二爻','三爻','四爻','五爻','上爻'];

/* ===== 节令表（1930-2070，十二节交接时刻，UTC 墙钟秒）===== */
const JIE_RAW=window.JIE_RAW;
const JIE_ZHI=(function(){ // 小寒→丑, 立春→寅 ... 大雪→子
  const a=[]; for(let i=0;i<12;i++) a.push((i+1)%12); return a;
})();
const JIE_LIST=(function(){
  const out=[];
  JIE_RAW.split(';').forEach(function(row){
    if(!row) return;
    const p=row.split(':'), y=+p[0], ts=p[1].split(',');
    for(let i=0;i<12;i++) out.push({t:+ts[i], y:y, z:JIE_ZHI[i]});
  });
  out.sort(function(a,b){return a.t-b.t;});
  return out;
})();

/* 年柱：以立春交接时刻为界 */
function yearGZ(y,m,d,ts){
  let yy=y;
  const lc=(function(){
    const row=JIE_LIST.find(function(o){return o.y===y && o.z===2;});
    return row?row.t:null;
  })();
  if(lc!==null){ if(ts<lc) yy=y-1; }
  else if(m<2||(m===2&&d<4)) yy=y-1;
  return {g:((yy-4)%10+10)%10, z:((yy-4)%12+12)%12, year:yy};
}

/* 月建：取当前时刻之前最近的节 */
function yueJian(ts){
  let lo=0, hi=JIE_LIST.length-1, ans=-1;
  while(lo<=hi){
    const mid=(lo+hi)>>1;
    if(JIE_LIST[mid].t<=ts){ ans=mid; lo=mid+1; } else { hi=mid-1; }
  }
  if(ans<0) return {z:0, exact:false};
  return {z:JIE_LIST[ans].z, exact:JIE_LIST[ans].t, yuan:JIE_LIST[ans].y};
}

/* 日柱：1949-10-01 甲子日 */
function dayGZ(y,m,d){
  const base=Date.UTC(1949,9,1);
  const t=Date.UTC(y,m-1,d);
  const diff=Math.round((t-base)/86400000);
  return {g:((diff%10)+10)%10, z:((diff%12)+12)%12};
}

/* 时柱：甲己起甲子，乙庚起丙子，丙辛起戊子，丁壬起庚子，戊癸起壬子 */
function shiGZ(dayGan, sc){
  /* 甲己日甲子起，乙庚日丙子起，丙辛日戊子起，丁壬日庚子起，戊癸日壬子起 */
  const start=2*(dayGan%5);
  return {g:(start+sc)%10, z:sc};
}

/* ===== 五行 / 六亲 ===== */
function liuqin(gongWx, yaoWx){
  if(gongWx===yaoWx) return '兄弟';
  if(SHENG[gongWx]===yaoWx) return '子孙';
  if(KE[gongWx]===yaoWx) return '妻财';
  if(SHENG[yaoWx]===gongWx) return '父母';
  if(KE[yaoWx]===gongWx) return '官鬼';
  return '';
}
function lsStart(rigan){
  const i=GAN_NAMES.indexOf(rigan);
  if(i<=1) return 0; if(i<=3) return 1; if(i===4) return 2;
  if(i===5) return 3; if(i<=7) return 4; return 5;
}
function kongWang(rigan, rizhi){
  const gi=GAN_NAMES.indexOf(rigan), zi=ZHI_IDX[rizhi];
  const xun=(zi-gi+12)%12;
  return [ZHI_NAMES[(xun+10)%12], ZHI_NAMES[(xun+11)%12]];
}
function wangShuai(yaoWx, yueWx){
  if(yaoWx===yueWx) return {l:'旺',w:true};
  if(SHENG[yueWx]===yaoWx) return {l:'相',w:true};
  if(SHENG[yaoWx]===yueWx) return {l:'休',w:false};
  if(KE[yueWx]===yaoWx) return {l:'囚',w:false};
  if(KE[yaoWx]===yueWx) return {l:'死',w:false};
  return {l:'',w:false};
}

/* ===== 伏神：缺六亲时，取本宫首卦中该六亲之爻，伏于同爻位 ===== */
const PURE_KEY={乾:'111111',震:'100100',坎:'010010',艮:'001001',坤:'000000',巽:'011011',离:'101101',兑:'110110'};
function fuShen(benGua, benLq){
  const pure=GUA[PURE_KEY[benGua.gong]];
  if(!pure) return {};
  const pureLq=pure.najia.map(function(n){ return liuqin(benGua.gongWx, DZWX[n[1]]); });
  const has={}; benLq.forEach(function(x){ has[x]=1; });
  const out={};
  LIUQIN_ALL.forEach(function(lq){
    if(has[lq]) return;                       // 六亲不缺，不列伏神
    for(let i=0;i<6;i++){
      if(pureLq[i]===lq){                     // 取本宫首卦中该六亲最低爻位
        out[i]={lq:lq, gan:pure.najia[i][0], zhi:pure.najia[i][1], wx:DZWX[pure.najia[i][1]]};
        break;
      }
    }
  });
  return out;
}

/* ===== UI ===== */
const el={
  gy:document.getElementById('gy'), gm:document.getElementById('gm'), gd:document.getElementById('gd'),
  sc:document.getElementById('sc'),
  ngz:document.getElementById('ngz'), yjz:document.getElementById('yjz'),
  rgz:document.getElementById('rgz'), sgz:document.getElementById('sgz'),
  out:document.getElementById('out'), outWrap:document.getElementById('outWrap'),
  progress:document.getElementById('coinProgress'), coinResult:document.getElementById('coinResult'),
  coinBtn:document.getElementById('coinBtn'),
  noteAsk:document.getElementById('noteAsk'), noteSay:document.getElementById('noteSay'),
  noteTip:document.getElementById('noteTip'), histBox:document.getElementById('histBox'),
  histCnt:document.getElementById('histCnt')
};
el.noteAsk.addEventListener('input', noteDraftSoon);
el.noteSay.addEventListener('input', noteDraftSoon);
window.addEventListener('beforeunload', noteDraft);
document.getElementById('histCnt').textContent=histLoad().length;

/* 时辰下拉 */
(function(){
  let h='';
  for(let i=0;i<12;i++){
    const a=(i*2+23)%24, b=(i*2+1)%24;
    h+='<option value="'+i+'"'+(i===6?' selected':'')+'>'+ZHI_NAMES[i]+'时 '+String(a).padStart(2,'0')+'–'+String(b).padStart(2,'0')+'</option>';
  }
  el.sc.innerHTML=h;
})();

/* 六爻选择 */
(function(){
  const opts=[{v:0,t:'少阳'},{v:1,t:'少阴'},{v:2,t:'老阳 ○'},{v:3,t:'老阴 ×'}];
  let h='';
  for(let i=0;i<6;i++){
    let o='';
    opts.forEach(function(x,j){ o+='<option value="'+x.v+'"'+(j===0?' selected':'')+'>'+x.t+'</option>'; });
    h+='<div class="yp"><label>'+yaoNames[i]+'</label><select id="y'+i+'">'+o+'</select></div>';
  }
  document.getElementById('yaoInput').innerHTML=h;
})();

/* 输入时刻 → 时间戳（按北京墙钟当作 UTC 秒，规避时区） */
function stamp(y,mo,d,h){
  return Date.UTC(y,mo-1,d,h,0,0)/1000;
}

function autoCalc(){
  const y=+el.gy.value, m=+el.gm.value, d=+el.gd.value, sc=+el.sc.value;
  if(!y||!m||!d) return;
  const ts=stamp(y,m,d,sc*2);
  const yGZ=yearGZ(y,m,d,ts), dGZ=dayGZ(y,m,d), sGZ=shiGZ(dGZ.g,sc);
  const yj=yueJian(ts);
  el.ngz.textContent=GAN_NAMES[yGZ.g]+ZHI_NAMES[yGZ.z];
  el.yjz.textContent=ZHI_NAMES[yj.z];
  el.rgz.textContent=GAN_NAMES[dGZ.g]+ZHI_NAMES[dGZ.z];
  el.sgz.textContent=GAN_NAMES[sGZ.g]+ZHI_NAMES[sGZ.z];
}
['gy','gm','gd','sc'].forEach(function(id){
  const n=document.getElementById(id);
  n.addEventListener('change',autoCalc);
  n.addEventListener('input',autoCalc);
});

/* 单侧：六亲 · 地支 · 爻象 · 圈注（不标天干、不标旺衰）
   dir='L' 本卦（爻象靠右，贴中缝）；dir='R' 变卦（爻象靠左，贴中缝） */
function cellHtml(o, dir){
  const sym=o.yang?'<div class="bar-y"></div>':'<div class="bar-n"><i></i><i></i></div>';
  const dm=o.dm?'<span class="dong-mark">'+o.dm+'</span>':'';
  const ln='<div class="c-line">'+sym+dm+'</div>';
  const mkh=(o.mks&&o.mks.length)
    ? '<div class="mk">'+o.mks.map(function(t){return '<i>'+t+'</i>';}).join('')+'</div>'
    : '';
  const word='<div class="c-lq">'+o.lq+'</div><div class="c-z">'+o.zhi+'</div>';
  return dir==='R' ? ln+mkh+word : word+mkh+ln;
}

/* 伏神列：单列竖直三行“伏／六亲／地支”，横排于本变卦之后 */
function fuCell(f, kong){
  if(!f) return '<div class="c-fu c-fu-e"></div>';
  return '<div class="c-fu">'+
    '<span class="fv">伏</span>'+
    '<em>'+f.lq+'</em>'+
    '<b>'+f.zhi+'</b>'+
    (kong?'<div class="mk"><i>空</i></div>':'')+
    '</div>';
}

function run(){
  const y=+el.gy.value, m=+el.gm.value, d=+el.gd.value, sc=+el.sc.value;
  if(!y||!m||!d) return;

  const ts=stamp(y,m,d,sc*2);
  const yGZ=yearGZ(y,m,d,ts), dGZ=dayGZ(y,m,d), sGZ=shiGZ(dGZ.g,sc);
  const yj=yueJian(ts);
  const yueWx=DZWX[ZHI_NAMES[yj.z]];
  const rigan=GAN_NAMES[dGZ.g], rizhi=ZHI_NAMES[dGZ.z];

  const vals=[];
  for(let i=0;i<6;i++) vals.push(+document.getElementById('y'+i).value);

  const benHua=vals.map(function(v){ return (v===0||v===2)?1:0; });
  const bianHua=vals.map(function(v){ if(v===2) return 0; if(v===3) return 1; return (v===0)?1:0; });
  const benGua=GUA[benHua.join('')], bianGua=GUA[bianHua.join('')];
  if(!benGua){ el.outWrap.style.display='none'; alert('卦象不存在，请检查输入'); return; }

  const kong=kongWang(rigan,rizhi);
  const ls0=lsStart(rigan);
  const benLq=benGua.najia.map(function(n){ return liuqin(benGua.gongWx, DZWX[n[1]]); });
  const dongArr=vals.map(function(v){ return v===2||v===3; });
  const anyDong=dongArr.some(Boolean);
  const hasBian=anyDong&&!!bianGua;
  const fu=fuShen(benGua, benLq);

  // 破（月建相冲）/ 冲（日辰相冲）/ 空（旬空）
  function marks(zhi){
    const z=ZHI_IDX[zhi], out=[];
    if(CHONG[z]===ZHI_IDX[ZHI_NAMES[yj.z]]) out.push('破');
    if(CHONG[z]===ZHI_IDX[rizhi]) out.push('冲');
    if(kong.indexOf(zhi)>=0) out.push('空');
    return out;
  }

  const bianLq=hasBian
    ? bianGua.najia.map(function(n){ return liuqin(benGua.gongWx, DZWX[n[1]]); })
    : null;

  let rowsHtml='';
  for(let i=5;i>=0;i--){
    const bz=benGua.najia[i][1];
    const bzi=hasBian?bianGua.najia[i][1]:'';
    rowsHtml+='<div class="ly'+(dongArr[i]?' dong':'')+'">'+
      '<div class="ly-idx">'+yaoNames[i].charAt(0)+'</div>'+
      '<div class="ly-ls">'+LIUSHEN[(ls0+i)%6]+'</div>'+
      '<div class="c2">'+cellHtml({
        lq:benLq[i], zhi:bz, yang:benHua[i]===1,
        dm:dongArr[i]?(vals[i]===2?'○':'×'):'', mks:marks(bz)
      },'L')+'</div>'+
      '<div class="c3'+(dongArr[i]?'':' c-quiet')+'">'+
        (hasBian?cellHtml({
          lq:bianLq[i], zhi:bzi, yang:bianHua[i]===1, dm:'', mks:marks(bzi)
        },'R'):'')+
      '</div>'+
      '<div class="ly-sy">'+(i===benGua.shi?'世':(i===benGua.ying?'应':''))+'</div>'+
      fuCell(fu[i], fu[i]?kong.indexOf(fu[i].zhi)>=0:false)+
    '</div>';
  }

  const dongStr=dongArr.filter(Boolean).length
    ? dongArr.map(function(v,i){ return v?yaoNames[i]:null; }).filter(Boolean).join('、')
    : '静卦';

  const panHead='<div class="pan-h">'+
      '<div class="pn">'+benGua.name+(hasBian?'<i>变</i>'+bianGua.name:'')+'</div>'+
      '<div class="ps">'+benGua.gong+'宫 '+benGua.gongWx+' · '+benGua.shiLabel+
        (hasBian?'　│　'+bianGua.gong+'宫 '+bianGua.gongWx+' · '+bianGua.shiLabel:'')+
      '</div>'+
    '</div>'+
    '<div class="pan-c"><span></span><span></span>'+
      '<span class="c2">本 卦</span><span class="c3">'+(hasBian?'变 卦':'静 卦')+'</span><span></span><span class="cf">伏神</span>'+
    '</div>';

  el.out.innerHTML=
    '<div class="info">'+
      '<div><span>月建</span><b>'+ZHI_NAMES[yj.z]+'（'+yueWx+'）</b></div>'+
      '<div><span>日辰</span><b>'+rigan+rizhi+'</b></div>'+
      '<div><span>空亡</span><b>'+kong[0]+kong[1]+'</b></div>'+
      '<div><span>动爻</span><b>'+dongStr+'</b></div>'+
    '</div>'+
    '<div class="pan' + (hasBian?'':' pan-one') + '">'+panHead+rowsHtml+'</div>'+
    (hasBian?'':'<div class="gua-note">六爻安静，无变卦，以本卦断之。</div>');

  el.outWrap.style.display='';

  // 测事 / 断语
  const nk=[y,m,d,sc].join('-')+'-'+(benGua.name||'')+(hasBian?('>'+bianGua.name):'');
  window.__guaName=benGua.name+(hasBian?(' 变 '+bianGua.name):'');
  switchNote(nk);
}

/* ===== 测事 / 断语：暂存与历史 ===== */
let curNoteKey='';
function switchNote(key){
  curNoteKey=key;
  let d={};
  try{ d=JSON.parse(localStorage.getItem('HYNOTE_D_'+key)||'{}'); }catch(e){ d={}; }
  el.noteAsk.value=d.ask||'';
  el.noteSay.value=d.say||'';
  el.noteTip.textContent='本卦内容会自动暂存，刷新或重排同一卦可直接续写。';
  renderHist();
}
function noteDraft(){
  if(!curNoteKey) return;
  try{
    localStorage.setItem('HYNOTE_D_'+curNoteKey, JSON.stringify({
      ask:el.noteAsk.value, say:el.noteSay.value, t:Date.now()
    }));
    pruneDrafts();
  }catch(e){}
}
let draftTimer=null;
function noteDraftSoon(){
  clearTimeout(draftTimer);
  draftTimer=setTimeout(noteDraft, 400);
}
function pruneDrafts(){
  try{
    const ks=Object.keys(localStorage).filter(function(k){ return k.indexOf('HYNOTE_D_')===0; });
    if(ks.length<=40) return;
    ks.map(function(k){ return [k,(JSON.parse(localStorage.getItem(k)||'{}').t)||0]; })
      .sort(function(a,b){ return a[1]-b[1]; })
      .slice(0,ks.length-40)
      .forEach(function(p){ localStorage.removeItem(p[0]); });
  }catch(e){}
}
function histLoad(){ try{ return JSON.parse(localStorage.getItem('HYNOTE_H')||'[]'); }catch(e){ return []; } }
function histSave(a){ try{ localStorage.setItem('HYNOTE_H', JSON.stringify(a)); }catch(e){} }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function saveNote(){
  const ask=el.noteAsk.value.trim(), say=el.noteSay.value.trim();
  if(!ask&&!say){ el.noteTip.textContent='「所测何事」或「断语」至少写一项再保存。'; return; }
  const a=histLoad();
  a.unshift({
    t:new Date().toLocaleString('zh-CN',{hour12:false}),
    g:window.__guaName||'', k:curNoteKey, ask:ask, say:say
  });
  if(a.length>60) a.length=60;
  histSave(a); renderHist();
  el.noteTip.textContent='已保存，共 '+a.length+' 条记录。';
}
function toggleHist(){
  const b=el.histBox;
  if(b.style.display==='none'){ b.style.display=''; renderHist(); }
  else b.style.display='none';
}
function renderHist(){
  const a=histLoad();
  el.histCnt.textContent=a.length;
  if(el.histBox.style.display==='none') return;
  if(!a.length){ el.histBox.innerHTML='<div class="hist-empty">还没有保存的断语。</div>'; return; }
  el.histBox.innerHTML=a.map(function(x,i){
    return '<div class="hist-i"><button class="del" onclick="delNote('+i+')">删除</button>'+
      '<div class="hm">'+esc(x.t)+(x.g?' · '+esc(x.g):'')+'</div>'+
      (x.ask?'<div class="ha">'+esc(x.ask)+'</div>':'')+
      (x.say?'<div class="hs">'+esc(x.say)+'</div>':'')+
    '</div>';
  }).join('');
}
function delNote(i){
  const a=histLoad(); a.splice(i,1); histSave(a); renderHist();
}

/* ===== 摇币起卦 ===== */
let coinCount=0, tossing=false;
const COIN_RESULT={'0':'少阳','1':'少阴','2':'老阳 ○','3':'老阴 ×'};

function tossCoin(){
  if(tossing) return;
  if(coinCount>=6){ alert('六爻已摇完，欲再占请点「重摇」'); return; }
  tossing=true; el.coinBtn.disabled=true;
  el.progress.textContent='正在摇第 '+(coinCount+1)+' 爻……';
  el.coinResult.textContent='';
  Array.from(document.querySelectorAll('#coinDisplay .coin')).forEach(function(c){
    c.textContent=''; c.className='coin'; void c.offsetWidth; c.classList.add('spin');
  });
  setTimeout(function(){
    const backs=[Math.random()<0.5, Math.random()<0.5, Math.random()<0.5];
    const n=backs.filter(Boolean).length;
    const v=(n+3)%4;
    const coins=document.querySelectorAll('#coinDisplay .coin');
    backs.forEach(function(b,i){
      coins[i].textContent=b?'背':'字';
      coins[i].className='coin '+(b?'bei':'');
    });
    document.getElementById('y'+coinCount).value=v;
    coinCount++;
    el.progress.textContent='第 '+coinCount+' / 6 爻';
    el.coinResult.textContent=yaoNames[coinCount-1]+'：'+COIN_RESULT[v];
    if(coinCount===6){
      el.coinResult.textContent='六爻已成，已排盘';
      run();
    }
    tossing=false; el.coinBtn.disabled=false;
  },520);
}

function resetCoins(){
  if(tossing) return;
  if(coinCount===0) return;
  if(!confirm('已摇 '+coinCount+' 爻，确定重摇？')) return;
  coinCount=0;
  el.progress.textContent='第 0 / 6 爻';
  el.coinResult.textContent='字为阴 · 背为阳，自初爻摇起';
  Array.from(document.querySelectorAll('#coinDisplay .coin')).forEach(function(c){
    c.textContent='字'; c.className='coin';
  });
}

autoCalc();
run();
