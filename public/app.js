// public/app.js

async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  return accounts[0];
}

async function requestNonce(address) {
  const res = await fetch("/auth/nonce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Nonce request failed");
  return data.nonce;
}

async function loginWithSignature(address) {
  const nonce = await requestNonce(address);
  const signature = await window.ethereum.request({
    method: "personal_sign",
    params: [nonce, address],
  });

  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ address, signature }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return true;
}

async function getMe() {
  const res = await fetch("/api/me", { credentials: "include" });
  if (!res.ok) return null;
  return await res.json();
}

// === Page logic ===
if (typeof window !== "undefined") {
  const btnConnect = document.getElementById("btn-connect");
  const btnLogin = document.getElementById("btn-login");
  const status = document.getElementById("status");
  const btnLogout = document.getElementById("btn-logout");

  // index.html
  if (btnConnect) {
    btnConnect.addEventListener("click", async () => {
      try {
        const address = await connectWallet();
        status.textContent = `Connected: ${address}`;
      } catch (err) {
        status.textContent = "Error: " + err.message;
      }
    });
  }

  if (btnLogin) {
    btnLogin.addEventListener("click", async () => {
      try {
        const address = await connectWallet();
        await loginWithSignature(address);
        window.location.href = "/dashboard";
      } catch (err) {
        alert("Login failed: " + err.message);
      }
    });
  }

  // dashboard.html
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/";
    });

    // check current user
    (async () => {
      const me = await getMe();
      const userDiv = document.getElementById("user");
      if (!me) {
        userDiv.textContent = "Not authenticated — redirecting...";
        setTimeout(() => (window.location.href = "/"), 1500);
        return;
      }
      userDiv.textContent = "✅ Logged in as: " + me.address;
    })();
  }
}
