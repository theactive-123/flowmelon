// node emit.cjs <page.json> <blockIndex>  -> writes out-<i>.json {html,css} with already-emitted selectors stripped
const fs=require('fs');const path=require('path');
const [,,file,idx,mode]=process.argv;
const REG=path.join(__dirname,'emitted.json');
const reg=fs.existsSync(REG)?JSON.parse(fs.readFileSync(REG,'utf8')):{};
const b=JSON.parse(fs.readFileSync(file,'utf8')).blocks[+idx];
// split top-level rules
function split(css){const out=[];let i=0,d=0,s=0;for(;i<css.length;i++){if(css[i]=='{')d++;else if(css[i]=='}'){d--;if(d==0){out.push(css.slice(s,i+1));s=i+1;}}}return out;}
const rules=split(b.css);const keep=[];const newSel=new Set();
for(const r of rules){
  const sel=r.startsWith('@media')? r.slice(r.indexOf('{')+1, r.indexOf('{',r.indexOf('{')+1)).trim() : r.slice(0,r.indexOf('{')).trim();
  if(reg[sel]){ if(reg[sel]!==b.name+'@'+file && !rules.includes(r)) {} continue; }
  keep.push(r);newSel.add(sel);
}
const css=keep.join('');
fs.writeFileSync(path.join(__dirname,'out.json'),JSON.stringify({html:b.html,css}));
if(mode==='commit'){for(const s of newSel)reg[s]=1;fs.writeFileSync(REG,JSON.stringify(reg));}
console.log(b.name,'parent',b.parent,'html',b.html.length,'css',b.css.length,'->',css.length,'rules',rules.length,'->',keep.length);
