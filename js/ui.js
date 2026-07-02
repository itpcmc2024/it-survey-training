const UI = {
  setProfile(profile) {
    const name = profile?.displayName || "ผู้ใช้งาน LINE";
    const userId = profile?.userId || "-";

    document.getElementById("displayName").textContent = name;
    document.getElementById("lineUserId").textContent = "Line User ID: " + userId;
    document.getElementById("avatarText").textContent = name.charAt(0).toUpperCase();
  },

  renderOptions(selectId, items) {
    const select = document.getElementById(selectId);
    items.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item;
      opt.textContent = item;
      select.appendChild(opt);
    });
  },

  renderTopics(config) {
    const container = document.getElementById("topicContainer");
    container.innerHTML = "";

    const grouped = {};

    config.forEach(item => {
      if (!grouped[item.TopicID]) {
        grouped[item.TopicID] = {
          topic: item.Topic,
          items: []
        };
      }
      grouped[item.TopicID].items.push(item);
    });

    Object.keys(grouped).forEach(topicId => {
      const group = grouped[topicId];

      const box = document.createElement("div");
      box.className = "topic-group";

      const title = document.createElement("div");
      title.className = "topic-title";
      title.textContent = topicId + ". " + group.topic;
      box.appendChild(title);

      group.items.forEach(sub => {
        const label = document.createElement("label");
        label.className = "checkbox-item";

        label.innerHTML = `
          <input type="checkbox"
                 class="subtopic"
                 data-topic-id="${sub.TopicID}"
                 data-sub-id="${sub.SubID}">
          <span>${sub.SubTopic}</span>
        `;

        box.appendChild(label);
      });

      container.appendChild(box);
    });
  },

  updateProgress() {
    const department = document.getElementById("department").value;
    const position = document.getElementById("position").value;
    const checked = document.querySelectorAll(".subtopic:checked").length;

    let score = 0;
    if (department) score += 30;
    if (position) score += 30;
    if (checked > 0) score += 40;

    document.getElementById("progressBar").style.width = score + "%";
    document.getElementById("progressText").textContent = score + "%";
  },

  showResult(type, message) {
    const box = document.getElementById("resultBox");
    box.className = "result " + type;
    box.textContent = message;
    box.classList.remove("hidden");
  },

  toggleOther(selectId, inputId) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);

    if (select.value === "อื่นๆ") {
      input.classList.remove("hidden");
      input.required = true;
    } else {
      input.classList.add("hidden");
      input.required = false;
      input.value = "";
    }
  }
};
