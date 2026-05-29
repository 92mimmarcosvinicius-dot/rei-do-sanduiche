/* ============================================
   REI DO SANDUICHE — Camada Cloud (Supabase)
   ============================================
   Intercepta DB.insert/update/remove/addLog
   e sincroniza com Supabase em background.
   Leitura continua via localStorage (sync).
   Escrita vai pra localStorage + nuvem (async).
   ============================================ */

const DBCloud = (() => {
  let _sb = null;
  let _ready = false;
  let _queue = [];

  // ---- Init: baixar dados da nuvem para localStorage ----
  async function init() {
    const url = window.REI_SUPABASE_URL || '';
    const key = window.REI_SUPABASE_KEY || '';

    if (!url || !key) {
      console.log('[DBCloud] Sem config Supabase — modo local (localStorage)');
      return false;
    }

    if (typeof supabase === 'undefined') {
      console.warn('[DBCloud] Supabase JS nao carregado');
      return false;
    }

    try {
      _sb = supabase.createClient(url, key);

      // Baixar TODOS os dados da nuvem
      const { data, error } = await _sb.from('rei_data').select('collection, item_id, data');
      if (error) throw error;

      if (data && data.length > 0) {
        // Agrupar por collection
        const groups = {};
        data.forEach(row => {
          if (!groups[row.collection]) groups[row.collection] = [];
          groups[row.collection].push(row);
        });

        // Popular localStorage
        Object.entries(groups).forEach(([col, rows]) => {
          if (col === 'config') {
            // Config e um objeto unico
            localStorage.setItem('rei_config', JSON.stringify(rows[0].data));
          } else if (col === 'checklist_fotos') {
            // Fotos: cada row e um checklist
            rows.forEach(r => {
              if (r.data && r.item_id) {
                localStorage.setItem('rei_ck_fotos_' + r.item_id, JSON.stringify(r.data));
              }
            });
          } else {
            // Collections normais: array de objetos
            const items = rows.map(r => r.data);
            localStorage.setItem('rei_' + col, JSON.stringify(items));
          }
        });

        console.log('[DBCloud] Dados baixados: ' + data.length + ' registros');
      } else {
        console.log('[DBCloud] Nuvem vazia — dados locais serao enviados');
      }

      // Patch nos metodos do DB
      _patchDB();
      _patchLocalStorage();
      _ready = true;

      // Se a nuvem estava vazia mas localStorage tem dados, enviar tudo
      if (!data || data.length === 0) {
        _pushAllToCloud();
      }

      return true;
    } catch (e) {
      console.error('[DBCloud] Erro na inicializacao:', e);
      return false;
    }
  }

  // ---- Patch: interceptar metodos do DB ----
  function _patchDB() {
    const origInsert = DB.insert;
    DB.insert = function (collection, data) {
      const result = origInsert.call(DB, collection, data);
      _cloudUpsert(collection, result);
      return result;
    };

    const origUpdate = DB.update;
    DB.update = function (collection, id, changes) {
      const result = origUpdate.call(DB, collection, id, changes);
      if (result && result.updated) {
        _cloudUpsert(collection, result.updated);
      }
      return result;
    };

    const origRemove = DB.remove;
    DB.remove = function (collection, id) {
      const result = origRemove.call(DB, collection, id);
      if (result) {
        _cloudDelete(collection, id);
      }
      return result;
    };

    const origAddLog = DB.addLog;
    DB.addLog = function (action) {
      const result = origAddLog.call(DB, action);
      if (result) {
        _cloudUpsert('logs', result);
      }
      return result;
    };

    // Patch downloadBackup para incluir fonte
    const origBackup = DB.downloadBackup;
    DB.downloadBackup = function () {
      origBackup.call(DB);
    };
  }

  // ---- Patch: interceptar localStorage.setItem para fotos ----
  function _patchLocalStorage() {
    const origSetItem = localStorage.setItem.bind(localStorage);

    localStorage.setItem = function (key, value) {
      origSetItem(key, value);

      // Interceptar fotos de checklist
      if (key.startsWith('rei_ck_fotos_')) {
        const checklistId = key.replace('rei_ck_fotos_', '');
        try {
          _cloudUpsertFotos(checklistId, JSON.parse(value));
        } catch (e) {}
      }

      // Interceptar config
      if (key === 'rei_config') {
        try {
          _cloudUpsertConfig(JSON.parse(value));
        } catch (e) {}
      }
    };

    // Interceptar removeItem para fotos
    const origRemoveItem = localStorage.removeItem.bind(localStorage);
    localStorage.removeItem = function (key) {
      origRemoveItem(key);
      if (key.startsWith('rei_ck_fotos_')) {
        const checklistId = key.replace('rei_ck_fotos_', '');
        _cloudDelete('checklist_fotos', checklistId);
      }
    };
  }

  // ---- Cloud operations (fire-and-forget) ----
  function _cloudUpsert(collection, record) {
    if (!_sb || !record) return;
    _sb.from('rei_data').upsert({
      collection: collection,
      item_id: record.id || 'unknown',
      data: record,
      updated_at: new Date().toISOString()
    }).then(({ error }) => {
      if (error) console.error('[DBCloud] Upsert erro:', collection, error.message);
    });
  }

  function _cloudDelete(collection, itemId) {
    if (!_sb) return;
    _sb.from('rei_data').delete()
      .eq('collection', collection)
      .eq('item_id', itemId)
      .then(({ error }) => {
        if (error) console.error('[DBCloud] Delete erro:', collection, error.message);
      });
  }

  function _cloudUpsertConfig(configData) {
    if (!_sb) return;
    _sb.from('rei_data').upsert({
      collection: 'config',
      item_id: 'main',
      data: configData,
      updated_at: new Date().toISOString()
    }).then(({ error }) => {
      if (error) console.error('[DBCloud] Config erro:', error.message);
    });
  }

  function _cloudUpsertFotos(checklistId, fotos) {
    if (!_sb) return;
    _sb.from('rei_data').upsert({
      collection: 'checklist_fotos',
      item_id: checklistId,
      data: fotos,
      updated_at: new Date().toISOString()
    }).then(({ error }) => {
      if (error) console.error('[DBCloud] Fotos erro:', error.message);
    });
  }

  // ---- Push tudo do localStorage para nuvem (primeira vez) ----
  async function _pushAllToCloud() {
    if (!_sb) return;
    console.log('[DBCloud] Enviando dados locais para a nuvem...');

    const collections = Object.values(DB.COLLECTIONS);
    for (const col of collections) {
      try {
        const raw = localStorage.getItem('rei_' + col);
        if (!raw) continue;
        const items = JSON.parse(raw);
        if (!Array.isArray(items) || items.length === 0) continue;

        const rows = items.map(item => ({
          collection: col,
          item_id: item.id || DB._generateId(),
          data: item,
          updated_at: new Date().toISOString()
        }));

        // Enviar em lotes de 50
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50);
          const { error } = await _sb.from('rei_data').upsert(batch);
          if (error) console.error('[DBCloud] Push erro ' + col + ':', error.message);
        }
      } catch (e) {
        console.error('[DBCloud] Push erro ' + col + ':', e);
      }
    }

    // Config
    try {
      const cfgRaw = localStorage.getItem('rei_config');
      if (cfgRaw) {
        await _sb.from('rei_data').upsert({
          collection: 'config',
          item_id: 'main',
          data: JSON.parse(cfgRaw),
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {}

    // Fotos
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('rei_ck_fotos_')) {
        try {
          const checklistId = key.replace('rei_ck_fotos_', '');
          const fotos = JSON.parse(localStorage.getItem(key));
          await _sb.from('rei_data').upsert({
            collection: 'checklist_fotos',
            item_id: checklistId,
            data: fotos,
            updated_at: new Date().toISOString()
          });
        } catch (e) {}
      }
    }

    console.log('[DBCloud] Dados locais enviados para a nuvem!');
  }

  // ---- Status ----
  function isReady() { return _ready; }
  function isCloud() { return !!_sb; }

  return { init, isReady, isCloud };
})();
