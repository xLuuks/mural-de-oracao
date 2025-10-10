// Seleciona elementos principais
const form = document.getElementById('pedidoForm');
const listaPedidos = document.getElementById('listaPedidos');
const toggleForm = document.getElementById('toggleForm');
const pedidoForm = document.getElementById('pedidoForm');
const formPreviewWrap = document.getElementById('formPreviewWrap');
const previewCardHost = document.getElementById('previewCardHost');
const textareaPedido = document.getElementById('pedido');
const pedidoCount = document.getElementById('pedidoCount');
const btnEnviarPedido = document.getElementById('btnEnviarPedido');
const btnEnviarPedidoMobile = document.getElementById('btnEnviarPedidoMobile');
let pendingCloseForm = false;
const thumbPin1 = document.getElementById('thumbPin1');
const thumbPin2 = document.getElementById('thumbPin2');
// Admin updates panel
const adminUpdates = document.getElementById('adminUpdates');
const adminUpdatesToggle = document.getElementById('adminUpdatesToggle');
const adminUpdatesList = document.getElementById('adminUpdatesList');
let SHOW_ADMIN_UPDATES_IN_CARD = false;

let ultimoAnimacaoId = null; // animação por ID do documento
let modalIndexAtual = null; // índice do pedido para o modal "Desejo orar"

// Modal Editar Pedido
const modalEditar = document.getElementById('modalEditar');
const modalEditarBackdrop = modalEditar?.querySelector('.modal-backdrop');
const modalEditarCloseBtns = modalEditar?.querySelectorAll('[data-modal-close]');
const modalEditarForm = document.getElementById('modalEditarForm');
const modalEditarTexto = document.getElementById('modalEditarTexto');
const modalEditarCancelar = document.getElementById('modalEditarCancelar');
let editPedidoIdAtual = null;

function abrirModalEditar(pedidoId, textoAtual) {
  editPedidoIdAtual = pedidoId;
  if (!modalEditar) return;
  modalEditar.classList.remove('hidden');
  modalEditarTexto.value = textoAtual || '';
  setTimeout(() => modalEditarTexto.focus(), 0);
  document.addEventListener('keydown', escEditarHandler);
}
function fecharModalEditar() {
  if (!modalEditar) return;
  modalEditar.classList.add('hidden');
  document.removeEventListener('keydown', escEditarHandler);
  editPedidoIdAtual = null;
}
function escEditarHandler(e) { if (e.key === 'Escape') fecharModalEditar(); }
modalEditarBackdrop?.addEventListener('click', fecharModalEditar);
modalEditarCloseBtns?.forEach((b)=> b.addEventListener('click', fecharModalEditar));
modalEditarCancelar?.addEventListener('click', fecharModalEditar);

modalEditarForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const novo = (modalEditarTexto.value || '').trim();
  if (!novo) return;
  if (!editPedidoIdAtual) return fecharModalEditar();
  try {
    await window.db.collection('pedidos').doc(editPedidoIdAtual).update({ texto: novo });
    showToast('Texto atualizado.', { type: 'success' });
    fecharModalEditar();
  } catch (err) {
    console.error('Erro ao editar pedido:', err);
    showToast('Não foi possível atualizar agora.', { type: 'error' });
  }
});
// Modal Finalizar Pedido
const modalFinalizar = document.getElementById('modalFinalizar');
const modalFinalizarBackdrop = modalFinalizar?.querySelector('.modal-backdrop');
const modalFinalizarCloseBtns = modalFinalizar?.querySelectorAll('[data-modal-close]');
const modalFinalizarCancelar = document.getElementById('modalFinalizarCancelar');
const modalFinalizarConfirmar = document.getElementById('modalFinalizarConfirmar');
let finalizePedidoIdAtual = null;

