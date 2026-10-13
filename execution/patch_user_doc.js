const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Iniciando atualização cirúrgica do documento Word do usuário...');

const docXmlPath = path.join(__dirname, '../.tmp/extracted_docx/word/document.xml');
let xml = fs.readFileSync(docXmlPath, 'utf8');

const targetStartText = '4.4. TELA INICIAL';
const targetEndText = '4.5. TELA DE VEÍCULOS';

const idxStart = xml.indexOf(targetStartText);
const idxEnd = xml.indexOf(targetEndText);

if (idxStart === -1 || idxEnd === -1) {
    console.error('ERRO: Não foi possível localizar as seções 4.4 ou 4.5 no documento!');
    process.exit(1);
}

const pStart = xml.lastIndexOf('<w:p', idxStart);
const pEnd = xml.lastIndexOf('<w:p', idxEnd);

console.log(`Localizada seção 4.4: posição ${pStart} até ${pEnd} (tamanho: ${pEnd - pStart} caracteres)`);

// Novo bloco XML exatamente formatado para o padrão Word / docx
const replacementXml = [
    '<w:p><w:pPr><w:pStyle w:val="Ttulo2"/><w:spacing w:before="200" w:after="100"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="0F172A"/><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr><w:t>4.4. TELA INICIAL (VISÃO GERAL / HOME DA FROTA)</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:spacing w:before="60" w:after="60" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:t>A tela inicial do CAR VERIFY ("Visão Geral da Frota") é a central de comando operacional, apresentando em um único painel a integridade e conformidade de todos os 10 veículos ativos da frota própria no mês selecionado.</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:pStyle w:val="Ttulo3"/><w:spacing w:before="160" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="2563EB"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>4.4.1. Controles e Filtros de Período</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:spacing w:before="60" w:after="60" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:t>No canto superior direito da tela, encontram-se os recursos de seleção e relatório:</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:ind w:left="400"/><w:spacing w:before="40" w:after="40" w:line="260" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="2563EB"/></w:rPr><w:t xml:space="preserve">✓  </w:t></w:r><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Seletor de Mês da Frota: </w:t></w:r><w:r><w:t>Menu suspenso que permite alternar a visualização para qualquer mês do histórico operacional (ex: Outubro 2026, Setembro 2026), recalculando instantaneamente os percentuais de conformidade e odômetros de todos os carros;</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:ind w:left="400"/><w:spacing w:before="40" w:after="40" w:line="260" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="2563EB"/></w:rPr><w:t xml:space="preserve">✓  </w:t></w:r><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Botão "Apresentação PPTX": </w:t></w:r><w:r><w:t>Acesso direto ao modal de geração e download dos relatórios executivos em PowerPoint.</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:pStyle w:val="Ttulo3"/><w:spacing w:before="160" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="2563EB"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>4.4.2. Grade de Cartões Individuais dos Veículos</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:spacing w:before="60" w:after="60" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:t>O painel organiza os veículos em cartões individuais dedicados para cada placa da frota (5 Fiorinos e 5 caminhões IVECO). Cada cartão contém:</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:pStyle w:val="PargrafodaLista"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:before="40" w:after="40" w:line="260" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Identificação: </w:t></w:r><w:r><w:t>Exibição da placa oficial em destaque e badge indicando a categoria e modelo do veículo.</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:pStyle w:val="PargrafodaLista"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:before="40" w:after="40" w:line="260" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Índice de Conformidade (%): </w:t></w:r><w:r><w:t>Índice de conformidade do veículo no mês (ex: 97%, 93%, 83%), acompanhado da legenda descritiva ("CONFORME" ou "SEM DADOS" caso o veículo não tenha operado no período).</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:pStyle w:val="PargrafodaLista"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:before="40" w:after="40" w:line="260" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Barra Visual de Status: </w:t></w:r><w:r><w:t>Linha de gradiente que indica visualmente o nível de atenção do veículo (Verde para conformidade alta ≥ 95%, Âmbar/Laranja para intermediária e Vermelho para atenção/crítica).</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:pStyle w:val="PargrafodaLista"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:before="40" w:after="40" w:line="260" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Quilometragem (KM): </w:t></w:r><w:r><w:t>Última quilometragem registrada no odômetro pelo condutor no mês (ex: 146.578 km, 282.900 km).</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:pStyle w:val="PargrafodaLista"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:before="40" w:after="40" w:line="260" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">Navegação Direta: </w:t></w:r><w:r><w:t>Ao clicar em qualquer cartão de veículo, o usuário é direcionado imediatamente para a tela "Veículos", abrindo o calendário e a ficha técnica completa daquela placa.</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:pStyle w:val="Ttulo3"/><w:spacing w:before="160" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="2563EB"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>4.4.3. Gráfico de Conformidade Geral da Frota</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:spacing w:before="60" w:after="60" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:t>Localizado na parte inferior da tela inicial, este gráfico de linha traça a trajetória e evolução histórica da conformidade média de toda a frota ao longo dos meses. Esse indicador permite à supervisão identificar tendências de melhoria ou deterioração na conservação dos veículos, fundamentando decisões de manutenção preventiva e reuniões com a equipe.</w:t></w:r></w:p>',
    '<w:p><w:pPr><w:spacing w:before="100"/></w:pPr></w:p>',
    '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="double" w:sz="12" w:space="0" w:color="000000"/><w:left w:val="double" w:sz="12" w:space="0" w:color="000000"/><w:bottom w:val="double" w:sz="12" w:space="0" w:color="000000"/><w:right w:val="double" w:sz="12" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders><w:tblCellMar><w:left w:w="10" w:type="dxa"/><w:right w:w="10" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="0"/></w:tblPr><w:tblGrid><w:gridCol w:w="9816"/></w:tblGrid><w:tr><w:tblPrEx><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPrEx><w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:tcMar><w:top w:w="140" w:type="dxa"/><w:left w:w="200" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/><w:right w:w="200" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="40" w:after="40" w:line="260" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:i/><w:iCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">NOTA: </w:t></w:r><w:r><w:rPr><w:i/><w:iCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>O SUPERVISOR DE DISTRIBUIÇÃO E OS LÍDERES DE TURNO DEVEM REVISAR A TELA INICIAL AO MENOS DUAS VEZES AO DIA (ÀS 07:00H APÓS A SAÍDA MATUTINA E ÀS 17:00H NO RETORNO DE ROTA) PARA AUDITAR POSSÍVEIS DESVIOS DE PREENCHIMENTO E IDENTIFICAR VEÍCULOS COM ÍNDICES REBAIXADOS.</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
    '<w:p><w:pPr><w:spacing w:after="100"/></w:pPr></w:p>',
    '<w:p><w:pPr><w:spacing w:before="180" w:after="80"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Imagem 4 – Tela Inicial do CAR VERIFY (Visão Geral da Frota)</w:t></w:r></w:p>',
    '<w:tbl><w:tblPr><w:tblW w:w="4750" w:type="pct"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/><w:left w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/><w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders><w:tblCellMar><w:left w:w="10" w:type="dxa"/><w:right w:w="10" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="0"/></w:tblPr><w:tblGrid><w:gridCol w:w="9396"/></w:tblGrid><w:tr><w:tblPrEx><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPrEx><w:trPr><w:jc w:val="center"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:tcMar><w:top w:w="280" w:type="dxa"/><w:left w:w="300" w:type="dxa"/><w:bottom w:w="280" w:type="dxa"/><w:right w:w="300" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="80" w:after="60"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="2563EB"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>[ CAPTURA DE TELA / REGISTRO VISUAL: TELA INICIAL DO CAR VERIFY (VISÃO GERAL DA FROTA) ]</w:t></w:r></w:p><w:p><w:pPr><w:spacing w:before="40" w:after="80"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:iCs/><w:color w:val="475569"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Painel com seletor de mês, botão PPTX, cartões de monitoramento individual das 10 placas (Conformidade, Status e KM) e Gráfico de Conformidade Geral da Frota.</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
    '<w:p><w:pPr><w:spacing w:after="140"/></w:pPr></w:p>'
].join('');

