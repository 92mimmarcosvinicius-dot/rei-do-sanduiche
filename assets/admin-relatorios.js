/* ============================================
   REI DO SANDUÍCHE — Relatórios Exportáveis
   ============================================
   Perdas, divergências, compras vs consumo,
   estoque histórico. Exporta Excel e PDF(print).
   ============================================ */

const AdminRelatorios = (() => {

  function _hoje() { return new Date().toISOString().slice(0, 10); }
  function _diasAtras(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

  function render() {
    const el = document.getElementById('page-content');

    let html = '<div class="stat-grid mb-4">';
    html += _renderReportCard('📉', 'Perdas por Período', 'Divergências negativas agrupadas por insumo e período', 'perdas');
    html += _renderReportCard('👥', 'Divergências por Funcionário', 'Análise de divergências agrupadas por quem fez o checklist', 'funcionario');
    html += _renderReportCard('🛒', 'Compras vs Consumo', 'Comparativo entre o que foi comprado e o consumo real', 'compras');
    html += _renderReportCard('📦', 'Estoque Histórico', 'Evolução do estoque registrado nos checklists', 'estoque');
    html += '</div>';

    html += '<div class="card" id="rel-config">';
    html += '<div class="card-header"><h3 class="card-title">Configurar Relatório</h3></div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:1rem;align-items:end">';
    html += '<div class="form-group" style="margin:0"><label class="form-label">Tipo</label><select class="form-input" id="rel-tipo"><option value="perdas">Perdas por Período</option><option value="funcionario">Divergências por Funcionário</option><option value="compras">Compras vs Consumo</option><option value="estoque">Estoque Histórico</option></select></div>';
    html += '<div class="form-group" style="margin:0"><label class="form-label">De</label><input type="date" class="form-input" id="rel-de" value="' + _diasAtras(30) + '"></div>';
    html += '<div class="form-group" style="margin:0"><label class="form-label">Até</label><input type="date" class="form-input" id="rel-ate" value="' + _hoje() + '"></div>';
    html += '<div style="display:flex;gap:0.5rem">';
    html += '<button class="btn btn-primary btn-sm" onclick="AdminRelatorios.gerar()">Gerar</button>';
    html += '<button class="btn btn-secondary btn-sm" onclick="AdminRelatorios.exportarExcel()" id="btn-export-xls" style="display:none">Excel</button>';
    html += '<button class="btn btn-secondary btn-sm" onclick="AdminRelatorios.imprimirPDF()" id="btn-export-pdf" style="display:none">Imprimir</button>';
    html += '</div></div></div>';

    html += '<div id="rel-resultado" class="mt-4"></div>';

    el.innerHTML = html;
  }

  function _renderReportCard(icon, title, desc, tipo) {
    return '<div class="stat-card" style="cursor:pointer;flex-direction:column;align-items:flex-start;gap:0.75rem" onclick="document.getElementById(\'rel-tipo\').value=\'' + tipo + '\';AdminRelatorios.gerar()">' +
      '<div style="display:flex;align-items:center;gap:0.75rem"><span style="font-size:1.5rem">' + icon + '</span><span class="font-semibold">' + title + '</span></div>' +
      '<div class="text-sm text-muted">' + desc + '</div></div>';
  }

  let _ultimoRelatorio = null;

  function gerar() {
    const tipo = document.getElementById('rel-tipo').value;
    const de = document.getElementById('rel-de').value;
    const ate = document.getElementById('rel-ate').value;
    const container = document.getElementById('rel-resultado');

    if (!de || !ate) { App.toast('Selecione as datas', 'warning'); return; }

    document.getElementById('btn-export-xls').style.display = '';
    document.getElementById('btn-export-pdf').style.display = '';

    if (tipo === 'perdas') _relPerdas(container, de, ate);
    else if (tipo === 'funcionario') _relFuncionario(container, de, ate);
    else if (tipo === 'compras') _relCompras(container, de, ate);
    else if (tipo === 'estoque') _relEstoque(container, de, ate);
  }

  function _relPerdas(el, de, ate) {
    const divergencias = DB.getAll(DB.COLLECTIONS.divergencias);
    const insumos = DB.getAll(DB.COLLECTIONS.insumos);
    const filtradas = divergencias.filter(d => d.data && d.data.slice(0, 10) >= de && d.data.slice(0, 10) <= ate && d.divergencia < 0);

    const map = {};
    let totalPerda = 0;
    filtradas.forEach(d => {
      const ins = insumos.find(i => i.id === d.insumoId);
      const custo = ins && ins.custoMedio ? ins.custoMedio : 0;
      const valorPerda = Math.abs(d.divergencia) * custo;
      if (!map[d.insumoId]) map[d.insumoId] = { nome: d.insumoNome, categoria: ins ? ins.categoria : '-', qtdTotal: 0, valorTotal: 0, ocorrencias: 0, unidade: ins ? ins.unidade : '' };
      map[d.insumoId].qtdTotal += Math.abs(d.divergencia);
      map[d.insumoId].valorTotal += valorPerda;
      map[d.insumoId].ocorrencias++;
      totalPerda += valorPerda;
    });

    const rows = Object.values(map).sort((a, b) => b.valorTotal - a.valorTotal);

    _ultimoRelatorio = {
      titulo: 'Perdas por Período (' + de + ' a ' + ate + ')',
      headers: ['Insumo', 'Categoria', 'Qtd Perdida', 'Valor (R$)', 'Ocorrências'],
      rows: rows.map(r => [r.nome, r.categoria, App.formatNumber(r.qtdTotal, 2) + ' ' + r.unidade, App.formatCurrency(r.valorTotal), r.ocorrencias]),
      rodape: 'Total de perdas: ' + App.formatCurrency(totalPerda)
    };

    let html = '<div class="card" id="rel-print-area"><div class="card-header"><h3 class="card-title">' + _ultimoRelatorio.titulo + '</h3></div>';
    if (rows.length === 0) {
      html += '<div class="empty-state"><p class="empty-state-title">Nenhuma perda no período</p></div>';
    } else {
      html += '<div class="table-container"><table class="table"><thead><tr>';
      _ultimoRelatorio.headers.forEach(h => { html += '<th>' + h + '</th>'; });
      html += '</tr></thead><tbody>';
      rows.forEach(r => {
        html += '<tr><td class="font-medium">' + App.escapeHtml(r.nome) + '</td><td class="text-sm">' + App.escapeHtml(r.categoria) + '</td><td>' + App.formatNumber(r.qtdTotal, 2) + ' ' + r.unidade + '</td><td class="font-semibold" style="color:var(--danger)">' + App.formatCurrency(r.valorTotal) + '</td><td>' + r.ocorrencias + '</td></tr>';
      });
      html += '</tbody></table></div>';
      html += '<div style="padding:1rem;font-weight:700;color:var(--danger);border-top:2px solid var(--border-light)">' + _ultimoRelatorio.rodape + '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  }

  function _relFuncionario(el, de, ate) {
    const divergencias = DB.getAll(DB.COLLECTIONS.divergencias);
    const checklists = DB.getAll(DB.COLLECTIONS.checklists);
    const filtradas = divergencias.filter(d => d.data && d.data.slice(0, 10) >= de && d.data.slice(0, 10) <= ate);

    const map = {};
    filtradas.forEach(d => {
      const ck = checklists.find(c => c.data && d.data && c.data.startsWith(d.data.slice(0, 10)));
      const nome = ck ? (ck.funcionarioNome || 'Desconhecido') : 'Desconhecido';
      if (!map[nome]) map[nome] = { total: 0, criticas: 0, alertas: 0, aceitas: 0 };
      map[nome].total++;
      if (d.severidade === 'vermelho') map[nome].criticas++;
      else if (d.severidade === 'amarelo') map[nome].alertas++;
      else map[nome].aceitas++;
    });

    const rows = Object.entries(map).sort((a, b) => b[1].criticas - a[1].criticas);

    _ultimoRelatorio = {
      titulo: 'Divergências por Funcionário (' + de + ' a ' + ate + ')',
      headers: ['Funcionário', 'Total', 'Críticas', 'Alertas', 'Aceitáveis', 'Taxa Crítica'],
      rows: rows.map(([n, d]) => [n, d.total, d.criticas, d.alertas, d.aceitas, (d.total > 0 ? (d.criticas / d.total * 100).toFixed(0) + '%' : '0%')])
    };

    let html = '<div class="card" id="rel-print-area"><div class="card-header"><h3 class="card-title">' + _ultimoRelatorio.titulo + '</h3></div>';
    if (rows.length === 0) {
      html += '<div class="empty-state"><p class="empty-state-title">Nenhuma divergência no período</p></div>';
    } else {
      html += '<div class="table-container"><table class="table"><thead><tr>';
      _ultimoRelatorio.headers.forEach(h => { html += '<th>' + h + '</th>'; });
      html += '</tr></thead><tbody>';
      rows.forEach(([nome, d]) => {
        const taxa = d.total > 0 ? (d.criticas / d.total * 100) : 0;
        const cls = taxa >= 30 ? 'danger' : taxa >= 10 ? 'warning' : 'success';
        html += '<tr><td class="font-medium">' + App.escapeHtml(nome) + '</td><td>' + d.total + '</td><td><span class="badge badge-danger">' + d.criticas + '</span></td><td><span class="badge badge-warning">' + d.alertas + '</span></td><td><span class="badge badge-success">' + d.aceitas + '</span></td><td><span class="badge badge-' + cls + '">' + taxa.toFixed(0) + '%</span></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
    el.innerHTML = html;
  }

  function _relCompras(el, de, ate) {
    const compras = DB.getAll(DB.COLLECTIONS.compras);
    const insumos = DB.getAll(DB.COLLECTIONS.insumos);
    const filtradas = compras.filter(c => c.data && c.data >= de && c.data <= ate);

    const map = {};
    let totalCompras = 0;
    filtradas.forEach(c => {
      const ins = insumos.find(i => i.id === c.insumoId);
      const nome = ins ? ins.nome : 'Desconhecido';
      if (!map[c.insumoId]) map[c.insumoId] = { nome, categoria: ins ? ins.categoria : '-', qtdComprada: 0, valorTotal: 0, estoqueAtual: ins ? (ins.estoqueAtual || 0) : 0, unidade: ins ? ins.unidade : '' };
      map[c.insumoId].qtdComprada += parseFloat(c.quantidade) || 0;
      map[c.insumoId].valorTotal += parseFloat(c.precoTotal) || 0;
      totalCompras += parseFloat(c.precoTotal) || 0;
    });

    const rows = Object.values(map).sort((a, b) => b.valorTotal - a.valorTotal);

    _ultimoRelatorio = {
      titulo: 'Compras vs Consumo (' + de + ' a ' + ate + ')',
      headers: ['Insumo', 'Categoria', 'Qtd Comprada', 'Valor Total', 'Estoque Atual'],
      rows: rows.map(r => [r.nome, r.categoria, App.formatNumber(r.qtdComprada, 2) + ' ' + r.unidade, App.formatCurrency(r.valorTotal), App.formatNumber(r.estoqueAtual, 1) + ' ' + r.unidade]),
      rodape: 'Total compras: ' + App.formatCurrency(totalCompras)
    };

    let html = '<div class="card" id="rel-print-area"><div class="card-header"><h3 class="card-title">' + _ultimoRelatorio.titulo + '</h3></div>';
    if (rows.length === 0) {
      html += '<div class="empty-state"><p class="empty-state-title">Nenhuma compra no período</p></div>';
    } else {
      html += '<div class="table-container"><table class="table"><thead><tr>';
      _ultimoRelatorio.headers.forEach(h => { html += '<th>' + h + '</th>'; });
      html += '</tr></thead><tbody>';
      rows.forEach(r => {
        html += '<tr><td class="font-medium">' + App.escapeHtml(r.nome) + '</td><td class="text-sm">' + App.escapeHtml(r.categoria) + '</td><td>' + App.formatNumber(r.qtdComprada, 2) + ' ' + r.unidade + '</td><td class="font-semibold">' + App.formatCurrency(r.valorTotal) + '</td><td>' + App.formatNumber(r.estoqueAtual, 1) + ' ' + r.unidade + '</td></tr>';
      });
      html += '</tbody></table></div>';
      html += '<div style="padding:1rem;font-weight:700;border-top:2px solid var(--border-light)">' + _ultimoRelatorio.rodape + '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  }

  function _relEstoque(el, de, ate) {
    const checklists = DB.getAll(DB.COLLECTIONS.checklists);
    const filtrados = checklists.filter(c => c.data && c.data.slice(0, 10) >= de && c.data.slice(0, 10) <= ate)
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    _ultimoRelatorio = {
      titulo: 'Estoque Histórico (' + de + ' a ' + ate + ')',
      headers: ['Data', 'Funcionário', 'Itens Contados', 'Status'],
      rows: filtrados.map(c => [
        App.formatDateShort(c.data || c.criadoEm),
        c.funcionarioNome || 'Desconhecido',
        (c.itens || []).length + ' itens',
        c.status || 'finalizado'
      ])
    };

    let html = '<div class="card" id="rel-print-area"><div class="card-header"><h3 class="card-title">' + _ultimoRelatorio.titulo + '</h3></div>';
    if (filtrados.length === 0) {
      html += '<div class="empty-state"><p class="empty-state-title">Nenhum checklist no período</p></div>';
    } else {
      html += '<div class="table-container"><table class="table"><thead><tr><th>Data</th><th>Funcionário</th><th>Itens</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
      filtrados.forEach(c => {
        html += '<tr><td>' + App.formatDateShort(c.data || c.criadoEm) + '</td><td>' + App.escapeHtml(c.funcionarioNome || 'Desconhecido') + '</td><td>' + (c.itens || []).length + ' itens</td><td><span class="badge badge-success">Finalizado</span></td><td><button class="btn btn-ghost btn-sm" onclick="AdminRelatorios.verChecklist(\'' + c.id + '\')">Ver</button></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
    el.innerHTML = html;
  }

  function verChecklist(id) {
    const ck = DB.getById(DB.COLLECTIONS.checklists, id);
    if (!ck) return;

    let html = '<div style="max-height:60vh;overflow-y:auto;padding:0.5rem">';
    html += '<p class="font-semibold mb-2">' + App.escapeHtml(ck.funcionarioNome || 'Desconhecido') + ' — ' + App.formatDateShort(ck.data || ck.criadoEm) + '</p>';
    html += '<div class="table-container"><table class="table"><thead><tr><th>Insumo</th><th>Categoria</th><th>Qtd</th><th>Unidade</th><th>Obs</th></tr></thead><tbody>';
    (ck.itens || []).forEach(item => {
      html += '<tr><td>' + App.escapeHtml(item.insumoNome || '-') + '</td><td class="text-sm">' + App.escapeHtml(item.categoria || '-') + '</td><td class="font-medium">' + App.formatNumber(item.quantidade, 2) + '</td><td>' + (item.unidade || '-') + '</td><td class="text-xs text-muted">' + App.escapeHtml(item.observacao || '-') + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    _showModal('Checklist — ' + App.formatDateShort(ck.data || ck.criadoEm), html);
  }

  function _showModal(titulo, conteudo) {
    let overlay = document.getElementById('modal-relatorio');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-relatorio';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = '<div class="modal" style="max-width:700px"><div class="modal-header"><h3 id="modal-rel-titulo"></h3><button class="modal-close">&times;</button></div><div class="modal-body" id="modal-rel-body"></div><div class="modal-footer"><button class="btn btn-secondary modal-close">Fechar</button></div></div>';
      document.body.appendChild(overlay);
    }
    document.getElementById('modal-rel-titulo').textContent = titulo;
    document.getElementById('modal-rel-body').innerHTML = conteudo;
    overlay.classList.add('active');
  }

  function exportarExcel() {
    if (!_ultimoRelatorio) { App.toast('Gere um relatório primeiro', 'warning'); return; }

    // Usa SheetJS se disponível
    if (typeof XLSX !== 'undefined') {
      const wsData = [_ultimoRelatorio.headers, ..._ultimoRelatorio.rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
      XLSX.writeFile(wb, 'relatorio-rei-' + _hoje() + '.xlsx');
      App.toast('Excel exportado com sucesso!', 'success');
    } else {
      // Fallback: carregar SheetJS dinamicamente
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      script.onload = () => exportarExcel();
      document.head.appendChild(script);
      App.toast('Carregando biblioteca de exportação...', 'info');
    }
  }

  function imprimirPDF() {
    const area = document.getElementById('rel-print-area');
    if (!area) { App.toast('Gere um relatório primeiro', 'warning'); return; }

    const win = window.open('', '_blank');
    win.document.write('<!DOCTYPE html><html><head><title>Relatório — Rei do Sanduíche</title>');
    win.document.write('<style>body{font-family:Inter,Arial,sans-serif;padding:2rem;color:#1E293B}h3{margin-bottom:1rem}table{width:100%;border-collapse:collapse;font-size:0.875rem}th{background:#F1F5F9;padding:0.5rem;text-align:left;border-bottom:2px solid #CBD5E1;font-size:0.75rem;text-transform:uppercase}td{padding:0.5rem;border-bottom:1px solid #E2E8F0}.font-medium{font-weight:600}.font-semibold{font-weight:700}.badge{padding:2px 8px;border-radius:999px;font-size:0.7rem;font-weight:600}.badge-danger{background:#FEE;color:#DC2626}.badge-warning{background:#FFFBEB;color:#B45309}.badge-success{background:#F0FDF4;color:#15803D}@media print{body{padding:0.5rem}}</style>');
    win.document.write('</head><body>');
    win.document.write('<div style="text-align:center;margin-bottom:1.5rem"><h2 style="margin:0">Rei do Sanduíche</h2><p style="color:#64748B;font-size:0.875rem">Relatório gerado em ' + new Date().toLocaleString('pt-BR') + '</p></div>');
    win.document.write(area.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  return { render, gerar, exportarExcel, imprimirPDF, verChecklist };
})();