function abrirModalFinalizar(pedidoId) {
  finalizePedidoIdAtual = pedidoId;
  if (!modalFinalizar) return;
  modalFinalizar.classList.remove('hidden');
  document.addEventListener('keydown', escFinalizarHandler);
}
function fecharModalFinalizar() {
  if (!modalFinalizar) return;
  modalFinalizar.classList.add('hidden');
  document.removeEventListener('keydown', escFinalizarHandler);
  finalizePedidoIdAtual = null;
}
function escFinalizarHandler(e) { if (e.key === 'Escape') fecharModalFinalizar(); }
modalFinalizarBackdrop?.addEventListener('click', fecharModalFinalizar);
modalFinalizarCloseBtns?.forEach((b)=> b.addEventListener('click', fecharModalFinalizar));
modalFinalizarCancelar?.addEventListener('click', fecharModalFinalizar);
modalFinalizarConfirmar?.addEventListener('click', async () => {
  if (!finalizePedidoIdAtual) return fecharModalFinalizar();
  try {
    await window.db.collection('pedidos').doc(finalizePedidoIdAtual).update({
      status: 'finalizado',
      attendedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showToast('Finalizado.', { type: 'success' });
  } catch (err) {
    console.error('Erro ao finalizar pedido:', err);
    showToast('Não foi possível finalizar agora.', { type: 'error' });
  } finally {
    fecharModalFinalizar();
  }
});
let modalExcluirIndex = null; // índice do pedido para exclusão

// Identidade local do usuário (para limitar 1 oração por pedido)
const USUARIO_ID_KEY = 'usuarioId';
function gerarIdLocal() {
  try {
    if (window.crypto && window.crypto.getRandomValues) {
      const buf = new Uint8Array(16);
      window.crypto.getRandomValues(buf);
      return [...buf].map((b) => b.toString(16).padStart(2, '0')).join(' • ');
    }
  } catch {}
  return 'uid-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function getUsuarioId() {
  let id = localStorage.getItem(USUARIO_ID_KEY);
  if (!id) {
    id = gerarIdLocal();
    localStorage.setItem(USUARIO_ID_KEY, id);
  }
  return id;
}

// Abrir/fechar formulário
if (toggleForm) {
  toggleForm.addEventListener('click', () => {
    const isHidden = getComputedStyle(pedidoForm).display === 'none';
    if (!isHidden) {
      // Tentando fechar o formulário: confirmar descarte se houver rascunho
      if (textareaPedido && textareaPedido.value.trim().length > 0) {
        pendingCloseForm = true;
        abrirModalDescartar();
        return;
      }
      // Fechando: limpar pré-visualização
      clearPreview();
      // Limpa todos os campos e preferências ao fechar
      const nomeEl = document.getElementById('nome');
      const cidadeEl = document.getElementById('cidade');
      if (nomeEl) nomeEl.value = '';
      if (cidadeEl) cidadeEl.value = '';
      // Remover preferências salvas
      localStorage.removeItem(PREF_COR_KEY);
      localStorage.removeItem(PREF_PIN_MODEL_KEY);
      localStorage.removeItem(PREF_PIN_COR_KEY);
      // Resetar seleção de cor para padrão, e desmarcar pins
      const corPadraoEl = document.querySelector('input[name="cor"][value="#fff9c4"]');
      if (corPadraoEl) corPadraoEl.checked = true;
      document.querySelectorAll('input[name="pinModelo"]').forEach((el) => (el.checked = false));
      document.querySelectorAll('input[name="pinCor"]').forEach((el) => (el.checked = false));
      // Atualiza miniaturas para cor padrão
      updatePinThumbnails('vermelho');
    }
    pedidoForm.style.display = isHidden ? 'block' : 'none';
    if (formPreviewWrap) formPreviewWrap.style.display = isHidden ? 'flex' : 'none';
    toggleForm.setAttribute('aria-expanded', String(isHidden));
    toggleForm.textContent = isHidden ? 'Fechar Formulário' : 'Novo Pedido';
    if (isHidden) {
      setTimeout(() => textareaPedido?.focus(), 0);
      // Restaura rascunho e preferências quando abrir
      restaurarRascunhoEPrefs();
      autoResize(textareaPedido);
      renderPreview();
    }
  });
}

// Firestore assinatura em tempo real
let pedidosDocs = [];
function iniciarAssinaturaPedidos() {
  if (!window.db) {
    console.error('Firestore não inicializado.');
    return;
  }
  window.db
    .collection('pedidos')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snap) => {
        pedidosDocs = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
        carregarPedidos();
        renderAdminUpdatesPanel();
      },
      (err) => console.error('Erro no snapshot:', err)
    );
}
// Assinatura de atualizações de pedidos (pendentes)
let updatesDocs = [];
function iniciarAssinaturaAtualizacoes() {
  if (!window.db) return;
  window.db
    .collection('updates')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snap) => {
        updatesDocs = snap.docs
          .map((d) => ({ id: d.id, data: d.data() }))
          .filter((u) => (u.data && u.data.status) === 'pending');
        carregarPedidos();
        renderAdminUpdatesPanel();
      },
      (err) => console.error('Erro no snapshot de updates:', err)
    );
}

document.addEventListener('DOMContentLoaded', () => { iniciarAssinaturaPedidos(); iniciarAssinaturaAtualizacoes(); });

// -------- UX Formulário: auto-resize, contador, rascunho e preferências --------
const DRAFT_KEY = 'draft_pedido_texto';
const PREF_COR_KEY = 'pref_cor';
const PREF_PIN_MODEL_KEY = 'pref_pin_modelo';
const PREF_PIN_COR_KEY = 'pref_pin_cor';

function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function atualizarContador() {
  if (!textareaPedido || !pedidoCount) return;
  const max = textareaPedido.maxLength || 600;
  const len = textareaPedido.value.length;
  pedidoCount.textContent = `${len}/${max}`;
  pedidoCount.classList.toggle('near-limit', max - len <= 40);
}

function salvarRascunho() {
  if (!textareaPedido) return;
  localStorage.setItem(DRAFT_KEY, textareaPedido.value);
}

function restaurarRascunhoEPrefs() {
  // Rascunho
  const draft = localStorage.getItem(DRAFT_KEY);
  if (textareaPedido && draft) {
    textareaPedido.value = draft;
    autoResize(textareaPedido);
    atualizarContador();
  }
  // Preferências de cor do post-it
  const cor = localStorage.getItem(PREF_COR_KEY);
  if (cor) {
    const el = document.querySelector(`input[name="cor"][value="${cor}"]`);
    if (el) el.checked = true;
  }
  // Preferências de pin
  const pinModelo = localStorage.getItem(PREF_PIN_MODEL_KEY);
  const pinCor = localStorage.getItem(PREF_PIN_COR_KEY);
  if (pinModelo) {
    const el = document.querySelector(`input[name="pinModelo"][value="${pinModelo}"]`);
    if (el) el.checked = true;
  }
  if (pinCor) {
    const el = document.querySelector(`input[name="pinCor"][value="${pinCor}"]`);
    if (el) el.checked = true;
    updatePinThumbnails(pinCor);
  }
}

// Eventos do textarea
textareaPedido?.addEventListener('input', () => {
  autoResize(textareaPedido);
  atualizarContador();
  salvarRascunho();
  renderPreview();
});
// Atualiza preview ao digitar nome e cidade
document.getElementById('nome')?.addEventListener('input', renderPreview);
document.getElementById('cidade')?.addEventListener('input', renderPreview);
// Inicializa contador/altura no carregamento
if (textareaPedido) {
  autoResize(textareaPedido);
  atualizarContador();
  renderPreview();
}

