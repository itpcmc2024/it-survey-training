const UI = {
  state: {
    master: null,
    existing: null,
    dashboard: null
  },

  showApp() {
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
  },

  setProfile(profile) {
    const name = profile?.displayName || "ผู้ใช้งาน LINE";
    const userId = profile?.userId || "-";

    document.getElementById("displayName").textContent = name;
    document.getElementById("lineUserId").textContent = "Line User ID: " + userId;
    document.getElementById("avatarText").textContent = name.charAt(0).toUpperCase();

    if (profile?.pictureUrl) {
      const img = document.getElementById("pictureUrl");
      img.src = profile.pictureUrl;
      img.classList.remove("hidden");
      document.getElementById("avatarText").classList.add("hidden");
    }
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
      if (!grouped[item.TopicID]) grouped[item.TopicID] = { topic: item.Topic, items: [] };
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
          <input type="checkbox" class="subtopic" data-topic-id="${sub.TopicID}" data-sub-id="${sub.SubID}">
          <span>${sub.SubTopic}</span>
        `;
        box.appendChild(label);
      });

      container.appendChild(box);
    });
  },

  fillExisting(existing) {
    if (!existing) return;

    this.state.existing = existing;
    document.getElementById("editBadge").classList.remove("hidden");

    document.getElementById("department").value = existing.Department || "";
    document.getElementById("departmentOther").value = existing["Department Other"] || "";
    document.getElementById("position").value = existing.Position || "";
    document.getElementById("positionOther").value = existing["Position Other"] || "";
    document.getElementById("remark").value = existing.Remark || "";

    this.toggleOther("department", "departmentOther");
    this.toggleOther("position", "positionOther");

    const selected = existing.details || [];
    selected.forEach(d => {
      const cb = document.querySelector(`.subtopic[data-topic-id="${d.topicId}"][data-sub-id="${d.subTopicId}"]`);
      if (cb) cb.checked = true;
    });

    document.getElementById("submitBtn").textContent = "บันทึกการแก้ไขคำตอบ";
    this.updateProgress();
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
    box.scrollIntoView({ behavior: "smooth" });
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
  },

  renderDashboard(data) {
    document.getElementById("totalResponses").textContent = data.total || 0;
    this.renderChart("deptChart", data.byDepartment || []);
    this.renderChart("positionChart", data.byPosition || []);
    this.renderChart("subTopicChart", data.bySubTopic || []);
    this.renderLatest(data.latest || []);
  },

  renderChart(id, rows) {
    const box = document.getElementById(id);
    box.innerHTML = "";
    const max = Math.max(...rows.map(r => r.value), 1);

    rows.forEach(r => {
      const div = document.createElement("div");
      div.className = "chart-row";
      div.innerHTML = `
        <div class="chart-label"><span>${r.label}</span><span>${r.value}</span></div>
        <div class="chart-bar"><div class="chart-fill" style="width:${(r.value / max) * 100}%"></div></div>
      `;
      box.appendChild(div);
    });
  },

  renderLatest(rows) {
    const tbody = document.getElementById("latestTable");
    tbody.innerHTML = "";

    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r["Display Name"] || "-"}</td>
        <td>${r.Department || "-"}</td>
        <td>${r.Position || "-"}</td>
        <td>${r.UpdatedAt || r.Timestamp || "-"}</td>
        <td>${r["Edit Count"] || 0}</td>
      `;
      tbody.appendChild(tr);
    });
  }
};
