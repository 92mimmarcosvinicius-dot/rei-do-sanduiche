/* ============================================
   REI DO SANDUÍCHE — Admin: Gestão de Vendas
   ============================================ */

const AdminVendas = (() => {

  // Colunas esperadas do relatório de vendas (sistema real)
  const COLUNAS_ESPERADAS = ['Produto', 'Categoria', 'Quantidade Vendida', 'Faturamento Total', 'Preço Médio', 'Custo Médio', 'Custo Total', 'Lucro', 'Margem'];

  function render() {
    const vendas = DB.getAll(DB.COLLECTIONS.vendas).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    let html = '';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem">';
    html += '<div class="flex items-center gap-4">';
    html += '<span class="badge badge-info">' + vendas.length + ' importações</span>';
    const totalFat = vendas.reduce((s, v) => s + (v.faturamentoTotal || 0), 0);
    html += '<span class="badge badge-neutral">Faturamento: ' + App.formatCurrency(totalFat) + '</span>';
    html += '</div>';
    html += '<button class="btn btn-primary btn-sm" onclick="AdminVendas.abrirImport()">📥 Importar Vendas (Excel)</button>';
    html += '</div>';

    // Info
    html += '<div class="card mb-4" style="padding:1rem;background:var(--bg-secondary);border-left:3px solid var(--primary)">';
    html += '<p class="text-sm" style="margin:0"><strong>Como funciona:</strong> Exporte o relatório de vendas do seu sistema e importe aqui. O sistema lê automaticamente as colunas: Produto, Categoria, Quantidade Vendida, Faturamento Total, etc.</p>';
    html += '</div>';

    // Filtros
    html += '<div class="card mb-4" style="padding:0.75rem 1rem;display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center">';
    html += '<input class="form-input" type="text" id="busca-venda" placeholder="Buscar produto..." style="flex:1;min-width:200px;border:none;background:transparent;padding:0">';
    html += '<input class="form-input" type="month" id="filtro-mes-venda" style="width:auto;padding:0.5rem;font-size:0.8125rem">';
    html += '</div>';

    // Tabela
    html += '<div class="card" style="padding:0"><div class="table-container" id="tabela-vendas">';
    html += _renderTable(vendas);
    html += '</div></div>';

    document.getElementById('page-content').innerHTML = html;

    // Filtros
    const busca = document.getElementById('busca-venda');
    const filtroMes = document.getElementById('filtro-mes-venda');
    const filtrar = App.debounce(() => {
      const t = busca.value.toLowerCase().trim();
      const m = filtroMes.value;
      const filtrados = vendas.filter(v => {
        if (m && v.data && !v.data.startsWith(m)) return false;
        if (t && !v.produto.toLowerCase().includes(t) && !(v.categoria || '').toLowerCase().includes(t)) return false;
        return true;
      });
      document.getElementById('tabela-vendas').innerHTML = _renderTable(filtrados);
    }, 200);
    busca.addEventListener('input', filtrar);
    filtroMes.addEventListener('change', filtrar);
  }

  function _renderTable(vendas) {
    if (!vendas.length) return '<div class="empty-state" style="padding:2rem"><p class="empty-state-title">Nenhuma venda importada</p><p class="empty-state-text">Importe um relatório Excel para ver os dados aqui.</p></div>';

    let html = '<table class="table"><thead><tr><th>Produto</th><th>Categoria</th><th style="text-align:right">Qtd</th><th style="text-align:right">Faturamento</th><th style="text-align:right">Lucro</th><th style="text-align:right">Margem</th><th>Data Import.</th></tr></thead><tbody>';
    vendas.forEach(v => {
      const margemClass = (v.margem || 0) >= 40 ? 'badge-success' : (v.margem || 0) >= 20 ? 'badge-warning' : 'badge-danger';
      html += '<tr>';
      html += '<td><span class="font-medium text-sm">' + App.escapeHtml(v.produto) + '</span></td>';
      html += '<td class="text-sm">' + App.escapeHtml(v.categoria || '-') + '</td>';
      html += '<td class="text-sm" style="text-align:right">' + (v.quantidadeVendida || 0) + '</td>';
      html += '<td class="text-sm" style="text-align:right">' + App.formatCurrency(v.faturamentoTotal || 0) + '</td>';
      html += '<td class="text-sm" style="text-align:right">' + App.formatCurrency(v.lucro || 0) + '</td>';
      html += '<td style="text-align:right"><span class="badge ' + margemClass + '" style="font-size:0.6875rem">' + App.formatNumber(v.margem || 0) + '%</span></td>';
      html += '<td class="text-sm text-muted">' + App.formatDateShort(v.data || v.criadoEm) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function abrirImport() {
    let html = '<div class="modal-overlay active" id="modal-import-vendas"><div class="modal" style="max-width:700px;max-height:90vh;display:flex;flex-direction:column">';
    html += '<div class="modal-header"><h3>Importar Relatório de Vendas</h3><button class="modal-close">&times;</button></div>';
    html += '<div class="modal-body" style="overflow-y:auto;flex:1">';

    // Step 1: Upload
    html += '<div id="import-step-1">';
    html += '<p class="text-sm text-muted mb-4">Selecione o arquivo Excel (.xlsx) exportado do sistema de vendas. O formato esperado é: Produto, Categoria, Quantidade Vendida, Faturamento Total, Preço Médio, Custo Médio, Custo Total, Lucro, Margem.</p>';
    html += '<div style="border:2px dashed var(--border);border-radius:12px;padding:2rem;text-align:center;cursor:pointer" id="drop-zone">';
    html += '<div style="font-size:2rem;margin-bottom:0.5rem">📄</div>';
    html += '<p class="font-medium">Clique para selecionar ou arraste o arquivo</p>';
    html += '<p class="text-xs text-muted">.xlsx ou .xls</p>';
    html += '<input type="file" accept=".xlsx,.xls,.csv" id="file-vendas" style="display:none">';
    html += '</div>';

    // Data da importação
    html += '<div class="form-group" style="margin-top:1rem"><label class="form-label">Data de referência das vendas</label>';
    html += '<input class="form-input" type="date" id="import-data" value="' + new Date().toISOString().slice(0, 10) + '" style="max-width:200px"></div>';

    html += '<p class="form-error" id="import-error" style="display:none"></p>';
    html += '</div>';

    // Step 2: Preview (hidden)
    html += '<div id="import-step-2" style="display:none">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">';
    html += '<div>';
    html += '<p class="font-medium" id="preview-info">0 produtos encontrados</p>';
    html += '<p class="text-xs text-muted" id="preview-dupes"></p>';
    html += '</div>';
    html += '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'import-step-1\').style.display=\'block\';document.getElementById(\'import-step-2\').style.display=\'none\'">← Voltar</button>';
    html += '</div>';
    html += '<div class="table-container" id="preview-table" style="max-height:400px;overflow-y:auto"></div>';
    html += '</div>';

    html += '</div>';
    html += '<div class="modal-footer"><button class="btn btn-secondary modal-close">Cancelar</button>';
    html += '<button class="btn btn-primary" id="btn-confirmar-import" style="display:none">Confirmar Importação</button></div>';
    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    App.initModals();

    // Drag-and-drop + click
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-vendas');
    dropZone.onclick = () => fileInput.click();
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--border)'; });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--border)';
      if (e.dataTransfer.files.length) _processFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function () {
      if (this.files.length) _processFile(this.files[0]);
    });
  }

  let _parsedRows = [];

  function _processFile(file) {
    const errorEl = document.getElementById('import-error');
    errorEl.style.display = 'none';

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      errorEl.textContent = 'Formato não suportado. Use .xlsx, .xls ou .csv';
      errorEl.style.display = 'block';
      return;
    }

    // CSV handling
    if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const rows = _parseCSV(e.target.result);
          _showPreview(rows);
        } catch (err) {
          errorEl.textContent = 'Erro ao ler CSV: ' + err.message;
          errorEl.style.display = 'block';
        }
      };
      reader.readAsText(file, 'utf-8');
      return;
    }

    // XLSX handling via SheetJS
    if (typeof XLSX === 'undefined') {
      _loadSheetJS(() => _readXLSX(file));
    } else {
      _readXLSX(file);
    }
  }

  function _loadSheetJS(callback) {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    script.onload = callback;
    script.onerror = () => {
      document.getElementById('import-error').textContent = 'Erro ao carregar biblioteca de leitura de Excel. Verifique sua conexão.';
      document.getElementById('import-error').style.display = 'block';
    };
    document.head.appendChild(script);
  }

  function _readXLSX(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        _showPreview(json);
      } catch (err) {
        document.getElementById('import-error').textContent = 'Erro ao ler arquivo: ' + err.message;
        document.getElementById('import-error').style.display = 'block';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function _parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('Arquivo vazio');
    const headers = lines[0].split(/[,;\t]/).map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const vals = line.split(/[,;\t]/).map(v => v.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    });
  }

  function _showPreview(rows) {
    if (!rows || !rows.length) {
      document.getElementById('import-error').textContent = 'Nenhum dado encontrado no arquivo';
      document.getElementById('import-error').style.display = 'block';
      return;
    }

    // Detectar colunas por nome (flexível)
    const firstRow = rows[0];
    const keys = Object.keys(firstRow);
    const colMap = {};

    const patterns = {
      produto: /produto|item|nome/i,
      categoria: /categoria|cat|tipo|grupo/i,
      quantidadeVendida: /quantidade|qtd|qty|vendid/i,
      faturamentoTotal: /faturamento|receita|revenue|total.*vend/i,
      precoMedio: /pre.o.*m.dio|avg.*price/i,
      custoMedio: /custo.*m.dio|avg.*cost/i,
      custoTotal: /custo.*total|total.*cost/i,
      lucro: /lucro|profit|ganho/i,
      margem: /margem|margin/i
    };

    Object.entries(patterns).forEach(([field, regex]) => {
      const match = keys.find(k => regex.test(k));
      if (match) colMap[field] = match;
    });

    if (!colMap.produto) {
      document.getElementById('import-error').textContent = 'Coluna "Produto" não encontrada. Colunas detectadas: ' + keys.join(', ');
      document.getElementById('import-error').style.display = 'block';
      return;
    }

    // Mapear dados
    const parsed = rows.filter(r => r[colMap.produto] && String(r[colMap.produto]).trim()).map(r => ({
      produto: String(r[colMap.produto]).trim(),
      categoria: colMap.categoria ? String(r[colMap.categoria]).trim() : '',
      quantidadeVendida: _parseNum(r[colMap.quantidadeVendida]),
      faturamentoTotal: _parseNum(r[colMap.faturamentoTotal]),
      precoMedio: _parseNum(r[colMap.precoMedio]),
      custoMedio: _parseNum(r[colMap.custoMedio]),
      custoTotal: _parseNum(r[colMap.custoTotal]),
      lucro: _parseNum(r[colMap.lucro]),
      margem: _parseNum(r[colMap.margem])
    }));

    if (!parsed.length) {
      document.getElementById('import-error').textContent = 'Nenhum produto válido encontrado';
      document.getElementById('import-error').style.display = 'block';
      return;
    }

    // Checar duplicatas
    const dataRef = document.getElementById('import-data').value;
    const existentes = DB.query(DB.COLLECTIONS.vendas, v => v.data === dataRef);
    const nomesDupes = [];
    parsed.forEach(p => {
      if (existentes.find(e => e.produto.toUpperCase() === p.produto.toUpperCase())) {
        p._isDupe = true;
        nomesDupes.push(p.produto);
      }
    });

    _parsedRows = parsed;

    // Mostrar preview
    document.getElementById('import-step-1').style.display = 'none';
    document.getElementById('import-step-2').style.display = 'block';
    document.getElementById('btn-confirmar-import').style.display = 'inline-flex';
    document.getElementById('preview-info').textContent = parsed.length + ' produtos encontrados';
    document.getElementById('preview-dupes').textContent = nomesDupes.length ? '⚠️ ' + nomesDupes.length + ' já importados nesta data (serão ignorados)' : '';

    let thtml = '<table class="table"><thead><tr><th>Produto</th><th>Cat.</th><th style="text-align:right">Qtd</th><th style="text-align:right">Faturamento</th><th style="text-align:right">Margem</th><th></th></tr></thead><tbody>';
    parsed.forEach(p => {
      const cls = p._isDupe ? ' style="opacity:0.4;text-decoration:line-through"' : '';
      thtml += '<tr' + cls + '>';
      thtml += '<td class="text-sm font-medium">' + App.escapeHtml(p.produto) + '</td>';
      thtml += '<td class="text-sm">' + App.escapeHtml(p.categoria || '-') + '</td>';
      thtml += '<td class="text-sm" style="text-align:right">' + p.quantidadeVendida + '</td>';
      thtml += '<td class="text-sm" style="text-align:right">' + App.formatCurrency(p.faturamentoTotal) + '</td>';
      thtml += '<td class="text-sm" style="text-align:right">' + App.formatNumber(p.margem) + '%</td>';
      thtml += '<td>' + (p._isDupe ? '<span class="text-xs text-muted">duplicado</span>' : '') + '</td>';
      thtml += '</tr>';
    });
    thtml += '</tbody></table>';
    document.getElementById('preview-table').innerHTML = thtml;

    // Botão confirmar
    document.getElementById('btn-confirmar-import').onclick = _confirmarImport;
  }

  function _confirmarImport() {
    const dataRef = document.getElementById('import-data').value;
    const novos = _parsedRows.filter(p => !p._isDupe);

    if (!novos.length) {
      App.toast('Todos os produtos já foram importados nesta data', 'warning');
      return;
    }

    novos.forEach(p => {
      DB.insert(DB.COLLECTIONS.vendas, {
        produto: p.produto,
        categoria: p.categoria,
        quantidadeVendida: p.quantidadeVendida,
        faturamentoTotal: p.faturamentoTotal,
        precoMedio: p.precoMedio,
        custoMedio: p.custoMedio,
        custoTotal: p.custoTotal,
        lucro: p.lucro,
        margem: p.margem,
        data: dataRef
      });
    });

    DB.addLog({
      acao: 'IMPORTAR_VENDAS',
      detalhes: novos.length + ' produtos importados — data ref: ' + dataRef + ' — faturamento: ' + App.formatCurrency(novos.reduce((s, p) => s + p.faturamentoTotal, 0))
    });

    App.toast(novos.length + ' vendas importadas com sucesso!', 'success');
    _parsedRows = [];
    document.getElementById('modal-import-vendas').remove();
    render();
  }

  function _parseNum(val) {
    if (val == null || val === '') return 0;
    const s = String(val).replace(/[R$\s%]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(s) || 0;
  }

  return { render, abrirImport };
})();
