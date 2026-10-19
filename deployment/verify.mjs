import { writeFileSync } from 'node:fs';
const base = 'https://df9kx3mn95m8a.cloudfront.net';
const results = [];
async function check(name,path,options,predicate) {
  try {
    const response=await fetch(base+path,{...options,signal:AbortSignal.timeout(60000)});
    const body=await response.text();
    const passed=predicate(response,body);
    results.push({name,status:response.status,passed,...(passed?{}:{detail:body.slice(0,700)})});
    console.log(`${passed?'PASS':'FAIL'} ${name}: HTTP ${response.status}`);
    return body;
  } catch(error) {results.push({name,passed:false,detail:error.message});console.log(`FAIL ${name}: ${error.message}`);}
}
const page=await check('Homepage','/',{},(r,b)=>r.status===200&&/<html/i.test(b));
await check('Direct navigation','/workspace/overview',{headers:{accept:'text/html'}},(r,b)=>r.status===200&&/<html/i.test(b));
await check('API health','/api/health',{},(r,b)=>r.status===200&&JSON.parse(b).status==='ok');
await check('API missing route','/api/deployment-missing-route',{},r=>r.status===404);
await check('API validation','/api/bedrock/converse/complete',{method:'POST',headers:{'content-type':'application/json'},body:'{}'},(r,b)=>r.status===400&&Boolean(JSON.parse(b).error));
const asset=page?.match(/src="(\/assets\/[^"\s]+\.js)"/);
if(asset) await check('JavaScript asset',asset[1],{},(r,b)=>r.status===200&&!/<html/i.test(b.slice(0,100)));
await check('Bedrock text generation','/api/bedrock/converse/complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userMessage:'Reply with the single word OK.',maxTokens:16,temperature:0})},(r,b)=>r.status===200&&Boolean(JSON.parse(b).content?.trim()));
await check('AgentCore advisor stream','/api/bedrock/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'Deployment health check. Reply with the single word OK.'})},(r,b)=>r.status===200&&b.includes('[DONE]')&&b.includes('"delta"')&&!b.includes('"error"'));
writeFileSync(new URL('./verification-results.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),website:base,results},null,2)+'\n');
if(results.some(r=>!r.passed)) process.exitCode=1;
