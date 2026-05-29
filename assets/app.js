/* ============================================
   REI DO SANDUÍCHE — Funções Globais
   ============================================ */

const App = (() => {
  // --- Toast Notifications ---

  function toast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: '&#10003;',
      error: '&#10007;',
      warning: '&#9888;',
      info: '&#8505;'
    };

    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<span style="font-size:1.1rem">' + (icons[type] || icons.info) + '</span><span>' + message + '</span>';
    container.appendChild(el);

    setTimeout(() => {
      el.style.animation = 'toastOut 0.3s ease-in forwards';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // --- Modal ---

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  }

  function initModals() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
      }
      if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
        const overlay = e.target.closest('.modal-overlay');
        if (overlay) overlay.classList.remove('active');
      }
    });
  }

  // --- Sidebar Mobile ---

  function initSidebar() {
    const toggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  }

  // --- Loading Screen ---

  function hideLoading() {
    const loading = document.getElementById('loading-screen');
    if (loading) {
      loading.classList.add('fade-out');
      setTimeout(() => loading.remove(), 500);
    }
  }

  function showLoading() {
    if (document.getElementById('loading-screen')) return;

    const el = document.createElement('div');
    el.id = 'loading-screen';
    el.className = 'loading-screen';
    el.innerHTML = '<img src="assets/logo.jpg" alt="Rei do Sanduíche" style="width:100px;border-radius:12px;animation:loadingPulse 1.5s ease-in-out infinite"><div class="loading-bar"><div class="loading-bar-fill"></div></div>';
    document.body.appendChild(el);
  }

  // --- Formatação ---

  function formatDate(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateShort(isoStr) {
    if (!isoStr) return '-';
    return new Date(isoStr).toLocaleDateString('pt-BR');
  }

  function formatCurrency(value) {
    return 'R$ ' + (parseFloat(value) || 0).toFixed(2).replace('.', ',');
  }

  function formatNumber(value, decimals = 0) {
    return (parseFloat(value) || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  // --- Validação ---

  function validateRequired(fields) {
    const errors = [];
    fields.forEach(({ el, name }) => {
      if (el && !el.value.trim()) {
        el.classList.add('error');
        errors.push(name + ' é obrigatório');
      } else if (el) {
        el.classList.remove('error');
      }
    });
    return errors;
  }

  function clearFormErrors(form) {
    if (!form) return;
    form.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
    form.querySelectorAll('.form-error.visible').forEach(el => el.classList.remove('visible'));
  }

  // --- Navegação ---

  function setActiveNav(selector) {
    document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
    const active = document.querySelector(selector);
    if (active) active.classList.add('active');
  }

  // --- Confirmação ---

  function confirm(message) {
    return window.confirm(message);
  }

  // --- Helpers de DOM ---

  function $(selector) {
    return document.querySelector(selector);
  }

  function $$(selector) {
    return document.querySelectorAll(selector);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Debounce ---

  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // --- Máscaras de Input ---

  function maskCPF(input) {
    input.addEventListener('input', () => {
      const pos = input.selectionStart;
      const oldLen = input.value.length;
      input.value = DB.formatCPF(input.value);
      const newLen = input.value.length;
      const newPos = pos + (newLen - oldLen);
      input.setSelectionRange(newPos, newPos);
    });
  }

  function maskTelefone(input) {
    input.addEventListener('input', () => {
      let v = input.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 10) {
        v = v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      } else if (v.length > 6) {
        v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
      } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
      }
      input.value = v;
    });
  }

  // --- Render de avatar ---

  function renderAvatar(nome, foto, size) {
    size = size || 36;
    if (foto) {
      return '<img src="' + escapeHtml(foto) + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover" alt="">';
    }
    const initial = (nome || '?').charAt(0).toUpperCase();
    return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--sidebar-active);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--brand-yellow);font-size:' + (size * 0.4) + 'px">' + initial + '</div>';
  }

  // --- Init Global ---

  function init() {
    DB.seedIfEmpty();
    initModals();
    initSidebar();

    // Aplicar máscaras automaticamente
    document.querySelectorAll('[data-mask="cpf"]').forEach(maskCPF);
    document.querySelectorAll('[data-mask="telefone"]').forEach(maskTelefone);

    setTimeout(hideLoading, 600);
  }

  return {
    toast,
    openModal,
    closeModal,
    initModals,
    initSidebar,
    hideLoading,
    showLoading,
    formatDate,
    formatDateShort,
    formatCurrency,
    formatNumber,
    validateRequired,
    clearFormErrors,
    setActiveNav,
    confirm,
    $,
    $$,
    escapeHtml,
    debounce,
    maskCPF,
    maskTelefone,
    renderAvatar,
    init
  };
})();
