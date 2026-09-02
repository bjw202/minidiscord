import { readFileSync } from 'node:fs'
const DOCS = ['spec.md','plan.md','acceptance.md','plan-done.md','progress.md'].map(f=>'.moai/specs/SPEC-BOTSTAB-001/'+f)
const FINDING_ID = /(?<![A-Za-z0-9-])[A-G]-0[1-9](?![0-9])/
const HISTORICAL = /개정 전|폐기|철회|되돌[리린]|회차 감사|v0\.[1-4]\.0 에서|^\| 0\.\d\.\d \||금지했다|굳혔다|재현했다|하한이었다|낡[았은]|삭제했다|사라[졌진]/
let tot=0, ex=0, byH=0, byF=0, both=0, hAndAc=0
const hLines=[]
const per={}
for(const f of DOCS){
  readFileSync(f,'utf8').split('\n').forEach((l,i)=>{
    if(!l.trim())return; tot++
    const h=HISTORICAL.test(l), fi=FINDING_ID.test(l)
    if(h||fi)ex++
    if(h&&!fi){byH++; hLines.push(f+':'+(i+1)+'  '+l.trim().slice(0,130))}
    if(fi&&!h)byF++
    if(h&&fi)both++
    if(h && /AC-(BOTSTAB-)?0\d\d|AC-013/.test(l)) hAndAc++
    if(h){ const m=l.match(HISTORICAL); per[m[0]]=(per[m[0]]||0)+1 }
  })
}
console.log(JSON.stringify({tot,ex,byH,byF,both,hAndAc}))
console.log('HISTORICAL trigger counts:', JSON.stringify(per))
console.log('--- HISTORICAL-only exempt lines ---')
hLines.forEach(x=>console.log(x))
