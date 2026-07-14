const Admin = {
  async login(){
    const pin=document.getElementById("adminPin").value.trim();
    if(pin!==String(CONFIG.ADMIN_PIN)){ alert("รหัสผู้ดูแลไม่ถูกต้อง"); return; }
    document.getElementById("adminLogin").classList.add("hidden");
    document.getElementById("dashboardContent").classList.remove("hidden");
    await this.load();
  },
  async load(){
    try{
      const data=await API.getAdmin();
      this.settings(data.setting||{});
      Dashboard.render(data.dashboard||{});
    }catch(e){
      console.error(e);
      alert("โหลดหน้า Admin ไม่สำเร็จ: "+e.message);
    }
  },
  settings(s){
    const box=document.getElementById("settingBox");
    if(!box) return;
    const keys=["SURVEY_OPEN","START_DATE","END_DATE","THANKYOU_MESSAGE","PRIMARY_COLOR","SECONDARY_COLOR","MAX_TOPIC_SELECT","ALLOW_EDIT","ENABLE_DASHBOARD","ENABLE_EXPORT"];
    box.innerHTML="";
    keys.forEach(k=>{
      let v=s[k]??"";
      const type=k.includes("DATE")?"date":"text";
      if(type==="date"&&v){ const d=new Date(v); if(!Number.isNaN(d.getTime())) v=d.toISOString().slice(0,10); }
      const row=document.createElement("div");
      row.className="setting-row";
      row.innerHTML=`<label>${k}</label><input type="${type}" data-setting="${k}" value="${Dashboard.esc(v)}">`;
      box.appendChild(row);
    });
  },
  async save(){
    const items={};
    document.querySelectorAll("[data-setting]").forEach(i=>items[i.dataset.setting]=i.value);
    await API.saveSettings(items);
    alert("บันทึก Setting แล้ว");
    await this.load();
  },
  bind(){
    document.getElementById("adminLoginBtn")?.addEventListener("click",()=>this.login());
    document.getElementById("saveSettingBtn")?.addEventListener("click",()=>this.save());
  }
};
document.addEventListener("DOMContentLoaded",()=>Admin.bind());