// Botão mobile fora do formulário aciona submit
btnEnviarPedidoMobile?.addEventListener('click', () => {
  if (form && typeof form.requestSubmit === 'function') form.requestSubmit();
  else form?.submit();
});

// Salvar preferências de seleção
document.getElementById('corOptions')?.addEventListener('change', (e) => {
  const target = e.target;
  if (target && target.name === 'cor') {
    localStorage.setItem(PREF_COR_KEY, target.value);
    renderPreview();
  }
});
document.getElementById('pinModelOptions')?.addEventListener('change', (e) => {
  const target = e.target;
  if (target && target.name === 'pinModelo') {
    localStorage.setItem(PREF_PIN_MODEL_KEY, target.value);
    renderPreview();
  }
});
document.getElementById('pinColorOptions')?.addEventListener('change', (e) => {
  const target = e.target;
  if (target && target.name === 'pinCor') {
    localStorage.setItem(PREF_PIN_COR_KEY, target.value);
    updatePinThumbnails(target.value);
    renderPreview();
  }
});

function updatePinThumbnails(color) {
  const cor = (color || document.querySelector('input[name="pinCor"]:checked')?.value || 'vermelho').trim();
  if (thumbPin1) {
    thumbPin1.src = `img/pin1_${cor}.png`;
    thumbPin1.alt = `Modelo pin 1 (${cor})`;
  }
  if (thumbPin2) {
    thumbPin2.src = `img/pin2_${cor}.png`;
    thumbPin2.alt = `Modelo pin 2 (${cor})`;
  }
}

// inicializa thumbs conforme seleção atual
updatePinThumbnails();

// ---------- Pré-visualização do post-it ----------
function buildPreviewPedidoFromForm() {
  const nome = document.getElementById('nome')?.value.trim() || '';
  const cidade = document.getElementById('cidade')?.value.trim() || '';
  const texto = textareaPedido?.value || '';
  const cor = document.querySelector('input[name="cor"]:checked')?.value || '#fff9c4';
  const modelo = document.querySelector('input[name="pinModelo"]:checked')?.value || '';
  const corPin = document.querySelector('input[name="pinCor"]:checked')?.value || '';
  let pinClass = '';
  if (modelo && corPin) pinClass = modelo + '-' + corPin;
  else if (modelo) pinClass = modelo;
  else if (corPin) pinClass = (Math.random() < 0.5 ? 'pin1' : 'pin2') + '-' + corPin;
  return { nome, cidade, texto, cor, intercessores: [], createdAt: null, pinClass, _id: 'preview' };
}

function createPreviewCard(pedido) {
  previewCardHost.innerHTML = '';
  const { nome, cidade, texto, cor = '#fff9c4', pinClass } = pedido;
  const card = document.createElement('div');
  card.classList.add('card');
  if (pinClass) card.classList.add(pinClass);
  card.style.setProperty('--pin-tilt', '0deg');
  const inner = document.createElement('div');
  inner.classList.add('card-inner');
  card.appendChild(inner);
  const front = document.createElement('div');
  front.classList.add('card-face', 'card-front');
  front.style.background = cor;
  front.style.paddingTop = '25px';
  inner.appendChild(front);
  const header = document.createElement('div');
  header.classList.add('card-header');
  if (nome) {
    const strong = document.createElement('strong');
    strong.textContent = nome;
    header.appendChild(strong);
  }
  if (cidade) {
    const span = document.createElement('span');
    span.classList.add('cidade');
    span.textContent = cidade;
    header.appendChild(span);
  }
  if (!nome && !cidade) {
    const strong = document.createElement('strong');
    strong.textContent = 'Anônimo';
    header.appendChild(strong);
  }
  if (header.childNodes.length) front.appendChild(header);
  const p = document.createElement('p');
  p.classList.add('card-texto');
  p.style.textAlign = 'center';
  p.textContent = texto;
  front.appendChild(p);
  previewCardHost.appendChild(card);
}

function renderPreview() {
  if (!previewCardHost) return;
  const pedido = buildPreviewPedidoFromForm();
  createPreviewCard(pedido);
}

// Toasts
function showToast(message, opts = {}) {
  const { type = 'info', duration = 3000 } = opts;
  const container = document.getElementById('toast-container');
  if (!container) return alert(message);
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  const span = document.createElement('span');
  span.textContent = message;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toast-close';
  btn.innerText = '×';
  btn.setAttribute('aria-label', 'Fechar');
  btn.addEventListener('click', () => container.removeChild(el));
  el.appendChild(span);
  el.appendChild(btn);
  container.appendChild(el);
  const to = setTimeout(() => {
    if (el.parentNode === container) container.removeChild(el);
  }, duration);
  el.addEventListener('remove', () => clearTimeout(to));
}

