// public/app-login.js

const statusEl = document.getElementById("status");
const toastEl = document.getElementById("toast");
const spinner = document.getElementById("spinner");
const btnConnect = document.getElementById("btn-connect");
const btnLogin = document.getElementById("btn-login");

let currentAccount = null;

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.className = "show";
  setTimeout(() => (toastEl.className = toastEl.className.replace("show", "")), 2500);
}

async function connectWallet() {
  if (!window.ethereum) {
    showToast("MetaMask not found!");
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    currentAccount = accounts[0];
    statusEl.textContent = `Connected: ${currentAccount}`;
    showToast("Wallet connected");
  } catch (err) {
    console.error(err);
    showToast("Failed to connect wallet");
  }
}

async function loginWithSignature() {
  if (!currentAccount) {
    showToast("Please connect wallet first");
    return;
  }

  spinner.style.display = "block";

  try {
    const nonceResp = await fetch("/auth/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: currentAccount }),
    });
    const { nonce } = await nonceResp.json();

    const signature = await window.ethereum.request({
      method: "personal_sign",
      params: [nonce, currentAccount],
    });

    const loginResp = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ address: currentAccount, signature }),
    });
    const result = await loginResp.json();

    if (result.ok) {
      showToast("Login successful!");
      setTimeout(() => (window.location.href = "/dashboard.html"), 1000);
    } else {
      showToast(result.error || "Login failed");
    }
  } catch (err) {
    console.error(err);
    showToast("Error during login");
  } finally {
    spinner.style.display = "none";
  }
}

btnConnect.addEventListener("click", connectWallet);
btnLogin.addEventListener("click", loginWithSignature);
