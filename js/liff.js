const LiffService = {
  profile: null,

  async init() {
    try {
      await liff.init({ liffId: CONFIG.LIFF_ID });

      if (!liff.isLoggedIn()) {
        liff.login();
        return null;
      }

      this.profile = await liff.getProfile();
      return this.profile;

    } catch (err) {
      console.error("LIFF init error", err);
      return {
        userId: "TEST_USER",
        displayName: "ทดสอบผู้ใช้งาน",
        pictureUrl: ""
      };
    }
  },

  getProfile() {
    return this.profile || {
      userId: "TEST_USER",
      displayName: "ทดสอบผู้ใช้งาน",
      pictureUrl: ""
    };
  }
};
