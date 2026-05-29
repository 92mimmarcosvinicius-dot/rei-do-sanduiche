/* ============================================
   REI DO SANDUÍCHE — Autenticação (CPF + Senha)
   ============================================ */

const Auth = (() => {
  const SESSION_CHECK_INTERVAL = 60000;
  let _checkTimer = null;

  // Perfis que acessam o painel admin
  const PERFIS_ADMIN = ['master', 'gerente', 'financeiro', 'auditoria', 'visualizacao'];

  function _isPerfilAdmin(perfil) {
    return PERFIS_ADMIN.includes(perfil);
  }

  function _getRedirectUrl(perfil) {
    return _isPerfilAdmin(perfil) ? 'admin.html' : 'operacional.html';
  }

  async function login(cpfStr, senha) {
    const cpfClean = DB.cleanCPF(cpfStr);

    if (cpfClean.length !== 11) {
      return { ok: false, erro: 'CPF deve ter 11 dígitos' };
    }

    // CPF 000.000.000-00 é o admin padrão, pula validação de CPF real
    if (cpfClean !== '00000000000' && !DB.validarCPF(cpfClean)) {
      return { ok: false, erro: 'CPF inválido' };
    }

    const usuarios = DB.getAll(DB.COLLECTIONS.usuarios);
    const user = usuarios.find(u => DB.cleanCPF(u.cpf) === cpfClean);

    if (!user) {
      DB.addLog({
        acao: 'LOGIN_FALHA',
        detalhes: 'CPF não cadastrado: ' + DB.formatCPF(cpfClean)
      });
      return { ok: false, erro: 'CPF não cadastrado no sistema' };
    }

    if (!user.ativo) {
      DB.addLog({
        acao: 'LOGIN_BLOQUEADO',
        detalhes: 'Tentativa de login de usuário inativo: ' + user.nome,
        entidade: 'usuario',
        entidadeId: user.id
      });
      return { ok: false, erro: 'Acesso bloqueado. Fale com a administração.' };
    }

    // Verificar senha
    const hash = await DB.hashPassword(senha);
    const isSyncHash = user.senhaHash.startsWith('sync_');
    let senhaCorreta = false;

    if (isSyncHash) {
      // Seed síncrono — comparar com hash sync da senha digitada
      const syncCheck = DB._hashPassword(senha);
      senhaCorreta = user.senhaHash === syncCheck;
    } else {
      senhaCorreta = user.senhaHash === hash;
    }

    if (!senhaCorreta) {
      DB.addLog({
        acao: 'LOGIN_FALHA',
        detalhes: 'Senha incorreta para: ' + user.nome + ' (' + DB.formatCPF(cpfClean) + ')',
        entidade: 'usuario',
        entidadeId: user.id
      });
      return { ok: false, erro: 'Senha incorreta' };
    }

    // Se era hash síncrono, atualizar para SHA-256
    if (isSyncHash) {
      DB.update(DB.COLLECTIONS.usuarios, user.id, { senhaHash: hash });
    }

    // Criar sessão
    const session = DB.setSession({
      usuarioId: user.id,
      nome: user.nome,
      cpf: user.cpf,
      perfil: user.perfil,
      cargo: user.cargo || ''
    });

    DB.addLog({
      acao: 'LOGIN',
      detalhes: 'Login bem-sucedido — Perfil: ' + (DB.PERFIS[user.perfil] || {}).nome + ' — IP/Sessão: ' + session.criadaEm,
      entidade: 'usuario',
      entidadeId: user.id
    });

    _startSessionCheck();

    return {
      ok: true,
      session,
      perfil: user.perfil,
      primeiroAcesso: user.primeiroAcesso === true,
      redirectUrl: _getRedirectUrl(user.perfil)
    };
  }

  function logout() {
    const session = DB.getSession();
    if (session) {
      DB.addLog({
        acao: 'LOGOUT',
        detalhes: 'Logout manual — Sessão durou desde ' + session.criadaEm,
        entidade: 'usuario',
        entidadeId: session.usuarioId
      });
    }
    DB.destroySession();
    _stopSessionCheck();
    window.location.href = 'index.html';
  }

  function requireAuth(perfisPermitidos) {
    const session = DB.getSession();

    if (!session) {
      window.location.href = 'index.html';
      return null;
    }

    // perfisPermitidos pode ser string ou array
    if (perfisPermitidos) {
      const lista = Array.isArray(perfisPermitidos) ? perfisPermitidos : [perfisPermitidos];
      if (!lista.includes(session.perfil)) {
        // Master tem acesso a tudo
        if (session.perfil !== 'master') {
          window.location.href = 'index.html';
          return null;
        }
      }
    }

    _startSessionCheck();
    return session;
  }

  function requireAdmin() {
    return requireAuth(PERFIS_ADMIN);
  }

  function requireOperacional() {
    return requireAuth(['operacional']);
  }

  function isLoggedIn() {
    return DB.getSession() !== null;
  }

  function getCurrentUser() {
    const session = DB.getSession();
    if (!session) return null;
    return DB.getById(DB.COLLECTIONS.usuarios, session.usuarioId);
  }

  function temPermissao(permissao) {
    const session = DB.getSession();
    if (!session) return false;

    const perfil = DB.PERFIS[session.perfil];
    if (!perfil) return false;
    if (perfil.acessoTotal) return true;

    const permissoesPorPerfil = {
      gerente: ['ver_dashboard', 'ver_divergencias', 'ver_insumos', 'editar_insumos', 'ver_fichas', 'editar_fichas', 'ver_compras', 'editar_compras', 'ver_vendas', 'ver_checklists', 'ver_usuarios', 'ver_logs'],
      financeiro: ['ver_dashboard', 'ver_compras', 'editar_compras', 'ver_vendas', 'ver_divergencias'],
      auditoria: ['ver_dashboard', 'ver_divergencias', 'ver_insumos', 'ver_fichas', 'ver_compras', 'ver_vendas', 'ver_checklists', 'ver_usuarios', 'ver_logs'],
      visualizacao: ['ver_dashboard', 'ver_divergencias', 'ver_insumos', 'ver_compras', 'ver_vendas', 'ver_checklists'],
      operacional: ['checklist', 'registrar_venda', 'ver_estoque']
    };

    const perms = permissoesPorPerfil[session.perfil] || [];
    return perms.includes(permissao);
  }

  async function changePassword(senhaAtual, novaSenha) {
    const session = DB.getSession();
    if (!session) return { ok: false, erro: 'Não autenticado' };

    const user = DB.getById(DB.COLLECTIONS.usuarios, session.usuarioId);
    if (!user) return { ok: false, erro: 'Usuário não encontrado' };

    // Verificar senha atual
    const isSyncHash = user.senhaHash.startsWith('sync_');
    let senhaAtualCorreta = false;

    if (isSyncHash) {
      senhaAtualCorreta = user.senhaHash === DB._hashPassword(senhaAtual);
    } else {
      const hashAtual = await DB.hashPassword(senhaAtual);
      senhaAtualCorreta = user.senhaHash === hashAtual;
    }

    if (!senhaAtualCorreta) {
      return { ok: false, erro: 'Senha atual incorreta' };
    }

    if (novaSenha.length < 4) {
      return { ok: false, erro: 'Nova senha deve ter ao menos 4 caracteres' };
    }

    const novoHash = await DB.hashPassword(novaSenha);
    DB.update(DB.COLLECTIONS.usuarios, user.id, {
      senhaHash: novoHash,
      primeiroAcesso: false
    });

    DB.addLog({
      acao: 'ALTERAR_SENHA',
      entidade: 'usuario',
      entidadeId: user.id,
      detalhes: 'Senha alterada pelo próprio usuário'
    });

    // Atualizar sessão para refletir que não é mais primeiro acesso
    const currentSession = DB.getSession();
    if (currentSession) {
      DB.setSession({ ...currentSession, primeiroAcesso: false });
    }

    return { ok: true };
  }

  async function forceChangePassword(userId, novaSenha) {
    const session = DB.getSession();
    if (!session) return { ok: false, erro: 'Não autenticado' };

    const perfilAdmin = DB.PERFIS[session.perfil];
    if (!perfilAdmin || perfilAdmin.nivel < 80) {
      return { ok: false, erro: 'Sem permissão para redefinir senhas' };
    }

    if (novaSenha.length < 4) {
      return { ok: false, erro: 'Senha deve ter ao menos 4 caracteres' };
    }

    const novoHash = await DB.hashPassword(novaSenha);
    const result = DB.update(DB.COLLECTIONS.usuarios, userId, {
      senhaHash: novoHash,
      primeiroAcesso: true
    });

    if (!result) return { ok: false, erro: 'Usuário não encontrado' };

    DB.addLog({
      acao: 'REDEFINIR_SENHA',
      entidade: 'usuario',
      entidadeId: userId,
      detalhes: 'Senha redefinida por admin: ' + session.nome + '. Usuário terá que trocar no próximo login.',
      valorAnterior: 'hash oculto',
      valorNovo: 'nova senha definida'
    });

    return { ok: true };
  }

  async function createUser(dados) {
    const session = DB.getSession();
    if (!session) return { ok: false, erro: 'Não autenticado' };

    const perfilAdmin = DB.PERFIS[session.perfil];
    if (!perfilAdmin || perfilAdmin.nivel < 80) {
      return { ok: false, erro: 'Sem permissão para cadastrar usuários' };
    }

    const cpfClean = DB.cleanCPF(dados.cpf);

    // Verificar CPF duplicado
    const existente = DB.query(DB.COLLECTIONS.usuarios, u => DB.cleanCPF(u.cpf) === cpfClean);
    if (existente.length > 0) {
      return { ok: false, erro: 'Já existe um usuário com este CPF' };
    }

    // Senha inicial: nome em CAPS LOCK (sem acentos, sem espaços)
    const senhaInicial = dados.nome
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '')
      .toUpperCase();

    const hash = await DB.hashPassword(senhaInicial);

    const user = DB.insert(DB.COLLECTIONS.usuarios, {
      nome: dados.nome.trim(),
      cpf: cpfClean,
      telefone: dados.telefone || '',
      cargo: dados.cargo || 'Atendente',
      perfil: dados.perfil || 'operacional',
      ativo: true,
      foto: dados.foto || null,
      senhaHash: hash,
      primeiroAcesso: true,
      dataCadastro: new Date().toISOString()
    });

    DB.addLog({
      acao: 'CADASTRAR_USUARIO',
      entidade: 'usuario',
      entidadeId: user.id,
      detalhes: 'Novo usuário: ' + dados.nome + ' — CPF: ' + DB.formatCPF(cpfClean) + ' — Perfil: ' + (DB.PERFIS[dados.perfil || 'operacional'] || {}).nome + ' — Senha inicial: nome em CAPS',
      valorNovo: JSON.stringify({ nome: dados.nome, cpf: DB.formatCPF(cpfClean), perfil: dados.perfil || 'operacional' })
    });

    return { ok: true, user, senhaInicial };
  }

  function updateUser(userId, changes) {
    const session = DB.getSession();
    if (!session) return { ok: false, erro: 'Não autenticado' };

    const perfilAdmin = DB.PERFIS[session.perfil];
    if (!perfilAdmin || perfilAdmin.nivel < 80) {
      return { ok: false, erro: 'Sem permissão' };
    }

    const userAtual = DB.getById(DB.COLLECTIONS.usuarios, userId);
    if (!userAtual) return { ok: false, erro: 'Usuário não encontrado' };

    // Se mudou CPF, verificar duplicidade
    if (changes.cpf) {
      const cpfClean = DB.cleanCPF(changes.cpf);
      const existente = DB.query(DB.COLLECTIONS.usuarios, u => DB.cleanCPF(u.cpf) === cpfClean && u.id !== userId);
      if (existente.length > 0) {
        return { ok: false, erro: 'CPF já em uso por outro usuário' };
      }
      changes.cpf = cpfClean;
    }

    const result = DB.update(DB.COLLECTIONS.usuarios, userId, changes);

    const camposAlterados = Object.keys(changes).filter(k => k !== 'atualizadoEm').join(', ');
    DB.addLog({
      acao: 'EDITAR_USUARIO',
      entidade: 'usuario',
      entidadeId: userId,
      detalhes: 'Campos alterados: ' + camposAlterados,
      valorAnterior: JSON.stringify(Object.keys(changes).reduce((acc, k) => { acc[k] = userAtual[k]; return acc; }, {})),
      valorNovo: JSON.stringify(changes)
    });

    return { ok: true, updated: result.updated };
  }

  function toggleUserStatus(userId) {
    const session = DB.getSession();
    if (!session) return { ok: false, erro: 'Não autenticado' };

    if (userId === session.usuarioId) {
      return { ok: false, erro: 'Você não pode bloquear sua própria conta' };
    }

    const user = DB.getById(DB.COLLECTIONS.usuarios, userId);
    if (!user) return { ok: false, erro: 'Usuário não encontrado' };

    const novoStatus = !user.ativo;
    DB.update(DB.COLLECTIONS.usuarios, userId, { ativo: novoStatus });

    DB.addLog({
      acao: novoStatus ? 'ATIVAR_USUARIO' : 'BLOQUEAR_USUARIO',
      entidade: 'usuario',
      entidadeId: userId,
      detalhes: (novoStatus ? 'Ativado' : 'Bloqueado') + ': ' + user.nome,
      valorAnterior: String(!novoStatus),
      valorNovo: String(novoStatus)
    });

    return { ok: true, ativo: novoStatus };
  }

  function removeUser(userId) {
    const session = DB.getSession();
    if (!session) return { ok: false, erro: 'Não autenticado' };

    const perfilAdmin = DB.PERFIS[session.perfil];
    if (!perfilAdmin || perfilAdmin.nivel < 100) {
      return { ok: false, erro: 'Apenas o Administrador Master pode remover usuários' };
    }

    if (userId === session.usuarioId) {
      return { ok: false, erro: 'Você não pode remover sua própria conta' };
    }

    const user = DB.getById(DB.COLLECTIONS.usuarios, userId);
    if (!user) return { ok: false, erro: 'Usuário não encontrado' };

    DB.remove(DB.COLLECTIONS.usuarios, userId);

    DB.addLog({
      acao: 'REMOVER_USUARIO',
      entidade: 'usuario',
      entidadeId: userId,
      detalhes: 'Removido permanentemente: ' + user.nome + ' — CPF: ' + DB.formatCPF(user.cpf),
      valorAnterior: JSON.stringify({ nome: user.nome, cpf: DB.formatCPF(user.cpf), perfil: user.perfil })
    });

    return { ok: true };
  }

  function getUserHistory(userId) {
    return DB.getLogs({ usuarioId: userId });
  }

  function _startSessionCheck() {
    _stopSessionCheck();
    _checkTimer = setInterval(() => {
      if (!DB.getSession()) {
        _stopSessionCheck();
        if (typeof App !== 'undefined') {
          App.toast('Sessão expirada. Faça login novamente.', 'warning');
        }
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
      }
    }, SESSION_CHECK_INTERVAL);
  }

  function _stopSessionCheck() {
    if (_checkTimer) {
      clearInterval(_checkTimer);
      _checkTimer = null;
    }
  }

  return {
    PERFIS_ADMIN,
    login,
    logout,
    requireAuth,
    requireAdmin,
    requireOperacional,
    isLoggedIn,
    getCurrentUser,
    temPermissao,
    changePassword,
    forceChangePassword,
    createUser,
    updateUser,
    toggleUserStatus,
    removeUser,
    getUserHistory,
    _isPerfilAdmin,
    _getRedirectUrl
  };
})();