function formatarData(createdAt) {
  if (!createdAt) return '';
  let dateObj = createdAt;
  if (createdAt && typeof createdAt.toDate === 'function') {
    dateObj = createdAt.toDate();
  } else if (!(createdAt instanceof Date)) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) dateObj = d;
    else return '';
  }
  return dateObj.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function criarCard(pedido, index, animarEntrada = false) {
  const { nome, cidade, texto, cor = '#fff9c4', intercessores = [], createdAt, pinClass, _id, status } = pedido;
  const dataFormatada = formatarData(createdAt);

  const card = document.createElement('div');
  card.classList.add('card');

  const pinVariantes = [
    'pin1-vermelho','pin1-amarelo','pin1-azul','pin1-laranja','pin1-rosa','pin1-roxo','pin1-verde',
    'pin2-vermelho','pin2-amarelo','pin2-azul','pin2-laranja','pin2-rosa','pin2-roxo','pin2-verde'
  ];
  let pinClasse = typeof pinClass === 'string' && pinClass ? pinClass : null;
  if (!pinClasse) pinClasse = pinVariantes[Math.floor(Math.random() * pinVariantes.length)];
  card.classList.add(pinClasse);

  const pinTilt = (Math.random() * 6 - 3).toFixed(2);
  card.style.setProperty('--pin-tilt', `${pinTilt}deg`);
  card.dataset.index = String(index);
  if (_id) card.dataset.id = _id;

  if (animarEntrada) {
    card.classList.add('card--entrando');
    card.addEventListener('animationend', () => card.classList.remove('card--entrando'), { once: true });
  }

  const cardInner = document.createElement('div');
  cardInner.classList.add('card-inner');
  card.appendChild(cardInner);

  const cardFront = document.createElement('div');
  cardFront.classList.add('card-face', 'card-front');
  cardFront.style.background = cor;
  cardInner.appendChild(cardFront);

  const cardBack = document.createElement('div');
  cardBack.classList.add('card-face', 'card-back');
  cardBack.style.background = cor;
  cardInner.appendChild(cardBack);

  const cabecalho = document.createElement('div');
  cabecalho.classList.add('card-header');
  if (nome) {
    const nomeEl = document.createElement('strong');
    nomeEl.textContent = nome;
    cabecalho.appendChild(nomeEl);
  }
  if (cidade) {
    const cidadeEl = document.createElement('span');
    cidadeEl.classList.add('cidade');
    cidadeEl.textContent = cidade;
    cabecalho.appendChild(cidadeEl);
  }
  if (!nome && !cidade) {
    const anonimoEl = document.createElement('strong');
    anonimoEl.textContent = 'Anônimo';
    cabecalho.appendChild(anonimoEl);
  }
  if (cabecalho.childNodes.length) cardFront.appendChild(cabecalho);

  const textoEl = document.createElement('p');
  textoEl.classList.add('card-texto', 'is-collapsed');
  textoEl.textContent = texto || '';
  cardFront.appendChild(textoEl);

  const collapsedHeight = textoEl.clientHeight;
  textoEl.classList.remove('is-collapsed');
  const fullHeight = textoEl.scrollHeight;
  const precisaResumo = (texto || '').trim().length > 220 || fullHeight - collapsedHeight > 4;
  if (precisaResumo) {
    textoEl.classList.add('is-collapsed');
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.classList.add('btn-leia-mais');
    toggleBtn.textContent = 'Ler mais';
    toggleBtn.addEventListener('click', () => {
      const estaColapsado = textoEl.classList.contains('is-collapsed');
      textoEl.classList.toggle('is-collapsed', !estaColapsado);
      textoEl.classList.toggle('is-expanded', estaColapsado);
      card.classList.toggle('card-expandido', estaColapsado);
      if (!estaColapsado) textoEl.scrollTop = 0;
      toggleBtn.textContent = estaColapsado ? 'Ler menos' : 'Ler mais';
    });
    cardFront.appendChild(toggleBtn);
  } else {
    textoEl.classList.remove('is-collapsed');
    card.classList.remove('card-expandido');
  }

  if (dataFormatada) {
    const dataEl = document.createElement('time');
    dataEl.classList.add('card-data');
    dataEl.dateTime = createdAt && createdAt.toDate ? createdAt.toDate().toISOString() : String(createdAt || '');
    dataEl.textContent = `Criado em ${dataFormatada}`;
    cardFront.appendChild(dataEl);
  }

  const footer = document.createElement('div');
  footer.classList.add('card-footer');

  const oracaoGroup = document.createElement('div');
  oracaoGroup.classList.add('oracao-group');

  const usuarioId = getUsuarioId();
  const jaOrado = Array.isArray(pedido.intercessorIds) && pedido.intercessorIds.includes(usuarioId);

  const orarBtn = document.createElement('button');
  orarBtn.type = 'button';
  orarBtn.classList.add('btn-acao');
  if (status === 'finalizado') {
    orarBtn.textContent = 'Finalizado';
    orarBtn.title = 'Este pedido foi finalizado';
    orarBtn.disabled = true;
  } else if (jaOrado) {
    orarBtn.textContent = 'Em oração';
    orarBtn.title = 'Você já registrou oração para este pedido';
    orarBtn.disabled = true;
  } else {
    orarBtn.textContent = 'Desejo orar';
    orarBtn.title = 'Registrar sua oração';
    orarBtn.disabled = false;
    orarBtn.addEventListener('click', () => orarPorPedido(index));
  }

  const contador = document.createElement('span');
  contador.classList.add('contador-oracoes');
  contador.textContent = String(intercessores.length);
  if (ultimoAnimacaoId !== null && _id && _id === ultimoAnimacaoId) {
    contador.classList.add('pulse');
    setTimeout(() => contador.classList.remove('pulse'), 450);
    ultimoAnimacaoId = null;
  }

  oracaoGroup.appendChild(orarBtn);
  oracaoGroup.appendChild(contador);

  const detalhesBtn = document.createElement('button');
  detalhesBtn.type = 'button';
  detalhesBtn.classList.add('btn-intercessores');
  detalhesBtn.textContent = 'Ver intercessores';
  detalhesBtn.addEventListener('click', () => card.classList.add('is-flipped'));

  footer.appendChild(oracaoGroup);
  footer.appendChild(detalhesBtn);
  cardFront.appendChild(footer);

  if (isAdmin()) {
    const removerBtn = document.createElement('button');
    removerBtn.type = 'button';
    removerBtn.classList.add('btn-remove');
    removerBtn.textContent = '×';
    removerBtn.setAttribute('aria-label', 'Remover pedido');
    removerBtn.title = 'Remover pedido';
    removerBtn.addEventListener('click', () => abrirModalExcluir(index));
    cardFront.appendChild(removerBtn);
  }

  const backTitle = document.createElement('h3');
  backTitle.textContent = 'Intercessores';
  cardBack.appendChild(backTitle);

  if (dataFormatada) {
    const dataVerso = document.createElement('p');
    dataVerso.classList.add('card-data', 'card-data-back');
    dataVerso.textContent = `Criado em ${dataFormatada}`;
    cardBack.appendChild(dataVerso);
  }

  const wrapper = document.createElement('div');
  wrapper.classList.add('intercessores-wrapper');
  if (intercessores.length) {
    const lista = document.createElement('ul');
    lista.classList.add('intercessores-list');
    intercessores.forEach((nomeIntercessor, posicao) => {
      const item = document.createElement('li');
      item.textContent = `${posicao + 1}. ${nomeIntercessor}`;
      lista.appendChild(item);
    });
    wrapper.appendChild(lista);
  } else {
    const vazio = document.createElement('p');
    vazio.classList.add('sem-intercessores');
    vazio.textContent = 'Ainda não há intercessores.';
  wrapper.appendChild(vazio);
  }
  cardBack.appendChild(wrapper);

  // Ação de atualização/edição
  if (isAdmin()) {
    const editarBtn = document.createElement('button');
    editarBtn.type = 'button';
    editarBtn.classList.add('btn-intercessores');
    editarBtn.textContent = 'Editar';
    editarBtn.addEventListener('click', () => abrirModalEditar(_id, texto));
    cardBack.appendChild(editarBtn);
  } else {
    const atualizarBtn = document.createElement('button');
    atualizarBtn.type = 'button';
    atualizarBtn.classList.add('btn-acao');
    atualizarBtn.textContent = 'Enviar atualização';
    atualizarBtn.addEventListener('click', () => abrirModalUpdate(pedido._id));
    cardBack.appendChild(atualizarBtn);
  }
  // Botão voltar e finalizar (admin)
  const voltarBtn = document.createElement('button');
  voltarBtn.type = 'button';
  voltarBtn.classList.add('btn-voltar-card');
  voltarBtn.textContent = 'Voltar';
  voltarBtn.addEventListener('click', () => card.classList.remove('is-flipped'));
  cardBack.appendChild(voltarBtn);

  if (isAdmin() && status !== 'finalizado') {
    const finalizarBtn = document.createElement('button');
    finalizarBtn.type = 'button';
    finalizarBtn.classList.add('btn-acao');
    finalizarBtn.textContent = 'Finalizar pedido';
    finalizarBtn.addEventListener('click', () => abrirModalFinalizar(_id));
    cardBack.appendChild(finalizarBtn);
  }

  listaPedidos.appendChild(card);
}

