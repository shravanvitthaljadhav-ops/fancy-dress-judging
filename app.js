const db=window.supabase.createClient("https://zawatmovyrjcpgxkqcqq.supabase.co","sb_publishable_x9u_XeQlrOil8VRZ6Kcbjg_48JRq51y");
const $=id=>document.getElementById(id);let role="",people=[],scores=[];
const fields=[["theme","theme_score"],["effort","effort_score"],["confidence","confidence_score"],["walk","walk_score"]];
function msg(t,err=false){$("status").textContent=t;$("status").className="notice"+(err?" error":"")}
function safe(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function roleName(r){return ({coordinator:"समन्वयक",judge1:"परीक्षक १",judge2:"परीक्षक २",judge3:"परीक्षक ३"})[r]||r}
async function start(){
 const {data:{user}}=await db.auth.getUser();
 if(!user){$("login").classList.remove("hidden");$("app").classList.add("hidden");return}
 const {data:u,error}=await db.from("fdj_users").select("role,email").eq("user_id",user.id).maybeSingle();
 if(error||!u){msg("या ईमेलला भूमिका दिलेली नाही. समन्वयकाने वापरकर्त्याची भूमिका नोंदवावी.",true);await db.auth.signOut();return}
 role=u.role;const {data:p,error:pe}=await db.from("fdj_participants").select("id,participant_name").order("id");
 if(pe){msg(pe.message,true);return}people=p||[];$("login").classList.add("hidden");$("app").classList.remove("hidden");
 $("welcome").textContent="नमस्कार, "+u.email;$("role").textContent="भूमिका: "+roleName(role);
 $("judge").classList.toggle("hidden",!role.startsWith("judge"));$("coordinator").classList.toggle("hidden",role!=="coordinator");
 if(role.startsWith("judge")){drawSelect();await ownScores()}if(role==="coordinator"){drawNames();await results()}msg("लॉगिन यशस्वी.");
}
$("send").onclick=async()=>{const email=$("email").value.trim().toLowerCase();if(!email)return msg("ईमेल पत्ता टाका.",true);$("send").disabled=true;const {error}=await db.auth.signInWithOtp({email});$("send").disabled=false;if(error)return msg(error.message,true);$("verify").classList.remove("hidden");msg("ईमेलवर लॉगिन कोड पाठवला आहे.")};
$("confirm").onclick=async()=>{const {error}=await db.auth.verifyOtp({email:$("email").value.trim().toLowerCase(),token:$("otp").value.trim(),type:"email"});if(error)return msg(error.message,true);await start()};
$("logout").onclick=async()=>{await db.auth.signOut();role="";$("app").classList.add("hidden");$("login").classList.remove("hidden");msg("लॉगआउट झाले.")};
document.querySelectorAll(".score").forEach(e=>e.innerHTML='<option value="">गुण निवडा</option>'+Array.from({length:11},(_,i)=>'<option>'+i+"</option>").join(""));
function drawSelect(){$("participant").innerHTML=people.map(p=>'<option value="'+p.id+'">'+p.id+" — "+safe(p.participant_name||"नाव नाही")+"</option>").join("");$("participant").onchange=fill}
async function ownScores(){const {data,error}=await db.from("fdj_scores").select("*").eq("judge_role",role);if(error)return msg(error.message,true);scores=data||[];fill()}
function fill(){const s=scores.find(x=>x.participant_id===Number($("participant").value));fields.forEach(([id,k])=>$(id).value=s?String(s[k]):"")}
$("save").onclick=async()=>{if(fields.some(([id])=>$(id).value===""))return msg("चारही निकषांचे गुण निवडा.",true);const row={participant_id:Number($("participant").value),judge_role:role,theme_score:+$("theme").value,effort_score:+$("effort").value,confidence_score:+$("confidence").value,walk_score:+$("walk").value};$("save").disabled=true;const {error}=await db.from("fdj_scores").upsert(row,{onConflict:"participant_id,judge_role"});$("save").disabled=false;if(error)return msg(error.message,true);msg("गुण जतन झाले.");await ownScores()};
function drawNames(){$("names").innerHTML=people.map(p=>'<div style="display:grid;grid-template-columns:100px 1fr;gap:8px;margin:8px 0"><b>सहभागी '+p.id+'</b><input data-id="'+p.id+'" value="'+safe(p.participant_name||"")+'" placeholder="सहभागीचे नाव"></div>').join("")}
$("saveNames").onclick=async()=>{for(const el of document.querySelectorAll("[data-id]")){const id=+el.dataset.id,name=el.value.trim();if(name!==(people.find(p=>p.id===id)?.participant_name||"")){const {error}=await db.from("fdj_participants").update({participant_name:name,updated_at:new Date().toISOString()}).eq("id",id);if(error)return msg(error.message,true)}}msg("नावे जतन केली.");await start()};
$("refreshResults").onclick=results;
async function results(){const [{data:s,error:se},{data:p,error:pe}]=await Promise.all([db.from("fdj_scores").select("*"),db.from("fdj_participants").select("id,participant_name").order("id")]);if(se||pe)return msg((se||pe).message,true);people=p||people;const map={};(s||[]).forEach(x=>{map[x.participant_id]??={};map[x.participant_id][x.judge_role]=x});const rows=people.map(p=>{const j=map[p.id]||{},tot=["judge1","judge2","judge3"].map(r=>j[r]?[j[r].theme_score,j[r].effort_score,j[r].confidence_score,j[r].walk_score].reduce((a,b)=>a+b,0):null),ok=tot.every(v=>v!==null);return {id:p.id,name:p.participant_name,tot,total:ok?tot.reduce((a,b)=>a+b,0):null,ok}});const rank={};let last=null,rn=0;rows.filter(x=>x.ok).sort((a,b)=>b.total-a.total||a.id-b.id).forEach((x,i)=>{if(x.total!==last)rn=i+1;rank[x.id]=rn;last=x.total});$("results").innerHTML='<div style="overflow:auto"><table><tr>'+["क्र.","सहभागी","परी.१","परी.२","परी.३","एकूण","स्थिती","क्रमांक"].map(x=>"<th>"+x+"</th>").join("")+"</tr>"+rows.map(x=>"<tr>"+[x.id,safe(x.name||"—"),...x.tot.map(v=>v===null?"—":v),x.total===null?"—":x.total+"/120",x.ok?"पूर्ण":"प्रलंबित",x.ok?rank[x.id]:"—"].map(v=>"<td>"+v+"</td>").join("")+"</tr>").join("")+"</table></div>"}
start().catch(e=>msg(e.message,true));
