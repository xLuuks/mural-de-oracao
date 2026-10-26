const adminSection = document.getElementById('admin-section');
const adminPedidosList = document.getElementById('adminPedidosList');
const adminPedidoCount = document.getElementById('adminPedidoCount');
const adminEditores = new Map();
const adminRascunhos = new Map();
const adminSalvando = new Set();
let adminVisivel = false;

function mostrarVisaoAdmin(ativo) {
  adminSection.hidden = !ativo;
  for (const id of ['form-section', 'filter-section', 'mural']) {
    document.getElementById(id).hidden = ativo;
  }
  if (ativo && !adminVisivel) {
    fecharModalOrar();
    document.getElementById('adminTitle').focus();
  }
  if (!ativo) {
    adminPedidosList.replaceChildren();
    adminEditores.clear();
    adminRascunhos.clear();
  }
  adminVisivel = ativo;
}

function valoresEditorAdmin(editor) {
  return Object.fromEntries(['nome', 'cidade', 'texto'].map((name) => [name, editor.elements.namedItem(name).value]));
}

function criarEditorAdmin(id) {
  const editor = document.createElement('form');
  editor.className = 'admin-pedido';
  editor.dataset.id = id;

  const heading = document.createElement('div');
  heading.className = 'admin-pedido__heading';
  const titulo = document.createElement('h3');
  titulo.className = 'admin-pedido__title';
  const status = document.createElement('span');
  status.className = 'admin-pedido__status';
  heading.append(titulo, status);
  const meta = document.createElement('p');
  meta.className = 'admin-pedido__meta';
  const campos = document.createElement('div');
  campos.className = 'admin-pedido__campos';
  for (const [name, labelText] of [['nome', 'Nome (opcional)'], ['cidade', 'Cidade (opcional)'], ['texto', 'Pedido de oração']]) {
    const label = document.createElement('label');
    label.textContent = labelText;
    const campo = document.createElement(name === 'texto' ? 'textarea' : 'input');
    campo.name = name;
    if (name === 'texto') {
      campo.required = true;
      campo.maxLength = 2000;
      campo.rows = 5;
      label.className = 'admin-pedido__texto';
    } else {
      campo.type = 'text';
      campo.maxLength = 200;
    }
    label.appendChild(campo);
    campos.appendChild(label);
  }
  const actions = document.createElement('div');
  actions.className = 'admin-pedido__actions';
  const salvar = document.createElement('button');
  salvar.type = 'submit';
  salvar.className = 'admin-pedido__salvar';
  salvar.textContent = 'Salvar alterações';
  const finalizar = document.createElement('button');
  finalizar.type = 'button';
  finalizar.className = 'admin-pedido__finalizar';
  finalizar.textContent = 'Finalizar pedido';
  finalizar.addEventListener('click', () => abrirModalFinalizar(id));
  const excluir = document.createElement('button');
  excluir.type = 'button';
  excluir.className = 'admin-pedido__excluir';
  excluir.textContent = 'Excluir pedido';
  excluir.addEventListener('click', () => abrirModalExcluir(id));
  const feedback = document.createElement('span');
  feedback.className = 'admin-pedido__feedback';
  feedback.setAttribute('role', 'status');
  actions.append(salvar, finalizar, excluir, feedback);
  editor.append(heading, meta, campos, actions);
  editor.addEventListener('input', () => {
    adminRascunhos.set(id, valoresEditorAdmin(editor));
    feedback.textContent = 'Alterações não salvas';
  });
  editor.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!isAdmin() || adminSalvando.has(id)) return;
    const values = valoresEditorAdmin(editor);
    const data = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
    if (!data.texto) {
      showToast('Escreva o texto do pedido antes de salvar.', { type: 'info' });
      editor.elements.namedItem('texto').focus();
      return;
    }
    adminSalvando.add(id);
    salvar.disabled = true;
    salvar.textContent = 'Salvando…';
    try {
      await window.db.collection('pedidos').doc(id).update(data);
      // A resposta de uma gravação não deve apagar edições feitas durante o envio.
      if (JSON.stringify(adminRascunhos.get(id)) === JSON.stringify(values)) {
        adminRascunhos.delete(id);
      }
      if (isAdmin()) {
        feedback.textContent = adminRascunhos.has(id) ? 'Alterações não salvas' : 'Alterações salvas';
        showToast('Pedido atualizado.', { type: 'success' });
      }
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      if (isAdmin()) {
        feedback.textContent = 'Falha ao salvar. Tente novamente.';
        showToast('Não foi possível salvar o pedido.', { type: 'error' });
      }
    } finally {
      adminSalvando.delete(id);
      salvar.disabled = false;
      salvar.textContent = 'Salvar alterações';
    }
  });
  return editor;
}

function renderPainelAdmin(documentos, estado) {
  if (!isAdmin()) return;
  adminPedidosList.setAttribute('aria-busy', String(estado === 'loading'));
  if (estado !== 'ready' || !documentos.length) {
    const message = document.createElement('div');
    message.className = 'admin-page__empty';
    message.setAttribute('role', 'status');
    message.textContent = estado === 'loading' ? 'Carregando todos os pedidos…'
      : estado === 'error' ? 'Não foi possível carregar os pedidos.' : 'Nenhum pedido cadastrado.';
    adminPedidoCount.textContent = estado === 'ready' ? '0 pedidos' : 'Aguarde';
    if (estado === 'error') {
      const tentar = document.createElement('button');
      tentar.type = 'button';
      tentar.className = 'btn-acao';
      tentar.textContent = 'Tentar novamente';
      tentar.addEventListener('click', iniciarAssinaturaPedidos);
      message.appendChild(tentar);
    }
    adminPedidosList.replaceChildren(message);
    return;
  }
  adminPedidoCount.textContent = `${documentos.length} ${documentos.length === 1 ? 'pedido' : 'pedidos'}`;
  adminPedidosList.querySelectorAll('.admin-page__empty').forEach((node) => node.remove());
  const ids = new Set(documentos.map((doc) => doc.id));
  for (const [id, node] of adminEditores) {
    if (!ids.has(id)) {
      node.remove();
      adminEditores.delete(id);
      adminRascunhos.delete(id);
    }
  }
  documentos.forEach(({ id, data }, index) => {
    let editor = adminEditores.get(id);
    if (!editor) {
      editor = criarEditorAdmin(id);
      adminEditores.set(id, editor);
    }
    const values = adminRascunhos.get(id) || data;
    for (const key of ['nome', 'cidade', 'texto']) {
      const value = typeof values[key] === 'string' ? values[key] : '';
      const campo = editor.elements.namedItem(key);
      if (campo.value !== value) campo.value = value;
    }
    editor.querySelector('.admin-pedido__title').textContent = data.nome || 'Pedido anônimo';
    const status = editor.querySelector('.admin-pedido__status');
    const finalizado = data.status === 'finalizado';
    status.textContent = finalizado ? 'Finalizado' : 'Em aberto';
    status.classList.toggle('is-finished', finalizado);
    editor.querySelector('.admin-pedido__finalizar').disabled = finalizado;
    const quantidade = Number.isSafeInteger(data.oracoes) && data.oracoes >= 0
      ? data.oracoes : Array.isArray(data.intercessores) ? data.intercessores.length : 0;
    editor.querySelector('.admin-pedido__meta').textContent = [formatarData(data.createdAt), data.cidade, `${quantidade} em oração`].filter(Boolean).join(' • ');
    if (adminPedidosList.children[index] !== editor) {
      adminPedidosList.insertBefore(editor, adminPedidosList.children[index] || null);
    }
  });
}
