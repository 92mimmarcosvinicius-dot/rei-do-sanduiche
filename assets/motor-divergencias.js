/* ============================================
   REI DO SANDUÍCHE — Motor de Cruzamento Inteligente
   ============================================
   Calcula: estoque esperado = anterior + compras - consumo teórico
   Divergência = esperado - real (checklist)
   Classifica severidade por tolerância do insumo
   ============================================ */

const MotorDivergencias = (() => {

  // Mapeamento de nomes de ingredientes (ficha técnica) → nomes de insumos (DB)
  const MAPA_NOMES = {
    'Maiosene': 'Maionese',
    'Pão Genérico': 'Pão Bola',
    'Gordura Vegetal': 'Gordura',
    'Papel toalha': 'Papel Toalha',
    'Saco temperada': 'Saco Temperada',
    'Batata frita': 'Batata Frita',
    'Batata palha': null,
    'Saco sanduíche': null,
    'Embalagem pastel': null,
    'Massa pastel': null,
    'Chocolate Harald': null,
    'Água': null,
    'Sorvete chocolate': 'Sorvete Brigadeiro',
    'Sorvete morango': 'Sorvete Morango',
    'Sorvete flocos': 'Sorvete Flocos',
    'Cobertura chocolate': 'Cobertura Chocolate',
    'Cobertura morango': 'Cobertura Morango',
    'Cream Cheese': 'Cream Cheese'
  };

  // Mapeamento de frutas da ficha → polpas do estoque
  const MAPA_FRUTAS = {
    'Abacaxi': 'Polpa Abacaxi',
    'Açaí': 'Polpa Açaí',
    'Acerola': 'Polpa Acerola',
    'Ameixa': 'Polpa Ameixa',
    'Cajá': 'Polpa Cajá',
    'Cupuaçu': 'Polpa Cupuaçu',
    'Goiaba': 'Polpa Goiaba',
    'Graviola': 'Polpa Graviola',
    'Manga': 'Polpa Manga',
    'Maracujá': 'Polpa Maracujá',
    'Sapoti': 'Polpa Sapoti'
  };

  let _cacheInsumos = null;
  let _cacheFichas = null;
  let _cacheMapaIngInsumo = null;

  function _limparCache() {
    _cacheInsumos = null;
    _cacheFichas = null;
    _cacheMapaIngInsumo = null;
  }

  function _getInsumos() {
    if (!_cacheInsumos) _cacheInsumos = DB.getAll(DB.COLLECTIONS.insumos);
    return _cacheInsumos;
  }

  function _getFichas() {
    if (!_cacheFichas) _cacheFichas = DB.getAll(DB.COLLECTIONS.fichas_tecnicas);
    return _cacheFichas;
  }

  // Normalizar nome: remover sufixos de peso, trim, lowercase
  function _normalizar(nome) {
    return (nome || '')
      .replace(/\s*\d+g$/i, '')   // "Frango 75g" → "Frango"
      .replace(/\s*\d+kg$/i, '')
      .replace(/\s*\d+ml$/i, '')
      .trim().toLowerCase();
  }

  // Construir mapa ingrediente → insumoId
  function _buildMapaIngredienteInsumo() {
    if (_cacheMapaIngInsumo) return _cacheMapaIngInsumo;

    const insumos = _getInsumos();
    const mapa = {};

    // Indexar insumos por nome normalizado
    const insumosPorNome = {};
    insumos.forEach(i => {
      insumosPorNome[_normalizar(i.nome)] = i;
    });

    // Para cada ficha, mapear cada ingrediente
    const fichas = _getFichas();
    const todosIngredientes = new Set();
    fichas.forEach(f => {
      (f.ingredientes || []).forEach(ing => todosIngredientes.add(ing.insumoNome));
    });

    todosIngredientes.forEach(nomeIng => {
      // 1. Mapa explícito
      if (nomeIng in MAPA_NOMES) {
        const target = MAPA_NOMES[nomeIng];
        if (target === null) { mapa[nomeIng] = null; return; }
        const match = insumos.find(i => i.nome === target);
        if (match) { mapa[nomeIng] = match.id; return; }
      }

      // 2. Mapa de frutas
      if (nomeIng in MAPA_FRUTAS) {
        const target = MAPA_FRUTAS[nomeIng];
        const match = insumos.find(i => i.nome === target);
        if (match) { mapa[nomeIng] = match.id; return; }
      }

      // 3. Match exato
      const exato = insumos.find(i => i.nome === nomeIng);
      if (exato) { mapa[nomeIng] = exato.id; return; }

      // 4. Match normalizado (sem sufixo de peso)
      const norm = _normalizar(nomeIng);
      if (insumosPorNome[norm]) { mapa[nomeIng] = insumosPorNome[norm].id; return; }

      // 5. Match parcial
      const parcial = insumos.find(i => _normalizar(i.nome) === norm || norm.includes(_normalizar(i.nome)) || _normalizar(i.nome).includes(norm));
      if (parcial) { mapa[nomeIng] = parcial.id; return; }

      // Não encontrou
      mapa[nomeIng] = null;
    });

    _cacheMapaIngInsumo = mapa;
    return mapa;
  }

  // Buscar o checklist mais recente ANTES de uma data para obter estoque anterior
  function _getChecklistAnterior(data) {
    return DB.query(DB.COLLECTIONS.checklists, c => c.data < data && c.status === 'finalizado')
      .sort((a, b) => b.data.localeCompare(a.data))[0] || null;
  }

  // Buscar checklist de uma data específica (ignora desconsiderados)
  function _getChecklistDoDia(data) {
    const checklists = DB.query(DB.COLLECTIONS.checklists, c => c.data === data && c.status !== 'desconsiderado');
    return checklists.sort((a, b) => (b.horarioFim || '').localeCompare(a.horarioFim || ''))[0] || null;
  }

  // Estoque anterior de um insumo a partir de um checklist
  function _estoqueAnteriorDoChecklist(checklist, insumoId) {
    if (!checklist || !checklist.itens) return null;
    const item = checklist.itens.find(i => i.insumoId === insumoId);
    return item && item.quantidade !== null ? item.quantidade : null;
  }

  // Somar compras de um insumo entre duas datas (dataInicio exclusive, dataFim inclusive)
  function _somarCompras(insumoId, dataInicio, dataFim) {
    return DB.query(DB.COLLECTIONS.compras, c =>
      c.insumoId === insumoId && c.data > dataInicio && c.data <= dataFim
    ).reduce((soma, c) => soma + (c.quantidade || 0), 0);
  }

  // Calcular consumo teórico de um insumo pelas vendas entre duas datas
  function _calcularConsumoTeorico(insumoId, dataInicio, dataFim) {
    const mapaIng = _buildMapaIngredienteInsumo();
    const fichas = _getFichas().filter(f => f.ativo !== false);

    // Vendas no período
    const vendas = DB.query(DB.COLLECTIONS.vendas, v =>
      v.data > dataInicio && v.data <= dataFim && v.quantidadeVendida > 0
    );

    if (!vendas.length) return { total: 0, detalhes: [] };

    // Para cada venda, encontrar a ficha correspondente e somar consumo do insumo
    let totalConsumo = 0;
    const detalhes = [];

    vendas.forEach(venda => {
      const ficha = _matchFichaParaVenda(venda.produto, fichas);
      if (!ficha) return;

      // Verificar se a ficha usa este insumo
      (ficha.ingredientes || []).forEach(ing => {
        const ingInsumoId = mapaIng[ing.insumoNome];
        if (ingInsumoId !== insumoId) return;

        const consumo = _converterUnidade(ing.quantidade, ing.unidade, insumoId) * venda.quantidadeVendida;
        if (consumo > 0) {
          totalConsumo += consumo;
          detalhes.push({
            produto: venda.produto,
            qtdVendida: venda.quantidadeVendida,
            ingrediente: ing.insumoNome,
            consumoPorUnidade: _converterUnidade(ing.quantidade, ing.unidade, insumoId),
            consumoTotal: consumo
          });
        }
      });
    });

    return { total: totalConsumo, detalhes };
  }

  // Encontrar ficha técnica para um produto vendido (match por nome)
  function _matchFichaParaVenda(nomeProduto, fichas) {
    if (!nomeProduto) return null;
    const norm = nomeProduto.trim().toUpperCase();

    // Match exato
    let match = fichas.find(f => f.nome.toUpperCase() === norm);
    if (match) return match;

    // Sem acentos
    const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const normSA = semAcento(norm);
    match = fichas.find(f => semAcento(f.nome.toUpperCase()) === normSA);
    if (match) return match;

    // Parcial (produto contido no nome da ficha ou vice-versa)
    match = fichas.find(f => {
      const fn = semAcento(f.nome.toUpperCase());
      return fn.includes(normSA) || normSA.includes(fn);
    });
    return match || null;
  }

  // Converter unidade da ficha para unidade do insumo
  // Considera o fator de conversão de contagem (ex: Catupiry 1un = 1.5kg)
  function _converterUnidade(quantidade, unidadeFicha, insumoId) {
    const insumo = _getInsumos().find(i => i.id === insumoId);
    if (!insumo) return quantidade;

    const unInsumo = insumo.unidade;
    const unFicha = (unidadeFicha || '').toLowerCase();
    const conv = DB.getConversao(insumo.nome);

    // Se o insumo tem conversão de peso (ex: Catupiry un→kg, Maionese un→kg)
    // A ficha usa g/kg, o insumo é contado em "un" mas cada un = X kg
    if (conv && conv.tipo === 'peso' && conv.unidadeReal === 'kg') {
      // Ficha diz "30g" de Catupiry → converter para unidades do insumo
      // 30g = 0.030kg. Cada un = 1.5kg. Então consumo = 0.030 / 1.5 = 0.020 un
      // Mas como o checklist já converte para kg (qtd × fator), precisamos retornar em kg
      if (unFicha === 'g') return quantidade / 1000; // converter para kg (o checklist armazena já em kg via fator)
      if (unFicha === 'kg') return quantidade;
      if (unFicha === 'un') return quantidade * conv.fator; // un da ficha → kg
    }

    // Mesma unidade
    if (unInsumo === unFicha) return quantidade;

    // g → kg
    if (unFicha === 'g' && unInsumo === 'kg') return quantidade / 1000;
    // kg → g
    if (unFicha === 'kg' && unInsumo === 'g') return quantidade * 1000;
    // ml → L
    if (unFicha === 'ml' && (unInsumo === 'L' || unInsumo === 'litro')) return quantidade / 1000;
    // L → ml
    if ((unFicha === 'l' || unFicha === 'litro') && unInsumo === 'ml') return quantidade * 1000;

    // g → un (quando insumo é contado em un mas cada un = X pães/polpas)
    // Para pães: ficha usa "un" e insumo também é "un" — não precisa converter
    // O checklist já multiplicou pelo fator (3 pacotes × 6 = 18 pães)

    // un para un — direto
    if (unFicha === 'un' && unInsumo === 'un') return quantidade;

    // Fallback: sem conversão possível, retornar como está
    return quantidade;
  }

  // Classificar severidade com base na tolerância do insumo
  function _classificarSeveridade(percentualDivergencia, tolerancia) {
    const tol = tolerancia || { verde: 10, amarelo: 20 };
    const p = Math.abs(percentualDivergencia);
    if (p <= tol.verde) return 'verde';
    if (p <= tol.amarelo) return 'amarelo';
    return 'vermelho';
  }

  // ══════════════════════════════════════════════
  // FUNÇÃO PRINCIPAL: calcular divergências para uma data
  // ══════════════════════════════════════════════
  function calcularParaData(data) {
    _limparCache();

    const checklistHoje = _getChecklistDoDia(data);
    if (!checklistHoje) return { erro: 'Nenhum checklist finalizado para ' + data, divergencias: [] };

    const checklistAnterior = _getChecklistAnterior(data);
    const dataAnterior = checklistAnterior ? checklistAnterior.data : '1970-01-01';

    const insumos = _getInsumos().filter(i => i.ativo);
    const resultados = [];

    insumos.forEach(insumo => {
      const itemHoje = (checklistHoje.itens || []).find(i => i.insumoId === insumo.id);
      const estoqueReal = itemHoje && itemHoje.quantidade !== null ? itemHoje.quantidade : null;

      if (estoqueReal === null) return;

      // Estoque anterior
      const estoqueAnterior = _estoqueAnteriorDoChecklist(checklistAnterior, insumo.id);

      // Compras no período
      const compras = _somarCompras(insumo.id, dataAnterior, data);

      // Consumo teórico
      const consumo = _calcularConsumoTeorico(insumo.id, dataAnterior, data);

      // Estoque esperado
      let estoqueEsperado = null;
      let metodoCalculo = '';

      if (estoqueAnterior !== null) {
        estoqueEsperado = estoqueAnterior + compras - consumo.total;
        metodoCalculo = 'checklist_anterior';
      } else if (compras > 0) {
        estoqueEsperado = compras - consumo.total;
        metodoCalculo = 'apenas_compras';
      } else {
        estoqueEsperado = (insumo.estoqueAtual || 0) - consumo.total;
        metodoCalculo = 'estoque_sistema';
      }

      // Divergência
      const divergenciaAbs = estoqueEsperado !== null ? estoqueReal - estoqueEsperado : 0;
      const base = estoqueEsperado !== null && estoqueEsperado !== 0 ? Math.abs(estoqueEsperado) : 1;
      const divergenciaPct = (divergenciaAbs / base) * 100;

      // Severidade
      const tol = insumo.tolerancia || { verde: 10, amarelo: 20 };
      const severidade = _classificarSeveridade(divergenciaPct, tol);

      resultados.push({
        insumoId: insumo.id,
        insumoNome: insumo.nome,
        categoria: insumo.categoria,
        unidade: insumo.unidade,
        data,
        checklistId: checklistHoje.id,
        funcionarioId: checklistHoje.funcionarioId || checklistHoje.usuarioId,
        funcionarioNome: checklistHoje.funcionarioNome || checklistHoje.usuarioNome,
        horario: checklistHoje.horarioFim,
        estoqueAnterior: estoqueAnterior !== null ? _arred(estoqueAnterior) : null,
        compras: _arred(compras),
        consumoTeorico: _arred(consumo.total),
        consumoDetalhes: consumo.detalhes,
        estoqueEsperado: estoqueEsperado !== null ? _arred(estoqueEsperado) : null,
        estoqueReal: _arred(estoqueReal),
        divergenciaAbs: _arred(divergenciaAbs),
        divergenciaPct: _arred(divergenciaPct),
        severidade,
        tipo: divergenciaAbs < -0.01 ? 'FALTA' : divergenciaAbs > 0.01 ? 'SOBRA' : 'OK',
        metodoCalculo,
        tolerancia: tol,
        observacao: itemHoje ? itemHoje.observacao : null
      });
    });

    // Ordenar: vermelho primeiro, depois amarelo, depois verde; dentro, por |divergência %| desc
    const ordemSev = { vermelho: 0, amarelo: 1, verde: 2 };
    resultados.sort((a, b) => {
      if (ordemSev[a.severidade] !== ordemSev[b.severidade]) return ordemSev[a.severidade] - ordemSev[b.severidade];
      return Math.abs(b.divergenciaPct) - Math.abs(a.divergenciaPct);
    });

    return {
      data,
      checklist: { id: checklistHoje.id, funcionario: checklistHoje.funcionarioNome || checklistHoje.usuarioNome, horario: checklistHoje.horarioFim },
      checklistAnterior: checklistAnterior ? { data: checklistAnterior.data, funcionario: checklistAnterior.funcionarioNome || checklistAnterior.usuarioNome } : null,
      divergencias: resultados,
      resumo: _calcularResumo(resultados)
    };
  }

  function _calcularResumo(divergencias) {
    const total = divergencias.length;
    const vermelhos = divergencias.filter(d => d.severidade === 'vermelho');
    const amarelos = divergencias.filter(d => d.severidade === 'amarelo');
    const verdes = divergencias.filter(d => d.severidade === 'verde');
    const faltas = divergencias.filter(d => d.tipo === 'FALTA');
    const sobras = divergencias.filter(d => d.tipo === 'SOBRA');

    return {
      total,
      vermelhos: vermelhos.length,
      amarelos: amarelos.length,
      verdes: verdes.length,
      ok: divergencias.filter(d => d.tipo === 'OK').length,
      faltas: faltas.length,
      sobras: sobras.length,
      topFaltas: faltas.sort((a, b) => a.divergenciaAbs - b.divergenciaAbs).slice(0, 5),
      topSobras: sobras.sort((a, b) => b.divergenciaAbs - a.divergenciaAbs).slice(0, 5),
      maiorDivergenciaPct: divergencias.length > 0 ? divergencias.reduce((max, d) => Math.abs(d.divergenciaPct) > Math.abs(max.divergenciaPct) ? d : max) : null
    };
  }

  // Salvar divergências calculadas no banco (para histórico auditável)
  function salvarDivergencias(resultado) {
    if (!resultado || !resultado.divergencias) return;

    // Remover divergências já salvas para esta data
    const existentes = DB.query(DB.COLLECTIONS.divergencias, d => d.data === resultado.data);
    existentes.forEach(e => DB.remove(DB.COLLECTIONS.divergencias, e.id));

    // Salvar apenas não-OK
    const relevantes = resultado.divergencias.filter(d => d.tipo !== 'OK');
    relevantes.forEach(d => {
      DB.insert(DB.COLLECTIONS.divergencias, {
        data: d.data,
        insumoId: d.insumoId,
        insumoNome: d.insumoNome,
        categoria: d.categoria,
        unidade: d.unidade,
        checklistId: d.checklistId,
        funcionarioId: d.funcionarioId,
        funcionarioNome: d.funcionarioNome,
        estoqueAnterior: d.estoqueAnterior,
        compras: d.compras,
        consumoTeorico: d.consumoTeorico,
        estoqueEsperado: d.estoqueEsperado,
        estoqueReal: d.estoqueReal,
        divergenciaAbs: d.divergenciaAbs,
        divergenciaPct: d.divergenciaPct,
        severidade: d.severidade,
        tipo: d.tipo,
        metodoCalculo: d.metodoCalculo,
        tolerancia: d.tolerancia,
        observacao: d.observacao,
        status: 'aberta'
      });
    });

    DB.addLog({
      acao: 'CALCULAR_DIVERGENCIAS',
      detalhes: resultado.data + ' — ' + relevantes.length + ' divergências (' +
        resultado.resumo.vermelhos + ' críticas, ' + resultado.resumo.amarelos + ' alerta)'
    });

    return relevantes.length;
  }

  // Histórico de divergências de um insumo específico
  function getHistoricoPorInsumo(insumoId) {
    return DB.query(DB.COLLECTIONS.divergencias, d => d.insumoId === insumoId)
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }

  // Padrão de divergência por funcionário
  function getPadraoPorFuncionario() {
    const divs = DB.getAll(DB.COLLECTIONS.divergencias);
    const mapa = {};
    divs.forEach(d => {
      const nome = d.funcionarioNome || 'Desconhecido';
      if (!mapa[nome]) mapa[nome] = { total: 0, vermelhos: 0, amarelos: 0, faltas: 0, sobras: 0, somaPctAbs: 0 };
      mapa[nome].total++;
      if (d.severidade === 'vermelho') mapa[nome].vermelhos++;
      if (d.severidade === 'amarelo') mapa[nome].amarelos++;
      if (d.tipo === 'FALTA') mapa[nome].faltas++;
      if (d.tipo === 'SOBRA') mapa[nome].sobras++;
      mapa[nome].somaPctAbs += Math.abs(d.divergenciaPct || 0);
    });
    return Object.entries(mapa).map(([nome, stats]) => ({
      nome,
      ...stats,
      mediaPct: stats.total > 0 ? _arred(stats.somaPctAbs / stats.total) : 0
    })).sort((a, b) => b.vermelhos - a.vermelhos || b.mediaPct - a.mediaPct);
  }

  // Insumos com maior perda acumulada
  function getTopPerdas(limite) {
    const divs = DB.query(DB.COLLECTIONS.divergencias, d => d.tipo === 'FALTA');
    const mapa = {};
    divs.forEach(d => {
      if (!mapa[d.insumoId]) mapa[d.insumoId] = { insumoNome: d.insumoNome, unidade: d.unidade, totalPerda: 0, ocorrencias: 0, vermelhos: 0 };
      mapa[d.insumoId].totalPerda += Math.abs(d.divergenciaAbs || 0);
      mapa[d.insumoId].ocorrencias++;
      if (d.severidade === 'vermelho') mapa[d.insumoId].vermelhos++;
    });
    return Object.entries(mapa).map(([id, stats]) => ({ insumoId: id, ...stats, totalPerda: _arred(stats.totalPerda) }))
      .sort((a, b) => b.totalPerda - a.totalPerda)
      .slice(0, limite || 10);
  }

  // Datas com checklists disponíveis
  function getDatasComChecklist() {
    return [...new Set(
      DB.query(DB.COLLECTIONS.checklists, c => c.status === 'finalizado').map(c => c.data)
    )].sort((a, b) => b.localeCompare(a));
  }

  function _arred(n) {
    return Math.round((n || 0) * 100) / 100;
  }

  return {
    calcularParaData,
    salvarDivergencias,
    getHistoricoPorInsumo,
    getPadraoPorFuncionario,
    getTopPerdas,
    getDatasComChecklist
  };
})();
