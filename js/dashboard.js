const Dashboard = {
  data:null,
  render(data){
    this.data=data||{};
    const total=document.getElementById("totalResponses");
    if(total) total.textContent=Number(this.data.total||0).toLocaleString("th-TH");
    this.chart("deptChart",this.data.byDepartment||[]);
    this.chart("positionChart",this.data.byPosition||[]);
    this.chart("topicChart",this.data.byTopic||[]);
    this.chart("subTopicChart",this.data.bySubTopic||[]);
    this.latest(this.data.latest||[]);
  },
  chart(id,rows){
    const box=document.getElementById(id);
    if(!box) return;
    box.innerHTML="";
    if(!rows.length){ box.innerHTML='<div class="dashboard-empty">ยังไม่มีข้อมูล</div>'; return; }
    const max=Math.max(...rows.map(r=>Number(r.value||0)),1);
    rows.forEach(r=>{
      const v=Number(r.value||0);
      const item=document.createElement("div");
      item.className="dashboard-bar-item";
      item.innerHTML=`<div class="dashboard-bar-header"><span>${this.esc(r.label||"ไม่ระบุ")}</span><strong>${v}</strong></div>
      <div class="dashboard-bar-track"><div class="dashboard-bar-fill" style="width:${Math.max(v/max*100,2)}%"></div></div>`;
      box.appendChild(item);
    });
  },
  latest(rows){
    const tbody=document.getElementById("latestTable");
    if(!tbody) return;
    tbody.innerHTML="";
    if(!rows.length){ tbody.innerHTML='<tr><td colspan="5" class="dashboard-empty">ยังไม่มีข้อมูลผู้ตอบ</td></tr>'; return; }
    rows.forEach(r=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${this.esc(r["Display Name"]||"-")}</td><td>${this.esc(r.Department||"-")}</td>
      <td>${this.esc(r.Position||"-")}</td><td>${this.date(r["Updated At"]||r.Timestamp)}</td><td>${Number(r["Edit Count"]||0)}</td>`;
      tbody.appendChild(tr);
    });
  },
  date(v){
    if(!v) return "-";
    const d=new Date(v);
    return Number.isNaN(d.getTime())?String(v):d.toLocaleString("th-TH",{timeZone:"Asia/Bangkok"});
  },
  esc(v){ return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }
};