const updatedXml = xml.substring(0, pStart) + replacementXml + xml.substring(pEnd);
fs.writeFileSync(docXmlPath, updatedXml, 'utf8');

console.log('document.xml atualizado cirurgicamente!');

// Recompacta o arquivo docx
const extractedDir = path.join(__dirname, '../.tmp/extracted_docx');
const targetDocx = path.join(__dirname, '../Instrucao_de_Trabalho_CAR_VERIFY_139_DIS_IT.docx');

// Utiliza o PowerShell System.IO.Compression para recriar o zip preservando tudo
const psScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem;
$targetPath = "${targetDocx.replace(/\\/g, '\\\\')}";
$sourceDir = "${extractedDir.replace(/\\/g, '\\\\')}";

if (Test-Path $targetPath) {
    Remove-Item $targetPath -Force;
}

[System.IO.Compression.ZipFile]::CreateFromDirectory($sourceDir, $targetPath);
`;

fs.writeFileSync(path.join(__dirname, '../.tmp/repack.ps1'), psScript);
execSync('powershell -ExecutionPolicy Bypass -File .tmp/repack.ps1');

const finalStat = fs.statSync(targetDocx);
console.log(`Documento Word reempacotado com sucesso! Tamanho final: ${(finalStat.size / 1024).toFixed(1)} KB`);
