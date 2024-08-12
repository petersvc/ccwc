import fs from "fs";
import csvParser from "csv-parser";
import { writeToPath } from "fast-csv";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

interface Row {
  Cpf: string;
  Acordo: string;
  DataAgendamento: string;
}

function extractEntidadeNumber(entidade: string): string {
  // Usa uma expressão regular para encontrar o número após ": "
  const match = entidade.match(/:\s*(\d+)/);
  return match ? match[1] : "";
}

// Função para converter a data no formato "dd/MM/yyyy HH:mm" para o formato ISO
function convertDateTimeFormat(dateStr: string): Date {
  const [datePart, timePart] = dateStr.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

// Função para obter o início do dia anterior e o final do dia atual
function getDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const startOfYesterday = new Date(startOfToday);
  // se hoje for segunda
  if (startOfToday.getDay() === 1) {
    startOfYesterday.setDate(startOfToday.getDate() - 3);
  } else {
    startOfYesterday.setDate(startOfToday.getDate() - 1);
  }

  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(startOfToday.getDate() + 1);

  return { start: startOfYesterday, end: endOfToday };
}

function isDateInRange(dateStr: string): boolean {
  const { start, end } = getDateRange();
  const date = convertDateTimeFormat(dateStr);

  return date >= start && date <= end;
}

// Função para gerar um arquivo de texto com todos os acordos da coluna Entidade
function writeAcordosToFile(filePath: string, acordos: string[]) {
  const acordosStr = acordos.join(", ");
  fs.writeFileSync(filePath, acordosStr, "utf8");
}

async function fetchFromDatabase(acordos: string[]): Promise<any[]> {
  const client = new Client({
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await client.connect();

  // Define o esquema de busca para a sessão atual
  await client.query("SET search_path TO tvlar");

  const query = `
    SELECT tc.cpf_cnpj, ta.numero_acordo, ta.status
    FROM t_acordo ta
    JOIN t_consumidor tc ON ta.id_consumidor = tc.id_consumidor
    WHERE ta.numero_acordo IN (${acordos.map((a) => `${a}`).join(", ")})
    AND ta.status = 'PENDENTE';
  `;

  const res = await client.query(query);
  await client.end();

  return res.rows;
}

async function processCSV(
  inputFilePath: string,
  outputFilePath: string,
  txtFilePath: string,
  dbFilePath: string,
) {
  const rows: Row[] = [];
  const acordos: string[] = [];

  fs.createReadStream(inputFilePath)
    .pipe(csvParser())
    .on("data", (data: any) => {
      const row: Row = {
        Cpf: data.Cliente,
        Acordo: extractEntidadeNumber(data.Entidade),
        DataAgendamento: data["Data Agendamento"],
      };

      if (isDateInRange(row["DataAgendamento"])) {
        rows.push(row);
        acordos.push(row.Acordo); // Adiciona a entidade filtrada
      }
    })
    .on("end", async () => {
      writeToPath(outputFilePath, rows, { headers: true });
      console.log("CSV processado com sucesso!");
      writeAcordosToFile(txtFilePath, acordos);
      console.log("Arquivo de texto com os acordos gerado com sucesso!");

      // Consulta ao banco de dados e gravação dos resultados
      const dbResults = await fetchFromDatabase(acordos);
      console.log("DBResults", dbResults);
      writeToPath(dbFilePath, dbResults, { headers: true }).on("finish", () => {
        console.log("Resultados do banco de dados salvos com sucesso!");
      });
    });
}

const inputFilePath = "relatorioWebhookMensagem.csv"; // Substitua pelo caminho do seu arquivo CSV de entrada
const outputFilePath = "output.csv"; // Substitua pelo caminho do arquivo CSV de saída
const txtFilePath = "acordos.txt"; // Substitua pelo caminho do arquivo de texto
const dbFilePath = "db_results.csv"; // Substitua pelo caminho do arquivo CSV com resultados do banco de dados

processCSV(inputFilePath, outputFilePath, txtFilePath, dbFilePath);
