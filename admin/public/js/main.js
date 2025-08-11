function adminLogin(event) {
  event.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("login-message");

  if (username === "admin" && password === "1234") {
    localStorage.setItem("adminAuth", "true");
    window.location.href = "dashboard.html";
  } else {
    msg.textContent = "Invalid credentials!";
    msg.style.color = "red";
  }
}

function logout() {
  localStorage.removeItem("adminAuth");
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.includes("dashboard.html")) {
    if (localStorage.getItem("adminAuth") !== "true") {
      alert("Unauthorized! Login first.");
      window.location.href = "index.html";
      return;
    }

    loadDummyData(); // Simulate loading data
  }
});

function loadDummyData() {
  const users = [
    { id: 1, name: "User A", email: "a@mail.com", balance: 300 },
    { id: 2, name: "User B", email: "b@mail.com", balance: 0, blocked: true },
  ];

  const deposits = [
    { id: 101, user: "User A", amount: 500, method: "Bkash" }
  ];

  const withdraws = [
    { id: 201, user: "User B", amount: 200, method: "Nagad" }
  ];

  const userList = document.getElementById("user-list");
  users.forEach(user => {
    const div = document.createElement("div");
    div.className = "user-card";
    div.innerHTML = `
      <p><strong>${user.name}</strong> (${user.email}) - ৳${user.balance}</p>
      <button class="action" onclick="toggleBlock(${user.id})">
        ${user.blocked ? "Unblock" : "Block"}
      </button>
    `;
    userList.appendChild(div);
  });

  const depList = document.getElementById("deposit-requests");
  deposits.forEach(req => {
    const div = document.createElement("div");
    div.className = "request-card";
    div.innerHTML = `
      <p><strong>${req.user}</strong> wants to deposit ৳${req.amount} via ${req.method}</p>
      <button class="action">Grant</button>
      <button class="action">Reject</button>
    `;
    depList.appendChild(div);
  });

  const wdList = document.getElementById("withdraw-requests");
  withdraws.forEach(req => {
    const div = document.createElement("div");
    div.className = "request-card";
    div.innerHTML = `
      <p><strong>${req.user}</strong> requested ৳${req.amount} via ${req.method}</p>
      <button class="action">Grant</button>
      <button class="action">Reject</button>
    `;
    wdList.appendChild(div);
  });
}

function toggleBlock(id) {
  alert(`Toggle block for user ID: ${id}`);
}