function carregarPedidos(opcoes = {}) {
  const { animarTodos = false } = opcoes;
  const lista = pedidosDocs.map((d, index) => ({ pedido: { ...d.data, _id: d.id }, index }));
  listaPedidos.innerHTML = '';
  lista.forEach(({ pedido, index }) => {
    const deveAnimar = animarTodos || (ultimoAnimacaoId && pedido._id === ultimoAnimacaoId);
    criarCard(pedido, index, deveAnimar);
  });
}

// Ação do botão "Desejo orar" abre o modal correspondente
function orarPorPedido(index) {
  abrirModalOrar(index);
}

// Enviar novo pedido
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (btnEnviarPedido) {
    btnEnviarPedido.disabled = true;
    btnEnviarPedido.textContent = 'Enviando…';
  if (btnEnviarPedidoMobile) {
    btnEnviarPedidoMobile.disabled = true;
    btnEnviarPedidoMobile.textContent = 'Enviando.';
  }
  }
  const nome = document.getElementById('nome').value.trim();
  const cidade = document.getElementById('cidade').value.trim();
  const pedidoTexto = document.getElementById('pedido').value.trim();
  const cor = document.querySelector("input[name=\"cor\"]:checked").value;
  if (!pedidoTexto) return;

  const modelo = (document.querySelector("input[name=\"pinModelo\"]:checked")?.value || document.getElementById("pinModelo")?.value || "").trim();
  const corPin = (document.querySelector("input[name=\"pinCor\"]:checked")?.value || document.getElementById("pinCor")?.value || "").trim();
  let pinClass = '';
  if (modelo && corPin) pinClass = modelo + '-' + corPin;
  else if (modelo) pinClass = modelo;
  else if (corPin) pinClass = (Math.random() < 0.5 ? 'pin1' : 'pin2') + '-' + corPin;

  try {
    const ref = await window.db.collection('pedidos').add({
      nome,
      cidade,
      texto: pedidoTexto,
      cor,
      intercessores: [],
      intercessorIds: [],
      oracoes: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      pinClass,
    });
    ultimoAnimacaoId = ref.id;
    form.reset();
    localStorage.removeItem(DRAFT_KEY);
    autoResize(textareaPedido);
    atualizarContador();
    showToast('Pedido enviado!', { type: 'success' });
    clearPreview();
  } catch (err) {
    console.error('Erro ao criar pedido:', err);
    showToast('Não foi possível enviar o pedido agora. Tente novamente.', { type: 'error' });
  } finally {
    if (btnEnviarPedido) {
      btnEnviarPedido.disabled = false;
      btnEnviarPedido.textContent = 'Enviar Pedido';
    }
    if (btnEnviarPedidoMobile) {
      btnEnviarPedidoMobile.disabled = false;
      btnEnviarPedidoMobile.textContent = 'Enviar Pedido';
    }
  }
});

function clearPreview() {
  if (previewCardHost) previewCardHost.innerHTML = '';
}

// Modal Desejo Orar
const modal = document.getElementById('modalOrar');
const modalBackdrop = modal?.querySelector('.modal-backdrop');
const modalCloseBtns = modal?.querySelectorAll('[data-modal-close]');
const modalForm = document.getElementById('modalOrarForm');
const modalNome = document.getElementById('modalNome');
const modalCancelar = document.getElementById('modalCancelar');

