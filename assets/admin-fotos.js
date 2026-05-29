/* ============================================
   REI DO SANDUÍCHE — Fotos e Evidências
   ============================================
   Visualizar, ampliar, baixar fotos enviadas
   pelas funcionárias. Filtrar por data, func, insumo.
   ============================================ */

const AdminFotos = (() => {

  function render() {
    const checklists = DB.getAll(DB.COLLECTIONS.checklists).sort((a, b) => (b.data || b.criadoEm || '').localeCompare(a.data || a.criadoEm || ''));
    const el = document.getElementById('page-content');

    // Coletar todas as fotos
    const todasFotos = [];
    checklists.forEach(ck => {
      const fotosKey = 'rei_ck_fotos_' + ck.id;
      let fotosData = null;
      try { fotosData = JSON.parse(localStorage.getItem(fotosKey)); } catch (e) {}
      if (!fotosData) return;

      (ck.itens || []).forEach(item => {
        if (item.temFoto && fotosData[item.insumoId]) {
          todasFotos.push({
            checklistId: ck.id,
            data: ck.data || ck.criadoEm || '',
            funcionario: ck.funcionarioNome || 'Desconhecido',
            funcionarioId: ck.funcionarioId || '',
            insumoId: item.insumoId,
            insumoNome: item.insumoNome || '-',
            categoria: item.categoria || '-',
            quantidade: item.quantidade,
            unidade: item.unidade || '',
            observacao: item.observacao || '',
            foto: fotosData[item.insumoId]
          });
        }
      });
    });

    // Filtros
    const funcionarios = [...new Set(todasFotos.map(f => f.funcionario))];
    const categorias = [...new Set(todasFotos.map(f => f.categoria))];

    let html = '';

    // Resumo
    html += '<div class="stat-grid mb-4">';
    html += '<div class="stat-card"><div class="stat-icon blue">📸</div><div><div class="stat-value">' + todasFotos.length + '</div><div class="stat-label">Fotos Total</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon green">📋</div><div><div class="stat-value">' + checklists.length + '</div><div class="stat-label">Checklists</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon yellow">👥</div><div><div class="stat-value">' + funcionarios.length + '</div><div class="stat-label">Funcionários</div></div></div>';
    html += '</div>';

    // Barra de filtros
    html += '<div class="card mb-4"><div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:1rem;align-items:end">';
    html += '<div class="form-group" style="margin:0"><label class="form-label">Buscar insumo</label><input type="text" class="form-input" id="fotos-busca" placeholder="Nome do insumo..."></div>';
    html += '<div class="form-group" style="margin:0"><label class="form-label">Funcionário</label><select class="form-input" id="fotos-func"><option value="">Todos</option>';
    funcionarios.forEach(f => { html += '<option value="' + App.escapeHtml(f) + '">' + App.escapeHtml(f) + '</option>'; });
    html += '</select></div>';
    html += '<div class="form-group" style="margin:0"><label class="form-label">Categoria</label><select class="form-input" id="fotos-cat"><option value="">Todas</option>';
    categorias.forEach(c => { html += '<option value="' + App.escapeHtml(c) + '">' + App.escapeHtml(c) + '</option>'; });
    html += '</select></div>';
    html += '<button class="btn btn-primary btn-sm" onclick="AdminFotos.filtrar()">Filtrar</button>';
    html += '</div></div>';

    // Galeria
    html += '<div id="fotos-galeria" class="dash-fotos-grid">';
    html += _renderGaleria(todasFotos);
    html += '</div>';

    if (todasFotos.length === 0) {
      html += '<div class="card"><div class="empty-state"><div class="empty-state-icon">📷</div><p class="empty-state-title">Nenhuma foto registrada</p><p class="empty-state-text">As fotos aparecem quando funcionárias enviam evidências pelo checklist.</p></div></div>';
    }

    el.innerHTML = html;

    // Evento de busca em tempo real
    const buscaInput = document.getElementById('fotos-busca');
    if (buscaInput) {
      buscaInput.addEventListener('input', App.debounce(() => filtrar(), 300));
    }
  }

  function _renderGaleria(fotos) {
    if (fotos.length === 0) return '';
    let html = '';
    fotos.forEach((f, idx) => {
      html += '<div class="dash-foto-card" data-func="' + App.escapeHtml(f.funcionario) + '" data-cat="' + App.escapeHtml(f.categoria) + '" data-nome="' + App.escapeHtml(f.insumoNome).toLowerCase() + '">';
      html += '<div class="dash-foto-img" onclick="AdminFotos.ampliar(' + idx + ')" style="background-image:url(' + f.foto + ')" title="Clique para ampliar"></div>';
      html += '<div class="dash-foto-info">';
      html += '<div class="font-medium text-sm">' + App.escapeHtml(f.insumoNome) + '</div>';
      html += '<div class="text-xs text-muted">' + App.escapeHtml(f.categoria) + '</div>';
      html += '<div class="text-xs" style="margin-top:0.25rem"><span class="font-medium">' + App.formatNumber(f.quantidade, 1) + '</span> ' + f.unidade + '</div>';
      html += '<div class="text-xs text-muted" style="margin-top:0.25rem">' + App.escapeHtml(f.funcionario) + ' — ' + App.formatDateShort(f.data) + '</div>';
      if (f.observacao) html += '<div class="text-xs" style="margin-top:0.25rem;color:var(--brand-blue-dark)">📝 ' + App.escapeHtml(f.observacao) + '</div>';
      html += '</div></div>';
    });
    return html;
  }

  let _fotosCache = null;

  function _getAllFotos() {
    if (_fotosCache) return _fotosCache;
    const checklists = DB.getAll(DB.COLLECTIONS.checklists);
    const fotos = [];
    checklists.forEach(ck => {
      let fotosData = null;
      try { fotosData = JSON.parse(localStorage.getItem('rei_ck_fotos_' + ck.id)); } catch (e) {}
      if (!fotosData) return;
      (ck.itens || []).forEach(item => {
        if (item.temFoto && fotosData[item.insumoId]) {
          fotos.push({
            data: ck.data || ck.criadoEm || '',
            funcionario: ck.funcionarioNome || 'Desconhecido',
            insumoNome: item.insumoNome || '-',
            categoria: item.categoria || '-',
            quantidade: item.quantidade,
            unidade: item.unidade || '',
            observacao: item.observacao || '',
            foto: fotosData[item.insumoId]
          });
        }
      });
    });
    _fotosCache = fotos;
    return fotos;
  }

  function filtrar() {
    const busca = (document.getElementById('fotos-busca').value || '').toLowerCase();
    const func = document.getElementById('fotos-func').value;
    const cat = document.getElementById('fotos-cat').value;

    document.querySelectorAll('.dash-foto-card').forEach(card => {
      const nome = card.dataset.nome || '';
      const cardFunc = card.dataset.func || '';
      const cardCat = card.dataset.cat || '';

      let show = true;
      if (busca && !nome.includes(busca)) show = false;
      if (func && cardFunc !== func) show = false;
      if (cat && cardCat !== cat) show = false;
      card.style.display = show ? '' : 'none';
    });
  }

  function ampliar(idx) {
    const fotos = _getAllFotos();
    const f = fotos[idx];
    if (!f) return;

    let overlay = document.getElementById('modal-foto-amp');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-foto-amp';
      overlay.className = 'modal-overlay';
      overlay.style.zIndex = '200';
      overlay.innerHTML = '<div class="modal" style="max-width:800px;background:var(--sidebar-bg)"><div class="modal-header" style="border-color:rgba(255,255,255,0.1)"><h3 id="foto-amp-titulo" style="color:#fff"></h3><button class="modal-close" style="color:#fff">&times;</button></div><div class="modal-body" style="padding:0;text-align:center;background:#000"><img id="foto-amp-img" style="max-width:100%;max-height:65vh;object-fit:contain"></div><div id="foto-amp-info" style="padding:1rem;color:var(--sidebar-text)"></div><div class="modal-footer" style="border-color:rgba(255,255,255,0.1)"><button class="btn btn-secondary btn-sm modal-close">Fechar</button><button class="btn btn-primary btn-sm" id="btn-baixar-foto">Baixar</button></div></div>';
      document.body.appendChild(overlay);
    }

    document.getElementById('foto-amp-titulo').textContent = f.insumoNome;
    document.getElementById('foto-amp-img').src = f.foto;
    document.getElementById('foto-amp-info').innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.875rem">' +
      '<div><span style="color:var(--text-muted)">Funcionário:</span> ' + App.escapeHtml(f.funcionario) + '</div>' +
      '<div><span style="color:var(--text-muted)">Data:</span> ' + App.formatDateShort(f.data) + '</div>' +
      '<div><span style="color:var(--text-muted)">Quantidade:</span> ' + App.formatNumber(f.quantidade, 1) + ' ' + f.unidade + '</div>' +
      '<div><span style="color:var(--text-muted)">Categoria:</span> ' + App.escapeHtml(f.categoria) + '</div>' +
      (f.observacao ? '<div style="grid-column:1/-1"><span style="color:var(--text-muted)">Obs:</span> ' + App.escapeHtml(f.observacao) + '</div>' : '') +
      '</div>';

    document.getElementById('btn-baixar-foto').onclick = () => {
      const a = document.createElement('a');
      a.href = f.foto;
      a.download = 'evidencia-' + f.insumoNome.replace(/\s/g, '_') + '-' + (f.data || '').slice(0, 10) + '.jpg';
      a.click();
    };

    overlay.classList.add('active');
  }

  return { render, filtrar, ampliar };
})();
