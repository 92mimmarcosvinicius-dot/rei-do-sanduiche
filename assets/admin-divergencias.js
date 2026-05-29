/* ============================================
   REI DO SANDUÍCHE — Admin: Painel de Divergências
   ============================================ */

const AdminDivergencias = (() => {

  let _resultado = null;
  let _filtros = { severidade: '', tipo: '', busca: '' };

  function render() {
    const datas = MotorDivergencias.getDatasComChecklist();

    let html = '';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem">';
    html += '<div class="flex items-center gap-4">';
    html += '<span class="font-bold" style="font-size:1.125rem">Análise de Divergências</span>';
    html += '</div>';
    html += '<div class="flex items-center gap-2">';
    html += '<select class="form-input" id="div-data" style="width:auto;padding:0.5rem;font-size:0.8125rem">';
    if (!datas.length) {
      html += '<option value="">Nenhum checklist</option>';
    } else {
      datas.forEach((d, i) => { html += '<option value="' + d + '"' + (i === 0 ? ' selected' : '') + '>' + App.formatDateShort(d) + '</option>'; });
    }
    html += '</select>';
    html += '<button class="btn btn-primary btn-sm" id="btn-calcular-div">Calcular</button>';
    html += '<button class="btn btn-secondary btn-sm" onclick="AdminDivergencias.verPadroes()">Padrões</button>';
    html += '</div></div>';

    // Área de resultado
    html += '<div id="div-resultado">';
    if (!datas.length) {
      html += '<div class="card"><div class="empty-state"><div class="empty-state-icon">📊</div>';
      html += '<p class="empty-state-title">Nenhum checklist encontrado</p>';
      html += '<p class="empty-state-text">As divergências são calculadas cruzando checklists, compras e vendas. Quando uma funcionária finalizar o checklist diário, os dados aparecerão aqui.</p>';
      html += '</div></div>';
    } else {
      html += '<div class="card"><div class="empty-state" style="padding:2rem"><p class="empty-state-text">Selecione uma data e clique em <strong>Calcular</strong></p></div></div>';
    }
    html += '</div>';

    // Histórico salvo
    const divSalvas = DB.getAll(DB.COLLECTIONS.divergencias);
    if (divSalvas.length > 0) {
      html += '<div class="card mt-4" style="padding:0">';
      html += '<div class="card-header"><h3 class="card-title">Histórico de Divergências Salvas</h3></div>';
      html += _renderHistoricoSalvo(divSalvas);
      html += '</div>';
    }

    document.getElementById('page-content').innerHTML = html;

    // Bind
    const btnCalc = document.getElementById('btn-calcular-div');
    if (btnCalc) btnCalc.onclick = () => _executarCalculo();
  }

  function _executarCalculo() {
    const selData = document.getElementById('div-data');
    if (!selData || !selData.value) return;

    const data = selData.value;
    _resultado = MotorDivergencias.calcularParaData(data);

    if (_resultado.erro) {
      document.getElementById('div-resultado').innerHTML =
        '<div class="card" style="padding:1.5rem;border-left:3px solid var(--danger)">' +
        '<p class="font-medium">' + App.escapeHtml(_resultado.erro) + '</p></div>';
      return;
    }

    _renderResultado();
  }

  function _renderResultado() {
    const r = _resultado;
    const res = r.resumo;
    let html = '';

    // Info do checklist
    html += '<div class="card mb-4" style="padding:1rem;display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center;font-size:0.8125rem">';
    html += '<div><span class="text-muted">Data:</span> <strong>' + App.formatDateShort(r.data) + '</strong></div>';
    html += '<div><span class="text-muted">Funcionário(a):</span> <strong>' + App.escapeHtml(r.checklist.funcionario) + '</strong></div>';
    html += '<div><span class="text-muted">Horário:</span> <strong>' + (r.checklist.horario ? App.formatDate(r.checklist.horario).split(' ')[1] : '-') + '</strong></div>';
    if (r.checklistAnterior) {
      html += '<div><span class="text-muted">Ref. anterior:</span> ' + App.formatDateShort(r.checklistAnterior.data) + ' (' + App.escapeHtml(r.checklistAnterior.funcionario) + ')</div>';
    }
    html += '</div>';

    // Cards resumo
    html += '<div class="stat-grid mb-4">';
    html += '<div class="stat-card"><div class="stat-icon red">🔴</div><div><div class="stat-value">' + res.vermelhos + '</div><div class="stat-label">Críticas</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon yellow">🟡</div><div><div class="stat-value">' + res.amarelos + '</div><div class="stat-label">Alerta</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon green">🟢</div><div><div class="stat-value">' + res.verdes + '</div><div class="stat-label">Aceitável</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon blue">📊</div><div><div class="stat-value">' + res.total + '</div><div class="stat-label">Itens analisados</div></div></div>';
    html += '</div>';

    // Alertas críticos
    if (res.vermelhos > 0) {
      html += '<div class="card mb-4" style="padding:1rem;border-left:4px solid var(--danger);background:rgba(239,83,80,0.05)">';
      html += '<p class="font-bold" style="color:var(--danger);margin-bottom:0.5rem">⚠️ ' + res.vermelhos + ' divergência(s) crítica(s) detectada(s)</p>';
      const tops = r.divergencias.filter(d => d.severidade === 'vermelho').slice(0, 3);
      tops.forEach(d => {
        html += '<p class="text-sm" style="margin-bottom:0.25rem">• <strong>' + App.escapeHtml(d.insumoNome) + '</strong>: esperado ' + d.estoqueEsperado + ' ' + d.unidade + ', real ' + d.estoqueReal + ' ' + d.unidade + ' → <span style="color:var(--danger)">' + (d.divergenciaAbs > 0 ? '+' : '') + d.divergenciaAbs + ' (' + d.divergenciaPct.toFixed(1) + '%)</span></p>';
      });
      html += '</div>';
    }

    // Filtros
    html += '<div class="card mb-4" style="padding:0.75rem 1rem;display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center">';
    html += '<input class="form-input" type="text" id="div-busca" placeholder="Buscar insumo..." style="flex:1;min-width:180px;border:none;background:transparent;padding:0">';
    html += '<select class="form-input" id="div-filtro-sev" style="width:auto;padding:0.5rem;font-size:0.8125rem"><option value="">Todas severidades</option><option value="vermelho">Vermelho</option><option value="amarelo">Amarelo</option><option value="verde">Verde</option></select>';
    html += '<select class="form-input" id="div-filtro-tipo" style="width:auto;padding:0.5rem;font-size:0.8125rem"><option value="">Todos tipos</option><option value="FALTA">Falta</option><option value="SOBRA">Sobra</option><option value="OK">OK</option></select>';
    html += '<button class="btn btn-primary btn-sm" id="btn-salvar-divs" title="Salvar para histórico">Salvar</button>';
    html += '</div>';

    // Tabela
    html += '<div class="card" style="padding:0"><div class="table-container" id="div-tabela">';
    html += _renderTabelaDivergencias(r.divergencias);
    html += '</div></div>';

    document.getElementById('div-resultado').innerHTML = html;

    // Bind filtros
    const busca = document.getElementById('div-busca');
    const filtroSev = document.getElementById('div-filtro-sev');
    const filtroTipo = document.getElementById('div-filtro-tipo');
    const filtrar = App.debounce(() => {
      const t = busca.value.toLowerCase().trim();
      const s = filtroSev.value;
      const tp = filtroTipo.value;
      const filtrados = r.divergencias.filter(d => {
        if (s && d.severidade !== s) return false;
        if (tp && d.tipo !== tp) return false;
        if (t && !d.insumoNome.toLowerCase().includes(t) && !d.categoria.toLowerCase().includes(t)) return false;
        return true;
      });
      document.getElementById('div-tabela').innerHTML = _renderTabelaDivergencias(filtrados);
    }, 200);
    busca.addEventListener('input', filtrar);
    filtroSev.addEventListener('change', filtrar);
    filtroTipo.addEventListener('change', filtrar);

    // Salvar
    document.getElementById('btn-salvar-divs').onclick = () => {
      const n = MotorDivergencias.salvarDivergencias(r);
      App.toast(n + ' divergências salvas no histórico!', 'success');
    };
  }

  function _renderTabelaDivergencias(divs) {
    if (!divs.length) return '<div class="empty-state" style="padding:2rem"><p class="empty-state-title">Nenhuma divergência encontrada</p></div>';

    let html = '<table class="table"><thead><tr>';
    html += '<th></th><th>Insumo</th><th style="text-align:right">Anterior</th><th style="text-align:right">Compras</th>';
    html += '<th style="text-align:right">Consumo</th><th style="text-align:right">Esperado</th>';
    html += '<th style="text-align:right">Real</th><th style="text-align:right">Diverg.</th><th>%</th><th></th>';
    html += '</tr></thead><tbody>';

    divs.forEach(d => {
      const sevColor = d.severidade === 'vermelho' ? 'var(--danger)' : d.severidade === 'amarelo' ? 'var(--warning)' : 'var(--success)';
      const sevBg = d.severidade === 'vermelho' ? 'rgba(239,83,80,0.08)' : d.severidade === 'amarelo' ? 'rgba(255,193,7,0.08)' : '';
      const rowStyle = sevBg ? ' style="background:' + sevBg + '"' : '';

      html += '<tr' + rowStyle + '>';
      html += '<td style="width:12px;padding-right:0"><div style="width:10px;height:10px;border-radius:50%;background:' + sevColor + '"></div></td>';
      html += '<td><div class="font-medium text-sm">' + App.escapeHtml(d.insumoNome) + '</div><div class="text-xs text-muted">' + App.escapeHtml(d.categoria) + '</div></td>';
      html += '<td class="text-sm" style="text-align:right">' + (d.estoqueAnterior !== null ? d.estoqueAnterior : '—') + '</td>';
      html += '<td class="text-sm" style="text-align:right;color:var(--success)">' + (d.compras > 0 ? '+' + d.compras : '—') + '</td>';
      html += '<td class="text-sm" style="text-align:right;color:var(--danger)">' + (d.consumoTeorico > 0 ? '-' + d.consumoTeorico : '—') + '</td>';
      html += '<td class="text-sm font-medium" style="text-align:right">' + (d.estoqueEsperado !== null ? d.estoqueEsperado : '—') + '</td>';
      html += '<td class="text-sm font-bold" style="text-align:right">' + d.estoqueReal + '</td>';

      // Divergência
      const divSign = d.divergenciaAbs > 0 ? '+' : '';
      const divColor = d.tipo === 'FALTA' ? 'var(--danger)' : d.tipo === 'SOBRA' ? 'var(--warning)' : 'var(--success)';
      html += '<td class="text-sm font-bold" style="text-align:right;color:' + divColor + '">' + divSign + d.divergenciaAbs + ' ' + d.unidade + '</td>';

      // % badge
      const badgeCls = d.severidade === 'vermelho' ? 'badge-danger' : d.severidade === 'amarelo' ? 'badge-warning' : 'badge-success';
      html += '<td><span class="badge ' + badgeCls + '" style="font-size:0.6875rem">' + Math.abs(d.divergenciaPct).toFixed(1) + '%</span></td>';

      // Ações
      html += '<td><button class="btn btn-ghost btn-sm" onclick="AdminDivergencias.verDetalhe(\'' + d.insumoId + '\')" title="Detalhe"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></button></td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  function verDetalhe(insumoId) {
    if (!_resultado) return;
    const d = _resultado.divergencias.find(x => x.insumoId === insumoId);
    if (!d) return;

    let html = '<div class="modal-overlay active" id="modal-div-detalhe"><div class="modal" style="max-width:600px;max-height:90vh;display:flex;flex-direction:column">';
    html += '<div class="modal-header"><h3>' + App.escapeHtml(d.insumoNome) + '</h3><button class="modal-close">&times;</button></div>';
    html += '<div class="modal-body" style="overflow-y:auto;flex:1">';

    // Severidade visual
    const sevLabel = d.severidade === 'vermelho' ? 'CRÍTICA' : d.severidade === 'amarelo' ? 'ALERTA' : 'ACEITÁVEL';
    const sevCls = d.severidade === 'vermelho' ? 'badge-danger' : d.severidade === 'amarelo' ? 'badge-warning' : 'badge-success';
    html += '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem">';
    html += '<span class="badge ' + sevCls + '">' + sevLabel + '</span>';
    html += '<span class="badge badge-neutral">' + App.escapeHtml(d.categoria) + '</span>';
    html += '<span class="badge badge-neutral">' + d.tipo + '</span>';
    html += '</div>';

    // Cálculo passo a passo
    html += '<div style="background:var(--bg-secondary);border-radius:var(--radius);padding:1rem;margin-bottom:1rem;font-size:0.875rem">';
    html += '<p class="font-bold mb-2">Cálculo do estoque esperado:</p>';
    html += '<table style="width:100%;border-collapse:collapse">';
    html += '<tr><td class="text-muted" style="padding:0.25rem 0">Estoque anterior (checklist)</td><td style="text-align:right;font-weight:600;padding:0.25rem 0">' + (d.estoqueAnterior !== null ? d.estoqueAnterior + ' ' + d.unidade : 'sem registro') + '</td></tr>';
    html += '<tr><td class="text-muted" style="padding:0.25rem 0">+ Compras no período</td><td style="text-align:right;font-weight:600;color:var(--success);padding:0.25rem 0">+' + d.compras + ' ' + d.unidade + '</td></tr>';
    html += '<tr><td class="text-muted" style="padding:0.25rem 0">- Consumo teórico (vendas)</td><td style="text-align:right;font-weight:600;color:var(--danger);padding:0.25rem 0">-' + d.consumoTeorico + ' ' + d.unidade + '</td></tr>';
    html += '<tr style="border-top:2px solid var(--border)"><td class="font-bold" style="padding:0.5rem 0">= Estoque esperado</td><td style="text-align:right;font-weight:800;font-size:1rem;padding:0.5rem 0">' + (d.estoqueEsperado !== null ? d.estoqueEsperado + ' ' + d.unidade : '—') + '</td></tr>';
    html += '</table>';
    html += '</div>';

    // Comparação
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">';
    html += '<div class="card" style="text-align:center;padding:1rem"><p class="text-xs text-muted">Esperado</p><p class="font-bold" style="font-size:1.5rem">' + (d.estoqueEsperado !== null ? d.estoqueEsperado : '—') + '</p><p class="text-xs">' + d.unidade + '</p></div>';
    html += '<div class="card" style="text-align:center;padding:1rem"><p class="text-xs text-muted">Real (contagem)</p><p class="font-bold" style="font-size:1.5rem;color:' + (d.tipo === 'OK' ? 'var(--success)' : 'var(--danger)') + '">' + d.estoqueReal + '</p><p class="text-xs">' + d.unidade + '</p></div>';
    html += '</div>';

    // Divergência
    html += '<div class="card mb-4" style="text-align:center;padding:1rem;border-left:4px solid ' + (d.severidade === 'vermelho' ? 'var(--danger)' : d.severidade === 'amarelo' ? 'var(--warning)' : 'var(--success)') + '">';
    html += '<p class="text-xs text-muted">Divergência</p>';
    html += '<p class="font-bold" style="font-size:1.75rem;color:' + (d.tipo === 'FALTA' ? 'var(--danger)' : d.tipo === 'SOBRA' ? 'var(--warning)' : 'var(--success)') + '">' + (d.divergenciaAbs > 0 ? '+' : '') + d.divergenciaAbs + ' ' + d.unidade + ' (' + d.divergenciaPct.toFixed(1) + '%)</p>';
    html += '<p class="text-xs text-muted">Tolerância: verde até ' + d.tolerancia.verde + '%, amarelo até ' + d.tolerancia.amarelo + '%</p>';
    html += '</div>';

    // Detalhes do consumo teórico
    if (d.consumoDetalhes && d.consumoDetalhes.length > 0) {
      html += '<div style="margin-bottom:1rem"><p class="font-bold text-sm mb-2">Consumo teórico detalhado:</p>';
      html += '<div class="table-container"><table class="table"><thead><tr><th>Produto vendido</th><th style="text-align:right">Qtd vend.</th><th style="text-align:right">Consumo/un</th><th style="text-align:right">Total</th></tr></thead><tbody>';
      d.consumoDetalhes.forEach(det => {
        html += '<tr><td class="text-sm">' + App.escapeHtml(det.produto) + '</td>';
        html += '<td class="text-sm" style="text-align:right">' + det.qtdVendida + '</td>';
        html += '<td class="text-sm" style="text-align:right">' + det.consumoPorUnidade + ' ' + d.unidade + '</td>';
        html += '<td class="text-sm font-medium" style="text-align:right">' + det.consumoTotal.toFixed(2) + ' ' + d.unidade + '</td></tr>';
      });
      html += '</tbody></table></div></div>';
    }

    // Observação da funcionária
    if (d.observacao) {
      html += '<div class="card" style="padding:0.75rem;border-left:3px solid var(--info)">';
      html += '<p class="text-xs text-muted">Observação da funcionária:</p>';
      html += '<p class="text-sm font-medium">' + App.escapeHtml(d.observacao) + '</p>';
      html += '</div>';
    }

    // Metadados
    html += '<div class="text-xs text-muted mt-4" style="display:flex;gap:1rem;flex-wrap:wrap">';
    html += '<span>Funcionário: ' + App.escapeHtml(d.funcionarioNome) + '</span>';
    html += '<span>Método: ' + d.metodoCalculo + '</span>';
    if (d.horario) html += '<span>Horário: ' + App.formatDate(d.horario).split(' ')[1] + '</span>';
    html += '</div>';

    // Histórico do insumo
    const historico = MotorDivergencias.getHistoricoPorInsumo(insumoId).slice(0, 10);
    if (historico.length > 0) {
      html += '<div style="margin-top:1.5rem"><p class="font-bold text-sm mb-2">Histórico deste insumo (últimos 10):</p>';
      html += '<div class="table-container"><table class="table"><thead><tr><th>Data</th><th>Func.</th><th style="text-align:right">Esperado</th><th style="text-align:right">Real</th><th style="text-align:right">Diverg.</th><th></th></tr></thead><tbody>';
      historico.forEach(h => {
        const sc = h.severidade === 'vermelho' ? 'badge-danger' : h.severidade === 'amarelo' ? 'badge-warning' : 'badge-success';
        html += '<tr><td class="text-xs">' + App.formatDateShort(h.data) + '</td>';
        html += '<td class="text-xs">' + App.escapeHtml(h.funcionarioNome) + '</td>';
        html += '<td class="text-xs" style="text-align:right">' + (h.estoqueEsperado !== null ? h.estoqueEsperado : '—') + '</td>';
        html += '<td class="text-xs" style="text-align:right">' + h.estoqueReal + '</td>';
        html += '<td class="text-xs" style="text-align:right">' + (h.divergenciaAbs > 0 ? '+' : '') + h.divergenciaAbs + '</td>';
        html += '<td><span class="badge ' + sc + '" style="font-size:0.625rem">' + Math.abs(h.divergenciaPct).toFixed(0) + '%</span></td></tr>';
      });
      html += '</tbody></table></div></div>';
    }

    html += '</div>';
    html += '<div class="modal-footer"><button class="btn btn-secondary modal-close">Fechar</button></div>';
    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    App.initModals();
  }

  function verPadroes() {
    const porFunc = MotorDivergencias.getPadraoPorFuncionario();
    const topPerdas = MotorDivergencias.getTopPerdas(10);

    let html = '<div class="modal-overlay active" id="modal-padroes"><div class="modal" style="max-width:700px;max-height:90vh;display:flex;flex-direction:column">';
    html += '<div class="modal-header"><h3>Padrões de Divergência</h3><button class="modal-close">&times;</button></div>';
    html += '<div class="modal-body" style="overflow-y:auto;flex:1">';

    // Por funcionário
    html += '<p class="font-bold mb-2">Divergências por funcionário(a)</p>';
    if (porFunc.length === 0) {
      html += '<p class="text-sm text-muted mb-4">Nenhum dado no histórico ainda.</p>';
    } else {
      html += '<div class="table-container mb-4"><table class="table"><thead><tr><th>Funcionário</th><th style="text-align:right">Total</th><th style="text-align:right">Críticas</th><th style="text-align:right">Alertas</th><th style="text-align:right">Média %</th><th style="text-align:right">Faltas</th><th style="text-align:right">Sobras</th></tr></thead><tbody>';
      porFunc.forEach(f => {
        const destaque = f.vermelhos > 0 ? ' style="background:rgba(239,83,80,0.06)"' : '';
        html += '<tr' + destaque + '>';
        html += '<td class="font-medium text-sm">' + App.escapeHtml(f.nome) + '</td>';
        html += '<td class="text-sm" style="text-align:right">' + f.total + '</td>';
        html += '<td style="text-align:right"><span class="badge badge-danger" style="font-size:0.6875rem">' + f.vermelhos + '</span></td>';
        html += '<td style="text-align:right"><span class="badge badge-warning" style="font-size:0.6875rem">' + f.amarelos + '</span></td>';
        html += '<td class="text-sm font-medium" style="text-align:right">' + f.mediaPct.toFixed(1) + '%</td>';
        html += '<td class="text-sm" style="text-align:right">' + f.faltas + '</td>';
        html += '<td class="text-sm" style="text-align:right">' + f.sobras + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    }

    // Top perdas acumuladas
    html += '<p class="font-bold mb-2">Insumos com maior perda acumulada</p>';
    if (topPerdas.length === 0) {
      html += '<p class="text-sm text-muted">Nenhuma perda registrada ainda.</p>';
    } else {
      html += '<div class="table-container"><table class="table"><thead><tr><th>Insumo</th><th style="text-align:right">Perda total</th><th style="text-align:right">Ocorrências</th><th style="text-align:right">Críticas</th></tr></thead><tbody>';
      topPerdas.forEach(p => {
        html += '<tr>';
        html += '<td class="font-medium text-sm">' + App.escapeHtml(p.insumoNome) + '</td>';
        html += '<td class="text-sm font-bold" style="text-align:right;color:var(--danger)">' + p.totalPerda + ' ' + p.unidade + '</td>';
        html += '<td class="text-sm" style="text-align:right">' + p.ocorrencias + 'x</td>';
        html += '<td style="text-align:right"><span class="badge badge-danger" style="font-size:0.6875rem">' + p.vermelhos + '</span></td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    }

    html += '</div>';
    html += '<div class="modal-footer"><button class="btn btn-secondary modal-close">Fechar</button></div>';
    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    App.initModals();
  }

  function _renderHistoricoSalvo(divs) {
    const porData = {};
    divs.forEach(d => {
      if (!porData[d.data]) porData[d.data] = { vermelhos: 0, amarelos: 0, verdes: 0, total: 0, funcionario: d.funcionarioNome };
      porData[d.data].total++;
      if (d.severidade === 'vermelho') porData[d.data].vermelhos++;
      else if (d.severidade === 'amarelo') porData[d.data].amarelos++;
      else porData[d.data].verdes++;
    });

    const datas = Object.keys(porData).sort((a, b) => b.localeCompare(a));

    let html = '<div class="table-container"><table class="table"><thead><tr><th>Data</th><th>Funcionário</th><th style="text-align:right">Total</th><th style="text-align:right">Críticas</th><th style="text-align:right">Alertas</th><th style="text-align:right">OK</th></tr></thead><tbody>';
    datas.forEach(data => {
      const r = porData[data];
      html += '<tr>';
      html += '<td class="text-sm font-medium">' + App.formatDateShort(data) + '</td>';
      html += '<td class="text-sm">' + App.escapeHtml(r.funcionario) + '</td>';
      html += '<td class="text-sm" style="text-align:right">' + r.total + '</td>';
      html += '<td style="text-align:right"><span class="badge badge-danger" style="font-size:0.6875rem">' + r.vermelhos + '</span></td>';
      html += '<td style="text-align:right"><span class="badge badge-warning" style="font-size:0.6875rem">' + r.amarelos + '</span></td>';
      html += '<td style="text-align:right"><span class="badge badge-success" style="font-size:0.6875rem">' + r.verdes + '</span></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  return { render, verDetalhe, verPadroes };
})();
