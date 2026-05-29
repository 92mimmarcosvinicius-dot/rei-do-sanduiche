# REGRAS ABSOLUTAS DO PROJETO — LEIA ANTES DE QUALQUER AÇÃO

## PROIBIDO TERMINANTEMENTE

NUNCA execute comandos que iniciem processos que não encerram sozinhos. Isso TRAVA a máquina do usuário (8GB de RAM). Proibido sob qualquer circunstância:

- NUNCA rodar: node server.js, npm start, npm run dev, npx serve, python -m http.server, http-server, live-server, ou qualquer servidor
- NUNCA rodar: Start-Process com janelas, Start-Sleep longo, comandos que ficam "escutando" uma porta
- NUNCA tentar "iniciar o servidor para testar"
- NUNCA tentar "verificar se o site está rodando" via requisição HTTP
- NUNCA abrir o navegador via comando

## COMO TESTAR

Você NÃO testa rodando nada. O usuário testa abrindo o arquivo HTML manualmente no navegador (duplo clique no index.html). Apenas crie os arquivos e avise o usuário para abrir no navegador.

## SE PRECISAR USAR POWERSHELL OU BASH

Evite ao máximo. Para criar pastas e arquivos, use suas ferramentas nativas de escrita de arquivo (Write/Edit), NÃO rode comandos de terminal.

Se for absolutamente inevitável rodar um comando de terminal:
- Use apenas comandos que terminam instantaneamente (criar pasta, listar arquivo)
- NUNCA comandos que ficam rodando
- O comando deve retornar e encerrar em menos de 2 segundos

## REGRA DE OURO

Na dúvida sobre rodar um comando: NÃO RODE. Apenas crie os arquivos com as ferramentas de escrita e explique ao usuário o que fazer. Criar arquivos nunca trava. Rodar processos trava.