function abrirModalOrar(index) {
  modalIndexAtual = index;
  if (!modal) return;
  modal.classList.remove('hidden');
  modalNome.value = '';
  setTimeout(() => modalNome.focus(), 0);
  document.addEventListener('keydown', escHandler);
}
function fecharModalOrar() {
  if (!modal) return;
  modal.classList.add('hidden');
  document.removeEventListener('keydown', escHandler);
  modalIndexAtual = null;
}
function escHandler(e) {
  if (e.key === 'Escape') fecharModalOrar();
}
modalBackdrop?.addEventListener('click', fecharModalOrar);
modalCloseBtns?.forEach((b) => b.addEventListener('click', fecharModalOrar));
modalCancelar?.addEventListener('click', fecharModalOrar);

modalForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (modalIndexAtual === null) return fecharModalOrar();
  const meta = pedidosDocs[modalIndexAtual];
  if (!meta) return fecharModalOrar();

  const usuarioId = getUsuarioId();
  const nomeIntercessor = (modalNome.value || '').trim() || 'Anônimo';
  const ref = window.db.collection('pedidos').doc(meta.id);

  try {
    await window.db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      const data = snap.data() || {};
      const ids = Array.isArray(data.intercessorIds) ? data.intercessorIds : [];
      if (ids.includes(usuarioId)) throw new Error('already');
      const novaQtde = (data.oracoes || 0) + 1;
      t.update(ref, {
        intercessorIds: firebase.firestore.FieldValue.arrayUnion(usuarioId),
        intercessores: firebase.firestore.FieldValue.arrayUnion(nomeIntercessor),
        oracoes: novaQtde,
      });
    });
    ultimoAnimacaoId = meta.id;
    fecharModalOrar();
    showToast('Oração registrada. Obrigado!', { type: 'success' });
  } catch (err) {
    if (String(err.message || err) === 'already') {
      showToast('Você já registrou uma oração para este pedido. Obrigado!', { type: 'info' });
    } else {
      console.error('Erro ao registrar oração:', err);
      showToast('Não foi possível registrar agora.', { type: 'error' });
    }
    fecharModalOrar();
  }
});

// Modal Excluir
const modalExcluir = document.getElementById('modalExcluir');
const modalExcluirBackdrop = modalExcluir?.querySelector('.modal-backdrop');
const modalExcluirCloseBtns = modalExcluir?.querySelectorAll('[data-modal-close]');
const modalExcluirCancelar = document.getElementById('modalExcluirCancelar');
const modalExcluirConfirmar = document.getElementById('modalExcluirConfirmar');

function abrirModalExcluir(index) {
  if (!isAdmin()) {
    abrirModalAdmin();
    return;
  }
  modalExcluirIndex = index;
  if (!modalExcluir) return;
  modalExcluir.classList.remove('hidden');
  document.addEventListener('keydown', escExcluirHandler);
}
function fecharModalExcluir() {
  if (!modalExcluir) return;
  modalExcluir.classList.add('hidden');
  document.removeEventListener('keydown', escExcluirHandler);
  modalExcluirIndex = null;
}
function escExcluirHandler(e) {
  if (e.key === 'Escape') fecharModalExcluir();
}
modalExcluirBackdrop?.addEventListener('click', fecharModalExcluir);
modalExcluirCloseBtns?.forEach((b) => b.addEventListener('click', fecharModalExcluir));
modalExcluirCancelar?.addEventListener('click', fecharModalExcluir);
modalExcluirConfirmar?.addEventListener('click', async () => {
  if (modalExcluirIndex === null) return fecharModalExcluir();
  const meta = pedidosDocs[modalExcluirIndex];
  if (!meta) return fecharModalExcluir();
  try {
    await window.db.collection('pedidos').doc(meta.id).delete();
    showToast('Pedido removido.', { type: 'success' });
  } catch (err) {
    console.error('Erro ao remover:', err);
    showToast('Não foi possível remover agora.', { type: 'error' });
  } finally {
    fecharModalExcluir();
  }
});


function limparFormularioCompleto() {
  const nomeEl = document.getElementById('nome');
  const cidadeEl = document.getElementById('cidade');
  if (nomeEl) nomeEl.value = '';
  if (cidadeEl) cidadeEl.value = '';
  if (textareaPedido) {
    textareaPedido.value = '';
    localStorage.removeItem(DRAFT_KEY);
    autoResize(textareaPedido);
    atualizarContador();
  }
  localStorage.removeItem(PREF_COR_KEY);
  localStorage.removeItem(PREF_PIN_MODEL_KEY);
  localStorage.removeItem(PREF_PIN_COR_KEY);
  const corPadraoEl = document.querySelector('input[name="cor"][value="#fff9c4"]');
  if (corPadraoEl) corPadraoEl.checked = true;
  document.querySelectorAll('input[name="pinModelo"]').forEach((el) => (el.checked = false));
  document.querySelectorAll('input[name="pinCor"]').forEach((el) => (el.checked = false));
  updatePinThumbnails('vermelho');
  clearPreview();
}

// Modal Descartar Texto
const modalDesc = document.getElementById('modalDescartar');
const modalDescBackdrop = modalDesc?.querySelector('.modal-backdrop');
const modalDescCloseBtns = modalDesc?.querySelectorAll('[data-modal-close]');
const modalDescCancelar = document.getElementById('modalDescartarCancelar');
const modalDescConfirmar = document.getElementById('modalDescartarConfirmar');

