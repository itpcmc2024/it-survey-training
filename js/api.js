/**
 * API service for Google Apps Script Web App.
 */

const API = {
  async getMaster() {
    return this.getJson(`${CONFIG.GAS_URL}?action=master&_=${Date.now()}`);
  },

  async checkExisting(lineUserId) {
    return this.getJson(
      `${CONFIG.GAS_URL}?action=check&lineUserId=${encodeURIComponent(lineUserId)}&_=${Date.now()}`
    );
  },

  async getDashboard() {
    return this.getJson(`${CONFIG.GAS_URL}?action=dashboard&_=${Date.now()}`);
  },

  async saveResponse(payload) {
    return this.post({
      action: 'saveResponse',
      payload
    });
  },

  async saveSettings(items) {
    return this.post({
      action: 'saveSettings',
      payload: {
        items
      }
    });
  },

  async getJson(url) {
    const response = await fetch(url);
    return await response.json();
  },

  async post(data) {
    // no-cors is used to avoid browser CORS block with Google Apps Script.
    // The request is still sent to GAS, but the browser cannot read the response body.
    await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(data)
    });

    return {
      success: true,
      message: 'ส่งข้อมูลแล้ว'
    };
  }
};
