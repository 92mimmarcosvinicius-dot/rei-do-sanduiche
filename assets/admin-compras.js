/* ============================================
   REI DO SANDUÍCHE — Admin: Gestão de Compras
   ============================================ */

const AdminCompras = (() => {

  function render() {
    const compras = DB.getAll(DB.COLLECTIONS.compras).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const insumos = DB.getAll(DB.COLLECTIONS.insumos).filter(i => i.ativo);

    let html = '';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem">';
    html += '<div class="flex items-center gap-4">';
    html += '<span class="badge badge-info">' + compras.length + ' compras</span>';
    const totalMes = compras.filter(c => c.data && c.data.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, c) => s + (c.valorTotal || 0), 0);
    html += '<span class="badge badge-neutral">Este mês: ' + App.formatCurrency(totalMes) + '</span>';
    html += '</div>';
    html += '<button class="btn btn-primary btn-sm" onclick="AdminCompras.abrirNovo()">+ Nova Compra</button>';
    html += '</div>';

    // Filtros
    html += '<div class="card mb-4" style="padding:0.75rem 1rem;display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center">';
    html += '<input class="form-input" type="text" id="busca-compra" placeholder="Buscar por insumo ou fornecedor..." style="flex:1;min-width:200px;border:none;background:transparent;padding:0">';
    html += '<input class="form-input" type="month" id="filtro-mes-compra" value="' + new Date().toISOString().slice(0, 7) + '" style="width:auto;padding:0.5rem;font-size:0.8125rem">';
    html += '</div>';

    // Tabela
    html += '<div class="card" style="padding:0"><div class="table-container" id="tabela-compras">';
    html += _renderTable(compras);
    html += '</div></div>';

    document.getElementById('page-content').innerHTML = html;

    // Filtros
    const busca = document.getElementById('busca-compra');
    const filtroMes = document.getElementById('filtro-mes-compra');
    const filtrar = App.debounce(() => {
      const t = busca.value.toLowerCase().trim();
      const m = filtroMes.value;
      const filtrados = compras.filter(c => {
        if (m && c.data && !c.data.startsWith(m)) return false;
        if (t) {
          const insumo = DB.getById(DB.COLLECTIONS.insumos, c.insumoId);
          const nomeIns = insumo ? insumo.nome.toLowerCase() : '';
          if (!nomeIns.includes(t) && !(c.fornecedor || '').toLowerCase().includes(t)) return false;
        }
        return true;
      });
      document.getElementById('tabela-compras').innerHTML = _renderTable(filtrados);
    }, 200);
    busca.addEventListener('input', filtrar);
    filtroMes.addEventListener('change', filtrar);
  }

  function _renderTable(compras) {
    if (!compras.length) return '<div class="empty-state" style="padding:2rem"><p class="empty-state-title">Nenhuma compra registrada</p><p class="empty-state-text">Registre compras para atualizar o estoque automaticamente.</p></div>';

    let html = '<table class="table"><thead><tr><th>Data</th><th>Insumo</th><th>Qtd</th><th>Fornecedor</th><th style="text-align:right">Valor Unit.</th><th style="text-align:right">Total</th><th>NF</th><th style="text-align:right">Ações</th></tr></thead><tbody>';
    compras.forEach(c => {
      const insumo = DB.getById(DB.COLLECTIONS.insumos, c.insumoId);
      const nomeIns = insumo ? insumo.nome : '(removido)';
      html += '<tr>';
      html += '<td class="text-sm">' + App.formatDateShort(c.data) + '</td>';
      html += '<td><span class="font-medium text-sm">' + App.escapeHtml(nomeIns) + '</span></td>';
      html += '<td class="text-sm">' + c.quantidade + ' ' + App.escapeHtml(c.unidade || '') + '</td>';
      html += '<td class="text-sm">' + App.escapeHtml(c.fornecedor || '-') + '</td>';
      html += '<td class="text-sm" style="text-align:right">' + App.formatCurrency(c.valorUnitario || 0) + '</td>';
      html += '<td class="text-sm" style="text-align:right;font-weight:600">' + App.formatCurrency(c.valorTotal || 0) + '</td>';
      html += '<td>';
      if (c.fotoNF) html += '<button class="btn btn-ghost btn-sm" onclick="AdminCompras.verNF(\'' + c.id + '\')" title="Ver NF">📄</button>';
      else html += '<span class="text-xs text-muted">—</span>';
      html += '</td>';
      html += '<td style="text-align:right">';
      html += '<button class="btn btn-ghost btn-sm" onclick="AdminCompras.editar(\'' + c.id + '\')" title="Editar">✏️</button>';
      html += '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function abrirNovo() {
    _abrirModal({
      insumoId: '', quantidade: '', unidade: '', valorUnitario: '', valorTotal: '',
      fornecedor: '', data: new Date().toISOString().slice(0, 10), fotoNF: null, obs: ''
    });
  }

  function editar(id) {
    const compra = DB.getById(DB.COLLECTIONS.compras, id);
    if (compra) _abrirModal(compra);
  }

  function _abrirModal(compra) {
    // Remover modal anterior se existir
    const old = document.getElementById('modal-compra');
    if (old) old.remove();

    const isEdit = !!compra.id;
    const insumos = DB.getAll(DB.COLLECTIONS.insumos).filter(i => i.ativo).sort((a, b) => a.nome.localeCompare(b.nome));

    // Nome do insumo selecionado (para edição)
    const insumoSelecionado = compra.insumoId ? DB.getById(DB.COLLECTIONS.insumos, compra.insumoId) : null;

    let html = '<div class="modal-overlay active" id="modal-compra"><div class="modal" style="max-width:520px">';
    html += '<div class="modal-header"><h3>' + (isEdit ? 'Editar Compra' : 'Nova Compra') + '</h3><button class="modal-close" onclick="document.getElementById(\'modal-compra\').remove()">&times;</button></div>';
    html += '<div class="modal-body">';

    // Insumo com barra de busca + datalist
    html += '<div class="form-group"><label class="form-label">Insumo *</label>';
    html += '<input class="form-input" type="text" id="cp-insumo-busca" list="cp-insumo-list" placeholder="Digite para buscar..." value="' + (insumoSelecionado ? App.escapeHtml(insumoSelecionado.nome) : '') + '" autocomplete="off">';
    html += '<datalist id="cp-insumo-list">';
    insumos.forEach(i => {
      html += '<option value="' + App.escapeHtml(i.nome) + '" data-id="' + i.id + '">' + App.escapeHtml(i.categoria) + ' — ' + i.unidade + '</option>';
    });
    html += '</datalist>';
    html += '<input type="hidden" id="cp-insumo-id" value="' + (compra.insumoId || '') + '">';
    html += '</div>';

    // Data e Fornecedor
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">';
    html += '<div class="form-group"><label class="form-label">Data *</label><input class="form-input" type="date" id="cp-data" value="' + (compra.data || '') + '"></div>';
    html += '<div class="form-group"><label class="form-label">Fornecedor</label><input class="form-input" id="cp-fornecedor" value="' + App.escapeHtml(compra.fornecedor || '') + '" placeholder="Nome do fornecedor"></div>';
    html += '</div>';

    // Quantidade, Valor Unitário, Total
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem">';
    html += '<div class="form-group"><label class="form-label">Quantidade *</label><input class="form-input" type="number" step="0.01" min="0" id="cp-qtd" value="' + (compra.quantidade || '') + '"></div>';
    html += '<div class="form-group"><label class="form-label">Valor Unit. (R$)</label><input class="form-input" type="number" step="0.01" min="0" id="cp-vunit" value="' + (compra.valorUnitario || '') + '"></div>';
    html += '<div class="form-group"><label class="form-label">Total (R$)</label><input class="form-input" type="number" step="0.01" min="0" id="cp-vtotal" value="' + (compra.valorTotal || '') + '" style="font-weight:600"></div>';
    html += '</div>';

    // Foto da NF
    html += '<div class="form-group"><label class="form-label">Foto da Nota Fiscal</label>';
    html += '<div style="display:flex;gap:0.75rem;align-items:center">';
    html += '<input type="file" accept="image/*" id="cp-foto-input" style="display:none">';
    html += '<button class="btn btn-secondary btn-sm" type="button" id="cp-foto-btn">' + (compra.fotoNF ? '📷 Trocar foto' : '📷 Tirar/Anexar foto') + '</button>';
    if (compra.fotoNF) html += '<span class="text-xs" style="color:var(--success)" id="cp-foto-status">Foto anexada</span>';
    else html += '<span class="text-xs text-muted" id="cp-foto-status">Sem foto</span>';
    html += '</div></div>';

    // Obs
    html += '<div class="form-group"><label class="form-label">Observações</label><textarea class="form-input" id="cp-obs" rows="2" style="resize:vertical">' + App.escapeHtml(compra.obs || '') + '</textarea></div>';

    html += '<input type="hidden" id="cp-id" value="' + (compra.id || '') + '">';
    html += '<p class="form-error" id="cp-error" style="display:none;color:var(--danger);font-size:0.8125rem;margin-top:0.5rem"></p>';
    html += '</div>';
    html += '<div class="modal-footer">';
    html += '<button class="btn btn-secondary" onclick="document.getElementById(\'modal-compra\').remove()">Cancelar</button>';
    html += '<button class="btn btn-primary" id="btn-salvar-compra">Salvar</button>';
    html += '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);

    // Fechar ao clicar fora
    document.getElementById('modal-compra').addEventListener('click', (e) => {
      if (e.target.id === 'modal-compra') document.getElementById('modal-compra').remove();
    });

    // Busca de insumo — resolver nome → ID
    const buscaInput = document.getElementById('cp-insumo-busca');
    const idHidden = document.getElementById('cp-insumo-id');
    buscaInput.addEventListener('input', () => {
      const nome = buscaInput.value.trim();
      const match = insumos.find(i => i.nome.toLowerCase() === nome.toLowerCase());
      idHidden.value = match ? match.id : '';
    });
    buscaInput.addEventListener('change', () => {
      const nome = buscaInput.value.trim();
      const match = insumos.find(i => i.nome.toLowerCase() === nome.toLowerCase());
      if (match) {
        idHidden.value = match.id;
        buscaInput.value = match.nome;
      } else {
        idHidden.value = '';
      }
    });

    // Auto-calcular total
    const qtdEl = document.getElementById('cp-qtd');
    const vunitEl = document.getElementById('cp-vunit');
    const vtotalEl = document.getElementById('cp-vtotal');
    qtdEl.addEventListener('input', () => {
      const q = parseFloat(qtdEl.value) || 0;
      const v = parseFloat(vunitEl.value) || 0;
      if (q > 0 && v > 0) vtotalEl.value = (q * v).toFixed(2);
    });
    vunitEl.addEventListener('input', () => {
      const q = parseFloat(qtdEl.value) || 0;
      const v = parseFloat(vunitEl.value) || 0;
      if (q > 0 && v > 0) vtotalEl.value = (q * v).toFixed(2);
    });
    vtotalEl.addEventListener('input', () => {
      const q = parseFloat(qtdEl.value) || 0;
      const t = parseFloat(vtotalEl.value) || 0;
      if (q > 0 && t > 0) vunitEl.value = (t / q).toFixed(2);
    });

    // Foto NF
    let fotoData = compra.fotoNF || null;
    document.getElementById('cp-foto-btn').addEventListener('click', () => {
      document.getElementById('cp-foto-input').click();
    });
    document.getElementById('cp-foto-input').addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max = 800;
          let w = img.width, h = img.height;
          if (w > max) { h = h * max / w; w = max; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          fotoData = canvas.toDataURL('image/jpeg', 0.6);
          document.getElementById('cp-foto-status').textContent = 'Foto anexada';
          document.getElementById('cp-foto-status').style.color = 'var(--success)';
          document.getElementById('cp-foto-btn').textContent = '📷 Trocar foto';
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

    // SALVAR
    document.getElementById('btn-salvar-compra').addEventListener('click', () => {
      const insumoId = document.getElementById('cp-insumo-id').value;
      const data = document.getElementById('cp-data').value;
      const qtd = parseFloat(qtdEl.value);
      const errorEl = document.getElementById('cp-error');

      if (!insumoId) {
        errorEl.textContent = 'Selecione um insumo válido da lista';
        errorEl.style.display = 'block';
        buscaInput.focus();
        return;
      }
      if (!data) {
        errorEl.textContent = 'Informe a data da compra';
        errorEl.style.display = 'block';
        return;
      }
      if (!qtd || qtd <= 0) {
        errorEl.textContent = 'Informe a quantidade';
        errorEl.style.display = 'block';
        return;
      }

      const insumo = DB.getById(DB.COLLECTIONS.insumos, insumoId);
      const dados = {
        insumoId: insumoId,
        data: data,
        quantidade: qtd,
        unidade: insumo ? insumo.unidade : '',
        valorUnitario: parseFloat(vunitEl.value) || 0,
        valorTotal: parseFloat(vtotalEl.value) || 0,
        fornecedor: document.getElementById('cp-fornecedor').value.trim(),
        fotoNF: fotoData,
        obs: document.getElementById('cp-obs').value.trim()
      };

      const id = document.getElementById('cp-id').value;
      if (id) {
        // Edição
        const compraAnterior = DB.getById(DB.COLLECTIONS.compras, id);
        DB.update(DB.COLLECTIONS.compras, id, dados);
        if (insumo && compraAnterior) {
          const diffQtd = qtd - (compraAnterior.quantidade || 0);
          if (diffQtd !== 0) {
            DB.update(DB.COLLECTIONS.insumos, insumoId, {
              estoqueAtual: (insumo.estoqueAtual || 0) + diffQtd
            });
          }
        }
        DB.addLog({ acao: 'EDITAR_COMPRA', entidade: 'compra', entidadeId: id, detalhes: 'Editada compra de ' + (insumo ? insumo.nome : '?') });
        App.toast('Compra atualizada!', 'success');
      } else {
        // Nova compra
        const cp = DB.insert(DB.COLLECTIONS.compras, dados);
        if (insumo) {
          const novoEstoque = (insumo.estoqueAtual || 0) + qtd;
          const updateData = { estoqueAtual: novoEstoque };
          if (dados.valorUnitario > 0) {
            const custoAtual = insumo.custoMedio || 0;
            const estoqueAnterior = insumo.estoqueAtual || 0;
            if (estoqueAnterior > 0 && custoAtual > 0) {
              updateData.custoMedio = ((custoAtual * estoqueAnterior) + (dados.valorUnitario * qtd)) / novoEstoque;
            } else {
              updateData.custoMedio = dados.valorUnitario;
            }
          }
          DB.update(DB.COLLECTIONS.insumos, insumoId, updateData);
        }
        DB.addLog({ acao: 'REGISTRAR_COMPRA', entidade: 'compra', entidadeId: cp.id, detalhes: (insumo ? insumo.nome : '?') + ' — ' + qtd + ' ' + dados.unidade + ' — ' + App.formatCurrency(dados.valorTotal) });
        App.toast('Compra registrada! Estoque atualizado.', 'success');
      }

      document.getElementById('modal-compra').remove();
      render();
    });
  }

  function verNF(id) {
    const compra = DB.getById(DB.COLLECTIONS.compras, id);
    if (!compra || !compra.fotoNF) return;

    const old = document.getElementById('modal-nf');
    if (old) old.remove();

    let html = '<div class="modal-overlay active" id="modal-nf"><div class="modal" style="max-width:600px">';
    html += '<div class="modal-header"><h3>Nota Fiscal</h3><button class="modal-close" onclick="document.getElementById(\'modal-nf\').remove()">&times;</button></div>';
    html += '<div class="modal-body" style="text-align:center;padding:1rem">';
    html += '<img src="' + compra.fotoNF + '" style="max-width:100%;max-height:70vh;border-radius:8px">';
    html += '</div>';
    html += '<div class="modal-footer"><button class="btn btn-secondary" onclick="document.getElementById(\'modal-nf\').remove()">Fechar</button></div>';
    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('modal-nf').addEventListener('click', (e) => {
      if (e.target.id === 'modal-nf') document.getElementById('modal-nf').remove();
    });
  }

  return { render, abrirNovo, editar, verNF };
})();
