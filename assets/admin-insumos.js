/* ============================================
   REI DO SANDUÍCHE — Admin: Gestão de Insumos
   ============================================ */

const AdminInsumos = (() => {

  function render() {
    const insumos = DB.getAll(DB.COLLECTIONS.insumos);
    const categorias = [...new Set(insumos.map(i => i.categoria))].sort();

    let html = '';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem">';
    html += '<div class="flex items-center gap-4">';
    html += '<span class="badge badge-info">' + insumos.length + ' insumos</span>';
    html += '<span class="badge badge-neutral">' + categorias.length + ' categorias</span>';
    html += '</div>';
    html += '<div class="flex items-center gap-2">';
    html += '<button class="btn btn-primary btn-sm" onclick="AdminInsumos.abrirNovo()">+ Novo Insumo</button>';
    html += '<button class="btn btn-secondary btn-sm" onclick="AdminInsumos.abrirTolerancia()">Tolerâncias</button>';
    html += '</div></div>';

    // Filtros
    html += '<div class="card mb-4" style="padding:0.75rem 1rem;display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center">';
    html += '<input class="form-input" type="text" id="busca-insumo" placeholder="Buscar insumo..." style="flex:1;min-width:200px;border:none;background:transparent;padding:0">';
    html += '<select class="form-input" id="filtro-cat" style="width:auto;padding:0.5rem;font-size:0.8125rem"><option value="">Todas categorias</option>';
    categorias.forEach(c => { html += '<option>' + App.escapeHtml(c) + '</option>'; });
    html += '</select></div>';

    // Tabela
    html += '<div class="card" style="padding:0"><div class="table-container" id="tabela-insumos">';
    html += _renderTable(insumos);
    html += '</div></div>';

    document.getElementById('page-content').innerHTML = html;

    // Filtros com debounce
    const busca = document.getElementById('busca-insumo');
    const filtroCat = document.getElementById('filtro-cat');
    const filtrar = App.debounce(() => {
      const t = busca.value.toLowerCase().trim();
      const c = filtroCat.value;
      const filtrados = insumos.filter(i => {
        if (c && i.categoria !== c) return false;
        if (t && !i.nome.toLowerCase().includes(t) && !(i.categoria || '').toLowerCase().includes(t)) return false;
        return true;
      });
      document.getElementById('tabela-insumos').innerHTML = _renderTable(filtrados);
    }, 200);
    busca.addEventListener('input', filtrar);
    filtroCat.addEventListener('change', filtrar);
  }

  function _renderTable(insumos) {
    if (!insumos.length) return '<div class="empty-state" style="padding:2rem"><p class="empty-state-title">Nenhum insumo encontrado</p></div>';

    let html = '<table class="table"><thead><tr><th>Insumo</th><th>Categoria</th><th>Unidade</th><th>Estoque</th><th>Tolerância</th><th style="text-align:right">Ações</th></tr></thead><tbody>';
    insumos.forEach(i => {
      const tol = i.tolerancia || { verde: 10, amarelo: 20 };
      html += '<tr>';
      html += '<td><div class="flex items-center gap-2">';
      if (i.foto) html += '<img src="' + i.foto + '" style="width:28px;height:28px;border-radius:4px;object-fit:cover">';
      html += '<span class="font-medium">' + App.escapeHtml(i.nome) + '</span>';
      if (!i.ativo) html += ' <span class="badge badge-danger">Inativo</span>';
      html += '</div></td>';
      html += '<td class="text-sm">' + App.escapeHtml(i.categoria) + '</td>';
      html += '<td class="text-sm">' + App.escapeHtml(i.unidade) + '</td>';
      html += '<td class="text-sm">' + (i.estoqueAtual || 0) + ' / ' + (i.estoqueMax || '-') + '</td>';
      html += '<td><span class="badge badge-success" style="font-size:0.6875rem">' + tol.verde + '%</span> <span class="badge badge-warning" style="font-size:0.6875rem">' + tol.amarelo + '%</span></td>';
      html += '<td style="text-align:right">';
      html += '<button class="btn btn-ghost btn-sm" onclick="AdminInsumos.editar(\'' + i.id + '\')" title="Editar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>';
      html += '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function abrirNovo() {
    _abrirModal({ nome: '', categoria: '', unidade: 'un', estoqueMax: 100, estoqueMin: 0, tolerancia: { verde: 10, amarelo: 20 }, foto: null, ativo: true });
  }

  function editar(id) {
    const insumo = DB.getById(DB.COLLECTIONS.insumos, id);
    if (insumo) _abrirModal(insumo);
  }

  function _abrirModal(insumo) {
    const isEdit = !!insumo.id;
    const categorias = [...new Set(DB.getAll(DB.COLLECTIONS.insumos).map(i => i.categoria))].sort();
    const tol = insumo.tolerancia || { verde: 10, amarelo: 20 };

    let html = '<div class="modal-overlay active" id="modal-insumo"><div class="modal" style="max-width:500px">';
    html += '<div class="modal-header"><h3>' + (isEdit ? 'Editar Insumo' : 'Novo Insumo') + '</h3><button class="modal-close">&times;</button></div>';
    html += '<div class="modal-body">';
    html += '<div class="form-group"><label class="form-label">Nome *</label><input class="form-input" id="ins-nome" value="' + App.escapeHtml(insumo.nome || '') + '"></div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">';
    html += '<div class="form-group"><label class="form-label">Categoria *</label><input class="form-input" id="ins-cat" list="cat-list" value="' + App.escapeHtml(insumo.categoria || '') + '"><datalist id="cat-list">';
    categorias.forEach(c => { html += '<option value="' + App.escapeHtml(c) + '">'; });
    html += '</datalist></div>';
    html += '<div class="form-group"><label class="form-label">Unidade</label><select class="form-input" id="ins-un"><option value="un"' + (insumo.unidade === 'un' ? ' selected' : '') + '>Unidade</option><option value="kg"' + (insumo.unidade === 'kg' ? ' selected' : '') + '>Kg</option><option value="g"' + (insumo.unidade === 'g' ? ' selected' : '') + '>Gramas</option><option value="L"' + (insumo.unidade === 'L' ? ' selected' : '') + '>Litros</option><option value="ml"' + (insumo.unidade === 'ml' ? ' selected' : '') + '>mL</option></select></div></div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">';
    html += '<div class="form-group"><label class="form-label">Estoque Máx.</label><input class="form-input" type="number" id="ins-max" value="' + (insumo.estoqueMax || '') + '"></div>';
    html += '<div class="form-group"><label class="form-label">Estoque Mín.</label><input class="form-input" type="number" id="ins-min" value="' + (insumo.estoqueMin || 0) + '"></div></div>';
    html += '<div class="form-group"><label class="form-label">Tolerância de divergência</label>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">';
    html += '<div><label class="text-xs text-muted">Até (verde) %</label><input class="form-input" type="number" id="ins-tol-verde" value="' + tol.verde + '" min="0" max="100"></div>';
    html += '<div><label class="text-xs text-muted">Até (amarelo) %</label><input class="form-input" type="number" id="ins-tol-amarelo" value="' + tol.amarelo + '" min="0" max="100"></div>';
    html += '</div><p class="text-xs text-muted mt-1">Acima do amarelo = vermelho (suspeita)</p></div>';
    if (isEdit) {
      html += '<div class="form-group"><label class="form-label">Status</label><select class="form-input" id="ins-ativo"><option value="1"' + (insumo.ativo ? ' selected' : '') + '>Ativo</option><option value="0"' + (!insumo.ativo ? ' selected' : '') + '>Inativo</option></select></div>';
    }
    html += '<input type="hidden" id="ins-id" value="' + (insumo.id || '') + '">';
    html += '<p class="form-error" id="ins-error" style="display:none"></p>';
    html += '</div>';
    html += '<div class="modal-footer"><button class="btn btn-secondary modal-close">Cancelar</button><button class="btn btn-primary" id="btn-salvar-insumo">Salvar</button></div>';
    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    App.initModals();

    document.getElementById('btn-salvar-insumo').onclick = () => {
      const nome = document.getElementById('ins-nome').value.trim();
      const cat = document.getElementById('ins-cat').value.trim();
      if (!nome || !cat) { document.getElementById('ins-error').textContent = 'Nome e categoria obrigatórios'; document.getElementById('ins-error').style.display = 'block'; return; }

      const dados = {
        nome, categoria: cat, unidade: document.getElementById('ins-un').value,
        estoqueMax: parseInt(document.getElementById('ins-max').value) || 100,
        estoqueMin: parseInt(document.getElementById('ins-min').value) || 0,
        tolerancia: { verde: parseInt(document.getElementById('ins-tol-verde').value) || 10, amarelo: parseInt(document.getElementById('ins-tol-amarelo').value) || 20 }
      };

      const id = document.getElementById('ins-id').value;
      if (id) {
        const ativoEl = document.getElementById('ins-ativo');
        if (ativoEl) dados.ativo = ativoEl.value === '1';
        DB.update(DB.COLLECTIONS.insumos, id, dados);
        DB.addLog({ acao: 'EDITAR_INSUMO', entidade: 'insumo', entidadeId: id, detalhes: 'Editado: ' + nome });
        App.toast('Insumo atualizado!', 'success');
      } else {
        dados.estoqueAtual = 0;
        dados.ativo = true;
        dados.foto = null;
        const ins = DB.insert(DB.COLLECTIONS.insumos, dados);
        DB.addLog({ acao: 'CADASTRAR_INSUMO', entidade: 'insumo', entidadeId: ins.id, detalhes: 'Novo: ' + nome + ' — ' + cat });
        App.toast('Insumo cadastrado!', 'success');
      }
      document.getElementById('modal-insumo').remove();
      render();
    };
  }

  function abrirTolerancia() {
    const categorias = [...new Set(DB.getAll(DB.COLLECTIONS.insumos).map(i => i.categoria))].sort();
    let html = '<div class="modal-overlay active" id="modal-tolerancia"><div class="modal" style="max-width:520px">';
    html += '<div class="modal-header"><h3>Tolerâncias por Categoria</h3><button class="modal-close">&times;</button></div>';
    html += '<div class="modal-body"><p class="text-sm text-muted mb-4">Defina os limites de divergência para cada categoria. Aplica a todos os insumos da categoria.</p>';
    html += '<div class="table-container"><table class="table"><thead><tr><th>Categoria</th><th>Verde (até %)</th><th>Amarelo (até %)</th></tr></thead><tbody>';
    categorias.forEach(cat => {
      const insumos = DB.query(DB.COLLECTIONS.insumos, i => i.categoria === cat);
      const tol = (insumos[0] || {}).tolerancia || { verde: 10, amarelo: 20 };
      html += '<tr><td class="font-medium text-sm">' + App.escapeHtml(cat) + '</td>';
      html += '<td><input type="number" class="form-input tol-input" data-cat="' + App.escapeHtml(cat) + '" data-tipo="verde" value="' + tol.verde + '" min="0" max="100" style="width:70px;padding:0.375rem;text-align:center"></td>';
      html += '<td><input type="number" class="form-input tol-input" data-cat="' + App.escapeHtml(cat) + '" data-tipo="amarelo" value="' + tol.amarelo + '" min="0" max="100" style="width:70px;padding:0.375rem;text-align:center"></td></tr>';
    });
    html += '</tbody></table></div></div>';
    html += '<div class="modal-footer"><button class="btn btn-secondary modal-close">Cancelar</button><button class="btn btn-primary" id="btn-salvar-tol">Aplicar</button></div>';
    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    App.initModals();

    document.getElementById('btn-salvar-tol').onclick = () => {
      const inputs = document.querySelectorAll('.tol-input');
      const map = {};
      inputs.forEach(inp => {
        const cat = inp.dataset.cat;
        if (!map[cat]) map[cat] = {};
        map[cat][inp.dataset.tipo] = parseInt(inp.value) || 10;
      });
      Object.keys(map).forEach(cat => {
        const insumos = DB.query(DB.COLLECTIONS.insumos, i => i.categoria === cat);
        insumos.forEach(i => DB.update(DB.COLLECTIONS.insumos, i.id, { tolerancia: map[cat] }));
      });
      DB.addLog({ acao: 'ATUALIZAR_TOLERANCIAS', detalhes: 'Tolerâncias atualizadas para ' + Object.keys(map).length + ' categorias' });
      App.toast('Tolerâncias atualizadas!', 'success');
      document.getElementById('modal-tolerancia').remove();
      render();
    };
  }

  return { render, abrirNovo, editar, abrirTolerancia };
})();
