/* ============================================
   REI DO SANDUÍCHE — Admin: Gestão de Usuários
   ============================================ */

const AdminUsuarios = (() => {
  let _fotoBase64 = null;

  function render() {
    const session = DB.getSession();
    const perfilNivel = (DB.PERFIS[session.perfil] || {}).nivel || 0;
    const podeEditar = perfilNivel >= 80;

    const usuarios = DB.getAll(DB.COLLECTIONS.usuarios);
    const ativos = usuarios.filter(u => u.ativo).length;
    const inativos = usuarios.filter(u => !u.ativo).length;

    let html = '';

    // Header com stats e botão
    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem">';
    html += '<div class="flex items-center gap-4">';
    html += '<span class="badge badge-success">' + ativos + ' ativos</span>';
    html += '<span class="badge badge-danger">' + inativos + ' inativos</span>';
    html += '<span class="badge badge-neutral">' + usuarios.length + ' total</span>';
    html += '</div>';
    if (podeEditar) {
      html += '<button class="btn btn-primary btn-sm" onclick="AdminUsuarios.abrirNovo()">+ Novo Funcionário</button>';
    }
    html += '</div>';

    // Busca
    html += '<div class="card mb-4" style="padding:0.75rem 1rem">';
    html += '<input class="form-input" type="text" id="busca-usuario" placeholder="Buscar por nome, CPF ou cargo..." style="border:none;background:transparent;padding:0">';
    html += '</div>';

    // Tabela
    html += '<div class="card" style="padding:0">';
    html += '<div class="table-container" id="tabela-usuarios">';
    html += _renderTable(usuarios, podeEditar, session.usuarioId);
    html += '</div></div>';

    document.getElementById('page-content').innerHTML = html;

    // Busca com debounce
    const buscaInput = document.getElementById('busca-usuario');
    if (buscaInput) {
      buscaInput.addEventListener('input', App.debounce(() => {
        const termo = buscaInput.value.toLowerCase().trim();
        const filtrados = usuarios.filter(u => {
          return u.nome.toLowerCase().includes(termo) ||
                 DB.formatCPF(u.cpf).includes(termo) ||
                 (u.cargo || '').toLowerCase().includes(termo);
        });
        document.getElementById('tabela-usuarios').innerHTML = _renderTable(filtrados, podeEditar, session.usuarioId);
      }, 200));
    }
  }

  function _renderTable(usuarios, podeEditar, meuId) {
    if (usuarios.length === 0) {
      return '<div class="empty-state" style="padding:2rem"><p class="empty-state-title">Nenhum usuário encontrado</p></div>';
    }

    let html = '<table class="table"><thead><tr>';
    html += '<th>Funcionário</th><th>CPF</th><th>Cargo</th><th>Perfil</th><th>Status</th><th>Cadastro</th>';
    if (podeEditar) html += '<th style="text-align:right">Ações</th>';
    html += '</tr></thead><tbody>';

    usuarios.forEach(u => {
      const perfil = DB.PERFIS[u.perfil] || {};
      const isMe = u.id === meuId;
      const cpfFormatado = DB.formatCPF(u.cpf || '');

      html += '<tr>';

      // Avatar + Nome
      html += '<td><div class="flex items-center gap-2">';
      html += App.renderAvatar(u.nome, u.foto, 32);
      html += '<div><div class="font-medium">' + App.escapeHtml(u.nome) + '</div>';
      if (u.primeiroAcesso) html += '<span class="text-xs text-muted">(1º acesso pendente)</span>';
      if (isMe) html += '<span class="badge badge-info" style="margin-left:0.25rem">Você</span>';
      html += '</div></div></td>';

      // CPF
      html += '<td class="text-sm" style="font-family:var(--font-mono)">' + App.escapeHtml(cpfFormatado) + '</td>';

      // Cargo
      html += '<td class="text-sm">' + App.escapeHtml(u.cargo || '-') + '</td>';

      // Perfil
      const perfilBadge = u.perfil === 'master' ? 'badge-danger' :
                          u.perfil === 'gerente' ? 'badge-warning' :
                          u.perfil === 'operacional' ? 'badge-info' : 'badge-neutral';
      html += '<td><span class="badge ' + perfilBadge + '">' + App.escapeHtml(perfil.nome || u.perfil) + '</span></td>';

      // Status
      html += '<td><span class="badge ' + (u.ativo ? 'badge-success' : 'badge-danger') + '">' + (u.ativo ? 'Ativo' : 'Inativo') + '</span></td>';

      // Data cadastro
      html += '<td class="text-xs text-muted">' + App.formatDateShort(u.dataCadastro || u.criadoEm) + '</td>';

      // Ações
      if (podeEditar) {
        html += '<td style="text-align:right;white-space:nowrap">';
        html += '<div style="display:inline-flex;gap:0.25rem">';

        // Editar
        html += '<button class="btn btn-ghost btn-sm" onclick="AdminUsuarios.abrirEditar(\'' + u.id + '\')" title="Editar">';
        html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>';

        // Bloquear/Ativar
        if (!isMe) {
          const toggleIcon = u.ativo
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
          html += '<button class="btn btn-ghost btn-sm" onclick="AdminUsuarios.toggleStatus(\'' + u.id + '\')" title="' + (u.ativo ? 'Bloquear' : 'Ativar') + '">' + toggleIcon + '</button>';
        }

        // Redefinir Senha
        html += '<button class="btn btn-ghost btn-sm" onclick="AdminUsuarios.abrirResetSenha(\'' + u.id + '\')" title="Redefinir senha">';
        html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></button>';

        // Histórico
        html += '<button class="btn btn-ghost btn-sm" onclick="AdminUsuarios.verHistorico(\'' + u.id + '\')" title="Histórico">';
        html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>';

        // Remover (só master)
        const session = DB.getSession();
        if (!isMe && session.perfil === 'master') {
          html += '<button class="btn btn-ghost btn-sm" onclick="AdminUsuarios.remover(\'' + u.id + '\')" title="Remover" style="color:var(--danger)">';
          html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
        }

        html += '</div></td>';
      }

      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  // --- Abrir modal novo ---
  function abrirNovo() {
    _fotoBase64 = null;
    document.getElementById('modal-usuario-titulo').textContent = 'Novo Funcionário';
    document.getElementById('usr-id').value = '';
    document.getElementById('usr-nome').value = '';
    document.getElementById('usr-cpf').value = '';
    document.getElementById('usr-telefone').value = '';
    document.getElementById('usr-cargo').value = 'Atendente';
    document.getElementById('usr-perfil').value = 'operacional';
    document.getElementById('usr-foto-data').value = '';
    document.getElementById('error-usuario').style.display = 'none';

    const preview = document.getElementById('foto-preview');
    preview.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

    _initFotoInput();
    _initMasks();
    App.openModal('modal-usuario');
  }

  // --- Abrir modal editar ---
  function abrirEditar(userId) {
    const user = DB.getById(DB.COLLECTIONS.usuarios, userId);
    if (!user) return;

    _fotoBase64 = user.foto || null;
    document.getElementById('modal-usuario-titulo').textContent = 'Editar: ' + user.nome;
    document.getElementById('usr-id').value = user.id;
    document.getElementById('usr-nome').value = user.nome;
    document.getElementById('usr-cpf').value = DB.formatCPF(user.cpf || '');
    document.getElementById('usr-telefone').value = user.telefone || '';
    document.getElementById('usr-cargo').value = user.cargo || '';
    document.getElementById('usr-perfil').value = user.perfil;
    document.getElementById('usr-foto-data').value = user.foto || '';
    document.getElementById('error-usuario').style.display = 'none';

    const preview = document.getElementById('foto-preview');
    if (user.foto) {
      preview.innerHTML = '<img src="' + user.foto + '" style="width:100%;height:100%;object-fit:cover">';
    } else {
      preview.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
    }

    _initFotoInput();
    _initMasks();
    App.openModal('modal-usuario');
  }

  function _initFotoInput() {
    const preview = document.getElementById('foto-preview');
    const fileInput = document.getElementById('input-foto');

    preview.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 200 * 1024) {
        App.toast('Foto muito grande (máx 200KB)', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        _fotoBase64 = ev.target.result;
        preview.innerHTML = '<img src="' + _fotoBase64 + '" style="width:100%;height:100%;object-fit:cover">';
      };
      reader.readAsDataURL(file);
    };
  }

  function _initMasks() {
    const cpfInput = document.getElementById('usr-cpf');
    const telInput = document.getElementById('usr-telefone');
    if (cpfInput && !cpfInput._masked) {
      App.maskCPF(cpfInput);
      cpfInput._masked = true;
    }
    if (telInput && !telInput._masked) {
      App.maskTelefone(telInput);
      telInput._masked = true;
    }
  }

  // --- Salvar (criar ou editar) ---
  function _bindSave() {
    document.getElementById('btn-salvar-usuario').onclick = async () => {
      const id = document.getElementById('usr-id').value;
      const nome = document.getElementById('usr-nome').value.trim();
      const cpf = document.getElementById('usr-cpf').value;
      const telefone = document.getElementById('usr-telefone').value.trim();
      const cargo = document.getElementById('usr-cargo').value.trim();
      const perfil = document.getElementById('usr-perfil').value;
      const errorEl = document.getElementById('error-usuario');

      errorEl.style.display = 'none';

      if (!nome) { _showFormError('Nome é obrigatório'); return; }
      if (DB.cleanCPF(cpf).length !== 11) { _showFormError('CPF deve ter 11 dígitos'); return; }

      // Validar CPF real (exceto 00000000000 para admin de teste)
      const cpfClean = DB.cleanCPF(cpf);
      if (cpfClean !== '00000000000' && !DB.validarCPF(cpfClean)) {
        _showFormError('CPF inválido — dígitos verificadores não conferem');
        return;
      }

      const btn = document.getElementById('btn-salvar-usuario');
      btn.disabled = true;
      btn.textContent = 'Salvando...';

      if (id) {
        // EDITAR
        const result = Auth.updateUser(id, {
          nome,
          cpf: cpfClean,
          telefone,
          cargo,
          perfil,
          foto: _fotoBase64
        });

        if (!result.ok) {
          _showFormError(result.erro);
          btn.disabled = false;
          btn.textContent = 'Salvar';
          return;
        }

        App.toast('Usuário atualizado!', 'success');
      } else {
        // CRIAR
        const result = await Auth.createUser({
          nome,
          cpf: cpfClean,
          telefone,
          cargo,
          perfil,
          foto: _fotoBase64
        });

        if (!result.ok) {
          _showFormError(result.erro);
          btn.disabled = false;
          btn.textContent = 'Salvar';
          return;
        }

        App.toast('Funcionário cadastrado! Senha inicial: ' + result.senhaInicial, 'success', 8000);
      }

      btn.disabled = false;
      btn.textContent = 'Salvar';
      App.closeModal('modal-usuario');
      render();
    };
  }

  function _showFormError(msg) {
    const el = document.getElementById('error-usuario');
    el.textContent = msg;
    el.style.display = 'block';
  }

  // --- Toggle status ---
  function toggleStatus(userId) {
    const user = DB.getById(DB.COLLECTIONS.usuarios, userId);
    if (!user) return;

    const action = user.ativo ? 'BLOQUEAR' : 'ATIVAR';
    if (!App.confirm(action + ' o acesso de ' + user.nome + '?')) return;

    const result = Auth.toggleUserStatus(userId);
    if (result.ok) {
      App.toast(user.nome + ' ' + (result.ativo ? 'ativado' : 'bloqueado') + '!', result.ativo ? 'success' : 'warning');
      render();
    } else {
      App.toast(result.erro, 'error');
    }
  }

  // --- Redefinir senha ---
  function abrirResetSenha(userId) {
    const user = DB.getById(DB.COLLECTIONS.usuarios, userId);
    if (!user) return;

    document.getElementById('reset-user-id').value = userId;
    document.getElementById('reset-msg').textContent = 'Nova senha para ' + user.nome + '. O usuário será obrigado a trocar no próximo login.';
    document.getElementById('reset-nova-senha').value = '';
    document.getElementById('error-reset').style.display = 'none';
    App.openModal('modal-reset-senha');
  }

  function _bindReset() {
    document.getElementById('btn-reset-senha').onclick = async () => {
      const userId = document.getElementById('reset-user-id').value;
      const novaSenha = document.getElementById('reset-nova-senha').value.trim();
      const errorEl = document.getElementById('error-reset');

      if (novaSenha.length < 4) {
        errorEl.textContent = 'Senha deve ter ao menos 4 caracteres';
        errorEl.style.display = 'block';
        return;
      }

      const btn = document.getElementById('btn-reset-senha');
      btn.disabled = true;
      btn.textContent = 'Salvando...';

      const result = await Auth.forceChangePassword(userId, novaSenha);
      btn.disabled = false;
      btn.textContent = 'Redefinir';

      if (!result.ok) {
        errorEl.textContent = result.erro;
        errorEl.style.display = 'block';
        return;
      }

      App.closeModal('modal-reset-senha');
      App.toast('Senha redefinida! O usuário precisará trocar no próximo login.', 'success');
      render();
    };
  }

  // --- Ver histórico ---
  function verHistorico(userId) {
    const user = DB.getById(DB.COLLECTIONS.usuarios, userId);
    if (!user) return;

    document.getElementById('historico-titulo').textContent = 'Histórico — ' + user.nome;

    // Busca logs do usuário E logs SOBRE o usuário
    const logsProprios = DB.getLogs({ usuarioId: userId });
    const logsSobreUsuario = DB.query(DB.COLLECTIONS.logs, l => l.entidadeId === userId && l.usuarioId !== userId);
    const todosLogs = [...logsProprios, ...logsSobreUsuario]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 50);

    let html = '';
    if (todosLogs.length === 0) {
      html = '<div class="empty-state"><p class="empty-state-title">Nenhum registro</p></div>';
    } else {
      html = '<div class="table-container"><table class="table"><thead><tr><th>Data/Hora</th><th>Por</th><th>Ação</th><th>Detalhes</th></tr></thead><tbody>';
      todosLogs.forEach(l => {
        const isOwn = l.usuarioId === userId;
        html += '<tr>';
        html += '<td class="text-xs" style="white-space:nowrap">' + App.formatDate(l.timestamp) + '</td>';
        html += '<td class="text-sm">' + App.escapeHtml(isOwn ? 'Próprio' : l.usuarioNome) + '</td>';
        html += '<td><span class="badge badge-neutral">' + App.escapeHtml(l.acao) + '</span></td>';
        html += '<td class="text-sm text-muted">' + App.escapeHtml(l.detalhes || '-').substring(0, 120) + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    }

    document.getElementById('historico-conteudo').innerHTML = html;
    App.openModal('modal-historico');
  }

  // --- Remover ---
  function remover(userId) {
    const user = DB.getById(DB.COLLECTIONS.usuarios, userId);
    if (!user) return;

    if (!App.confirm('REMOVER PERMANENTEMENTE o usuário ' + user.nome + '?\n\nEssa ação NÃO pode ser desfeita.')) return;
    if (!App.confirm('Confirme novamente: REMOVER ' + user.nome + '?')) return;

    const result = Auth.removeUser(userId);
    if (result.ok) {
      App.toast(user.nome + ' removido permanentemente.', 'warning');
      render();
    } else {
      App.toast(result.erro, 'error');
    }
  }

  // Init bindings quando DOM estiver pronto
  document.addEventListener('DOMContentLoaded', () => {
    _bindSave();
    _bindReset();
  });

  return {
    render,
    abrirNovo,
    abrirEditar,
    toggleStatus,
    abrirResetSenha,
    verHistorico,
    remover
  };
})();
