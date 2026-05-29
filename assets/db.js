/* ============================================
   REI DO SANDUÍCHE — Camada de Dados (localStorage)
   ============================================ */

const DB = (() => {
  const STORAGE_PREFIX = 'rei_';
  const DB_VERSION = 2;

  const COLLECTIONS = {
    usuarios: 'usuarios',
    insumos: 'insumos',
    fichasTecnicas: 'fichas_tecnicas',
    fichas_tecnicas: 'fichas_tecnicas',
    categorias: 'categorias',
    checklists: 'checklists',
    compras: 'compras',
    vendas: 'vendas',
    divergencias: 'divergencias',
    logs: 'logs',
    config: 'config'
  };

  const PERFIS = {
    master: { nome: 'Administrador Master', nivel: 100, acessoTotal: true },
    gerente: { nome: 'Gerente Operacional', nivel: 80, acessoTotal: false },
    financeiro: { nome: 'Financeiro', nivel: 60, acessoTotal: false },
    auditoria: { nome: 'Auditoria', nivel: 50, acessoTotal: false },
    visualizacao: { nome: 'Somente Visualização', nivel: 20, acessoTotal: false },
    operacional: { nome: 'Operacional (Funcionário)', nivel: 10, acessoTotal: false }
  };

  function _key(collection) {
    return STORAGE_PREFIX + collection;
  }

  function _read(collection) {
    try {
      const raw = localStorage.getItem(_key(collection));
      return raw ? JSON.parse(raw) : [];
    } catch {
      console.error('Erro ao ler ' + collection);
      return [];
    }
  }

  function _write(collection, data) {
    try {
      localStorage.setItem(_key(collection), JSON.stringify(data));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('localStorage cheio');
      }
      return false;
    }
  }

  function _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  function _timestamp() {
    return new Date().toISOString();
  }

  // --- CRUD Genérico ---

  function getAll(collection) {
    return _read(collection);
  }

  function getById(collection, id) {
    return _read(collection).find(item => item.id === id) || null;
  }

  function insert(collection, data) {
    const items = _read(collection);
    const record = {
      id: _generateId(),
      ...data,
      criadoEm: _timestamp(),
      atualizadoEm: _timestamp()
    };
    items.push(record);
    _write(collection, items);
    return record;
  }

  function update(collection, id, changes) {
    const items = _read(collection);
    const idx = items.findIndex(item => item.id === id);
    if (idx === -1) return null;

    const old = { ...items[idx] };
    items[idx] = { ...items[idx], ...changes, atualizadoEm: _timestamp() };
    _write(collection, items);
    return { old, updated: items[idx] };
  }

  function remove(collection, id) {
    const items = _read(collection);
    const idx = items.findIndex(item => item.id === id);
    if (idx === -1) return null;

    const removed = items.splice(idx, 1)[0];
    _write(collection, items);
    return removed;
  }

  function query(collection, filterFn) {
    return _read(collection).filter(filterFn);
  }

  // --- Logs de Auditoria ---

  function addLog(action) {
    const session = getSession();
    const log = {
      id: _generateId(),
      timestamp: _timestamp(),
      usuarioId: session ? session.usuarioId : 'sistema',
      usuarioNome: session ? session.nome : 'Sistema',
      acao: action.acao,
      entidade: action.entidade || null,
      entidadeId: action.entidadeId || null,
      detalhes: action.detalhes || null,
      valorAnterior: action.valorAnterior || null,
      valorNovo: action.valorNovo || null
    };

    const logs = _read(COLLECTIONS.logs);
    logs.push(log);

    if (logs.length > 5000) {
      logs.splice(0, logs.length - 5000);
    }

    _write(COLLECTIONS.logs, logs);
    return log;
  }

  function getLogs(filters = {}) {
    let logs = _read(COLLECTIONS.logs);

    if (filters.usuarioId) {
      logs = logs.filter(l => l.usuarioId === filters.usuarioId);
    }
    if (filters.acao) {
      logs = logs.filter(l => l.acao === filters.acao);
    }
    if (filters.entidade) {
      logs = logs.filter(l => l.entidade === filters.entidade);
    }
    if (filters.de) {
      logs = logs.filter(l => l.timestamp >= filters.de);
    }
    if (filters.ate) {
      logs = logs.filter(l => l.timestamp <= filters.ate);
    }

    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  // --- Sessão ---

  function setSession(data) {
    const session = {
      ...data,
      criadaEm: _timestamp(),
      expiraEm: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    };
    sessionStorage.setItem(STORAGE_PREFIX + 'session', JSON.stringify(session));
    return session;
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_PREFIX + 'session');
      if (!raw) return null;
      const session = JSON.parse(raw);

      if (new Date(session.expiraEm) < new Date()) {
        destroySession();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  function destroySession() {
    sessionStorage.removeItem(STORAGE_PREFIX + 'session');
  }

  // --- Backup / Export ---

  function exportAll() {
    const snapshot = {
      versao: DB_VERSION,
      exportadoEm: _timestamp(),
      dados: {}
    };

    Object.values(COLLECTIONS).forEach(col => {
      snapshot.dados[col] = _read(col);
    });

    return snapshot;
  }

  function importAll(snapshot) {
    if (!snapshot || !snapshot.dados) return false;

    Object.keys(snapshot.dados).forEach(col => {
      _write(col, snapshot.dados[col]);
    });

    addLog({
      acao: 'IMPORTAR_BACKUP',
      detalhes: 'Backup importado com ' + Object.keys(snapshot.dados).length + ' coleções'
    });

    return true;
  }

  function downloadBackup() {
    const snapshot = exportAll();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rei-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);

    addLog({ acao: 'EXPORTAR_BACKUP', detalhes: 'Download de backup manual' });
  }

  // --- Migração automática (atualiza insumos existentes) ---

  function _migrateV3() {
    const config = _read(COLLECTIONS.config);
    if (config && config.migracao >= 3) return; // já migrou

    const insumos = _read(COLLECTIONS.insumos);
    if (insumos.length === 0) return; // seed ainda não rodou

    // 1. Renomear categorias de bebidas → "Bebidas"
    const categBebidas = ['Bebidas - Latas', 'Bebidas - PET', 'Bebidas - 1L'];
    insumos.forEach(i => {
      if (categBebidas.includes(i.categoria)) i.categoria = 'Bebidas';
    });

    // 2. Mover insumos para categorias corretas
    const mudancasCat = {
      'Presunto': 'Frios', 'Salsicha': 'Frios', 'Calabresa': 'Frios', 'Bacon': 'Frios'
    };
    insumos.forEach(i => { if (mudancasCat[i.nome]) i.categoria = mudancasCat[i.nome]; });

    // 3. Mover Açúcar e Leite para Frutas e Polpas
    insumos.forEach(i => {
      if (i.nome === 'Açúcar' || i.nome === 'Leite') i.categoria = 'Frutas e Polpas';
    });

    // 4. Corrigir unidades
    const mudancasUn = {
      'Sal de Cozinha': 'kg', 'Orégano': 'kg', 'Morango': 'kg', 'Cebola': 'un'
    };
    insumos.forEach(i => { if (mudancasUn[i.nome]) i.unidade = mudancasUn[i.nome]; });

    // 5. Renomear H2O → H2OH
    insumos.forEach(i => { if (i.nome === 'H2O') i.nome = 'H2OH'; });

    // 6. Substituir "Cerveja" por Heineken/Stella/Corona (se existe)
    const idxCerveja = insumos.findIndex(i => i.nome === 'Cerveja');
    if (idxCerveja !== -1) {
      const base = { ...insumos[idxCerveja] };
      insumos[idxCerveja].nome = 'Heineken';
      // Adicionar Stella e Corona se não existem
      if (!insumos.find(i => i.nome === 'Stella')) {
        insumos.push({ ...base, id: _generateId(), nome: 'Stella', criadoEm: _timestamp(), atualizadoEm: _timestamp(), estoqueAtual: 0 });
      }
      if (!insumos.find(i => i.nome === 'Corona')) {
        insumos.push({ ...base, id: _generateId(), nome: 'Corona', criadoEm: _timestamp(), atualizadoEm: _timestamp(), estoqueAtual: 0 });
      }
    }

    // 7. Remover "Porção Pastel Queijo"/"Porção Pastel Carne" duplicatas se existirem como "Porção Pastel Queijo"
    // (manter como estão, nome já correto no seed)

    // 8. Adicionar novos insumos que não existem
    const nomesExistentes = insumos.map(i => i.nome);
    const novos = [
      { nome: 'Porção Pastel Queijo', categoria: 'Proteínas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Porção Pastel Carne', categoria: 'Proteínas', unidade: 'un', estoqueMax: 30 }
    ];
    novos.forEach(n => {
      if (!nomesExistentes.includes(n.nome)) {
        insumos.push({ id: _generateId(), ...n, estoqueAtual: 0, estoqueMin: 0, foto: null, ativo: true, criadoEm: _timestamp(), atualizadoEm: _timestamp() });
      }
    });

    // 9. Adicionar categoria "Frios" se não existe
    const categorias = _read(COLLECTIONS.categorias);
    if (!categorias.find(c => c.nome === 'Frios')) {
      categorias.push({ id: _generateId(), nome: 'Frios', ativo: true, criadoEm: _timestamp(), atualizadoEm: _timestamp() });
      _write(COLLECTIONS.categorias, categorias);
    }
    // Adicionar "Bebidas" se não existe
    if (!categorias.find(c => c.nome === 'Bebidas')) {
      categorias.push({ id: _generateId(), nome: 'Bebidas', ativo: true, criadoEm: _timestamp(), atualizadoEm: _timestamp() });
      _write(COLLECTIONS.categorias, categorias);
    }

    // Salvar insumos atualizados
    _write(COLLECTIONS.insumos, insumos);

    // Marcar migração como feita
    const cfgAtual = _read(COLLECTIONS.config) || {};
    cfgAtual.migracao = 3;
    _write(COLLECTIONS.config, cfgAtual);

    addLog({ acao: 'MIGRACAO_V3', detalhes: 'Insumos atualizados: categorias, unidades, nomes. Cerveja→Heineken/Stella/Corona. Bebidas unificadas.' });
  }

  // --- Seed (dados iniciais) ---

  function seedIfEmpty() {
    const usuarios = _read(COLLECTIONS.usuarios);
    if (usuarios.length > 0) {
      // Já tem dados — rodar migração se necessário
      _migrateV3();
      return false;
    }

    // Admin master padrão — CPF 000.000.000-00 / Senha ADMIN
    insert(COLLECTIONS.usuarios, {
      nome: 'Emilly',
      cpf: '00000000000',
      telefone: '',
      cargo: 'Proprietária',
      perfil: 'master',
      ativo: true,
      foto: null,
      senhaHash: _hashPassword('ADMIN'),
      primeiroAcesso: false,
      dataCadastro: _timestamp()
    });

    // Categorias
    const categs = [
      'Pães', 'Proteínas', 'Frios', 'Queijos e Frios', 'Molhos e Temperos',
      'Embalagens', 'Limpeza', 'Bebidas',
      'Frutas e Polpas', 'Sorvetes e Coberturas',
      'Descartáveis', 'Hortifruti', 'Outros'
    ];
    categs.forEach(nome => insert(COLLECTIONS.categorias, { nome, ativo: true }));

    // Insumos — extraídos do checklist manual
    _seedInsumos();

    _write(COLLECTIONS.config, {
      nomeEstabelecimento: 'Rei do Sanduíche',
      toleranciaDivergencia: 5,
      horaFechamento: '23:00',
      versao: DB_VERSION
    });

    addLog({ acao: 'SEED_INICIAL', detalhes: 'Dados iniciais criados — admin master CPF 000.000.000-00 — ' + _read(COLLECTIONS.insumos).length + ' insumos' });
    return true;
  }

  function _seedInsumos() {
    const itens = [
      // Pães
      { nome: 'Pão Árabe', categoria: 'Pães', unidade: 'un', estoqueMax: 100 },
      { nome: 'Pão Bola', categoria: 'Pães', unidade: 'un', estoqueMax: 120 },
      { nome: 'Pão Batata', categoria: 'Pães', unidade: 'un', estoqueMax: 60 },
      { nome: 'Pão Brioche', categoria: 'Pães', unidade: 'un', estoqueMax: 60 },
      { nome: 'Pão Forma', categoria: 'Pães', unidade: 'un', estoqueMax: 40 },
      // Proteínas
      { nome: 'Frango', categoria: 'Proteínas', unidade: 'kg', estoqueMax: 30 },
      { nome: 'Carne', categoria: 'Proteínas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Filé', categoria: 'Proteínas', unidade: 'kg', estoqueMax: 20 },
      { nome: 'Carne do Sol', categoria: 'Proteínas', unidade: 'kg', estoqueMax: 20 },
      { nome: 'Ovos', categoria: 'Proteínas', unidade: 'un', estoqueMax: 60 },
      { nome: 'Porção Pastel Queijo', categoria: 'Proteínas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Porção Pastel Carne', categoria: 'Proteínas', unidade: 'un', estoqueMax: 30 },
      // Frios
      { nome: 'Presunto', categoria: 'Frios', unidade: 'kg', estoqueMax: 10 },
      { nome: 'Salsicha', categoria: 'Frios', unidade: 'kg', estoqueMax: 20 },
      { nome: 'Calabresa', categoria: 'Frios', unidade: 'kg', estoqueMax: 15 },
      { nome: 'Bacon', categoria: 'Frios', unidade: 'kg', estoqueMax: 10 },
      // Queijos e Frios
      { nome: 'Mussarela', categoria: 'Queijos e Frios', unidade: 'kg', estoqueMax: 15 },
      { nome: 'Cream Cheese', categoria: 'Queijos e Frios', unidade: 'un', estoqueMax: 10 },
      { nome: 'Catupiry', categoria: 'Queijos e Frios', unidade: 'un', estoqueMax: 10 },
      { nome: 'Cheddar', categoria: 'Queijos e Frios', unidade: 'un', estoqueMax: 10 },
      // Molhos e Temperos
      { nome: 'Maionese', categoria: 'Molhos e Temperos', unidade: 'un', estoqueMax: 10 },
      { nome: 'Ketchup', categoria: 'Molhos e Temperos', unidade: 'un', estoqueMax: 10 },
      { nome: 'Mostarda', categoria: 'Molhos e Temperos', unidade: 'un', estoqueMax: 10 },
      { nome: 'Barbecue', categoria: 'Molhos e Temperos', unidade: 'un', estoqueMax: 10 },
      { nome: 'Margarina', categoria: 'Molhos e Temperos', unidade: 'un', estoqueMax: 5 },
      { nome: 'Gordura', categoria: 'Molhos e Temperos', unidade: 'un', estoqueMax: 5 },
      { nome: 'Sal Sachê', categoria: 'Molhos e Temperos', unidade: 'un', estoqueMax: 200 },
      { nome: 'Palito Sachê', categoria: 'Molhos e Temperos', unidade: 'un', estoqueMax: 200 },
      { nome: 'Sal de Cozinha', categoria: 'Molhos e Temperos', unidade: 'kg', estoqueMax: 5 },
      { nome: 'Orégano', categoria: 'Molhos e Temperos', unidade: 'kg', estoqueMax: 5 },
      { nome: 'Adoçante', categoria: 'Molhos e Temperos', unidade: 'un', estoqueMax: 10 },
      // Hortifruti
      { nome: 'Tomate', categoria: 'Hortifruti', unidade: 'kg', estoqueMax: 50 },
      { nome: 'Alface', categoria: 'Hortifruti', unidade: 'un', estoqueMax: 30 },
      { nome: 'Cebola', categoria: 'Hortifruti', unidade: 'un', estoqueMax: 10 },
      { nome: 'Alho', categoria: 'Hortifruti', unidade: 'kg', estoqueMax: 5 },
      { nome: 'Milho', categoria: 'Hortifruti', unidade: 'un', estoqueMax: 15 },
      { nome: 'Batata Frita', categoria: 'Hortifruti', unidade: 'un', estoqueMax: 20 },
      { nome: 'Passas', categoria: 'Hortifruti', unidade: 'kg', estoqueMax: 5 },
      // Bebidas
      { nome: 'Coca Lata', categoria: 'Bebidas', unidade: 'un', estoqueMax: 60 },
      { nome: 'Coca Lata Zero', categoria: 'Bebidas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Uva Lata', categoria: 'Bebidas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Sprite Lata', categoria: 'Bebidas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Laranja Lata', categoria: 'Bebidas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Guaraná Lata', categoria: 'Bebidas', unidade: 'un', estoqueMax: 30 },
      { nome: 'São Geraldo Lata', categoria: 'Bebidas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Coca PET', categoria: 'Bebidas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Coca PET Zero', categoria: 'Bebidas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Coca 1L', categoria: 'Bebidas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Coca 1L Zero', categoria: 'Bebidas', unidade: 'un', estoqueMax: 20 },
      { nome: 'São Geraldo 1L', categoria: 'Bebidas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Guaraná 1L', categoria: 'Bebidas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Água com Gás', categoria: 'Bebidas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Água sem Gás', categoria: 'Bebidas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Heineken', categoria: 'Bebidas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Stella', categoria: 'Bebidas', unidade: 'un', estoqueMax: 30 },
      { nome: 'Corona', categoria: 'Bebidas', unidade: 'un', estoqueMax: 30 },
      { nome: 'H2OH', categoria: 'Bebidas', unidade: 'un', estoqueMax: 20 },
      // Frutas e Polpas
      { nome: 'Leite', categoria: 'Frutas e Polpas', unidade: 'un', estoqueMax: 12 },
      { nome: 'Açúcar', categoria: 'Frutas e Polpas', unidade: 'kg', estoqueMax: 15 },
      { nome: 'Polpa Maracujá', categoria: 'Frutas e Polpas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Polpa Goiaba', categoria: 'Frutas e Polpas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Polpa Cajá', categoria: 'Frutas e Polpas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Polpa Acerola', categoria: 'Frutas e Polpas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Polpa Manga', categoria: 'Frutas e Polpas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Polpa Abacaxi', categoria: 'Frutas e Polpas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Polpa Graviola', categoria: 'Frutas e Polpas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Polpa Ameixa', categoria: 'Frutas e Polpas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Polpa Sapoti', categoria: 'Frutas e Polpas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Polpa Açaí', categoria: 'Frutas e Polpas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Polpa Cupuaçu', categoria: 'Frutas e Polpas', unidade: 'un', estoqueMax: 20 },
      { nome: 'Morango', categoria: 'Frutas e Polpas', unidade: 'kg', estoqueMax: 30 },
      { nome: 'Laranja', categoria: 'Frutas e Polpas', unidade: 'un', estoqueMax: 60 },
      // Sorvetes e Coberturas
      { nome: 'Sorvete Flocos', categoria: 'Sorvetes e Coberturas', unidade: 'un', estoqueMax: 5 },
      { nome: 'Sorvete Morango', categoria: 'Sorvetes e Coberturas', unidade: 'un', estoqueMax: 5 },
      { nome: 'Sorvete Brigadeiro', categoria: 'Sorvetes e Coberturas', unidade: 'un', estoqueMax: 5 },
      { nome: 'Cobertura Chocolate', categoria: 'Sorvetes e Coberturas', unidade: 'un', estoqueMax: 5 },
      { nome: 'Cobertura Morango', categoria: 'Sorvetes e Coberturas', unidade: 'un', estoqueMax: 5 },
      { nome: 'Ovomaltine', categoria: 'Sorvetes e Coberturas', unidade: 'un', estoqueMax: 5 },
      { nome: 'Gelo', categoria: 'Sorvetes e Coberturas', unidade: 'un', estoqueMax: 5 },
      { nome: 'Garrafão de Água', categoria: 'Sorvetes e Coberturas', unidade: 'un', estoqueMax: 5 },
      // Descartáveis
      { nome: 'Guardanapo', categoria: 'Descartáveis', unidade: 'un', estoqueMax: 500 },
      { nome: 'Copo 200ml', categoria: 'Descartáveis', unidade: 'un', estoqueMax: 500 },
      { nome: 'Copo 400ml', categoria: 'Descartáveis', unidade: 'un', estoqueMax: 300 },
      { nome: 'Tampa 400ml', categoria: 'Descartáveis', unidade: 'un', estoqueMax: 300 },
      { nome: 'Garrafa Suco', categoria: 'Descartáveis', unidade: 'un', estoqueMax: 200 },
      { nome: 'Canudo', categoria: 'Descartáveis', unidade: 'un', estoqueMax: 500 },
      { nome: 'Saco Árabe', categoria: 'Descartáveis', unidade: 'un', estoqueMax: 300 },
      { nome: 'Saco Dindim', categoria: 'Descartáveis', unidade: 'un', estoqueMax: 300 },
      { nome: 'Comandas', categoria: 'Descartáveis', unidade: 'un', estoqueMax: 200 },
      { nome: 'Caneta', categoria: 'Descartáveis', unidade: 'un', estoqueMax: 20 },
      // Embalagens
      { nome: 'Sacola P', categoria: 'Embalagens', unidade: 'un', estoqueMax: 300 },
      { nome: 'Sacola M', categoria: 'Embalagens', unidade: 'un', estoqueMax: 300 },
      { nome: 'Saco Lixo', categoria: 'Embalagens', unidade: 'un', estoqueMax: 100 },
      { nome: 'Saco Temperada', categoria: 'Embalagens', unidade: 'un', estoqueMax: 200 },
      { nome: 'Etiqueta Delivery', categoria: 'Embalagens', unidade: 'un', estoqueMax: 300 },
      { nome: 'Embalagem Delivery', categoria: 'Embalagens', unidade: 'un', estoqueMax: 200 },
      { nome: 'Bobina Maquineta', categoria: 'Embalagens', unidade: 'un', estoqueMax: 20 },
      { nome: 'Bobina Impressora', categoria: 'Embalagens', unidade: 'un', estoqueMax: 20 },
      { nome: 'Papel Manteiga', categoria: 'Embalagens', unidade: 'un', estoqueMax: 10 },
      { nome: 'Papel Mão', categoria: 'Embalagens', unidade: 'un', estoqueMax: 20 },
      { nome: 'Papel Toalha', categoria: 'Embalagens', unidade: 'un', estoqueMax: 20 },
      { nome: 'Grampo', categoria: 'Embalagens', unidade: 'un', estoqueMax: 100 },
      // Limpeza
      { nome: 'Álcool', categoria: 'Limpeza', unidade: 'un', estoqueMax: 10 },
      { nome: 'Perfex', categoria: 'Limpeza', unidade: 'un', estoqueMax: 10 },
      { nome: 'Detergente', categoria: 'Limpeza', unidade: 'un', estoqueMax: 10 },
      { nome: 'Água Sanitária', categoria: 'Limpeza', unidade: 'un', estoqueMax: 10 },
      { nome: 'Desinfetante', categoria: 'Limpeza', unidade: 'un', estoqueMax: 10 },
      { nome: 'Papel Higiênico', categoria: 'Limpeza', unidade: 'un', estoqueMax: 30 },
      { nome: 'Pano de Chão', categoria: 'Limpeza', unidade: 'un', estoqueMax: 10 },
      { nome: 'Pano de Prato', categoria: 'Limpeza', unidade: 'un', estoqueMax: 10 },
      { nome: 'Prod. Limp. Verdura', categoria: 'Limpeza', unidade: 'un', estoqueMax: 5 },
      { nome: 'Luva', categoria: 'Limpeza', unidade: 'un', estoqueMax: 20 },
      { nome: 'Touca', categoria: 'Limpeza', unidade: 'un', estoqueMax: 30 },
      { nome: 'Pedra Sanitária', categoria: 'Limpeza', unidade: 'un', estoqueMax: 10 }
    ];

    itens.forEach(item => {
      insert(COLLECTIONS.insumos, {
        nome: item.nome,
        categoria: item.categoria,
        unidade: item.unidade,
        estoqueAtual: 0,
        estoqueMax: item.estoqueMax,
        estoqueMin: 0,
        foto: null,
        ativo: true
      });
    });
  }

  // --- Hash de senha ---

  async function hashPassword(password) {
    const salt = 'rei_salt_2024_';
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function _hashPassword(password) {
    const salt = 'rei_salt_2024_';
    let hash = 0;
    const str = salt + password;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'sync_' + Math.abs(hash).toString(16).padStart(8, '0');
  }

  // --- CPF ---

  function formatCPF(cpf) {
    const digits = cpf.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0, 3) + '.' + digits.slice(3);
    if (digits.length <= 9) return digits.slice(0, 3) + '.' + digits.slice(3, 6) + '.' + digits.slice(6);
    return digits.slice(0, 3) + '.' + digits.slice(3, 6) + '.' + digits.slice(6, 9) + '-' + digits.slice(9);
  }

  function cleanCPF(cpf) {
    return (cpf || '').replace(/\D/g, '');
  }

  function validarCPF(cpf) {
    const digits = cleanCPF(cpf);
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let d1 = 11 - (sum % 11);
    if (d1 >= 10) d1 = 0;
    if (parseInt(digits[9]) !== d1) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    let d2 = 11 - (sum % 11);
    if (d2 >= 10) d2 = 0;
    if (parseInt(digits[10]) !== d2) return false;

    return true;
  }

  // --- Conversões de contagem ---
  // Mapa: nome do insumo → fator de conversão e label para o checklist
  // fator: multiplica a quantidade contada para obter a quantidade real
  // unidadeReal: unidade efetiva após conversão (kg para queijos/molhos)
  const CONVERSOES = {
    // Pães — contagem por pacote
    'Pão Árabe':      { fator: 5,   label: 'Pacote (5 pães)',      tipo: 'pacote' },
    'Pão Batata':     { fator: 4,   label: 'Pacote (4 pães)',      tipo: 'pacote' },
    'Pão Bola':       { fator: 6,   label: 'Pacote (6 pães)',      tipo: 'pacote' },
    'Pão Brioche':    { fator: 6,   label: 'Pacote (6 pães)',      tipo: 'pacote' },
    'Pão Forma':      { fator: 10,  label: 'Pacote (10 pães)',     tipo: 'pacote' },
    // Proteínas — contagem por balde/porção
    'Carne':          { fator: 35,  label: 'Balde (35 porções)',    tipo: 'pacote' },
    'Carne do Sol':   { fator: 0.075, label: 'Porção (75g cada)',   tipo: 'peso', unidadeReal: 'kg' },
    'Filé':           { fator: 0.130, label: 'Porção (130g cada)',  tipo: 'peso', unidadeReal: 'kg' },
    'Frango':         { fator: 0.075, label: 'Porção (75g cada)',   tipo: 'peso', unidadeReal: 'kg' },
    // Queijos/Frios — contagem por unidade com peso
    'Catupiry':       { fator: 1.5, label: 'Unidade (1,5kg cada)', tipo: 'peso', unidadeReal: 'kg' },
    'Cheddar':        { fator: 1.5, label: 'Unidade (1,5kg cada)', tipo: 'peso', unidadeReal: 'kg' },
    'Cream Cheese':   { fator: 1.0, label: 'Unidade (1kg cada)',   tipo: 'peso', unidadeReal: 'kg' },
    // Molhos/Temperos
    'Maionese':       { fator: 6.0, label: 'Caixa (6kg cada)',     tipo: 'peso', unidadeReal: 'kg' },
    'Palito Sachê':   { fator: 1,   label: 'Caixas',               tipo: 'caixa' },
    'Sal Sachê':      { fator: 1,   label: 'Caixas',               tipo: 'caixa' },
    // Hortifruti
    'Batata Frita':   { fator: 2.5, label: 'Unidade (2,5kg cada)', tipo: 'peso', unidadeReal: 'kg' },
    'Milho':          { fator: 1.7, label: 'Lata (1,7kg cada)',    tipo: 'peso', unidadeReal: 'kg' },
    // Sorvetes
    'Sorvete Flocos':     { fator: 5, label: 'Pote (5 milkshakes)',  tipo: 'pacote' },
    'Sorvete Morango':    { fator: 5, label: 'Pote (5 milkshakes)',  tipo: 'pacote' },
    'Sorvete Brigadeiro': { fator: 5, label: 'Pote (5 milkshakes)',  tipo: 'pacote' },
    'Ovomaltine':     { fator: 0.75, label: 'Pacote (750g cada)',   tipo: 'peso', unidadeReal: 'kg' },
    // Descartáveis — pacotes grandes
    'Saco Árabe':     { fator: 1000, label: 'Pacote (1.000 un)',   tipo: 'pacote' },
    'Saco Dindim':    { fator: 1000, label: 'Pacote (1.000 un)',   tipo: 'pacote' },
    'Tampa 400ml':    { fator: 50,   label: 'Pacote (50 un)',      tipo: 'pacote' },
    'Copo 400ml':     { fator: 50,   label: 'Pacote (50 un)',      tipo: 'pacote' }
  };

  function getConversao(nomeInsumo) {
    return CONVERSOES[nomeInsumo] || null;
  }

  function converterContagem(nomeInsumo, qtdContada) {
    const conv = CONVERSOES[nomeInsumo];
    if (!conv) return qtdContada;
    return qtdContada * conv.fator;
  }

  // --- Divergências ---

  function calcularDivergencia(insumoId, estoqueReal) {
    const insumo = getById(COLLECTIONS.insumos, insumoId);
    if (!insumo) return null;

    const estoqueTeoricoAtual = insumo.estoqueAtual || 0;
    const diferenca = estoqueReal - estoqueTeoricoAtual;
    const percentual = estoqueTeoricoAtual > 0
      ? Math.abs((diferenca / estoqueTeoricoAtual) * 100).toFixed(1)
      : 0;

    const config = _read(COLLECTIONS.config);
    const tolerancia = config.toleranciaDivergencia || 5;

    return {
      insumoId,
      insumoNome: insumo.nome,
      estoqueTeoricoAtual,
      estoqueReal,
      diferenca,
      percentual: parseFloat(percentual),
      tipo: diferenca < 0 ? 'FALTA' : diferenca > 0 ? 'SOBRA' : 'OK',
      critico: parseFloat(percentual) > tolerancia
    };
  }

  return {
    COLLECTIONS,
    PERFIS,
    CONVERSOES,
    getAll,
    getById,
    insert,
    update,
    remove,
    query,
    addLog,
    getLogs,
    setSession,
    getSession,
    destroySession,
    exportAll,
    importAll,
    downloadBackup,
    seedIfEmpty,
    hashPassword,
    _hashPassword,
    formatCPF,
    cleanCPF,
    validarCPF,
    calcularDivergencia,
    getConversao,
    converterContagem,
    _generateId
  };
})();
