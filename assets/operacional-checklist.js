/* ============================================
   REI DO SANDUÍCHE — Checklist Digital Operacional
   ============================================ */

const Checklist = (() => {
  let _dados = {};       // { insumoId: { qtd, obs, foto } }
  let _categoriaAberta = null;
  let _insumos = [];
  let _checklistId = null;   // se não-nulo, estamos editando um checklist existente
  let _editando = false;

  function render() {
    _insumos = DB.getAll(DB.COLLECTIONS.insumos).filter(i => i.ativo);
    _insumos.sort((a, b) => a.nome.localeCompare(b.nome));

    // Carregar rascunho do dia se existir
    _carregarRascunho();

    const categorias = _getCategorias();
    const total = _insumos.length;
    const preenchidos = _contarPreenchidos();

    let html = '';

    // Banner de edição
    if (_editando) {
      html += '<div style="background:var(--warning-bg);border:1px solid var(--warning);border-radius:var(--radius-md);padding:0.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.75rem">';
      html += '<span style="font-size:1.25rem">✏️</span>';
      html += '<div><span class="font-semibold" style="color:var(--warning)">Modo Edição</span><br><span class="text-xs text-muted">Você está editando um checklist já enviado. Altere o que precisar e clique em Salvar.</span></div>';
      html += '</div>';
    }

    // Barra de progresso
    html += '<div class="card mb-4" style="padding:1rem 1.25rem">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">';
    html += '<span class="font-semibold" style="font-size:0.9375rem">' + (_editando ? 'Editando Checklist' : 'Checklist Diário de Estoque') + '</span>';
    html += '<span class="badge ' + (preenchidos === total ? 'badge-success' : 'badge-warning') + '" id="ck-progress-badge">' + preenchidos + ' de ' + total + '</span>';
    html += '</div>';
    html += '<div style="height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">';
    const pct = total > 0 ? (preenchidos / total * 100) : 0;
    html += '<div id="ck-progress-bar" style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--brand-blue),var(--success));border-radius:4px;transition:width 0.3s ease"></div>';
    html += '</div>';
    html += '<p class="text-xs text-muted mt-2" id="ck-status-msg">' + _statusMsg(preenchidos, total) + '</p>';
    html += '</div>';

    // Botão finalizar/salvar no topo
    html += '<div style="display:flex;gap:0.75rem;margin-bottom:1.25rem;flex-wrap:wrap">';
    if (_editando) {
      html += '<button class="btn btn-primary" onclick="Checklist.salvarEdicao()">💾 Salvar Alterações</button>';
      html += '<button class="btn btn-secondary" onclick="Checklist.cancelarEdicao()">Cancelar Edição</button>';
    } else {
      html += '<button class="btn btn-primary" id="btn-finalizar-ck" onclick="Checklist.finalizar()">Finalizar Checklist</button>';
      html += '<button class="btn btn-secondary" onclick="Checklist.limpar()">Limpar Tudo</button>';
    }
    html += '</div>';

    // Acordeão de categorias
    categorias.forEach((cat, idx) => {
      const itens = _insumos.filter(i => i.categoria === cat);
      const catPreenchidos = itens.filter(i => _dados[i.id] && _dados[i.id].qtd !== '' && _dados[i.id].qtd !== undefined).length;
      const isOpen = _categoriaAberta === cat || (_categoriaAberta === null && idx === 0);

      html += '<div class="card mb-4" style="padding:0;overflow:hidden">';

      // Header da categoria
      html += '<div class="ck-cat-header" data-cat="' + cat + '" style="padding:1rem 1.25rem;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-light);background:var(--bg-secondary);user-select:none">';
      html += '<div class="flex items-center gap-2">';
      html += '<span style="font-size:1.1rem">' + _catIcon(cat) + '</span>';
      html += '<span class="font-semibold">' + App.escapeHtml(cat) + '</span>';
      html += '<span class="badge ' + (catPreenchidos === itens.length ? 'badge-success' : 'badge-neutral') + '" style="font-size:0.6875rem">' + catPreenchidos + '/' + itens.length + '</span>';
      html += '</div>';
      html += '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition:transform 0.2s;transform:rotate(' + (isOpen ? '180' : '0') + 'deg)"><polyline points="6 9 12 15 18 9"/></svg>';
      html += '</div>';

      // Grid de cards
      html += '<div class="ck-cat-body" data-cat-body="' + cat + '" style="' + (isOpen ? '' : 'display:none;') + 'padding:1rem;display:' + (isOpen ? 'grid' : 'none') + ';grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0.75rem">';

      itens.forEach(insumo => {
        const d = _dados[insumo.id] || {};
        const preenchido = d.qtd !== '' && d.qtd !== undefined;
        html += _renderCard(insumo, d, preenchido);
      });

      html += '</div></div>';
    });

    // Botão finalizar/salvar no final também
    html += '<div style="display:flex;gap:0.75rem;margin-top:1.25rem;flex-wrap:wrap">';
    if (_editando) {
      html += '<button class="btn btn-primary" onclick="Checklist.salvarEdicao()">💾 Salvar Alterações</button>';
      html += '<button class="btn btn-secondary" onclick="Checklist.cancelarEdicao()">Cancelar Edição</button>';
    } else {
      html += '<button class="btn btn-primary" onclick="Checklist.finalizar()">Finalizar Checklist</button>';
      html += '<button class="btn btn-secondary" onclick="Checklist.limpar()">Limpar Tudo</button>';
    }
    html += '</div>';

    document.getElementById('page-content').innerHTML = html;

    // Bind acordeão
    document.querySelectorAll('.ck-cat-header').forEach(header => {
      header.addEventListener('click', () => {
        const cat = header.dataset.cat;
        const body = document.querySelector('[data-cat-body="' + cat + '"]');
        const arrow = header.querySelector('svg');
        if (body.style.display === 'none') {
          body.style.display = 'grid';
          arrow.style.transform = 'rotate(180deg)';
          _categoriaAberta = cat;
        } else {
          body.style.display = 'none';
          arrow.style.transform = 'rotate(0deg)';
          if (_categoriaAberta === cat) _categoriaAberta = null;
        }
      });
    });
  }

  function _renderCard(insumo, d, preenchido) {
    const conv = DB.getConversao(insumo.nome);
    const unLabel = conv ? conv.label : _unidadeLabel(insumo.unidade);
    const hasObs = d.obs && d.obs.trim();
    const hasFoto = !!d.foto;

    let html = '<div class="ck-card' + (preenchido ? ' ck-done' : '') + '" id="ck-card-' + insumo.id + '">';

    // Topo com nome e status
    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem">';
    html += '<div>';
    html += '<div class="font-semibold" style="font-size:0.875rem;line-height:1.2">' + App.escapeHtml(insumo.nome) + '</div>';
    html += '<span class="text-xs text-muted">' + App.escapeHtml(unLabel) + '</span>';
    html += '</div>';
    html += '<div class="ck-status-dot" id="ck-dot-' + insumo.id + '" style="width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:4px;background:' + (preenchido ? 'var(--success)' : 'var(--border-medium)') + '"></div>';
    html += '</div>';

    // Campo de quantidade
    html += '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">';
    html += '<button class="ck-btn-minus" data-id="' + insumo.id + '" type="button" style="width:36px;height:36px;border-radius:var(--radius-sm);background:var(--bg-secondary);border:1px solid var(--border-light);font-size:1.25rem;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-secondary)">−</button>';
    html += '<input type="number" class="ck-input" id="ck-qty-' + insumo.id + '" data-id="' + insumo.id + '" data-max="' + (insumo.estoqueMax || 999) + '" value="' + (d.qtd !== undefined && d.qtd !== '' ? d.qtd : '') + '" placeholder="0" inputmode="decimal" step="any" min="0" style="flex:1;text-align:center;padding:0.5rem;font-size:1.125rem;font-weight:700;border:1.5px solid ' + (preenchido ? 'var(--success)' : 'var(--border-light)') + ';border-radius:var(--radius-sm);background:var(--bg-card);outline:none;min-width:0">';
    html += '<button class="ck-btn-plus" data-id="' + insumo.id + '" type="button" style="width:36px;height:36px;border-radius:var(--radius-sm);background:var(--bg-secondary);border:1px solid var(--border-light);font-size:1.25rem;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-secondary)">+</button>';
    html += '</div>';

    // Botões obs e foto
    html += '<div style="display:flex;gap:0.375rem">';
    html += '<button class="ck-btn-obs btn btn-ghost btn-sm" data-id="' + insumo.id + '" style="flex:1;font-size:0.75rem;min-height:32px;' + (hasObs ? 'color:var(--brand-blue-dark);font-weight:600' : '') + '">';
    html += (hasObs ? '📝 Obs' : '+ Obs');
    html += '</button>';
    html += '<button class="ck-btn-foto btn btn-ghost btn-sm" data-id="' + insumo.id + '" style="flex:1;font-size:0.75rem;min-height:32px;' + (hasFoto ? 'color:var(--success);font-weight:600' : '') + '">';
    html += (hasFoto ? '📷 Foto ✓' : '📷 Foto');
    html += '</button>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  function _bindEvents() {
    // Quantidade — salvar ao mudar
    document.addEventListener('input', (e) => {
      if (!e.target.classList.contains('ck-input')) return;
      const id = e.target.dataset.id;
      const val = e.target.value;
      _setQtd(id, val);
    });

    // Focus/blur visual
    document.addEventListener('focusin', (e) => {
      if (e.target.classList.contains('ck-input')) {
        e.target.style.borderColor = 'var(--brand-blue)';
        e.target.style.boxShadow = '0 0 0 3px rgba(41,182,246,0.15)';
        if (e.target.value === '0') e.target.value = '';
      }
    });
    document.addEventListener('focusout', (e) => {
      if (!e.target.classList.contains('ck-input')) return;
      const id = e.target.dataset.id;
      const val = e.target.value;
      e.target.style.boxShadow = 'none';

      if (val !== '' && val !== undefined) {
        const num = parseFloat(val);
        const max = parseFloat(e.target.dataset.max) || 999;

        // Validar quantidade absurda
        if (num > max * 3) {
          if (!window.confirm('Valor muito alto (' + num + '). O máximo esperado é ' + max + '. Confirma?')) {
            e.target.value = '';
            _setQtd(id, '');
            return;
          }
        }
        if (num < 0) {
          e.target.value = 0;
          _setQtd(id, 0);
        }
      }

      _updateCardVisual(id);
    });

    // Botões +/-
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.ck-btn-plus, .ck-btn-minus');
      if (!btn) return;
      const id = btn.dataset.id;
      const input = document.getElementById('ck-qty-' + id);
      if (!input) return;
      let val = parseFloat(input.value) || 0;
      const insumo = _getInsumoById(id);
      const conv = insumo ? DB.getConversao(insumo.nome) : null;
      const isKg = insumo && insumo.unidade === 'kg' && (!conv || conv.tipo !== 'peso');
      const step = isKg ? 0.5 : 1;

      if (btn.classList.contains('ck-btn-plus')) val += step;
      else val = Math.max(0, val - step);

      input.value = isKg ? val.toFixed(1) : val;
      _setQtd(id, input.value);
      _updateCardVisual(id);
    });

    // Observação
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.ck-btn-obs');
      if (!btn) return;
      const id = btn.dataset.id;
      const insumo = _getInsumoById(id);
      const atual = (_dados[id] || {}).obs || '';
      const obs = window.prompt('Observação para ' + (insumo ? insumo.nome : 'item') + ':', atual);
      if (obs === null) return;
      if (!_dados[id]) _dados[id] = {};
      _dados[id].obs = obs;
      _salvarRascunho();
      btn.textContent = obs.trim() ? '📝 Obs' : '+ Obs';
      if (obs.trim()) { btn.style.color = 'var(--brand-blue-dark)'; btn.style.fontWeight = '600'; }
      else { btn.style.color = ''; btn.style.fontWeight = ''; }
    });

    // Foto (câmera)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.ck-btn-foto');
      if (!btn) return;
      const id = btn.dataset.id;
      _tirarFoto(id, btn);
    });
  }

  function _tirarFoto(insumoId, btn) {
    // Mostrar menu de opções: câmera ou galeria
    let menu = document.getElementById('ck-foto-menu');
    if (menu) menu.remove();

    menu = document.createElement('div');
    menu.id = 'ck-foto-menu';
    menu.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:flex-end;justify-content:center;padding:1rem';
    menu.innerHTML =
      '<div style="background:#fff;border-radius:16px 16px 0 0;padding:1.5rem;width:100%;max-width:400px">' +
        '<p style="font-weight:700;font-size:1rem;margin-bottom:1rem;text-align:center">Adicionar Foto</p>' +
        '<button id="ck-foto-camera" style="width:100%;padding:0.875rem;font-size:0.9375rem;font-weight:600;background:var(--brand-blue);color:#fff;border:none;border-radius:10px;cursor:pointer;margin-bottom:0.625rem;display:flex;align-items:center;justify-content:center;gap:0.5rem">📸 Tirar Foto (Câmera)</button>' +
        '<button id="ck-foto-galeria" style="width:100%;padding:0.875rem;font-size:0.9375rem;font-weight:600;background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-light);border-radius:10px;cursor:pointer;margin-bottom:0.625rem;display:flex;align-items:center;justify-content:center;gap:0.5rem">🖼️ Escolher da Galeria</button>' +
        (_dados[insumoId] && _dados[insumoId].foto ? '<button id="ck-foto-remover" style="width:100%;padding:0.875rem;font-size:0.9375rem;font-weight:600;background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger);border-radius:10px;cursor:pointer;margin-bottom:0.625rem">🗑️ Remover Foto</button>' : '') +
        '<button id="ck-foto-cancelar" style="width:100%;padding:0.875rem;font-size:0.9375rem;color:var(--text-muted);background:none;border:none;cursor:pointer">Cancelar</button>' +
      '</div>';

    document.body.appendChild(menu);

    // Fechar ao clicar fora
    menu.addEventListener('click', (e) => {
      if (e.target === menu || e.target.id === 'ck-foto-cancelar') menu.remove();
    });

    // Câmera
    document.getElementById('ck-foto-camera').addEventListener('click', () => {
      menu.remove();
      _abrirInputFoto(insumoId, btn, true);
    });

    // Galeria
    document.getElementById('ck-foto-galeria').addEventListener('click', () => {
      menu.remove();
      _abrirInputFoto(insumoId, btn, false);
    });

    // Remover
    const btnRemover = document.getElementById('ck-foto-remover');
    if (btnRemover) {
      btnRemover.addEventListener('click', () => {
        menu.remove();
        if (_dados[insumoId]) _dados[insumoId].foto = null;
        _salvarRascunho();
        btn.innerHTML = '📷 Foto';
        btn.style.color = '';
        btn.style.fontWeight = '';
        App.toast('Foto removida', 'info', 2000);
      });
    }
  }

  function _abrirInputFoto(insumoId, btn, usarCamera) {
    const inputId = usarCamera ? 'ck-camera-input' : 'ck-galeria-input';
    let fileInput = document.getElementById(inputId);
    if (fileInput) fileInput.remove();

    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = inputId;
    fileInput.accept = 'image/*';
    if (usarCamera) fileInput.setAttribute('capture', 'environment');
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxW = 640;
          const scale = Math.min(1, maxW / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.5);

          if (!_dados[insumoId]) _dados[insumoId] = {};
          _dados[insumoId].foto = compressed;
          _salvarRascunho();

          btn.innerHTML = '📷 Foto ✓';
          btn.style.color = 'var(--success)';
          btn.style.fontWeight = '600';
          App.toast('Foto salva!', 'success', 2000);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    };

    fileInput.click();
  }

  function _setQtd(id, val) {
    if (!_dados[id]) _dados[id] = {};
    _dados[id].qtd = val;
    _salvarRascunho();
    _atualizarProgresso();
  }

  function _updateCardVisual(id) {
    const d = _dados[id] || {};
    const preenchido = d.qtd !== '' && d.qtd !== undefined;
    const card = document.getElementById('ck-card-' + id);
    const dot = document.getElementById('ck-dot-' + id);
    const input = document.getElementById('ck-qty-' + id);

    if (card) {
      if (preenchido) card.classList.add('ck-done');
      else card.classList.remove('ck-done');
    }
    if (dot) dot.style.background = preenchido ? 'var(--success)' : 'var(--border-medium)';
    if (input) input.style.borderColor = preenchido ? 'var(--success)' : 'var(--border-light)';
  }

  function _atualizarProgresso() {
    const total = _insumos.length;
    const preenchidos = _contarPreenchidos();
    const pct = total > 0 ? (preenchidos / total * 100) : 0;

    const bar = document.getElementById('ck-progress-bar');
    const badge = document.getElementById('ck-progress-badge');
    const msg = document.getElementById('ck-status-msg');

    if (bar) bar.style.width = pct + '%';
    if (badge) {
      badge.textContent = preenchidos + ' de ' + total;
      badge.className = 'badge ' + (preenchidos === total ? 'badge-success' : 'badge-warning');
    }
    if (msg) msg.textContent = _statusMsg(preenchidos, total);

    // Atualizar badges das categorias
    document.querySelectorAll('.ck-cat-header').forEach(header => {
      const cat = header.dataset.cat;
      const itens = _insumos.filter(i => i.categoria === cat);
      const catPreen = itens.filter(i => _dados[i.id] && _dados[i.id].qtd !== '' && _dados[i.id].qtd !== undefined).length;
      const badgeEl = header.querySelector('.badge');
      if (badgeEl) {
        badgeEl.textContent = catPreen + '/' + itens.length;
        badgeEl.className = 'badge ' + (catPreen === itens.length ? 'badge-success' : 'badge-neutral');
      }
    });
  }

  function _contarPreenchidos() {
    return _insumos.filter(i => _dados[i.id] && _dados[i.id].qtd !== '' && _dados[i.id].qtd !== undefined).length;
  }

  function _statusMsg(p, t) {
    if (p === 0) return 'Nenhum item preenchido ainda. Toque no campo para começar.';
    if (p === t) return 'Todos os itens preenchidos! Você pode finalizar o checklist.';
    return 'Continue preenchendo — faltam ' + (t - p) + ' itens.';
  }

  function _getCategorias() {
    const cats = [];
    _insumos.forEach(i => {
      if (!cats.includes(i.categoria)) cats.push(i.categoria);
    });
    // Ordenar por prioridade lógica
    const ordem = ['Pães', 'Proteínas', 'Frios', 'Queijos e Frios', 'Molhos e Temperos', 'Hortifruti', 'Bebidas', 'Frutas e Polpas', 'Sorvetes e Coberturas', 'Descartáveis', 'Embalagens', 'Limpeza', 'Outros'];
    cats.sort((a, b) => {
      const ia = ordem.indexOf(a);
      const ib = ordem.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return cats;
  }

  function _catIcon(cat) {
    const icons = {
      'Pães': '🍞', 'Proteínas': '🥩', 'Frios': '🥓', 'Queijos e Frios': '🧀',
      'Molhos e Temperos': '🫙', 'Hortifruti': '🥬',
      'Bebidas': '🥤', 'Frutas e Polpas': '🍓', 'Sorvetes e Coberturas': '🍦',
      'Descartáveis': '🥤', 'Embalagens': '📦', 'Limpeza': '🧹', 'Outros': '📋'
    };
    return icons[cat] || '📋';
  }

  function _unidadeLabel(un) {
    const labels = { kg: 'Quilos (kg)', un: 'Unidades', litro: 'Litros (L)', g: 'Gramas (g)' };
    return labels[un] || un;
  }

  function _getInsumoById(id) {
    return _insumos.find(i => i.id === id) || null;
  }

  // --- Rascunho (salva automaticamente no sessionStorage) ---

  function _hojeLocal() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function _salvarRascunho() {
    sessionStorage.setItem('rei_ck_rascunho', JSON.stringify({ data: _hojeLocal(), dados: _dados }));
  }

  function _carregarRascunho() {
    try {
      const raw = sessionStorage.getItem('rei_ck_rascunho');
      if (!raw) { _dados = {}; return; }
      const rascunho = JSON.parse(raw);
      if (rascunho.data === _hojeLocal()) {
        _dados = rascunho.dados || {};
      } else {
        _dados = {};
        sessionStorage.removeItem('rei_ck_rascunho');
      }
    } catch {
      _dados = {};
    }
  }

  // --- Finalizar ---

  function finalizar() {
    const total = _insumos.length;
    const preenchidos = _contarPreenchidos();

    // Alertar campos vazios
    if (preenchidos < total) {
      const faltam = total - preenchidos;
      const vazios = _insumos.filter(i => !_dados[i.id] || _dados[i.id].qtd === '' || _dados[i.id].qtd === undefined);
      const nomesVazios = vazios.slice(0, 5).map(i => i.nome).join(', ');
      const msgExtra = vazios.length > 5 ? ' e mais ' + (vazios.length - 5) + ' itens' : '';

      if (!window.confirm('Ainda faltam ' + faltam + ' itens:\n' + nomesVazios + msgExtra + '\n\nDeseja finalizar mesmo assim?')) {
        return;
      }
    }

    if (!window.confirm('Confirma o envio do checklist? Após enviar, não poderá ser editado.')) {
      return;
    }

    const session = DB.getSession();
    // Usar data local (não UTC) para evitar atrasar 1 dia em fuso negativo
    const agora = new Date();
    const hoje = agora.getFullYear() + '-' + String(agora.getMonth() + 1).padStart(2, '0') + '-' + String(agora.getDate()).padStart(2, '0');

    // Montar itens do checklist (aplicar conversão de pacote/peso)
    const itens = _insumos.map(insumo => {
      const d = _dados[insumo.id] || {};
      const qtdContada = d.qtd !== undefined && d.qtd !== '' ? parseFloat(d.qtd) : null;
      const conv = DB.getConversao(insumo.nome);
      // quantidadeContada = o que o funcionário digitou (pacotes/unidades)
      // quantidade = valor real convertido (pães individuais ou kg)
      const qtdReal = qtdContada !== null && conv ? qtdContada * conv.fator : qtdContada;
      return {
        insumoId: insumo.id,
        insumoNome: insumo.nome,
        categoria: insumo.categoria,
        unidade: insumo.unidade,
        quantidadeContada: qtdContada,
        quantidade: qtdReal,
        fatorConversao: conv ? conv.fator : 1,
        observacao: d.obs || null,
        temFoto: !!d.foto
      };
    });

    // Salvar fotos separadamente para não pesar o checklist
    const fotos = {};
    Object.keys(_dados).forEach(id => {
      if (_dados[id].foto) fotos[id] = _dados[id].foto;
    });

    const checklist = DB.insert(DB.COLLECTIONS.checklists, {
      data: hoje,
      usuarioId: session.usuarioId,
      usuarioNome: session.nome,
      funcionarioId: session.usuarioId,
      funcionarioNome: session.nome,
      horarioInicio: sessionStorage.getItem('rei_ck_inicio') || new Date().toISOString(),
      horarioFim: new Date().toISOString(),
      totalItens: total,
      itensPreenchidos: preenchidos,
      itens: itens,
      status: 'finalizado'
    });

    // Salvar fotos vinculadas ao checklist
    if (Object.keys(fotos).length > 0) {
      try {
        localStorage.setItem('rei_ck_fotos_' + checklist.id, JSON.stringify(fotos));
      } catch {
        // Se não couber, ignorar fotos
      }
    }

    DB.addLog({
      acao: 'FINALIZAR_CHECKLIST',
      entidade: 'checklist',
      entidadeId: checklist.id,
      detalhes: session.nome + ' finalizou checklist — ' + preenchidos + '/' + total + ' itens — ' + hoje
    });

    // Limpar rascunho
    sessionStorage.removeItem('rei_ck_rascunho');
    sessionStorage.removeItem('rei_ck_inicio');
    _dados = {};

    App.toast('Checklist finalizado e enviado!', 'success', 5000);

    // Mostrar tela de conclusão
    document.getElementById('page-content').innerHTML =
      '<div class="card" style="text-align:center;padding:3rem 1.5rem">' +
      '<div style="font-size:4rem;margin-bottom:1rem">✅</div>' +
      '<h3 class="font-bold" style="font-size:1.25rem;margin-bottom:0.5rem">Checklist Enviado!</h3>' +
      '<p class="text-muted" style="margin-bottom:0.25rem">' + preenchidos + ' de ' + total + ' itens preenchidos</p>' +
      '<p class="text-muted text-sm">Enviado por ' + App.escapeHtml(session.nome) + ' em ' + App.formatDate(new Date().toISOString()) + '</p>' +
      '<button class="btn btn-primary mt-6" onclick="Checklist.render()">Iniciar Novo Checklist</button>' +
      '</div>';
  }

  function limpar() {
    if (!window.confirm('Limpar todos os campos preenchidos?')) return;
    _dados = {};
    sessionStorage.removeItem('rei_ck_rascunho');
    render();
    App.toast('Campos limpos', 'info', 2000);
  }

  // --- Editar checklist existente ---

  function editarChecklist(checklistId) {
    const ck = DB.getById(DB.COLLECTIONS.checklists, checklistId);
    if (!ck) { App.toast('Checklist não encontrado', 'error'); return; }

    // Carregar dados do checklist nos campos
    _dados = {};
    _checklistId = checklistId;
    _editando = true;

    // Carregar fotos
    let fotosData = null;
    try { fotosData = JSON.parse(localStorage.getItem('rei_ck_fotos_' + checklistId)); } catch (e) {}

    (ck.itens || []).forEach(item => {
      if (item.quantidade !== null && item.quantidade !== undefined) {
        // Usar quantidadeContada se disponível (valor original antes da conversão)
        const qtdOriginal = item.quantidadeContada !== null && item.quantidadeContada !== undefined
          ? item.quantidadeContada : item.quantidade;
        _dados[item.insumoId] = {
          qtd: qtdOriginal,
          obs: item.observacao || '',
          foto: (fotosData && fotosData[item.insumoId]) || null
        };
      }
    });

    render();
    App.toast('Checklist carregado para edição', 'info', 3000);
  }

  function salvarEdicao() {
    if (!_checklistId) return;

    const session = DB.getSession();
    const total = _insumos.length;
    const preenchidos = _contarPreenchidos();

    if (!window.confirm('Salvar as alterações no checklist?')) return;

    // Montar itens atualizados (mesma lógica do finalizar)
    const itens = _insumos.map(insumo => {
      const d = _dados[insumo.id] || {};
      const qtdContada = d.qtd !== undefined && d.qtd !== '' ? parseFloat(d.qtd) : null;
      const conv = DB.getConversao(insumo.nome);
      const qtdReal = qtdContada !== null && conv ? qtdContada * conv.fator : qtdContada;
      return {
        insumoId: insumo.id,
        insumoNome: insumo.nome,
        categoria: insumo.categoria,
        unidade: insumo.unidade,
        quantidadeContada: qtdContada,
        quantidade: qtdReal,
        fatorConversao: conv ? conv.fator : 1,
        observacao: d.obs || null,
        temFoto: !!d.foto
      };
    });

    // Salvar fotos
    const fotos = {};
    Object.keys(_dados).forEach(id => {
      if (_dados[id].foto) fotos[id] = _dados[id].foto;
    });

    // Atualizar o checklist existente
    DB.update(DB.COLLECTIONS.checklists, _checklistId, {
      totalItens: total,
      itensPreenchidos: preenchidos,
      itens: itens,
      editadoEm: new Date().toISOString(),
      editadoPor: session.nome
    });

    // Atualizar fotos
    if (Object.keys(fotos).length > 0) {
      try { localStorage.setItem('rei_ck_fotos_' + _checklistId, JSON.stringify(fotos)); } catch (e) {}
    }

    DB.addLog({
      acao: 'EDITAR_CHECKLIST',
      entidade: 'checklist',
      entidadeId: _checklistId,
      detalhes: session.nome + ' editou checklist — ' + preenchidos + '/' + total + ' itens'
    });

    // Limpar estado de edição
    _checklistId = null;
    _editando = false;
    _dados = {};
    sessionStorage.removeItem('rei_ck_rascunho');

    App.toast('Checklist atualizado com sucesso!', 'success', 4000);

    // Voltar para tela de conclusão
    document.getElementById('page-content').innerHTML =
      '<div class="card" style="text-align:center;padding:3rem 1.5rem">' +
      '<div style="font-size:4rem;margin-bottom:1rem">✅</div>' +
      '<h3 class="font-bold" style="font-size:1.25rem;margin-bottom:0.5rem">Checklist Atualizado!</h3>' +
      '<p class="text-muted">' + preenchidos + ' de ' + total + ' itens</p>' +
      '<p class="text-muted text-sm">Editado por ' + App.escapeHtml(session.nome) + '</p>' +
      '<button class="btn btn-primary mt-6" onclick="Checklist.render()">Voltar</button>' +
      '</div>';
  }

  function cancelarEdicao() {
    _checklistId = null;
    _editando = false;
    _dados = {};
    sessionStorage.removeItem('rei_ck_rascunho');
    render();
    App.toast('Edição cancelada', 'info', 2000);
  }

  // Init — chamado uma vez
  function init() {
    _bindEvents();
    // Registrar horário de início
    if (!sessionStorage.getItem('rei_ck_inicio')) {
      sessionStorage.setItem('rei_ck_inicio', new Date().toISOString());
    }
  }

  return {
    render,
    finalizar,
    limpar,
    editarChecklist,
    salvarEdicao,
    cancelarEdicao,
    init
  };
})();