function abrirModalDescartar() {
  if (!modalDesc) return;
  modalDesc.classList.remove('hidden');
  document.addEventListener('keydown', escDescHandler);
}
function fecharModalDescartar() {
  if (!modalDesc) return;
  modalDesc.classList.add('hidden');
  document.removeEventListener('keydown', escDescHandler);
}
function escDescHandler(e) { if (e.key === 'Escape') fecharModalDescartar(); }
modalDescBackdrop?.addEventListener('click', fecharModalDescartar);
modalDescCloseBtns?.forEach((b) => b.addEventListener('click', fecharModalDescartar));
modalDescCancelar?.addEventListener('click', fecharModalDescartar);
modalDescConfirmar?.addEventListener('click', () => {
  fecharModalDescartar();
  if (!pendingCloseForm) return;
  limparFormularioCompleto();
  pendingCloseForm = false;
  pedidoForm.style.display = 'none';
  if (formPreviewWrap) formPreviewWrap.style.display = 'none';
  toggleForm.setAttribute('aria-expanded', 'false');
  toggleForm.textContent = 'Novo Pedido';
});// ----- Admin (Firebase Auth) -----
const ADMIN_UID = 'qIxfD3Xeu7SvKGb9zf6APMhpFow2';
function isAdmin() {
  const user = firebase.auth().currentUser;
  return !!(user && user.uid === ADMIN_UID);
}

function atualizarModoAdminUI() {
  const btn = document.getElementById('adminToggle');
  if (!btn) return;
  const user = firebase.auth().currentUser;
  // Texto/ação do botão: qualquer usuário autenticado pode sair
  if (user) {
    btn.textContent = 'Sair do modo admin';
    btn.title = 'Sair do modo admin';
    btn.setAttribute('aria-label', 'Sair do modo admin');
  } else {
    btn.textContent = 'Entrar como administrador';
    btn.title = 'Entrar no modo administrador';
    btn.setAttribute('aria-label', 'Entrar como administrador');
  }
  // Classe visual de admin apenas para o verdadeiro admin
  if (isAdmin()) {
    document.body.classList.add('is-admin');
  } else {
    document.body.classList.remove('is-admin');
  }
}

const adminToggleBtn = document.getElementById('adminToggle');
adminToggleBtn?.addEventListener('click', () => {
  const user = firebase.auth().currentUser;
  if (user) {
    firebase.auth().signOut().finally(() => {
      atualizarModoAdminUI();
      carregarPedidos();
      renderAdminUpdatesPanel();
      showToast('Admin desconectado.', { type: 'info' });
    });
  } else {
    abrirModalAdmin();
  }
});
// Elementos do modal Admin (re-adicionados)
const modalAdmin = document.getElementById('modalAdmin');
const modalAdminBackdrop = modalAdmin?.querySelector('.modal-backdrop');
const modalAdminCloseBtns = modalAdmin?.querySelectorAll('[data-modal-close]');
const modalAdminForm = document.getElementById('modalAdminForm');
const modalAdminEmail = document.getElementById('modalAdminEmail');
const modalAdminSenha = document.getElementById('modalAdminSenha');
const modalAdminCancelar = document.getElementById('modalAdminCancelar');

function abrirModalAdmin() {
  if (!modalAdmin) return;
  modalAdmin.classList.remove('hidden');
  modalAdminEmail.value = '';
  modalAdminSenha.value = '';
  setTimeout(() => modalAdminEmail.focus(), 0);
  document.addEventListener('keydown', escAdminHandler);
}
function fecharModalAdmin() {
  if (!modalAdmin) return;
  modalAdmin.classList.add('hidden');
  document.removeEventListener('keydown', escAdminHandler);
}
function escAdminHandler(e) {
  if (e.key === 'Escape') fecharModalAdmin();
}
modalAdminBackdrop?.addEventListener('click', fecharModalAdmin);
modalAdminCloseBtns?.forEach((b) => b.addEventListener('click', fecharModalAdmin));
modalAdminCancelar?.addEventListener('click', fecharModalAdmin);

modalAdminForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (modalAdminEmail.value || '').trim();
  const senha = (modalAdminSenha.value || '').trim();
  if (!email || !senha) return;
  try {
    const cred = await firebase.auth().signInWithEmailAndPassword(email, senha);
    if (cred.user.uid !== ADMIN_UID) {
      await firebase.auth().signOut();
      showToast('Esta conta não tem permissão de administrador.', { type: 'error' });
      return;
    }
    fecharModalAdmin();
    atualizarModoAdminUI();
    carregarPedidos();
        renderAdminUpdatesPanel();
    showToast('Admin conectado.', { type: 'success' });
  } catch (err) {
    console.error('Erro ao autenticar:', err);
    showToast('Não foi possível entrar. Verifique e-mail e senha.', { type: 'error' });
  }
});

// Gatilhos discretos (opcional): Ctrl+Shift+A para abrir login admin
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
    if (isAdmin()) {
      firebase.auth().signOut().finally(() => {
        atualizarModoAdminUI();
        carregarPedidos();
        renderAdminUpdatesPanel();
      });
    } else {
      abrirModalAdmin();
    }
  }
});

// Atualiza UI quando estado de auth muda
firebase.auth().onAuthStateChanged(() => {  atualizarModoAdminUI();  carregarPedidos();  renderAdminUpdatesPanel();});






// ----- Modal Atualização -----
const modalUpdate = document.getElementById('modalUpdate');
const modalUpdateBackdrop = modalUpdate?.querySelector('.modal-backdrop');
const modalUpdateCloseBtns = modalUpdate?.querySelectorAll('[data-modal-close]');
const modalUpdateForm = document.getElementById('modalUpdateForm');
const modalUpdateMsg = document.getElementById('modalUpdateMsg');
const modalUpdateCancelar = document.getElementById('modalUpdateCancelar');
let updatePedidoIdAtual = null;

