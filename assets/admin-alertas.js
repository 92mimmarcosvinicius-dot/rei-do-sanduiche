/* ============================================
   REI DO SANDUÍCHE — Alertas Automáticos
   ============================================
   Estoque baixo, previsão de ruptura, sugestão
   de compra, comportamento suspeito, tendências
   ============================================ */

const AdminAlertas = (() => {

  function _hoje() { return new Date().toISOString().slice(0, 10); }
  function _diasAtras(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

  function _consumoMedioDiario(insumoId) {
    const divergencias = DB.getAll(DB.COLLECTIONS.divergencias);
    const de = _diasAtras(30);
    const ate = _hoje();
    const divs = divergencias.filter(d =>
      d.insumoId === insumoId && d.data && d.data.slice(0, 10) >= de && d.data.slice(0, 10) <= ate && d.consumoTeorico
    );
    if (divs.length === 0) return 0;
    const total = divs.reduce((s, d) => s + Math.abs(d.consumoTeorico || 0), 0);
    return total / divs.length;
  }

  function gerarAlertas() {
    const insumos = DB.getAll(DB.COLLECTIONS.insumos).filter(i => i.ativo);
    const divergencias = DB.getAll(DB.COLLECTIONS.divergencias);
    const checklists = DB.getAll(DB.COLLECTIONS.checklists);
    const alertas = [];

    insumos.forEach(ins => {
      const estoque = ins.estoqueAtual || 0;
      const max = ins.estoqueMax || 0;
      const pct = max > 0 ? (estoque / max * 100) : 100;

      // 1. Estoque baixo
      if (max > 0 && pct <= 20) {
        alertas.push({
          tipo: 'estoque_baixo',
          severidade: pct <= 5 ? 'critico' : 'alerta',
          icon: '📦',
          titulo: 'Estoque baixo: ' + ins.nome,
          descricao: App.formatNumber(estoque, 1) + ' ' + ins.unidade + ' restante(s) (' + pct.toFixed(0) + '% do máximo)',
          insumoId: ins.id,
          categoria: ins.categoria
        });
      }

      // 2. Previsão de ruptura
      const consumoDiario = _consumoMedioDiario(ins.id);
      if (consumoDiario > 0 && estoque > 0) {
        const diasParaRuptura = Math.floor(estoque / consumoDiario);
        if (diasParaRuptura <= 3) {
          alertas.push({
            tipo: 'ruptura',
            severidade: diasParaRuptura <= 1 ? 'critico' : 'alerta',
            icon: '⏰',
            titulo: 'Ruptura prevista: ' + ins.nome,
            descricao: 'Consumo médio: ' + App.formatNumber(consumoDiario, 2) + ' ' + ins.unidade + '/dia. Esgota em ~' + diasParaRuptura + ' dia(s)',
            insumoId: ins.id,
            sugestaoCompra: Math.ceil(consumoDiario * 7 - estoque),
            unidade: ins.unidade,
            categoria: ins.categoria
          });
        }
      }

      // 3. Sugestão de compra (estoque < consumo de 5 dias)
      if (consumoDiario > 0 && estoque < consumoDiario * 5) {
        const qtdSugerida = Math.ceil(consumoDiario * 7);
        alertas.push({
          tipo: 'sugestao_compra',
          severidade: 'info',
          icon: '🛒',
          titulo: 'Sugestão de compra: ' + ins.nome,
          descricao: 'Comprar ~' + App.formatNumber(qtdSugerida, 1) + ' ' + ins.unidade + ' (cobertura para 7 dias)',
          insumoId: ins.id,
          categoria: ins.categoria
        });
      }

      // 4. Tendência de perda (3+ divergências vermelhas nos últimos 30 dias)
      const divRecentes = divergencias.filter(d =>
        d.insumoId === ins.id && d.severidade === 'vermelho' &&
        d.data && d.data.slice(0, 10) >= _diasAtras(30)
      );
      if (divRecentes.length >= 3) {
        alertas.push({
          tipo: 'tendencia_perda',
          severidade: 'critico',
          icon: '📉',
          titulo: 'Perda recorrente: ' + ins.nome,
          descricao: divRecentes.length + ' divergências críticas nos últimos 30 dias. Investigar causa!',
          insumoId: ins.id,
          categoria: ins.categoria
        });
      }
    });

    // 5. Comportamento suspeito (mesmo funcionário com muitas críticas)
    const funcMap = {};
    checklists.forEach(ck => {
      const funcNome = ck.funcionarioNome || 'Desconhecido';
      const funcId = ck.funcionarioId || 'desconhecido';
      if (!funcMap[funcId]) funcMap[funcId] = { nome: funcNome, criticas: 0, total: 0 };
      funcMap[funcId].total++;

      const divsDia = divergencias.filter(d => d.data && ck.data && d.data.startsWith(ck.data.slice(0, 10)) && d.severidade === 'vermelho');
      funcMap[funcId].criticas += divsDia.length;
    });

    Object.entries(funcMap).forEach(([id, f]) => {
      if (f.criticas >= 5 && f.total > 0) {
        const taxa = (f.criticas / f.total * 100).toFixed(0);
        alertas.push({
          tipo: 'comportamento_suspeito',
          severidade: 'critico',
          icon: '🔍',
          titulo: 'Padrão suspeito: ' + f.nome,
          descricao: f.criticas + ' div. críticas em ' + f.total + ' checklists (' + taxa + '% de taxa). Verificar turno/funcionário.',
          funcionarioId: id
        });
      }
    });

    // 6. Produtos vulneráveis (fichas com insumos de alta divergência)
    const fichas = DB.getAll(DB.COLLECTIONS.fichas_tecnicas);
    const insumoProblema = {};
    divergencias.filter(d => d.severidade === 'vermelho').forEach(d => {
      insumoProblema[d.insumoNome] = (insumoProblema[d.insumoNome] || 0) + 1;
    });

    fichas.forEach(ficha => {
      let riscoTotal = 0;
      (ficha.ingredientes || []).forEach(ing => {
        const nomeUpper = (ing.nome || '').toUpperCase();
        Object.entries(insumoProblema).forEach(([nome, count]) => {
          if (nome.toUpperCase() === nomeUpper) riscoTotal += count;
        });
      });
      if (riscoTotal >= 5) {
        alertas.push({
          tipo: 'produto_vulneravel',
          severidade: 'alerta',
          icon: '🍔',
          titulo: 'Produto vulnerável: ' + ficha.nome,
          descricao: 'Usa insumos com ' + riscoTotal + ' divergências críticas acumuladas. Margem pode estar comprometida.',
          fichaId: ficha.id
        });
      }
    });

    // Ordenar: críticos primeiro
    const ordemSeveridade = { critico: 0, alerta: 1, info: 2 };
    alertas.sort((a, b) => (ordemSeveridade[a.severidade] || 3) - (ordemSeveridade[b.severidade] || 3));

    return alertas;
  }

  function render() {
    const alertas = gerarAlertas();
    const el = document.getElementById('page-content');

    // Contadores
    const criticos = alertas.filter(a => a.severidade === 'critico').length;
    const avisos = alertas.filter(a => a.severidade === 'alerta').length;
    const infos = alertas.filter(a => a.severidade === 'info').length;

    let html = '';

    // Resumo
    html += '<div class="stat-grid mb-4">';
    html += '<div class="stat-card"><div class="stat-icon red">🚨</div><div><div class="stat-value">' + criticos + '</div><div class="stat-label">Críticos</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon yellow">⚠️</div><div><div class="stat-value">' + avisos + '</div><div class="stat-label">Alertas</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon blue">ℹ️</div><div><div class="stat-value">' + infos + '</div><div class="stat-label">Sugestões</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon green">📊</div><div><div class="stat-value">' + alertas.length + '</div><div class="stat-label">Total</div></div></div>';
    html += '</div>';

    // Filtro
    html += '<div class="card mb-4"><div style="display:flex;flex-wrap:wrap;gap:0.5rem;padding:0.25rem 0">';
    html += '<button class="btn btn-sm btn-secondary alerta-filtro active" data-filtro="todos">Todos (' + alertas.length + ')</button>';
    html += '<button class="btn btn-sm btn-secondary alerta-filtro" data-filtro="critico">Críticos (' + criticos + ')</button>';
    html += '<button class="btn btn-sm btn-secondary alerta-filtro" data-filtro="alerta">Alertas (' + avisos + ')</button>';
    html += '<button class="btn btn-sm btn-secondary alerta-filtro" data-filtro="info">Sugestões (' + infos + ')</button>';
    html += '<button class="btn btn-sm btn-secondary alerta-filtro" data-filtro="estoque_baixo">Estoque Baixo</button>';
    html += '<button class="btn btn-sm btn-secondary alerta-filtro" data-filtro="ruptura">Ruptura</button>';
    html += '<button class="btn btn-sm btn-secondary alerta-filtro" data-filtro="tendencia_perda">Tendências</button>';
    html += '<button class="btn btn-sm btn-secondary alerta-filtro" data-filtro="comportamento_suspeito">Suspeitos</button>';
    html += '</div></div>';

    // Lista de alertas
    if (alertas.length === 0) {
      html += '<div class="card"><div class="empty-state"><div class="empty-state-icon">✅</div><p class="empty-state-title">Tudo em ordem!</p><p class="empty-state-text">Nenhum alerta no momento. O sistema está monitorando automaticamente.</p></div></div>';
    } else {
      html += '<div id="alertas-lista">';
      alertas.forEach((a, idx) => {
        const borderColor = a.severidade === 'critico' ? 'var(--danger)' : a.severidade === 'alerta' ? 'var(--warning)' : 'var(--info)';
        const bgColor = a.severidade === 'critico' ? 'var(--danger-bg)' : a.severidade === 'alerta' ? 'var(--warning-bg)' : 'var(--info-bg)';
        html += '<div class="alerta-item" data-sev="' + a.severidade + '" data-tipo="' + a.tipo + '" style="background:' + bgColor + ';border-left:4px solid ' + borderColor + ';border-radius:var(--radius-md);padding:1rem 1.25rem;margin-bottom:0.75rem;display:flex;gap:1rem;align-items:flex-start">';
        html += '<span style="font-size:1.5rem;flex-shrink:0">' + a.icon + '</span>';
        html += '<div style="flex:1;min-width:0">';
        html += '<div style="font-weight:600;margin-bottom:0.25rem">' + App.escapeHtml(a.titulo) + '</div>';
        html += '<div class="text-sm" style="color:var(--text-secondary)">' + App.escapeHtml(a.descricao) + '</div>';
        if (a.sugestaoCompra) {
          html += '<div class="text-sm font-medium mt-2" style="color:var(--brand-blue-dark)">Sugestão: comprar ' + App.formatNumber(a.sugestaoCompra, 1) + ' ' + a.unidade + '</div>';
        }
        html += '</div>';
        const badgeCls = a.severidade === 'critico' ? 'danger' : a.severidade === 'alerta' ? 'warning' : 'info';
        html += '<span class="badge badge-' + badgeCls + '" style="flex-shrink:0">' + a.severidade.toUpperCase() + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    el.innerHTML = html;

    // Evento de filtro
    el.querySelectorAll('.alerta-filtro').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.alerta-filtro').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filtro = btn.dataset.filtro;
        el.querySelectorAll('.alerta-item').forEach(item => {
          const sev = item.dataset.sev;
          const tipo = item.dataset.tipo;
          if (filtro === 'todos') { item.style.display = ''; return; }
          if (filtro === 'critico' || filtro === 'alerta' || filtro === 'info') {
            item.style.display = sev === filtro ? '' : 'none';
          } else {
            item.style.display = tipo === filtro ? '' : 'none';
          }
        });
      });
    });
  }

  return { render, gerarAlertas };
})();
