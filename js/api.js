const API = {
  async getMaster() {
    const url = `${CONFIG.GAS_URL}?action=master&_=${Date.now()}`;
    return this.getJson(url);
  },

  async checkExisting(lineUserId) {
    const url = `${CONFIG.GAS_URL}?action=check&lineUserId=${encodeURIComponent(lineUserId)}&_=${Date.now()}`;
    return this.getJson(url);
  },

  async saveResponse(payload) {
    const res = await fetch(CONFIG.GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveResponse",
        payload
      })
    });

    return { success: true, message: "ส่งข้อมูลแล้ว กรุณาตรวจสอบใน Google Sheet" };
  },

  async getDashboard() {
    const url = `${CONFIG.GAS_URL}?action=dashboard&_=${Date.now()}`;
    return this.getJson(url);
  },

  async getJson(url) {
    const res = await fetch(url);
    return await res.json();
  }
};
