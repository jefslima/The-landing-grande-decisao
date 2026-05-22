/* ===================================================================
   A GRANDE DECISÃO — comportamento da landing page
=================================================================== */

/* -------------------------------------------------------------------
   CONFIGURAÇÃO DA PLANILHA GOOGLE
   Cole aqui a URL do App da Web do Google Apps Script (ver apps-script/Code.gs).
   Enquanto estiver vazio, o formulário roda em MODO DEMO: valida, mostra a
   confirmação e guarda o cadastro no navegador (localStorage), sem enviar.
------------------------------------------------------------------- */
const SHEETS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzdV9CeTD4sUctJZCx5hJKBnNO8PzDGYFgXKClKSlQhTasddt4ySg4YAKQzRn3mjXDiHA/exec";

/* Data e hora do evento: 20/06/2026, 15h (horário de Brasília, -03:00) */
const EVENT_DATE = new Date("2026-06-20T15:00:00-03:00");

document.addEventListener("DOMContentLoaded", () => {
  initHeaderScroll();
  initCountdown();
  initPhoneMask();
  initCepLookup();
  initForm();
});

/* ===================================================================
   HEADER fica sólido ao rolar
=================================================================== */
function initHeaderScroll() {
  const header = document.getElementById("header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 30);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ===================================================================
   CONTAGEM REGRESSIVA
=================================================================== */
function initCountdown() {
  const el = {
    days: document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    mins: document.getElementById("cd-mins"),
    secs: document.getElementById("cd-secs"),
  };
  if (!el.days) return;

  const pad = (n) => String(Math.max(0, n)).padStart(2, "0");

  const tick = () => {
    const diff = EVENT_DATE.getTime() - Date.now();
    if (diff <= 0) {
      el.days.textContent = el.hours.textContent = el.mins.textContent = el.secs.textContent = "00";
      clearInterval(timer);
      return;
    }
    const s = Math.floor(diff / 1000);
    el.days.textContent = pad(Math.floor(s / 86400));
    el.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    el.mins.textContent = pad(Math.floor((s % 3600) / 60));
    el.secs.textContent = pad(s % 60);
  };

  tick();
  const timer = setInterval(tick, 1000);
}

/* ===================================================================
   MÁSCARA DE TELEFONE  (00) 00000-0000
=================================================================== */
function initPhoneMask() {
  const input = document.getElementById("whatsapp");
  if (!input) return;
  input.addEventListener("input", () => {
    let v = input.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 6) {
      const part = v.length > 10 ? 5 : 4; // celular (9 díg.) x fixo (8 díg.)
      input.value = `(${v.slice(0, 2)}) ${v.slice(2, 2 + part)}-${v.slice(2 + part)}`;
    } else if (v.length > 2) {
      input.value = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
      input.value = `(${v}`;
    } else {
      input.value = "";
    }
  });
}

/* ===================================================================
   CEP -> autopreenchimento de endereço (foco em velocidade)
   ViaCEP como serviço principal, BrasilAPI como fallback.
=================================================================== */
function initCepLookup() {
  const cep = document.getElementById("cep");
  const status = document.getElementById("cep-status");
  if (!cep) return;

  const uf = document.getElementById("uf");
  const cidade = document.getElementById("cidade");
  const endereco = document.getElementById("endereco");

  const setStatus = (msg, cls) => {
    status.textContent = msg;
    status.className = "cep-status" + (cls ? " " + cls : "");
  };

  cep.addEventListener("input", () => {
    let v = cep.value.replace(/\D/g, "").slice(0, 8);
    cep.value = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
    if (v.length === 8) lookup(v);
    else setStatus("");
  });

  async function lookup(digits) {
    setStatus("Buscando endereço...", "loading");
    const data = (await fromViaCep(digits)) || (await fromBrasilApi(digits));
    if (!data) { setStatus("Não encontramos esse CEP. Você pode preencher o endereço manualmente.", "err"); return; }

    if (data.uf) setOption(uf, data.uf);
    if (data.cidade) cidade.value = data.cidade;
    const rua = [data.logradouro, data.bairro].filter(Boolean).join(", ");
    if (rua) endereco.value = rua;

    setStatus("Endereço preenchido. Agora informe o número.", "ok");
    const numero = document.getElementById("numero");
    if (numero) numero.focus();
    else cidade.focus();
  }

  async function fromViaCep(d) {
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      if (!r.ok) return null;
      const j = await r.json();
      if (j.erro) return null;
      return { uf: j.uf, cidade: j.localidade, logradouro: j.logradouro, bairro: j.bairro };
    } catch { return null; }
  }

  async function fromBrasilApi(d) {
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${d}`);
      if (!r.ok) return null;
      const j = await r.json();
      return { uf: j.state, cidade: j.city, logradouro: j.street, bairro: j.neighborhood };
    } catch { return null; }
  }

  function setOption(select, value) {
    const v = String(value).toUpperCase();
    if ([...select.options].some((o) => o.value === v)) select.value = v;
  }
}

/* ===================================================================
   FORMULÁRIO: validação + envio
=================================================================== */
function initForm() {
  const form = document.getElementById("rsvp-form");
  if (!form) return;
  const submitBtn = document.getElementById("submit-btn");
  const successPanel = document.getElementById("success-panel");

  const showError = (name, msg) => {
    const field = form.elements[name];
    const small = form.querySelector(`.error[data-for="${name}"]`);
    if (field && field.classList) field.classList.toggle("invalid", !!msg);
    if (small) small.textContent = msg || "";
  };

  const validators = {
    nome: (v) => (v.trim().length >= 3 ? "" : "Informe seu nome completo."),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Informe um e-mail válido."),
    whatsapp: (v) => (v.replace(/\D/g, "").length >= 10 ? "" : "Informe um WhatsApp válido com DDD."),
  };

  // Validação ao sair do campo
  ["nome", "email", "whatsapp"].forEach((name) => {
    form.elements[name].addEventListener("blur", (e) => showError(name, validators[name](e.target.value)));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let firstInvalid = null;

    for (const name of ["nome", "email", "whatsapp"]) {
      const msg = validators[name](form.elements[name].value);
      showError(name, msg);
      if (msg && !firstInvalid) firstInvalid = form.elements[name];
    }

    // Número é obrigatório apenas quando a pessoa informa o endereço.
    const enderecoVal = form.elements["endereco"].value.trim();
    const numeroVal = form.elements["numero"].value.trim();
    if (enderecoVal && !numeroVal) {
      showError("numero", "Informe o número (use S/N se não houver).");
      if (!firstInvalid) firstInvalid = form.elements["numero"];
    } else {
      showError("numero", "");
    }

    const consent = form.elements["consent"];
    if (!consent.checked) {
      showError("consent", "É necessário concordar para garantir o convite.");
      if (!firstInvalid) firstInvalid = consent;
    } else {
      showError("consent", "");
    }

    if (firstInvalid) { firstInvalid.focus(); return; }

    const payload = {
      nome: form.elements["nome"].value.trim(),
      email: form.elements["email"].value.trim(),
      whatsapp: form.elements["whatsapp"].value.trim(),
      cep: form.elements["cep"].value.trim(),
      uf: form.elements["uf"].value.trim(),
      cidade: form.elements["cidade"].value.trim(),
      endereco: form.elements["endereco"].value.trim(),
      numero: form.elements["numero"].value.trim(),
      complemento: form.elements["complemento"].value.trim(),
      origem: "landing-grande-decisao",
      data_envio: new Date().toISOString(),
    };

    submitBtn.classList.add("loading");
    submitBtn.textContent = "Enviando...";

    saveLocalBackup(payload);
    await sendLead(payload);

    // Sucesso (mesmo em demo). O backup local garante que nenhum lead se perca.
    form.hidden = true;
    successPanel.hidden = false;
    successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function saveLocalBackup(payload) {
  try {
    const key = "leads_grande_decisao";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    list.push(payload);
    localStorage.setItem(key, JSON.stringify(list));
  } catch { /* localStorage indisponível: ignora */ }
}

async function sendLead(payload) {
  if (!SHEETS_ENDPOINT) return; // modo demo
  try {
    await fetch(SHEETS_ENDPOINT, {
      method: "POST",
      // form-encoded => requisição "simples", sem preflight CORS
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams(payload).toString(),
    });
  } catch (err) {
    // Falha de rede: o backup em localStorage preserva o cadastro.
    console.warn("Falha ao enviar para a planilha:", err);
  }
}
