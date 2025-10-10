# Política de Privacidade e Termos de Uso

Última atualização: 10/10/2025
Contato: ibnmidia1945@gmail.com

ATENÇÃO: Este documento é um rascunho de referência e não constitui aconselhamento jurídico. Adapte para sua realidade e valide com um profissional quando necessário.

Projeto: desenvolvido por Lucas Augusto para o Instituto Bíblico do Norte. Exceto quando indicado em LICENSE (código sob MIT), a marca, a identidade visual e os ativos gráficos do site possuem direitos reservados ao Instituto Bíblico do Norte (ver ASSETS-LICENSE.md).

---

## 1) Política de Privacidade

### 1.1. Quais dados coletamos
- Conteúdo do pedido de oração: texto (obrigatório, até 600 caracteres), cor do post‑it e fixador (pin) selecionados.
- Identificação opcional: nome e cidade.
- Identificador local de usuário: um ID gerado e salvo no dispositivo (localStorage) para limitar um registro de oração por pedido.
- Metadados técnicos: timestamps de criação (serverTimestamp do Firestore) e contadores de intercessão.

### 1.2. Como os dados são coletados
- Informações fornecidas diretamente pelo usuário ao enviar o formulário.
- Identificador local criado no navegador e armazenado via localStorage.
- Timestamps/contadores atualizados via Cloud Firestore (Firebase).

### 1.3. Finalidades de uso
- Exibir pedidos de oração e o número de intercessores.
- Evitar registros duplicados do mesmo usuário para um mesmo pedido.
- Permitir moderação/edição/finalização/remoção por administrador autenticado, para manter respeito e segurança do mural.

### 1.4. Base legal
- Consentimento do usuário ao submeter um pedido ou registrar uma intercessão.
- Legítimo interesse na moderação do conteúdo para manter o ambiente adequado.

### 1.5. Armazenamento e retenção
- Os dados são armazenados no Google Cloud Firestore (Firebase), em data centers do Google.
- Pedidos podem permanecer publicados até serem removidos por moderação/admin ou mediante solicitação do titular.
- O identificador local permanece no dispositivo do usuário até ser removido pelo próprio usuário (limpando o armazenamento do navegador) ou por mudanças na aplicação.

### 1.6. Compartilhamento com terceiros
- Utilizamos Firebase (Google) para banco de dados e autenticação de administrador. Consulte as políticas do Google/Firebase.
- Não vendemos dados de usuários.

### 1.7. Direitos do titular (LGPD)
Você pode solicitar: acesso, correção, exclusão e esclarecimentos sobre seus dados.
- Canal de contato: ibnmidia1945@gmail.com

### 1.8. Cookies e tecnologias similares
- Usamos localStorage (não cookies) para armazenar um identificador local e preferências (cor/pin) de UX.
- Não realizamos rastreamento para fins de publicidade.

### 1.9. Segurança
- Regras do Firestore restringem atualização/remoção de pedidos apenas ao administrador autenticado.
- O frontend evita injeção de HTML ao renderizar conteúdo do usuário (uso de textContent).
- Nenhuma medida é 100% segura; empregamos esforços razoáveis compatíveis com um projeto estático público.

### 1.10. Crianças e adolescentes
- O conteúdo deve ser respeitoso e adequado. Responsáveis devem orientar a não inclusão de informações sensíveis.

### 1.11. Alterações nesta política
- Esta política pode ser atualizada a qualquer momento. A versão vigente será publicada com a data de atualização.

---

## 2) Termos de Uso

### 2.1. Objeto
Este site (“Mural de Oração”) oferece um espaço para publicar pedidos de oração e registrar intercessões. Ao usar o site, você concorda com estes Termos.

### 2.2. Conteúdo enviado pelo usuário
- Você é responsável pelo conteúdo que publica.
- Não publique informações pessoais sensíveis, dados de terceiros sem consentimento, conteúdo ofensivo, ilegal, difamatório, promocional/comercial, spam, ou que viole direitos de terceiros.
- Você concede permissão para exibirmos o conteúdo enviado no site e, quando necessário, em materiais relacionados ao funcionamento do próprio serviço.

### 2.3. Moderação
- O administrador pode editar, ocultar, finalizar ou remover pedidos a qualquer momento, a seu critério, para preservar respeito, segurança e a finalidade do mural.

### 2.4. Acesso de administrador
- Ações de edição/remoção/finalização estão restritas a contas autenticadas como administrador.

### 2.5. Propriedade intelectual
- Código-fonte: licenciado sob MIT (ver arquivo LICENSE).
- Marca, identidade visual, logo do Instituto Bíblico do Norte e imagens de pinos/ícone: ver ASSETS-LICENSE.md. Em resumo, direitos reservados aos seus respectivos titulares; uso restrito a este projeto conforme permissões indicadas.

### 2.6. Isenção de responsabilidade
- O serviço é fornecido “no estado em que se encontra”, sem garantias de disponibilidade, adequação a propósito específico ou ausência de erros.
- Não nos responsabilizamos por danos decorrentes de uso, falhas técnicas, indisponibilidade ou conduta de usuários.

### 2.7. Privacidade
- O uso do site está sujeito à Política de Privacidade acima.

### 2.8. Alterações nos Termos
- Estes Termos podem ser atualizados a qualquer momento. A versão vigente será publicada com a data de atualização.

### 2.9. Contato
- Dúvidas ou solicitações: ibnmidia1945@gmail.com

---

## 3) Titularidade e direitos
- Este projeto foi desenvolvido por Lucas Augusto para o Instituto Bíblico do Norte, e deve ter seus direitos reservados nos elementos de marca/identidade visual e ativos gráficos (conforme ASSETS-LICENSE.md).
- O código-fonte está disponibilizado sob os termos do arquivo LICENSE (MIT). Em caso de conflito de interpretação entre este documento e a licença do código, a licença (LICENSE) prevalece para o código.