function abrirModalUpdate(pedidoId) {
  updatePedidoIdAtual = pedidoId;
  if (!modalUpdate) return;
  modalUpdate.classList.remove('hidden');
  modalUpdateMsg.value = '';
  setTimeout(() => modalUpdateMsg.focus(), 0);
  document.addEventListener('keydown', escUpdateHandler);
}
function fecharModalUpdate() {
  if (!modalUpdate) return;
  modalUpdate.classList.add('hidden');
  document.removeEventListener('keydown', escUpdateHandler);
  updatePedidoIdAtual = null;
}
function escUpdateHandler(e) { if (e.key === 'Escape') fecharModalUpdate(); }
modalUpdateBackdrop?.addEventListener('click', fecharModalUpdate);
modalUpdateCloseBtns?.forEach((b) => b.addEventListener('click', fecharModalUpdate));
modalUpdateCancelar?.addEventListener('click', fecharModalUpdate);

modalUpdateForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = (modalUpdateMsg.value || '').trim();
  if (!msg || !updatePedidoIdAtual) return;
  try {
    const pedidoRef = window.db.collection('pedidos').doc(updatePedidoIdAtual);
    const pedidoSnap = await pedidoRef.get();
    const pedidoData = pedidoSnap.data() || {};
    const pedidoCreatedAt = pedidoData.createdAt || null;
    const pedidoResumo = typeof pedidoData.texto === 'string' ? pedidoData.texto.slice(0, 80) : '';
    const pedidoNome = typeof pedidoData.nome === 'string' ? pedidoData.nome : '';
    const pedidoCidade = typeof pedidoData.cidade === 'string' ? pedidoData.cidade : '';

    await window.db.collection('updates').add({
      pedidoId: updatePedidoIdAtual,
      message: msg,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      submittedBy: getUsuarioId(),
      pedidoCreatedAt,
      pedidoResumo,
      pedidoNome,
      pedidoCidade,
      });
    showToast('Atualização enviada para análise.', { type: 'success' });
    fecharModalUpdate();
  } catch (err) {
    console.error('Erro ao enviar atualização:', err);
    showToast('Não foi possível enviar a atualização agora.', { type: 'error' });
  }
});

async function reviewUpdate(updateId) {
  try {
    await window.db.collection('updates').doc(updateId).update({ status: 'reviewed' });
    showToast('Atualização marcada como lida.', { type: 'success' });
  } catch (err) {
    console.error('Erro ao marcar como lida:', err);
    showToast('Falha ao marcar atualização.', { type: 'error' });
  }
}

async function recusarUpdate(updateId) {
  try {
    await window.db.collection('updates').doc(updateId).update({ status: 'rejected' });
    showToast('Atualização recusada.', { type: 'info' });
  } catch (err) {
    console.error('Erro ao recusar atualização:', err);
    showToast('Falha ao recusar atualização.', { type: 'error' });
  }
}



function renderAdminUpdatesPanel() {
  if (!adminUpdates || !adminUpdatesList) return;
  const isAdm = isAdmin();
  adminUpdatesToggle?.classList.toggle('hidden', !isAdm);
  if (!isAdm) { adminUpdates.classList.add('hidden'); adminUpdatesList.innerHTML=''; return; }
  adminUpdatesList.innerHTML = '';
  if (!updatesDocs.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Sem atualizações pendentes.';
    empty.className = 'meta';
    adminUpdatesList.appendChild(empty);
    return;
  }
  updatesDocs.forEach((u) => {
    const item = document.createElement('div');
    item.className = 'admin-update-item';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const ts = (u.data.pedidoCreatedAt && typeof u.data.pedidoCreatedAt.toDate === 'function')
      ? u.data.pedidoCreatedAt
      : (u.data.createdAt || null);
    const date = ts && typeof ts.toDate === 'function' ? ts.toDate().toLocaleString('pt-BR') : '';
    meta.textContent = date ? `Criado em ${date}` : '';
    const pedidoSnippetEl = document.createElement('div');
pedidoSnippetEl.className = 'snippet';
pedidoSnippetEl.textContent = (u.data.pedidoResumo || '').slice(0, 80);

const who = document.createElement('div');
who.className = 'meta';
who.textContent = [u.data.pedidoNome || '', u.data.pedidoCidade || ''].filter(Boolean).join(' • ');


const msg = document.createElement('div');
msg.className = 'msg';
msg.textContent = u.data.message;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const aprovar = document.createElement('button');
    aprovar.className = 'btn-acao';
    aprovar.type = 'button';
    aprovar.textContent = 'Marcar como lida';
    aprovar.addEventListener('click', () => reviewUpdate(u.id));
    const recusar = document.createElement('button');
    recusar.className = 'btn-intercessores';
    recusar.type = 'button';
    recusar.textContent = 'Recusar';
    recusar.addEventListener('click', () => recusarUpdate(u.id));
    actions.appendChild(aprovar);
    actions.appendChild(recusar);
    item.appendChild(meta);
    if (who.textContent) item.appendChild(who);
    if (pedidoSnippetEl.textContent) item.appendChild(pedidoSnippetEl);
    item.appendChild(msg);
    item.appendChild(actions);
    adminUpdatesList.appendChild(item);
  });
}

adminUpdatesToggle?.addEventListener('click', () => {
  if (!isAdmin()) return;
  const isOpen = !adminUpdates.classList.contains('hidden');
  adminUpdates.classList.toggle('hidden', isOpen);
  adminUpdatesToggle.setAttribute('aria-expanded', String(!isOpen));
  if (!isOpen) renderAdminUpdatesPanel();
});
adminUpdates?.querySelector('.admin-updates__close')?.addEventListener('click', () => {
  adminUpdates.classList.add('hidden');
  adminUpdatesToggle?.setAttribute('aria-expanded', 'false');
});
