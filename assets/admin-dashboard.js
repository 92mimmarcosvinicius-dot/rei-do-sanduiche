/* ============================================
   REI DO SANDUÍCHE — Dashboard Inteligente
   ============================================
   KPIs, gráficos, tendências, comparativos
   ============================================ */

const AdminDashboard = (() => {

  let _charts = {};

  // ---- Helpers de data ----
  function _hoje() { return new Date().toISOString().slice(0, 10); }

  function _diasAtras(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  function _inicioSemana() {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  }

  function _inicioMes() {
    return new Date().toISOString().slice(0, 7) + '-01';
  }

  function _entreDatas(dataItem, de, ate) {
    if (!dataItem) return false;
    const d = dataItem.slice(0, 10);
    return d >= de && d <= ate;
  }

  // ---- Cálculos de inteligência ----

  function _calcKPIs() {
    const hoje = _hoje();
    const inicioSemana = _inicioSemana();
    const inicioMes = _inicioMes();
    const ontemStr = _diasAtras(1);
    const insumos = DB.getAll(DB.COLLECTIONS.insumos);
    const compras = DB.getAll(DB.COLLECTIONS.compras);
    const vendas = DB.getAll(DB.COLLECTIONS.vendas);
    const divergencias = DB.getAll(DB.COLLECTIONS.divergencias);

    // Perdas do dia (soma das divergências negativas em R$)
    const divHoje = divergencias.filter(d => d.data && d.data.startsWith(hoje));
    let perdasHoje = 0;
    divHoje.forEach(d => {
      if (d.divergencia < 0) {
        const ins = insumos.find(i => i.id === d.insumoId);
        perdasHoje += Math.abs(d.divergencia) * (ins && ins.custoMedio ? ins.custoMedio : 0);
      }
    });

    // Perdas ontem para comparação
    const divOntem = divergencias.filter(d => d.data && d.data.startsWith(ontemStr));
    let perdasOntem = 0;
    divOntem.forEach(d => {
      if (d.divergencia < 0) {
        const ins = insumos.find(i => i.id === d.insumoId);
        perdasOntem += Math.abs(d.divergencia) * (ins && ins.custoMedio ? ins.custoMedio : 0);
      }
    });

    // Perdas semana
    let perdasSemana = 0;
    divergencias.filter(d => _entreDatas(d.data, inicioSemana, hoje)).forEach(d => {
      if (d.divergencia < 0) {
        const ins = insumos.find(i => i.id === d.insumoId);
        perdasSemana += Math.abs(d.divergencia) * (ins && ins.custoMedio ? ins.custoMedio : 0);
      }
    });

    // Perdas mês
    let perdasMes = 0;
    divergencias.filter(d => _entreDatas(d.data, inicioMes, hoje)).forEach(d => {
      if (d.divergencia < 0) {
        const ins = insumos.find(i => i.id === d.insumoId);
        perdasMes += Math.abs(d.divergencia) * (ins && ins.custoMedio ? ins.custoMedio : 0);
      }
    });

    // Estoque crítico (abaixo de 20% do máximo)
    const estoqueCritico = insumos.filter(i => {
      if (!i.ativo || !i.estoqueMax || i.estoqueMax <= 0) return false;
      return (i.estoqueAtual || 0) <= i.estoqueMax * 0.2;
    });

    // Divergências abertas
    const divAbertas = divergencias.filter(d => d.status === 'aberta');
    const divCriticas = divAbertas.filter(d => d.severidade === 'vermelho');

    // Margem estimada (vendas do mês)
    const vendasMes = vendas.filter(v => _entreDatas(v.criadoEm || v.data, inicioMes, hoje));
    let faturamentoMes = 0, custoMes = 0;
    vendasMes.forEach(v => {
      faturamentoMes += parseFloat(v.faturamento) || 0;
      custoMes += parseFloat(v.custoTotal) || 0;
    });
    const margemMes = faturamentoMes > 0 ? ((faturamentoMes - custoMes) / faturamentoMes * 100) : 0;

    // Compras do mês
    const comprasMes = compras.filter(c => _entreDatas(c.data, inicioMes, hoje));
    let totalComprasMes = 0;
    comprasMes.forEach(c => { totalComprasMes += parseFloat(c.precoTotal) || 0; });

    return {
      perdasHoje, perdasOntem, perdasSemana, perdasMes,
      estoqueCritico, divAbertas, divCriticas,
      margemMes, faturamentoMes, custoMes, totalComprasMes,
      totalInsumos: insumos.length,
      totalVendasMes: vendasMes.length
    };
  }

  function _topPerdas(periodo) {
    const hoje = _hoje();
    const de = periodo === 'hoje' ? hoje : periodo === 'semana' ? _inicioSemana() : _inicioMes();
    const divergencias = DB.getAll(DB.COLLECTIONS.divergencias);
    const insumos = DB.getAll(DB.COLLECTIONS.insumos);

    const map = {};
    divergencias.filter(d => _entreDatas(d.data, de, hoje) && d.divergencia < 0).forEach(d => {
      if (!map[d.insumoId]) map[d.insumoId] = { nome: d.insumoNome, totalQtd: 0, totalR$: 0, count: 0 };
      const ins = insumos.find(i => i.id === d.insumoId);
      const custo = ins && ins.custoMedio ? ins.custoMedio : 0;
      map[d.insumoId].totalQtd += Math.abs(d.divergencia);
      map[d.insumoId]['totalR$'] += Math.abs(d.divergencia) * custo;
      map[d.insumoId].count++;
    });

    return Object.values(map).sort((a, b) => b['totalR$'] - a['totalR$']).slice(0, 10);
  }

  function _evolucaoPerdas() {
    const divergencias = DB.getAll(DB.COLLECTIONS.divergencias);
    const insumos = DB.getAll(DB.COLLECTIONS.insumos);
    const dias = [];
    for (let i = 6; i >= 0; i--) dias.push(_diasAtras(i));

    return dias.map(dia => {
      let perda = 0;
      divergencias.filter(d => d.data && d.data.startsWith(dia) && d.divergencia < 0).forEach(d => {
        const ins = insumos.find(i => i.id === d.insumoId);
        perda += Math.abs(d.divergencia) * (ins && ins.custoMedio ? ins.custoMedio : 0);
      });
      return { dia: dia.slice(5), perda };
    });
  }

  function _comprasVsConsumo() {
    const insumos = DB.getAll(DB.COLLECTIONS.insumos);
    const compras = DB.getAll(DB.COLLECTIONS.compras);
    const divergencias = DB.getAll(DB.COLLECTIONS.divergencias);
    const inicioMes = _inicioMes();
    const hoje = _hoje();

    // Agrupar por categoria
    const cats = {};
    insumos.filter(i => i.ativo).forEach(i => {
      if (!cats[i.categoria]) cats[i.categoria] = { comprado: 0, consumido: 0 };
    });

    compras.filter(c => _entreDatas(c.data, inicioMes, hoje)).forEach(c => {
      const ins = insumos.find(i => i.id === c.insumoId);
      if (ins && cats[ins.categoria]) {
        cats[ins.categoria].comprado += (parseFloat(c.precoTotal) || 0);
      }
    });

    // Consumo teórico baseado em divergências
    divergencias.filter(d => _entreDatas(d.data, inicioMes, hoje)).forEach(d => {
      const ins = insumos.find(i => i.id === d.insumoId);
      if (ins && cats[ins.categoria] && d.consumoTeorico) {
        cats[ins.categoria].consumido += Math.abs(d.consumoTeorico) * (ins.custoMedio || 0);
      }
    });

    const top = Object.entries(cats)
      .filter(([, v]) => v.comprado > 0 || v.consumido > 0)
      .sort((a, b) => b[1].comprado - a[1].comprado)
      .slice(0, 8);

    return { labels: top.map(t => t[0]), compras: top.map(t => t[1].comprado), consumo: top.map(t => t[1].consumido) };
  }

  function _vendasPorCategoria() {
    const vendas = DB.getAll(DB.COLLECTIONS.vendas);
    const inicioMes = _inicioMes();
    const hoje = _hoje();
    const cats = {};

    vendas.filter(v => _entreDatas(v.criadoEm || v.data, inicioMes, hoje)).forEach(v => {
      const cat = v.categoria || 'Outros';
      if (!cats[cat]) cats[cat] = 0;
      cats[cat] += parseFloat(v.faturamento) || 0;
    });

    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { labels: sorted.map(s => s[0]), valores: sorted.map(s => s[1]) };
  }

  function _produtosMaisVendidos() {
    const vendas = DB.getAll(DB.COLLECTIONS.vendas);
    const inicioMes = _inicioMes();
    const hoje = _hoje();
    const prods = {};

    vendas.filter(v => _entreDatas(v.criadoEm || v.data, inicioMes, hoje)).forEach(v => {
      const nome = v.produto || v.nome || 'Desconhecido';
      if (!prods[nome]) prods[nome] = { qtd: 0, faturamento: 0, lucro: 0 };
      prods[nome].qtd += parseInt(v.quantidadeVendida) || 0;
      prods[nome].faturamento += parseFloat(v.faturamento) || 0;
      prods[nome].lucro += parseFloat(v.lucro) || 0;
    });

    return Object.entries(prods)
      .map(([nome, d]) => ({ nome, ...d, margem: d.faturamento > 0 ? (d.lucro / d.faturamento * 100) : 0 }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 10);
  }

  function _itensRisco() {
    const divergencias = DB.getAll(DB.COLLECTIONS.divergencias);
    const insumos = DB.getAll(DB.COLLECTIONS.insumos);
    const map = {};

    divergencias.filter(d => d.severidade === 'vermelho' || d.severidade === 'amarelo').forEach(d => {
      if (!map[d.insumoId]) map[d.insumoId] = { nome: d.insumoNome, criticas: 0, alertas: 0, totalPerda: 0 };
      if (d.severidade === 'vermelho') map[d.insumoId].criticas++;
      else map[d.insumoId].alertas++;
      if (d.divergencia < 0) {
        const ins = insumos.find(i => i.id === d.insumoId);
        map[d.insumoId].totalPerda += Math.abs(d.divergencia) * (ins && ins.custoMedio ? ins.custoMedio : 0);
      }
    });

    return Object.values(map)
      .map(v => ({ ...v, risco: v.criticas * 3 + v.alertas }))
      .sort((a, b) => b.risco - a.risco)
      .slice(0, 10);
  }

  function _perdasPorFuncionario() {
    const divergencias = DB.getAll(DB.COLLECTIONS.divergencias);
    const checklists = DB.getAll(DB.COLLECTIONS.checklists);
    const map = {};

    divergencias.forEach(d => {
      // Buscar o checklist associado para saber funcionário
      const ck = checklists.find(c => c.data && d.data && c.data.startsWith(d.data.slice(0, 10)));
      const funcNome = ck ? (ck.funcionarioNome || 'Desconhecido') : 'Desconhecido';
      if (!map[funcNome]) map[funcNome] = { divergencias: 0, criticas: 0 };
      map[funcNome].divergencias++;
      if (d.severidade === 'vermelho') map[funcNome].criticas++;
    });

    return Object.entries(map)
      .map(([nome, d]) => ({ nome, ...d }))
      .sort((a, b) => b.criticas - a.criticas);
  }

  // ---- Renderização ----

  function _destroyCharts() {
    Object.values(_charts).forEach(c => { try { c.destroy(); } catch (e) {} });
    _charts = {};
  }

  function _trendArrow(atual, anterior) {
    if (anterior === 0 && atual === 0) return '<span class="dash-trend dash-trend-neutral">—</span>';
    if (atual > anterior) return '<span class="dash-trend dash-trend-up">▲ ' + Math.abs(((atual - anterior) / (anterior || 1)) * 100).toFixed(0) + '%</span>';
    if (atual < anterior) return '<span class="dash-trend dash-trend-down">▼ ' + Math.abs(((anterior - atual) / (anterior || 1)) * 100).toFixed(0) + '%</span>';
    return '<span class="dash-trend dash-trend-neutral">— 0%</span>';
  }

  function render() {
    AdminFichas.seedFichas();
    _destroyCharts();

    const kpis = _calcKPIs();
    const el = document.getElementById('page-content');

    // Badge de divergências na sidebar
    const badge = document.getElementById('badge-divergencias');
    if (kpis.divAbertas.length > 0) {
      badge.textContent = kpis.divAbertas.length;
      badge.style.display = 'inline';
    }

    let html = '';

    // ---- Row 1: KPI Cards ----
    html += '<div class="dash-kpi-row">';
    html += _renderKpiCard('💰', 'Perdas Hoje', App.formatCurrency(kpis.perdasHoje),
      kpis.perdasHoje > kpis.perdasOntem ? 'danger' : 'success',
      _trendArrow(kpis.perdasHoje, kpis.perdasOntem), 'vs ontem');
    html += _renderKpiCard('📦', 'Estoque Crítico', kpis.estoqueCritico.length + ' itens',
      kpis.estoqueCritico.length > 5 ? 'danger' : kpis.estoqueCritico.length > 0 ? 'warning' : 'success',
      '', 'abaixo de 20%');
    html += _renderKpiCard('⚠️', 'Divergências', kpis.divAbertas.length + ' abertas',
      kpis.divCriticas.length > 0 ? 'danger' : kpis.divAbertas.length > 0 ? 'warning' : 'success',
      kpis.divCriticas.length > 0 ? '<span class="dash-trend dash-trend-up">' + kpis.divCriticas.length + ' críticas</span>' : '', '');
    html += _renderKpiCard('📊', 'Margem Mês', kpis.margemMes.toFixed(1) + '%',
      kpis.margemMes >= 30 ? 'success' : kpis.margemMes >= 15 ? 'warning' : 'danger',
      App.formatCurrency(kpis.faturamentoMes) + ' faturado', '');
    html += '</div>';

    // ---- Row 2: Perdas resumo ----
    html += '<div class="dash-periodo-row">';
    html += '<div class="dash-periodo-card"><span class="dash-periodo-label">Perdas Hoje</span><span class="dash-periodo-value">' + App.formatCurrency(kpis.perdasHoje) + '</span></div>';
    html += '<div class="dash-periodo-card"><span class="dash-periodo-label">Perdas Semana</span><span class="dash-periodo-value">' + App.formatCurrency(kpis.perdasSemana) + '</span></div>';
    html += '<div class="dash-periodo-card"><span class="dash-periodo-label">Perdas Mês</span><span class="dash-periodo-value">' + App.formatCurrency(kpis.perdasMes) + '</span></div>';
    html += '<div class="dash-periodo-card"><span class="dash-periodo-label">Compras Mês</span><span class="dash-periodo-value">' + App.formatCurrency(kpis.totalComprasMes) + '</span></div>';
    html += '</div>';

    // ---- Row 3: Charts ----
    html += '<div class="dash-charts-row">';
    html += '<div class="card"><div class="card-header"><h3 class="card-title">Top Perdas (Mês)</h3></div><div style="position:relative;height:280px"><canvas id="chart-top-perdas"></canvas></div></div>';
    html += '<div class="card"><div class="card-header"><h3 class="card-title">Evolução de Perdas (7 dias)</h3></div><div style="position:relative;height:280px"><canvas id="chart-evolucao"></canvas></div></div>';
    html += '</div>';

    html += '<div class="dash-charts-row">';
    html += '<div class="card"><div class="card-header"><h3 class="card-title">Compras vs Consumo por Categoria</h3></div><div style="position:relative;height:280px"><canvas id="chart-compras-consumo"></canvas></div></div>';
    html += '<div class="card"><div class="card-header"><h3 class="card-title">Vendas por Categoria (Mês)</h3></div><div style="position:relative;height:280px"><canvas id="chart-vendas-cat"></canvas></div></div>';
    html += '</div>';

    // ---- Row 4: Tables ----
    html += '<div class="dash-tables-row">';

    // Produtos mais vendidos
    const topProdutos = _produtosMaisVendidos();
    html += '<div class="card"><div class="card-header"><h3 class="card-title">Produtos Mais Vendidos (Mês)</h3></div>';
    if (topProdutos.length === 0) {
      html += '<div class="empty-state"><div class="empty-state-icon">🛒</div><p class="empty-state-title">Nenhuma venda importada</p></div>';
    } else {
      html += '<div class="table-container"><table class="table"><thead><tr><th>#</th><th>Produto</th><th>Qtd</th><th>Faturamento</th><th>Margem</th></tr></thead><tbody>';
      topProdutos.forEach((p, i) => {
        const margemCls = p.margem >= 30 ? 'success' : p.margem >= 15 ? 'warning' : 'danger';
        html += '<tr><td>' + (i + 1) + '</td><td class="font-medium">' + App.escapeHtml(p.nome) + '</td><td>' + p.qtd + '</td><td>' + App.formatCurrency(p.faturamento) + '</td><td><span class="badge badge-' + margemCls + '">' + p.margem.toFixed(1) + '%</span></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    // Itens de maior risco operacional
    const riscos = _itensRisco();
    html += '<div class="card"><div class="card-header"><h3 class="card-title">Maior Risco Operacional</h3></div>';
    if (riscos.length === 0) {
      html += '<div class="empty-state"><div class="empty-state-icon">✅</div><p class="empty-state-title">Nenhum risco identificado</p></div>';
    } else {
      html += '<div class="table-container"><table class="table"><thead><tr><th>Insumo</th><th>Críticas</th><th>Alertas</th><th>Perda Total</th><th>Risco</th></tr></thead><tbody>';
      riscos.forEach(r => {
        const riskBadge = r.risco >= 6 ? 'danger' : r.risco >= 3 ? 'warning' : 'info';
        html += '<tr><td class="font-medium">' + App.escapeHtml(r.nome) + '</td><td><span class="badge badge-danger">' + r.criticas + '</span></td><td><span class="badge badge-warning">' + r.alertas + '</span></td><td>' + App.formatCurrency(r.totalPerda) + '</td><td><span class="badge badge-' + riskBadge + '">' + (r.risco >= 6 ? 'ALTO' : r.risco >= 3 ? 'MÉDIO' : 'BAIXO') + '</span></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    html += '</div>'; // dash-tables-row

    // ---- Row 5: Estoque crítico + Perdas por funcionário ----
    html += '<div class="dash-tables-row">';

    // Estoque crítico
    html += '<div class="card"><div class="card-header"><h3 class="card-title">Estoque Crítico</h3></div>';
    if (kpis.estoqueCritico.length === 0) {
      html += '<div class="empty-state"><div class="empty-state-icon">✅</div><p class="empty-state-title">Estoque adequado</p></div>';
    } else {
      html += '<div class="table-container"><table class="table"><thead><tr><th>Insumo</th><th>Categoria</th><th>Atual</th><th>Máx</th><th>%</th></tr></thead><tbody>';
      kpis.estoqueCritico.slice(0, 10).forEach(ins => {
        const pct = ins.estoqueMax > 0 ? ((ins.estoqueAtual || 0) / ins.estoqueMax * 100) : 0;
        const cls = pct <= 5 ? 'danger' : pct <= 15 ? 'warning' : 'info';
        html += '<tr><td class="font-medium">' + App.escapeHtml(ins.nome) + '</td><td class="text-sm text-muted">' + App.escapeHtml(ins.categoria) + '</td><td>' + App.formatNumber(ins.estoqueAtual || 0, 1) + ' ' + ins.unidade + '</td><td>' + ins.estoqueMax + '</td><td><span class="badge badge-' + cls + '">' + pct.toFixed(0) + '%</span></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    // Perdas por funcionário
    const perdasFunc = _perdasPorFuncionario();
    html += '<div class="card"><div class="card-header"><h3 class="card-title">Divergências por Funcionário</h3></div>';
    if (perdasFunc.length === 0) {
      html += '<div class="empty-state"><div class="empty-state-icon">👥</div><p class="empty-state-title">Nenhuma divergência registrada</p></div>';
    } else {
      html += '<div class="table-container"><table class="table"><thead><tr><th>Funcionário</th><th>Total Div.</th><th>Críticas</th><th>Status</th></tr></thead><tbody>';
      perdasFunc.forEach(f => {
        const cls = f.criticas >= 3 ? 'danger' : f.criticas >= 1 ? 'warning' : 'success';
        const label = f.criticas >= 3 ? 'Atenção' : f.criticas >= 1 ? 'Monitorar' : 'Normal';
        html += '<tr><td class="font-medium">' + App.escapeHtml(f.nome) + '</td><td>' + f.divergencias + '</td><td><span class="badge badge-danger">' + f.criticas + '</span></td><td><span class="badge badge-' + cls + '">' + label + '</span></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    html += '</div>'; // dash-tables-row

    // ---- Atividade Recente ----
    const recentLogs = DB.getLogs({}).slice(0, 8);
    html += '<div class="card"><div class="card-header"><h3 class="card-title">Atividade Recente</h3></div>';
    if (recentLogs.length === 0) {
      html += '<div class="empty-state"><div class="empty-state-icon">📋</div><p class="empty-state-title">Nenhuma atividade registrada</p></div>';
    } else {
      html += '<div class="table-container"><table class="table"><thead><tr><th>Hora</th><th>Usuário</th><th>Ação</th><th>Detalhes</th></tr></thead><tbody>';
      recentLogs.forEach(l => {
        html += '<tr><td class="text-xs" style="white-space:nowrap">' + App.formatDate(l.timestamp) + '</td><td>' + App.escapeHtml(l.usuarioNome) + '</td><td><span class="badge badge-neutral">' + App.escapeHtml(l.acao) + '</span></td><td class="text-sm text-muted" style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + App.escapeHtml(l.detalhes || '-').substring(0, 80) + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    el.innerHTML = html;

    // ---- Renderizar gráficos (se Chart.js disponível) ----
    if (typeof Chart !== 'undefined') {
      setTimeout(() => _renderCharts(), 50);
    }
  }

  function _renderKpiCard(icon, label, value, color, trend, sub) {
    const borderColor = color === 'danger' ? 'var(--danger)' : color === 'warning' ? 'var(--warning)' : color === 'success' ? 'var(--success)' : 'var(--info)';
    return '<div class="dash-kpi-card" style="border-left:4px solid ' + borderColor + '">' +
      '<div class="dash-kpi-icon">' + icon + '</div>' +
      '<div class="dash-kpi-body">' +
        '<div class="dash-kpi-label">' + label + '</div>' +
        '<div class="dash-kpi-value">' + value + '</div>' +
        '<div class="dash-kpi-footer">' + (trend || '') + (sub ? '<span class="text-xs text-muted" style="margin-left:0.5rem">' + sub + '</span>' : '') + '</div>' +
      '</div>' +
    '</div>';
  }

  function _renderCharts() {
    const fontFamily = "'Inter', sans-serif";
    const gridColor = 'rgba(0,0,0,0.06)';
    Chart.defaults.font.family = fontFamily;
    Chart.defaults.font.size = 12;

    // 1. Top Perdas (horizontal bar)
    const topPerdas = _topPerdas('mes');
    const ctx1 = document.getElementById('chart-top-perdas');
    if (ctx1 && topPerdas.length > 0) {
      _charts.topPerdas = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: topPerdas.map(p => p.nome),
          datasets: [{
            label: 'Perda (R$)',
            data: topPerdas.map(p => p['totalR$']),
            backgroundColor: 'rgba(239,68,68,0.7)',
            borderRadius: 4,
            barThickness: 18
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { callback: v => 'R$' + v.toFixed(0) } },
            y: { grid: { display: false } }
          }
        }
      });
    }

    // 2. Evolução de Perdas (line)
    const evol = _evolucaoPerdas();
    const ctx2 = document.getElementById('chart-evolucao');
    if (ctx2) {
      _charts.evolucao = new Chart(ctx2, {
        type: 'line',
        data: {
          labels: evol.map(e => e.dia),
          datasets: [{
            label: 'Perdas (R$)',
            data: evol.map(e => e.perda),
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239,68,68,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#EF4444'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: gridColor }, ticks: { callback: v => 'R$' + v.toFixed(0) }, beginAtZero: true },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 3. Compras vs Consumo (grouped bar)
    const cc = _comprasVsConsumo();
    const ctx3 = document.getElementById('chart-compras-consumo');
    if (ctx3 && cc.labels.length > 0) {
      _charts.comprasConsumo = new Chart(ctx3, {
        type: 'bar',
        data: {
          labels: cc.labels,
          datasets: [
            { label: 'Compras', data: cc.compras, backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 4 },
            { label: 'Consumo', data: cc.consumo, backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 4 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 12 } } },
          scales: {
            y: { grid: { color: gridColor }, ticks: { callback: v => 'R$' + v.toFixed(0) }, beginAtZero: true },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 4. Vendas por Categoria (doughnut)
    const vc = _vendasPorCategoria();
    const ctx4 = document.getElementById('chart-vendas-cat');
    if (ctx4 && vc.labels.length > 0) {
      const colors = ['#29B6F6', '#FFD54F', '#EF4444', '#22C55E', '#A855F7', '#F97316'];
      _charts.vendasCat = new Chart(ctx4, {
        type: 'doughnut',
        data: {
          labels: vc.labels,
          datasets: [{
            data: vc.valores,
            backgroundColor: colors.slice(0, vc.labels.length),
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } }
          }
        }
      });
    }
  }

  return { render };
})();
