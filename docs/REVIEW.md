# Análise técnica do Mural de Oração

Revisão de 26/10/2026 do código presente na pasta local. Escopo: HTML, CSS, JavaScript, integração Firebase descrita pelo cliente, configuração Netlify, imagens, documentação e comparação com o repositório remoto. Não foram alteradas regras, contas ou dados reais do Firebase.

## Achados prioritários

### P1. Um modal aberto pode agir sobre outro pedido

**Evidência:** `script.js`, funções `abrirModalOrar`, `abrirModalExcluir` e handlers de confirmação. Os modais guardam o índice em `pedidosDocs`; a confirmação consulta o array novamente. Um novo pedido em tempo real, uma exclusão ou a troca do filtro pode mudar a posição.

**Impacto:** registrar oração em outro pedido ou, no modo administrativo, excluir um pedido diferente do selecionado. A reprodução local insere um documento mais recente após abrir a confirmação de exclusão e registra o ID enviado à operação, sem escrever no Firestore.

**Recomendação:** guardar o ID estável do documento ao abrir o modal, apresentar a identificação do pedido na confirmação e validar a existência ao executar. Testar alterações concorrentes e troca de filtro com o modal aberto.

### P1. Assinatura de atualizações não acompanha a autenticação

**Evidência:** `iniciarAssinaturaAtualizacoes` é chamada no `DOMContentLoaded` para qualquer visitante; `onAuthStateChanged` apenas atualiza a interface. O retorno de cancelamento do listener de `updates` não é guardado.

**Impacto:** com leitura restrita ao admin, o listener pode encerrar por permissão antes do login e não ser recriado. Se a leitura estiver pública, a fila e seus metadados podem ser baixados por visitantes mesmo quando a interface a esconde. O segundo cenário depende das regras implantadas, que não foram auditadas.

**Recomendação:** iniciar o listener apenas para o admin, cancelá-lo e limpar a fila ao sair, e consultar `status == 'pending'` no servidor. Testar login após erro de permissão e mudança de conta.

### P1. Intercessores com o mesmo nome desaparecem da contagem visual

**Evidência:** o registro usa `arrayUnion(nomeIntercessor)`, `arrayUnion(usuarioId)` e incremento separado de `oracoes`; o contador visível usa `intercessores.length`.

**Impacto:** duas identidades chamadas Ana, ou dois registros anônimos, incrementam `oracoes`, mas produzem um único nome no array. A lista e o contador visível deixam de representar os registros.

**Recomendação:** modelar cada intercessão por ID, por exemplo em subcoleção, preservando nome e timestamp. Planejar a migração dos documentos antigos e a proteção contra alterações arbitrárias antes de trocar o cliente.

### P1. Autorização do banco não pode ser comprovada pelo repositório

**Evidência:** não há regras Firestore ou testes de autorização versionados. `isAdmin` controla o frontend, enquanto as operações de banco são feitas diretamente pelo navegador. O README anterior continha um exemplo que limitava os campos modificados, mas não impedia substituir ou esvaziar os arrays de intercessores.

**Impacto:** não é possível confirmar isolamento da fila, integridade dos contadores e proteção administrativa. Isto é uma lacuna de verificação, não a afirmação de que o banco publicado esteja aberto.

**Recomendação:** versionar as regras reais e testá-las no Emulator Suite: campos/tipos/tamanhos, criação inicial, status, identidade, incrementos e permissões de leitura. Separar dados de desenvolvimento. O exemplo permissivo foi retirado do README; nenhuma regra foi implantada nesta revisão.

## Confiabilidade e experiência

### P2. Envio contendo apenas espaços bloqueia os botões

**Evidência:** o submit desabilita os botões antes de aplicar `trim`; se o resultado for vazio, retorna antes do `try/finally`. `required` no HTML não rejeita texto composto apenas por espaços.

**Impacto:** o formulário permanece com o botão desabilitado sem gravar o pedido.

**Recomendação:** validar antes de entrar no estado de envio e usar um único fluxo de limpeza. Também desabilitar ações assíncronas em andamento para evitar envios duplicados de atualizações.

### P2. O período pode mudar antes de os resultados chegarem

**Evidência:** o filtro altera o resumo e substitui o listener, mas mantém `pedidosDocs` até o novo snapshot. O erro do listener é registrado somente no console. Na inicialização, a mudança de autenticação também pode renderizar um estado vazio antes da carga.

**Impacto:** pedidos antigos podem aparecer sob o novo período; falhas de acesso ou conexão podem ser confundidas com ausência de pedidos.

**Recomendação:** estados explícitos de carregamento, sucesso vazio e erro com nova tentativa. Limpar ou desativar resultados durante a troca e ignorar callbacks de consultas já substituídas. Após enviar um pedido estando em um mês antigo, oferecer retorno ao mês atual para visualizar a publicação.

### P2. Pedidos finalizados não são revalidados na transação

**Evidência:** `criarCard` desabilita o botão com base no snapshot exibido; a transação de oração verifica duplicidade, mas não o status atual.

**Impacto:** um modal aberto antes da finalização pode registrar intercessão depois dela, se as regras permitirem.

**Recomendação:** validar status no banco e na transação, com mensagem adequada ao visitante.

