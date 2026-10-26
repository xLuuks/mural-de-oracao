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
  const snapshot = (items) => ({ docs: items.map((row) => ({ id: row.id, data: () => row.data })) });
  const query = (name, filters = []) => ({
    where: (key, op, value) => query(name, [...filters, [key, op, value]]),
    orderBy: () => query(name, filters),
    onSnapshot: (callback) => {
      const send = () => {
        let items = name === 'pedidos' ? rows : updates;
        items = items.filter((row) => filters.every(([key, op, value]) => op === '>=' ? row.data[key].toDate() >= value.toDate() : row.data[key].toDate() < value.toDate()));
        callback(snapshot([...items].sort((a, b) => b.data.createdAt.toDate() - a.data.createdAt.toDate())));
      };
      listeners.push(send);
      queueMicrotask(send);
      return () => { const i = listeners.indexOf(send); if (i >= 0) listeners.splice(i, 1); };
    },
    doc: (id) => ({ id, get: async () => ({ data: () => rows.find((r) => r.id === id)?.data }), update: async (data) => { writes.push({ name, id, data }); }, delete: async () => { writes.push({ name, id, deleted: true }); } }),
    add: async (data) => { writes.push({ name, data }); return { id: 'demo-new' }; },
  });
  const auth = { currentUser: null, onAuthStateChanged: (cb) => { setTimeout(cb, 0); return () => {}; }, signOut: async () => { auth.currentUser = null; } };
  const db = { collection: query, runTransaction: async (callback) => callback({ get: async (ref) => ({ data: () => rows.find((r) => r.id === ref.id)?.data }), update: (ref, data) => writes.push({ name: 'pedidos', id: ref.id, data }) }) };
  const firestore = () => db;
  firestore.Timestamp = { fromDate: (date) => ({ toDate: () => date }) };
  firestore.FieldValue = { serverTimestamp: () => stamp(10, 26), arrayUnion: (...values) => ({ union: values }) };
  window.firebase = { initializeApp: () => {}, firestore, auth: () => auth };
  window.__demo = { rows, updates, writes, emit: () => [...listeners].forEach((send) => send()), admin: () => { auth.currentUser = { uid: '__ADMIN_UID__' }; } };
})();
