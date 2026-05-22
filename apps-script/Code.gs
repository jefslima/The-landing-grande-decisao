/**
 * A GRANDE DECISÃO — recebedor de cadastros na Planilha Google
 * =============================================================
 *
 * COMO CONECTAR (passo a passo):
 *  1. Crie uma Planilha Google nova (sheets.new).
 *  2. No menu, vá em  Extensões > Apps Script.
 *  3. Apague o conteúdo padrão e cole TODO este arquivo.
 *  4. Clique em  Implantar > Nova implantação.
 *       - Tipo: "App da Web"
 *       - Executar como: "Eu"
 *       - Quem pode acessar: "Qualquer pessoa"
 *  5. Copie a URL gerada (termina em /exec).
 *  6. Abra o arquivo  script.js  da landing page e cole a URL em:
 *         const SHEETS_ENDPOINT = "COLE_A_URL_AQUI";
 *  7. Pronto. Cada cadastro vira uma nova linha na planilha.
 *
 * Para testar rapidamente: abra a URL /exec no navegador. Deve responder
 * com {"status":"ok","message":"Endpoint ativo"}.
 */

// Cabeçalho das colunas (ordem das células na planilha).
var HEADERS = ['Data/Hora', 'Nome', 'E-mail', 'WhatsApp', 'CEP', 'UF', 'Cidade', 'Endereço', 'Número', 'Complemento', 'Origem'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // evita gravações simultâneas sobrescrevendo linhas
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // Cria o cabeçalho na primeira vez.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    }

    var p = parseInput_(e);
    var fuso = Session.getScriptTimeZone() || 'America/Sao_Paulo';
    var carimbo = Utilities.formatDate(new Date(), fuso, 'dd/MM/yyyy HH:mm:ss');

    sheet.appendRow([
      carimbo,
      p.nome || '',
      p.email || '',
      p.whatsapp || '',
      p.cep || '',
      p.uf || '',
      p.cidade || '',
      p.endereco || '',
      p.numero || '',
      p.complemento || '',
      p.origem || ''
    ]);

    return json_({ status: 'ok' });
  } catch (err) {
    return json_({ status: 'erro', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Resposta amigável ao abrir a URL no navegador (teste).
function doGet() {
  return json_({ status: 'ok', message: 'Endpoint ativo' });
}

// Aceita tanto form-encoded (e.parameter) quanto JSON (e.postData).
function parseInput_(e) {
  if (e && e.parameter && e.parameter.nome) return e.parameter;
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (_) {}
  }
  return (e && e.parameter) || {};
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
