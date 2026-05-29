/* ============================================
   REI DO SANDUÍCHE — Checklists (Admin View)
   ============================================
   Visualizar, editar, desconsiderar, excluir
   checklists. Escolher qual usar para cálculos.
   ============================================ */

const AdminChecklists = (() => {

  function render() {
    const checklists = DB.getAll(DB.COLLECTIONS.checklists)
      .sort((a, b) => (b.data || b.criadoEm || '').localeCompare(a.data || a.criadoEm || ''));
    const el = document.getElementById('page-content');

    const funcionarios = [...new Set(checklists.map(c => c.funcionarioNome || c.usuarioNome || 'Desconhecido'))];

    const hoje = new Date().toISOString().slice(0, 10);
    const ckHoje = checklists.filter(c => (c.data || '').startsWith(hoje)).length;
    const semana = new Date(); semana.setDate(semana.getDate() - 7);
    const ckSemana = checklists.filter(c => (c.data || '').slice(0, 10) >= semana.toISOString().slice(0, 10)).length;

    let totalFotos = 0;
    checklists.forEach(c => { (c.itens || []).forEach(it => { if (it.temFoto) totalFotos++; }); });

    let html = '';

    html += '<div class="stat-grid mb-4">';
    html += '<div class="stat-card"><div class="stat-icon blue">📋</div><div><div class="stat-value">' + checklists.length + '</div><div class="stat-label">Total Checklists</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon green">✅</div><div><div class="stat-value">' + ckHoje + '</div><div class="stat-label">Hoje</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon yellow">📊</div><div><div class="stat-value">' + ckSemana + '</div><div class="stat-label">Esta Semana</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon red">📸</div><div><div class="stat-value">' + totalFotos + '</div><div class="stat-label">Fotos</div></div></div>';
    html += '</div>';

    // Filtros
    html += '<div class="card mb-4"><div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:end">';
    html += '<div class="form-group" style="margin:0;flex:1;min-width:150px"><label class="form-label">Funcionário</label><select class="form-input" id="ck-filtro-func"><option value="">Todos</option>';
    funcionarios.forEach(f => { html += '<option value="' + App.escapeHtml(f) + '">' + App.escapeHtml(f) + '</option>'; });
    html += '</select></div>';
    html += '<div class="form-group" style="margin:0"><label class="form-label">De</label><input type="date" class="form-input" id="ck-filtro-de"></div>';
    html += '<div class="form-group" style="margin:0"><label class="form-label">Até</label><input type="date" class="form-input" id="ck-filtro-ate"></div>';
    html += '<button class="btn btn-primary btn-sm" onclick="AdminChecklists.filtrar()">Filtrar</button>';
    html += '</div></div>';

    html += '<div class="card"><div class="card-header"><h3 class="card-title">Histórico de Checklists</h3></div>';
    html += '<div id="ck-tabela">' + _renderTabela(checklists) + '</div></div>';

    el.innerHTML = html;
  }

  function _renderTabela(checklists) {
    if (checklists.length === 0) {
      return '<div class="empty-state"><div class="empty-state-icon">📋</div><p class="empty-state-title">Nenhum checklist registrado</p></div>';
    }

    let html = '<div class="table-container"><table class="table"><thead><tr><th>Data/Hora</th><th>Funcionário</th><th>Itens</th><th>Fotos</th><th>Status</th><th style="text-align:right">Ações</th></tr></thead><tbody>';
    checklists.forEach(c => {
      const qtdFotos = (c.itens || []).filter(it => it.temFoto).length;
      const func = c.funcionarioNome || c.usuarioNome || 'Desconhecido';
      const dataHora = App.formatDate(c.horarioFim || c.criadoEm);
      const isDesconsiderado = c.status === 'desconsiderado';
      const rowStyle = isDesconsiderado ? 'opacity:0.5' : '';

      html += '<tr style="' + rowStyle + '">';
      html += '<td style="white-space:nowrap">' + dataHora;
      if (c.editadoEm) html += '<br><span class="text-xs" style="color:var(--warning)">editado ' + App.formatDate(c.editadoEm) + '</span>';
      html += '</td>';
      html += '<td class="font-medium">' + App.escapeHtml(func) + '</td>';
      html += '<td>' + (c.itensPreenchidos || 0) + '/' + (c.totalItens || 0) + '</td>';
      html += '<td>' + (qtdFotos > 0 ? '<span class="badge badge-info">' + qtdFotos + ' 📸</span>' : '—') + '</td>';

      // Status
      if (isDesconsiderado) {
        html += '<td><span class="badge badge-neutral">Desconsiderado</span></td>';
      } else {
        html += '<td><span class="badge badge-success">Ativo</span></td>';
      }

      // Ações
      html += '<td style="text-align:right;white-space:nowrap">';
      html += '<button class="btn btn-ghost btn-sm" onclick="AdminChecklists.verDetalhe(\'' + c.id + '\')" title="Ver">👁️</button> ';
      html += '<button class="btn btn-ghost btn-sm" onclick="AdminChecklists.editarChecklist(\'' + c.id + '\')" title="Editar">✏️</button> ';
      if (!isDesconsiderado) {
        html += '<button class="btn btn-ghost btn-sm" onclick="AdminChecklists.desconsiderar(\'' + c.id + '\')" title="Desconsiderar" style="color:var(--warning)">🚫</button> ';
      } else {
        html += '<button class="btn btn-ghost btn-sm" onclick="AdminChecklists.reativar(\'' + c.id + '\')" title="Reativar" style="color:var(--success)">✅</button> ';
      }
      html += '<button class="btn btn-ghost btn-sm" onclick="AdminChecklists.excluir(\'' + c.id + '\')" title="Excluir" style="color:var(--danger)">🗑️</button>';
      html += '</td></tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function filtrar() {
    const func = document.getElementById('ck-filtro-func').value;
    const de = document.getElementById('ck-filtro-de').value;
    const ate = document.getElementById('ck-filtro-ate').value;

    let checklists = DB.getAll(DB.COLLECTIONS.checklists)
      .sort((a, b) => (b.data || b.criadoEm || '').localeCompare(a.data || a.criadoEm || ''));

    if (func) checklists = checklists.filter(c => (c.funcionarioNome || c.usuarioNome || 'Desconhecido') === func);
    if (de) checklists = checklists.filter(c => (c.data || '').slice(0, 10) >= de);
    if (ate) checklists = checklists.filter(c => (c.data || '').slice(0, 10) <= ate);

    document.getElementById('ck-tabela').innerHTML = _renderTabela(checklists);
  }

  // --- Ver detalhes ---
  function verDetalhe(id) {
    const ck = DB.getById(DB.COLLECTIONS.checklists, id);
    if (!ck) return;

    let fotosData = null;
    try { fotosData = JSON.parse(localStorage.getItem('rei_ck_fotos_' + id)); } catch (e) {}

    let html = '<div style="max-height:70vh;overflow-y:auto">';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;padding:1rem;background:var(--bg-secondary);border-radius:var(--radius-md)">';
    html += '<div><span class="text-sm text-muted">Funcionário:</span><br><span class="font-semibold">' + App.escapeHtml(ck.funcionarioNome || ck.usuarioNome || 'Desconhecido') + '</span></div>';
    html += '<div><span class="text-sm text-muted">Data/Hora:</span><br><span class="font-semibold">' + App.formatDate(ck.horarioFim || ck.criadoEm) + '</span></div>';
    html += '<div><span class="text-sm text-muted">Itens:</span><br><span class="font-semibold">' + (ck.itensPreenchidos || 0) + '/' + (ck.totalItens || 0) + '</span></div>';
    html += '<div><span class="text-sm text-muted">Status:</span><br><span class="font-semibold">' + (ck.status === 'desconsiderado' ? 'Desconsiderado' : 'Ativo') + '</span></div>';
    if (ck.editadoEm) {
      html += '<div style="grid-column:1/-1"><span class="text-sm text-muted">Última edição:</span><br><span class="font-semibold" style="color:var(--warning)">' + App.formatDate(ck.editadoEm) + ' por ' + App.escapeHtml(ck.editadoPor || '-') + '</span></div>';
    }
    html += '</div>';

    const categorias = {};
    (ck.itens || []).forEach(item => {
      const cat = item.categoria || 'Outros';
      if (!categorias[cat]) categorias[cat] = [];
      categorias[cat].push(item);
    });

    Object.entries(categorias).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cat, itens]) => {
      html += '<div style="margin-bottom:1rem"><div class="font-semibold text-sm mb-2" style="color:var(--brand-blue-dark)">' + App.escapeHtml(cat) + ' (' + itens.length + ')</div>';
      html += '<div class="table-container"><table class="table"><thead><tr><th>Insumo</th><th>Contagem</th><th>Real</th><th>Foto</th><th>Obs</th></tr></thead><tbody>';
      itens.forEach(item => {
        const temFoto = item.temFoto && fotosData && fotosData[item.insumoId];
        const qtdContada = item.quantidadeContada != null ? App.formatNumber(item.quantidadeContada, 2) : '-';
        const qtdReal = item.quantidade != null ? App.formatNumber(item.quantidade, 2) : '-';
        const conv = DB.getConversao(item.insumoNome);
        html += '<tr>';
        html += '<td>' + App.escapeHtml(item.insumoNome || '-') + '</td>';
        html += '<td class="font-medium">' + qtdContada + (conv ? ' <span class="text-xs text-muted">(' + conv.label.split('(')[0].trim() + ')</span>' : '') + '</td>';
        html += '<td>' + qtdReal + ' ' + (item.unidade || '') + '</td>';
        html += '<td>';
        if (temFoto) {
          html += '<img src="' + fotosData[item.insumoId] + '" style="width:40px;height:40px;border-radius:4px;object-fit:cover;cursor:pointer" onclick="this.style.width=this.style.width===\'40px\'?\'200px\':\'40px\';this.style.height=this.style.width===\'200px\'?\'auto\':\'40px\'">';
        } else {
          html += '—';
        }
        html += '</td>';
        html += '<td class="text-xs text-muted">' + App.escapeHtml(item.observacao || '-') + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table></div></div>';
    });
    html += '</div>';

    _showModal('Checklist — ' + App.formatDate(ck.horarioFim || ck.criadoEm), html);
  }

  // --- Editar checklist (admin) ---
  function editarChecklist(id) {
    const ck = DB.getById(DB.COLLECTIONS.checklists, id);
    if (!ck) return;

    const insumos = DB.getAll(DB.COLLECTIONS.insumos).filter(i => i.ativo);

    let html = '<div style="max-height:70vh;overflow-y:auto">';
    html += '<p class="text-sm text-muted mb-4">Edite as quantidades que precisar corrigir:</p>';
    html += '<div class="table-container"><table class="table"><thead><tr><th>Insumo</th><th>Categoria</th><th>Qtd Contada</th><th>Obs</th></tr></thead><tbody>';

    (ck.itens || []).forEach((item, idx) => {
      const qtd = item.quantidadeContada != null ? item.quantidadeContada : (item.quantidade || '');
      const conv = DB.getConversao(item.insumoNome);
      html += '<tr>';
      html += '<td class="font-medium">' + App.escapeHtml(item.insumoNome || '-');
      if (conv) html += '<br><span class="text-xs text-muted">' + conv.label + '</span>';
      html += '</td>';
      html += '<td class="text-xs text-muted">' + App.escapeHtml(item.categoria || '-') + '</td>';
      html += '<td><input type="number" class="form-input ck-edit-qty" data-idx="' + idx + '" value="' + qtd + '" step="any" min="0" style="width:80px;padding:0.375rem 0.5rem;text-align:center;font-weight:600"></td>';
      html += '<td><input type="text" class="form-input ck-edit-obs" data-idx="' + idx + '" value="' + App.escapeHtml(item.observacao || '') + '" style="width:120px;padding:0.375rem 0.5rem;font-size:0.8125rem" placeholder="Obs..."></td>';
      html += '</tr>';
    });

    html += '</tbody></table></div></div>';

    _showModal('Editar Checklist — ' + App.formatDate(ck.horarioFim || ck.criadoEm), html, [
      { label: 'Cancelar', cls: 'btn-secondary', action: 'close' },
      { label: 'Salvar Alterações', cls: 'btn-primary', action: function () {
        _salvarEdicaoAdmin(id);
      }}
    ]);
  }

  function _salvarEdicaoAdmin(id) {
    const ck = DB.getById(DB.COLLECTIONS.checklists, id);
    if (!ck) return;

    const session = DB.getSession();
    const itensAtualizados = [...(ck.itens || [])];
    let alteracoes = 0;

    document.querySelectorAll('.ck-edit-qty').forEach(input => {
      const idx = parseInt(input.dataset.idx);
      const novaQtd = input.value !== '' ? parseFloat(input.value) : null;
      if (idx >= 0 && idx < itensAtualizados.length) {
        const item = itensAtualizados[idx];
        const qtdAnterior = item.quantidadeContada != null ? item.quantidadeContada : item.quantidade;
        if (novaQtd !== qtdAnterior) {
          item.quantidadeContada = novaQtd;
          const conv = DB.getConversao(item.insumoNome);
          item.quantidade = novaQtd !== null && conv ? novaQtd * conv.fator : novaQtd;
          alteracoes++;
        }
      }
    });

    document.querySelectorAll('.ck-edit-obs').forEach(input => {
      const idx = parseInt(input.dataset.idx);
      if (idx >= 0 && idx < itensAtualizados.length) {
        itensAtualizados[idx].observacao = input.value.trim() || null;
      }
    });

    const preenchidos = itensAtualizados.filter(i => i.quantidade !== null).length;

    DB.update(DB.COLLECTIONS.checklists, id, {
      itens: itensAtualizados,
      itensPreenchidos: preenchidos,
      editadoEm: new Date().toISOString(),
      editadoPor: session.nome
    });

    DB.addLog({
      acao: 'ADMIN_EDITAR_CHECKLIST',
      entidade: 'checklist',
      entidadeId: id,
      detalhes: session.nome + ' editou checklist — ' + alteracoes + ' item(ns) alterado(s)'
    });

    _closeModal();
    App.toast('Checklist atualizado! ' + alteracoes + ' alteração(ões)', 'success');
    render();
  }

  // --- Desconsiderar ---
  function desconsiderar(id) {
    const ck = DB.getById(DB.COLLECTIONS.checklists, id);
    if (!ck) return;
    const func = ck.funcionarioNome || ck.usuarioNome || 'Desconhecido';

    if (!window.confirm('Desconsiderar o checklist de ' + func + ' (' + App.formatDateShort(ck.data) + ')?\n\nEle não será usado nos cálculos de divergência, mas ficará no histórico.')) return;

    const session = DB.getSession();
    DB.update(DB.COLLECTIONS.checklists, id, { status: 'desconsiderado', desconsideradoPor: session.nome, desconsideradoEm: new Date().toISOString() });
    DB.addLog({ acao: 'DESCONSIDERAR_CHECKLIST', entidade: 'checklist', entidadeId: id, detalhes: session.nome + ' desconsiderou checklist de ' + func });
    App.toast('Checklist desconsiderado', 'warning');
    render();
  }

  // --- Reativar ---
  function reativar(id) {
    const session = DB.getSession();
    DB.update(DB.COLLECTIONS.checklists, id, { status: 'finalizado', desconsideradoPor: null, desconsideradoEm: null });
    DB.addLog({ acao: 'REATIVAR_CHECKLIST', entidade: 'checklist', entidadeId: id, detalhes: session.nome + ' reativou checklist' });
    App.toast('Checklist reativado', 'success');
    render();
  }

  // --- Excluir ---
  function excluir(id) {
    const ck = DB.getById(DB.COLLECTIONS.checklists, id);
    if (!ck) return;
    const func = ck.funcionarioNome || ck.usuarioNome || 'Desconhecido';

    if (!window.confirm('EXCLUIR permanentemente o checklist de ' + func + ' (' + App.formatDateShort(ck.data) + ')?\n\nEsta ação NÃO pode ser desfeita!')) return;

    const session = DB.getSession();
    DB.remove(DB.COLLECTIONS.checklists, id);

    // Remover fotos associadas
    try { localStorage.removeItem('rei_ck_fotos_' + id); } catch (e) {}

    DB.addLog({ acao: 'EXCLUIR_CHECKLIST', entidade: 'checklist', entidadeId: id, detalhes: session.nome + ' excluiu checklist de ' + func + ' — ' + App.formatDateShort(ck.data) });
    App.toast('Checklist excluído', 'error');
    render();
  }

  // --- Modal helpers ---
  function _showModal(titulo, conteudo, botoes) {
    _closeModal();
    const overlay = document.createElement('div');
    overlay.id = 'modal-ck-admin';
    overlay.className = 'modal-overlay active';

    let footerHtml = '';
    if (botoes) {
      botoes.forEach((b, i) => {
        footerHtml += '<button class="btn ' + b.cls + '" id="modal-ck-btn-' + i + '">' + b.label + '</button>';
      });
    } else {
      footerHtml = '<button class="btn btn-secondary" id="modal-ck-btn-close">Fechar</button>';
    }

    overlay.innerHTML = '<div class="modal" style="max-width:800px"><div class="modal-header"><h3>' + titulo + '</h3><button class="modal-close" id="modal-ck-x">&times;</button></div><div class="modal-body" style="padding:1rem">' + conteudo + '</div><div class="modal-footer">' + footerHtml + '</div></div>';
    document.body.appendChild(overlay);

    // Bind close
    document.getElementById('modal-ck-x').onclick = _closeModal;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) _closeModal(); });

    if (botoes) {
      botoes.forEach((b, i) => {
        document.getElementById('modal-ck-btn-' + i).addEventListener('click', () => {
          if (b.action === 'close') _closeModal();
          else if (typeof b.action === 'function') b.action();
        });
      });
    } else {
      document.getElementById('modal-ck-btn-close').onclick = _closeModal;
    }
  }

  function _closeModal() {
    const m = document.getElementById('modal-ck-admin');
    if (m) m.remove();
  }

  return { render, filtrar, verDetalhe, editarChecklist, desconsiderar, reativar, excluir };
})();
