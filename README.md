**Requisitos:** node 17+.

**execução:**
- Baixe a planilha csv e coloque na pasta raiz do projeto, mantenha o nome padrão dela.
- Em um terminal, clone o projeto, entre no diretório do projeto:
  - Instale as dependências: `npm install`;
  - Execute o comando: npm run start ou npm run dev.
- Ou caso baixe o executável:
  - Para window: execute o arquivo .exe com dois cliques;
  - Para Linux: execute via terminal o comando: ./ccwx-linux.

### Funcionalidade:

- Fitra os dados do .csv por data, e extrai 3 colunas, sendo elas: Cliente, Acordo, Data de Criação.
- Gera um csv com os filtros e extrações, e também gera um .txt com os acordos em linha, separados por vírgula.
- Consulta o banco de dados, e retorna os acordos com problemas.


### Em desenvolvimento:

- Automação com puppeteer para baixar o .csv.
- Interface gráfica para facilitar a execução do programa.
