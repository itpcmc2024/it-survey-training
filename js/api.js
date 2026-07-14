const API = {
  async getMaster(){ return this.get(`${CONFIG.GAS_URL}?action=master&_=${Date.now()}`); },
  async getDashboard(){ return this.get(`${CONFIG.GAS_URL}?action=dashboard&_=${Date.now()}`); },
  async getAdmin(){ return this.get(`${CONFIG.GAS_URL}?action=admin&_=${Date.now()}`); },
  async checkExisting(id){ return this.get(`${CONFIG.GAS_URL}?action=check&lineUserId=${encodeURIComponent(id)}&_=${Date.now()}`); },
  async saveSettings(items){ return this.post({action:"saveSettings",payload:{items}}); },
  async saveResponse(payload){ return this.post({action:"saveResponse",payload}); },
  async get(url){
    const r=await fetch(url);
    if(!r.ok) throw new Error(`API error: ${r.status}`);
    const j=await r.json();
    if(!j.success) throw new Error(j.message||"API ทำงานไม่สำเร็จ");
    return j.data;
  },
  async post(body){
    await fetch(CONFIG.GAS_URL,{
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(body)
    });
    return {success:true};
  }
};
