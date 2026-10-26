// Local browser fixture. Never connects to Firebase or writes production data.
(() => {
  const stamp = (month, day) => ({ toDate: () => new Date(2026, month - 1, day, 10, 30) });
  const rows = [
    { id: 'demo-estudos', data: { nome: 'Ana (demonstração)', cidade: 'Manaus', texto: 'Peço oração por sabedoria e perseverança nos estudos e pelas atividades de nossa turma neste semestre.', cor: '#fff9c4', pinClass: 'pin1-vermelho', createdAt: stamp(10, 20), intercessores: ['Clara', 'Pedro', 'Marcos'], intercessorIds: ['demo-1', 'demo-2', 'demo-3'], oracoes: 3 } },
    { id: 'demo-comunidade', data: { nome: 'Grupo de alunos (demonstração)', cidade: 'Comunidade IBN', texto: 'Oremos pelas famílias de nossa comunidade e por aqueles que precisam de acolhimento, cuidado e esperança.', cor: '#c8e6c9', pinClass: 'pin2-azul', createdAt: stamp(10, 18), intercessores: ['Clara', 'Pedro'], intercessorIds: ['demo-1', 'demo-2'], oracoes: 2 } },
    { id: 'demo-gratidao', data: { nome: 'Equipe (demonstração)', cidade: 'Manaus', texto: 'Agradecemos a Deus pelo encontro da comunidade. Obrigado a todos que estiveram em oração conosco!', cor: '#bbdefb', pinClass: 'pin1-amarelo', status: 'finalizado', createdAt: stamp(10, 15), intercessores: ['Clara'], intercessorIds: ['demo-1'], oracoes: 1 } },
    { id: 'demo-anterior', data: { nome: 'Turma (demonstração)', cidade: 'Manaus', texto: 'Pedido demonstrativo de setembro para conferir a navegação entre períodos.', cor: '#f8bbd0', pinClass: 'pin2-roxo', createdAt: stamp(9, 10), intercessores: [], intercessorIds: [], oracoes: 0 } },
  ];
  const updates = [{ id: 'demo-update', data: { pedidoId: 'demo-estudos', pedidoNome: rows[0].data.nome, pedidoCidade: 'Manaus', pedidoResumo: rows[0].data.texto.slice(0, 80), pedidoCreatedAt: stamp(10, 20), createdAt: stamp(10, 22), message: 'Concluímos a primeira etapa dos estudos. Continuem orando pela preparação dos próximos encontros!', status: 'pending' } }];
  const listeners = [];
  const writes = [];
  const authListeners = [];
  const emit = () => [...listeners].forEach((entry) => { if (entry.active) entry.send(); });
  const getRows = (name) => name === 'pedidos' ? rows : updates;
  const docSnapshot = (id, name = 'pedidos') => {
    const row = getRows(name).find((r) => r.id === id);
    return { exists: !!row, data: () => row?.data };
  };
  const applyUpdate = (name, id, data) => {
    const row = getRows(name).find((r) => r.id === id);
    if (!row) throw new Error('not-found');
    for (const [key, value] of Object.entries(data)) {
      row.data[key] = value?.union ? [...new Set([...(row.data[key] || []), ...value.union])] : value;
    }
    writes.push({ name, id, data });
  };
  const snapshot = (items) => ({ docs: items.map((row) => ({ id: row.id, data: () => row.data })) });
  const query = (name, filters = []) => ({
    where: (key, op, value) => query(name, [...filters, [key, op, value]]),
    orderBy: () => query(name, filters),
    onSnapshot: (callback, onError) => {
      const send = () => {
        let items = name === 'pedidos' ? rows : updates;
        items = items.filter((row) => filters.every(([key, op, value]) => op === '==' ? row.data[key] === value : op === '>=' ? row.data[key].toDate() >= value.toDate() : row.data[key].toDate() < value.toDate()));
        callback(snapshot([...items].sort((a, b) => b.data.createdAt.toDate() - a.data.createdAt.toDate())));
      };
      const entry = { name, send, onError, callback, active: true };
      listeners.push(entry);
      queueMicrotask(() => { if (entry.active) send(); });
      return () => { entry.active = false; };
    },
    doc: (id) => ({ id, get: async () => docSnapshot(id, name), update: async (data) => { applyUpdate(name, id, data); emit(); }, delete: async () => { const items = getRows(name); const i = items.findIndex((r) => r.id === id); if (i >= 0) items.splice(i, 1); writes.push({ name, id, deleted: true }); emit(); } }),
    add: async (data) => { writes.push({ name, data }); return { id: 'demo-new' }; },
  });
  const setUser = (user) => { auth.currentUser = user; authListeners.forEach((cb) => cb(user)); };
  const auth = { currentUser: null, onAuthStateChanged: (cb) => { authListeners.push(cb); setTimeout(() => cb(auth.currentUser), 0); return () => {}; }, signOut: async () => setUser(null) };
  const db = { collection: query, runTransaction: async (callback) => {
    const pending = [];
    await callback({ get: async (ref) => docSnapshot(ref.id), update: (ref, data) => pending.push({ id: ref.id, data }) });
    pending.forEach(({ id, data }) => applyUpdate('pedidos', id, data));
    emit();
  } };
  const firestore = () => db;
  firestore.Timestamp = { fromDate: (date) => ({ toDate: () => date }) };
  firestore.FieldValue = { serverTimestamp: () => stamp(10, 26), arrayUnion: (...values) => ({ union: values }) };
  window.firebase = { initializeApp: () => {}, firestore, auth: () => auth };
  window.__demo = { rows, updates, writes, emit, listeners, admin: () => setUser({ uid: '__ADMIN_UID__' }), logout: () => setUser(null), fail: (name) => listeners.filter((l) => l.active && l.name === name).forEach((l) => { l.active = false; l.onError?.(new Error('permission-denied')); }) };
})();
