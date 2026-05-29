/* ============================================
   REI DO SANDUÍCHE — Configurações
   ============================================ */

const AdminConfig = (() => {

  function render() {
    const config = _getConfig();
    const el = document.getElementById('page-content');

    let html = '';

    // Info do sistema
    html += '<div class="stat-grid mb-4">';
    html += '<div class="stat-card"><div class="stat-icon blue">💾</div><div><div class="stat-value">' + _calcLocalStorageUsage() + '</div><div class="stat-label">Uso do localStorage</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon green">📦</div><div><div class="stat-value">' + DB.getAll(DB.COLLECTIONS.insumos).length + '</div><div class="stat-label">Insumos</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon yellow">📋</div><div><div class="stat-value">' + DB.getAll(DB.COLLECTIONS.checklists).length + '</div><div class="stat-label">Checklists</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon red">📊</div><div><div class="stat-value">v' + (config.versao || 2) + '</div><div class="stat-label">Versão DB</div></div></div>';
    html += '</div>';

    // Configurações gerais
    html += '<div class="card mb-4">';
    html += '<div class="card-header"><h3 class="card-title">Configurações Gerais</h3></div>';
    html += '<form id="form-config" autocomplete="off">';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">';
    html += '<div class="form-group"><label class="form-label">Nome do Estabelecimento</label><input type="text" class="form-input" id="cfg-nome" value="' + App.escapeHtml(config.nomeEstabelecimento || 'Rei do Sanduíche') + '"></div>';
    html += '<div class="form-group"><label class="form-label">Tolerância Padrão de Divergência (%)</label><input type="number" class="form-input" id="cfg-tolerancia" value="' + (config.toleranciaDivergencia || 5) + '" min="1" max="50"></div>';
    html += '<div class="form-group"><label class="form-label">Hora de Fechamento</label><input type="time" class="form-input" id="cfg-fechamento" value="' + (config.horaFechamento || '23:00') + '"></div>';
    html += '<div class="form-group"><label class="form-label">Alerta Estoque Crítico (%)</label><input type="number" class="form-input" id="cfg-alerta-estoque" value="' + (config.alertaEstoquePct || 20) + '" min="5" max="50"></div>';
    html += '</div>';
    html += '<button type="button" class="btn btn-primary" onclick="AdminConfig.salvar()">Salvar Configurações</button>';
    html += '</form></div>';

    // Backup / Restaurar
    html += '<div class="card mb-4">';
    html += '<div class="card-header"><h3 class="card-title">Backup e Restauração</h3></div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:1rem">';
    html += '<button class="btn btn-secondary" onclick="DB.downloadBackup()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Baixar Backup</button>';
    html += '<label class="btn btn-secondary" style="cursor:pointer"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Restaurar Backup<input type="file" id="cfg-restore-file" accept=".json" style="display:none" onchange="AdminConfig.restaurar(this)"></label>';
    html += '</div>';
    html += '<p class="text-sm text-muted mt-4">O backup inclui todos os dados: usuários, insumos, fichas, compras, vendas, checklists, divergências e logs.</p>';
    html += '</div>';

    // Limpar dados (perigoso)
    html += '<div class="card" style="border-color:var(--danger)">';
    html += '<div class="card-header"><h3 class="card-title" style="color:var(--danger)">Zona de Perigo</h3></div>';
    html += '<p class="text-sm text-muted mb-4">Estas ações são irreversíveis. Faça backup antes!</p>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:1rem">';
    html += '<button class="btn btn-danger btn-sm" onclick="AdminConfig.limparDivergencias()">Limpar Divergências</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="AdminConfig.limparLogs()">Limpar Logs</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="AdminConfig.limparVendas()">Limpar Vendas</button>';
    html += '</div></div>';

    el.innerHTML = html;
  }

  function _getConfig() {
    try {
      const raw = localStorage.getItem('rei_config');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  function _saveConfig(config) {
    localStorage.setItem('rei_config', JSON.stringify(config));
  }

  function _calcLocalStorageUsage() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith('rei_')) {
        total += localStorage.getItem(key).length * 2; // UTF-16
      }
    }
    const mb = (total / (1024 * 1024)).toFixed(2);
    return mb + ' MB';
  }

  function salvar() {
    const config = _getConfig();
    config.nomeEstabelecimento = document.getElementById('cfg-nome').value.trim() || 'Rei do Sanduíche';
    config.toleranciaDivergencia = parseInt(document.getElementById('cfg-tolerancia').value) || 5;
    config.horaFechamento = document.getElementById('cfg-fechamento').value || '23:00';
    config.alertaEstoquePct = parseInt(document.getElementById('cfg-alerta-estoque').value) || 20;
    _saveConfig(config);

    DB.addLog({ acao: 'ALTERAR_CONFIG', detalhes: 'Configurações atualizadas' });
    App.toast('Configurações salvas!', 'success');
  }

  function restaurar(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const snapshot = JSON.parse(e.target.result);
        if (!snapshot.dados) { App.toast('Arquivo de backup inválido', 'error'); return; }
        if (!window.confirm('Restaurar backup? Isso substituirá TODOS os dados atuais!')) return;
        DB.importAll(snapshot);
        App.toast('Backup restaurado! Recarregando...', 'success');
        setTimeout(() => location.reload(), 1500);
      } catch (err) {
        App.toast('Erro ao ler arquivo: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  function limparDivergencias() {
    if (!window.confirm('Limpar TODAS as divergências? Esta ação é irreversível!')) return;
    localStorage.setItem('rei_divergencias', '[]');
    DB.addLog({ acao: 'LIMPAR_DIVERGENCIAS', detalhes: 'Todas as divergências removidas' });
    App.toast('Divergências limpas', 'success');
    render();
  }

  function limparLogs() {
    if (!window.confirm('Limpar TODOS os logs de auditoria?')) return;
    localStorage.setItem('rei_logs', '[]');
    App.toast('Logs limpos', 'success');
    render();
  }

  function limparVendas() {
    if (!window.confirm('Limpar TODAS as vendas importadas?')) return;
    localStorage.setItem('rei_vendas', '[]');
    DB.addLog({ acao: 'LIMPAR_VENDAS', detalhes: 'Todas as vendas removidas' });
    App.toast('Vendas limpas', 'success');
    render();
  }

  return { render, salvar, restaurar, limparDivergencias, limparLogs, limparVendas };
})();