### P2. Modais e seletores precisam de navegação acessível

**Evidência:** modais possuem `aria-modal` e fechamento por Escape, mas não gerenciam ciclo de foco, retorno ao acionador ou conteúdo de fundo inerte. Os radios são ocultos com `display: none`; as cores não possuem nomes acessíveis. As duas faces do card usam transformação visual sem tratamento equivalente de foco/semântica.

**Impacto:** usuários de teclado podem perder acesso às opções ou navegar por controles que não estão visíveis.

**Recomendação:** tornar os radios focáveis com ocultação visual apropriada, rotular as cores, sinalizar foco, gerenciar modais e faces dos cards. Revisar com teclado e leitor de tela.

### P2. Dados em formato inesperado podem interromper a renderização

**Evidência:** a renderização presume arrays para intercessores, string para `texto.trim()` e classe válida para `classList.add(pinClass)`.

**Impacto:** um documento legado ou inválido pode lançar uma exceção e impedir a exibição dos demais cards.

**Recomendação:** validar nas regras e normalizar o modelo lido no cliente, com fallback por documento.

## Escala, desempenho e manutenção

| Prioridade | Observação | Melhoria sugerida |
| :--- | :--- | :--- |
| P2 | Mostrar todos baixa todo o histórico e os arrays embutidos de intercessores. | Paginação e carregamento sob demanda; revisar o modelo das intercessões. |
| P2 | Cada snapshot recria todos os cards e pode perder expansão, verso e foco. Atualizações da fila também disparam `carregarPedidos`. | Atualizar por ID ou `docChanges` e desacoplar o painel da lista pública. |
| P2 | Os 14 pins somam cerca de 6,7 MiB e a imagem social tem cerca de 2 MiB. | Redimensionar e comprimir assets preservando transparência/qualidade; conferir dimensões de favicon e imagem social. |
| P2 | O CSS tem cache de sete dias, sem versão na URL. | Versionamento por hash ou política de revalidação consistente. |
| P2 | `publish = '.'` pode publicar backups, scripts e documentação presentes na raiz. `.gitignore` não controla o pacote Netlify. | Diretório de distribuição contendo só arquivos necessários ou regra explícita de exclusão no fluxo de deploy. |
| P3 | `script.js` reúne dados, autenticação, UI e modais em cerca de 50 KB. | Extrair módulos com responsabilidades claras; adicionar lint, testes e CI incrementalmente. |
| P3 | Medição de altura para Ler mais ocorre antes de inserir o card no DOM. | Medir após montagem ou usar estratégia de truncamento verificável. |
| P3 | IDs e preferências dependem de chamadas de localStorage sem proteção contra falha. | Wrapper com fallback em memória e mensagens para rascunhos indisponíveis. |
| P3 | A senha administrativa recebe `trim()`. | Preservar a senha digitada; validar apenas sua presença. |
| P3 | Resumo da atualização tem 80 caracteres e a data prioriza a criação do pedido. | Mostrar data do envio separadamente e link para localizar o pedido original. |
| P3 | SDK compat 9.23.0 e CSP com `unsafe-inline` e `unsafe-eval`. | Planejar atualização do SDK com testes e reduzir permissões CSP conforme uso comprovado. Não há vulnerabilidade específica do SDK afirmada nesta revisão. |
| P3 | Limites mensais seguem o fuso do visitante e o primeiro ano é fixo em 2025. | Definir fuso do produto e estratégia de catálogo de períodos. |

## Documentação e portfólio

O README foi reescrito seguindo a apresentação dos projetos SplitCraft e Local Transcriber: introdução, contexto de uso real, tecnologias, screenshots, instruções reproduzíveis, funcionamento, limitações e autoria. Os arquivos de licença existentes foram respeitados, sem transferir direitos de marca.

As screenshots usam conteúdo fictício em uma instância local com SDK Firebase substituído. O painel administrativo é simulado no navegador apenas para apresentação. O script de captura não autentica contas reais nem envia gravações à produção.

O repositório remoto estava privado e sua versão era anterior à pasta local. A publicação deve manter isso explícito: um README em repositório privado não fica visível a visitantes do portfólio sem acesso. Alterar a visibilidade do repositório é uma decisão separada.

## Verificação e limites

- Inspeção estática dos arquivos atuais e checagem sintática com Node.js.
- Exercício da interface no Chrome com dados fictícios: filtros, Mostrar todos, estado vazio, formulário e indicador de pendências.
- Reprodução local dos cenários de modal com índice instável e envio de espaços; os resultados são impressos pelo script de captura.
- Conferência visual de screenshots desktop/mobile e referências locais da documentação.
- As permissões de produção, console Firebase, integração Netlify/GitHub e fluxo real de login administrativo não foram auditados.

## Ordem sugerida

1. Corrigir identidade dos alvos nos modais e criar regressões para mudanças em tempo real.
2. Rever intercessões e regras do banco em ambiente isolado, junto com a assinatura administrativa.
3. Corrigir validação/envio e estados de carregamento/erro.
4. Melhorar acessibilidade de seletores, cards e modais.
5. Introduzir paginação, otimização de imagens, distribuição limpa e testes contínuos.

As recomendações estão documentadas; o comportamento de produção não foi refatorado nesta etapa.
