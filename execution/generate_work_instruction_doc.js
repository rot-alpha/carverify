const fs = require('fs');
const path = require('path');
const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
    VerticalAlign,
    Header,
    Footer,
    PageNumber,
    ImageRun,
    HeadingLevel,
    ShadingType
} = require('docx');

// Carrega as imagens oficiais do projeto se existirem
const logoGrupoEfxPath = path.join(__dirname, '../src/assets/logo-grupo-efx.png');
const logoCarVerifyPath = path.join(__dirname, '../src/assets/logo-car-verify.png');

let logoEfxBuffer = null;
if (fs.existsSync(logoGrupoEfxPath)) {
    logoEfxBuffer = fs.readFileSync(logoGrupoEfxPath);
}

let logoCarVerifyBuffer = null;
if (fs.existsSync(logoCarVerifyPath)) {
    logoCarVerifyBuffer = fs.readFileSync(logoCarVerifyPath);
}

// Definições de Estilo Institucional
const FONT_FAMILY = 'Calibri';
const COLOR_PRIMARY = '0F172A'; // Dark Navy corporativo
const COLOR_ACCENT = '2563EB'; // Blue
const COLOR_MUTED = '475569';
const COLOR_BORDER = '94A3B8';
const COLOR_BORDER_DARK = '000000';
const COLOR_BG_LIGHT = 'F8FAFC';
const COLOR_BG_NOTE = 'F1F5F9';

// Helpers para criação de elementos estilizados
function createTitle(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 280, after: 120 },
        children: [
            new TextRun({
                text: text,
                bold: true,
                size: 26, // 13pt
                font: FONT_FAMILY,
                color: COLOR_PRIMARY
            })
        ]
    });
}

function createSubTitle(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
            new TextRun({
                text: text,
                bold: true,
                size: 23, // 11.5pt
                font: FONT_FAMILY,
                color: COLOR_PRIMARY
            })
        ]
    });
}

function createSubSubTitle(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 80 },
        children: [
            new TextRun({
                text: text,
                bold: true,
                size: 21, // 10.5pt
                font: FONT_FAMILY,
                color: COLOR_ACCENT
            })
        ]
    });
}

function createBody(text, bold = false, italic = false) {
    return new Paragraph({
        spacing: { before: 60, after: 60, line: 276 },
        children: [
            new TextRun({
                text: text,
                bold: bold,
                italics: italic,
                size: 21, // 10.5pt
                font: FONT_FAMILY,
                color: COLOR_PRIMARY
            })
        ]
    });
}

function createBullet(text, boldPrefix = '') {
    const children = [];
    if (boldPrefix) {
        children.push(new TextRun({
            text: boldPrefix + ' ',
            bold: true,
            size: 21,
            font: FONT_FAMILY,
            color: COLOR_PRIMARY
        }));
    }
    children.push(new TextRun({
        text: text,
        size: 21,
        font: FONT_FAMILY,
        color: COLOR_PRIMARY
    }));

    return new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 40, after: 40, line: 260 },
        children: children
    });
}

function createCheckBullet(text, boldPrefix = '') {
    const children = [
        new TextRun({
            text: '✓  ',
            bold: true,
            size: 21,
            font: FONT_FAMILY,
            color: COLOR_ACCENT
        })
    ];
    if (boldPrefix) {
        children.push(new TextRun({
            text: boldPrefix + ' ',
            bold: true,
            size: 21,
            font: FONT_FAMILY,
            color: COLOR_PRIMARY
        }));
    }
    children.push(new TextRun({
        text: text,
        size: 21,
        font: FONT_FAMILY,
        color: COLOR_PRIMARY
    }));

    return new Paragraph({
        indent: { left: 400 },
        spacing: { before: 40, after: 40, line: 260 },
        children: children
    });
}

function createNumberedStep(number, text, boldPrefix = '') {
    const children = [
        new TextRun({
            text: `${number}  `,
            bold: true,
            size: 21,
            font: FONT_FAMILY,
            color: COLOR_PRIMARY
        })
    ];
    if (boldPrefix) {
        children.push(new TextRun({
            text: boldPrefix + ' ',
            bold: true,
            size: 21,
            font: FONT_FAMILY,
            color: COLOR_PRIMARY
        }));
    }
    children.push(new TextRun({
        text: text,
        size: 21,
        font: FONT_FAMILY,
        color: COLOR_PRIMARY
    }));

    return new Paragraph({
        indent: { left: 400 },
        spacing: { before: 60, after: 60, line: 270 },
        children: children
    });
}

// Cria caixa de NOTA exatamente no padrão visual da empresa
function createNoteBox(noteText) {
    const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.DOUBLE, size: 12, color: COLOR_BORDER_DARK },
            bottom: { style: BorderStyle.DOUBLE, size: 12, color: COLOR_BORDER_DARK },
            left: { style: BorderStyle.DOUBLE, size: 12, color: COLOR_BORDER_DARK },
            right: { style: BorderStyle.DOUBLE, size: 12, color: COLOR_BORDER_DARK }
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        shading: { type: ShadingType.CLEAR, fill: COLOR_BG_NOTE },
                        margins: { top: 140, bottom: 140, left: 200, right: 200 },
                        children: [
                            new Paragraph({
                                spacing: { before: 40, after: 40, line: 260 },
                                children: [
                                    new TextRun({
                                        text: 'NOTA: ',
                                        bold: true,
                                        italics: true,
                                        size: 20,
                                        font: FONT_FAMILY,
                                        color: COLOR_PRIMARY
                                    }),
                                    new TextRun({
                                        text: noteText,
                                        italics: true,
                                        size: 20,
                                        font: FONT_FAMILY,
                                        color: COLOR_PRIMARY
                                    })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]
    });

    return [
        new Paragraph({ spacing: { before: 100 } }),
        table,
        new Paragraph({ spacing: { after: 100 } })
    ];
}

// Cria moldura padronizada para figura / imagem
function createImagePlaceholder(imageNumber, title, description, embeddedBuffer = null, imgWidth = 520, imgHeight = 220) {
    const items = [];

    items.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 180, after: 80 },
        children: [
            new TextRun({
                text: `Imagem ${imageNumber} – ${title}`,
                bold: true,
                size: 21,
                font: FONT_FAMILY,
                color: COLOR_PRIMARY
            })
        ]
    }));

    if (embeddedBuffer) {
        items.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 80 },
            children: [
                new ImageRun({
                    data: embeddedBuffer,
                    transformation: { width: imgWidth, height: imgHeight }
                })
            ]
        }));
    } else {
        // Moldura técnica para screenshot caso não haja imagem binária direta
        const placeholderTable = new Table({
            width: { size: 95, type: WidthType.PERCENTAGE },
            alignment: AlignmentType.CENTER,
            borders: {
                top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
                left: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
                right: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER }
            },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            shading: { type: ShadingType.CLEAR, fill: COLOR_BG_LIGHT },
                            margins: { top: 280, bottom: 280, left: 300, right: 300 },
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 80, after: 60 },
                                    children: [
                                        new TextRun({
                                            text: `[ CAPTURA DE TELA / REGISTRO VISUAL: ${title.toUpperCase()} ]`,
                                            bold: true,
                                            size: 20,
                                            font: FONT_FAMILY,
                                            color: COLOR_ACCENT
                                        })
                                    ]
                                }),
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 40, after: 80 },
                                    children: [
                                        new TextRun({
                                            text: description,
                                            italics: true,
                                            size: 18,
                                            font: FONT_FAMILY,
                                            color: COLOR_MUTED
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                })
            ]
        });
        items.push(placeholderTable);
    }

    items.push(new Paragraph({ spacing: { after: 140 } }));
    return items;
}

// ─── MONTAGEM DO CABEÇALHO PADRÃO EMPRESA ────────────────
function buildDocumentHeader() {
    const logoCellChildren = [];
    if (logoEfxBuffer) {
        logoCellChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new ImageRun({
                    data: logoEfxBuffer,
                    transformation: { width: 120, height: 42 }
                })
            ]
        }));
    } else {
        logoCellChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: 'ALPHA Candies', bold: true, size: 22, font: FONT_FAMILY }),
                new TextRun({ text: '\nGRUPO EFX IMPORTAÇÃO', size: 14, font: FONT_FAMILY, color: COLOR_MUTED })
            ]
        }));
    }

    const titleCellChildren = [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 },
            children: [
                new TextRun({
                    text: 'INSTRUÇÃO DE TRABALHO',
                    size: 22, // 11pt
                    font: FONT_FAMILY,
                    color: COLOR_PRIMARY
                })
            ]
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 },
            children: [
                new TextRun({
                    text: 'Gestão e Controle de Checklists da Frota – Sistema CAR VERIFY',
                    bold: true,
                    size: 24, // 12pt
                    font: FONT_FAMILY,
                    color: COLOR_PRIMARY
                })
            ]
        })
    ];

    // Tabela lateral direita (Código, Data, Revisão, Página)
    const metaTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER_DARK },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER_DARK },
            left: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER_DARK },
            right: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER_DARK },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER_DARK },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER_DARK }
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        margins: { top: 30, bottom: 30, left: 60, right: 60 },
                        children: [new Paragraph({ children: [new TextRun({ text: 'Código', bold: true, size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        margins: { top: 30, bottom: 30, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '139.DIS.IT', size: 18, font: FONT_FAMILY })] })]
                    })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({
                        margins: { top: 30, bottom: 30, left: 60, right: 60 },
                        children: [new Paragraph({ children: [new TextRun({ text: 'Data', bold: true, size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        margins: { top: 30, bottom: 30, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '02/10/2026', size: 18, font: FONT_FAMILY })] })]
                    })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({
                        margins: { top: 30, bottom: 30, left: 60, right: 60 },
                        children: [new Paragraph({ children: [new TextRun({ text: 'Revisão', bold: true, size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        margins: { top: 30, bottom: 30, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'R00', size: 18, font: FONT_FAMILY })] })]
                    })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({
                        margins: { top: 30, bottom: 30, left: 60, right: 60 },
                        children: [new Paragraph({ children: [new TextRun({ text: 'Página', bold: true, size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        margins: { top: 30, bottom: 30, left: 60, right: 60 },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({ children: [PageNumber.CURRENT], size: 18, font: FONT_FAMILY }),
                                    new TextRun({ text: ' de ', size: 18, font: FONT_FAMILY }),
                                    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: FONT_FAMILY })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]
    });

    // Tabela Geral de Cabeçalho (3 Colunas)
    const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER_DARK },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER_DARK },
            left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER_DARK },
            right: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER_DARK },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER_DARK }
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 24, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: { top: 80, bottom: 80, left: 80, right: 80 },
                        children: logoCellChildren
                    }),
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: { top: 60, bottom: 60, left: 100, right: 100 },
                        children: titleCellChildren
                    }),
                    new TableCell({
                        width: { size: 26, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: { top: 40, bottom: 40, left: 40, right: 40 },
                        children: [metaTable]
                    })
                ]
            })
        ]
    });

    return new Header({
        children: [headerTable, new Paragraph({ spacing: { after: 120 } })]
    });
}

// ─── CONSTRUÇÃO DO CONTEÚDO PRINCIPAL ───────────────────
function buildDocumentBody() {
    const content = [];

    // 1. OBJETIVO
    content.push(createTitle('1. OBJETIVO'));
    content.push(createBody(
        'Esta Instrução de Trabalho (IT) tem como objetivo padronizar e regulamentar os procedimentos operacionais de vistoria, preenchimento, validação técnica, sincronização sistêmica e auditoria contínua dos checklists diários dos veículos da frota própria pertencentes à ALPHA CANDIES (GRUPO EFX IMPORTAÇÃO).'
    ));
    content.push(createBody(
        'O cumprimento desta rotina visa assegurar as perfeitas condições mecânicas, elétricas, de segurança viária e de higiene da frota (composta por veículos Fiorino e IVECO/VUC), garantindo a integridade dos motoristas e ajudantes, a conformidade rigorosa da cadeia de frio no transporte de cargas refrigeradas (Thermo King), a conservação patrimonial e a rastreabilidade total das inspeções em tempo real através da plataforma web integrada CAR VERIFY.'
    ));

    // 2. DEFINIÇÃO
    content.push(createTitle('2. DEFINIÇÃO'));
    content.push(createBullet('Vistoria preventiva e obrigatória realizada pelo motorista antes do início de sua jornada operacional, contemplando a avaliação minuciosa de 29 itens de segurança e funcionamento do veículo.', 'Checklist Operacional Diário:'));
    content.push(createBullet('Plataforma web corporativa de inteligência operacional e auditoria, desenvolvida para centralizar, analisar e exibir indicadores de conformidade mecânica, engajamento dos condutores, histórico cronológico e alertas de avarias da frota.', 'CAR VERIFY:'));
    content.push(createBullet('Veículos automotores registrados e pertencentes à empresa, destinados ao transporte, distribuição e entrega de mercadorias no estado de São Paulo e praças regionais.', 'Frota Própria (FP):'));
    content.push(createBullet('Componente veicular ou item de documentação que foi inspecionado e considerado em perfeitas condições de uso, sem apresentar avarias, folgas ou inconformidades.', 'Item Conforme (OK):'));
    content.push(createBullet('Componente veicular ou aspecto operacional que apresentou anomalia, desgaste excessivo, quebra, vazamento ou inconformidade legal, exigindo reporte descritivo e eventual intervenção corretiva.', 'Item Não Conforme (NOK):'));
    content.push(createBullet('Métrica percentual que avalia a razão entre a quantidade de itens aprovados (OK) e o total de 29 itens inspecionados no checklist, expressando a integridade física e operacional do veículo.', 'Índice de Conformidade (%):'));
    content.push(createBullet('Indicador que afere a regularidade dos condutores na realização do checklist diário frente aos dias operacionais úteis do veículo, descontando afastamentos legais e férias aprovadas.', 'Taxa de Engajamento Operacional (%):'));
    content.push(createBullet('Sinalização gráfica interativa exibida no calendário mensal e nos cartões do painel CAR VERIFY, indicando que o veículo passou por duas ou mais vistorias completas na mesma data (ex: trocas de turno ou inspeções de reentrada).', 'Selo "2x" (Múltiplas Vistorias Diárias):'));
    content.push(createBullet('Rotina algorítmica de proteção de integridade de dados que analisa a data informada pelo condutor e, caso identifique digitação inválida ou ano inconsistente, utiliza com precisão o carimbo oficial de data e hora do envio.', 'Resolução Inteligente de Data:'));
    content.push(createBullet('Equipamento de refrigeração e climatização acoplado ao baú do veículo, indispensável para manter a temperatura controlada das mercadorias e a segurança microbiológica dos alimentos transportados.', 'Thermo King:'));
    content.push(createBullet('Banco de dados relacional em nuvem (PostgreSQL) onde todos os dados de vistorias, motoristas e veículos são armazenados de forma estruturada, segura e escalável.', 'Supabase Database:'));
    content.push(createBullet('Tecnologia de mensageria via WebSockets que transmite eventos instantâneos de novos registros inseridos no banco diretamente para a interface do CAR VERIFY, sem necessidade de atualização manual da tela (F5).', 'Supabase Realtime:'));
    content.push(createBullet('Registro quilométrico exibido no odômetro do veículo no momento da inspeção, indispensável para o controle preventivo de revisões mecânicas e troca de fluidos.', 'KM Atual:'));

    // 3. RESPONSABILIDADE
    content.push(createTitle('3. RESPONSABILIDADE'));
    content.push(createNumberedStep('1', 'Executar a inspeção visual e funcional completa dos 29 itens do veículo antes de sair para entrega, preencher com precisão o formulário digital, relatar anomalias no campo de observações e reportar inconformidades críticas à liderança.', 'Motorista Operacional:'));
    content.push(createNumberedStep('2', 'Auxiliar o motorista na conferência de itens visuais externos (luzes de ré, lanternas, travas e limpeza do baú) e zelar pelas boas práticas durante o manuseio e acomodação da carga.', 'Ajudante de Distribuição:'));
    content.push(createNumberedStep('3', 'Acompanhar em tempo real os checklists transmitidos pelo painel CAR VERIFY, vetar imediatamente a saída de veículos que apresentem itens de segurança crítica em estado NOK e abrir ordens de serviço junto à manutenção mecânica.', 'Líder de Frota / Encarregado de Operações:'));
    content.push(createNumberedStep('4', 'Monitorar os indicadores gerais de conformidade e engajamento da frota, cobrar planos de ação para itens recorrentes de desgaste e apresentar os resultados em reuniões executivas periódicas.', 'Supervisor de Distribuição e Transporte:'));
    content.push(createNumberedStep('5', 'Auditar os registros eletrônicos, garantir a rastreabilidade das informações conforme as diretrizes do Sistema de Gestão da Qualidade (SGQ) e propor melhorias contínuas nesta Instrução de Trabalho.', 'Analista de Qualidade e Processos:'));

    // 4. DESCRIÇÃO DO PROCESSO
    content.push(createTitle('4. DESCRIÇÃO DO PROCESSO - GESTÃO DE CHECKLIST E PAINEL CAR VERIFY'));

    // 4.1. PREENCHIMENTO DO FORMULÁRIO DE CHECKLIST
    content.push(createSubTitle('4.1. PREENCHIMENTO DO FORMULÁRIO DE CHECKLIST (ROTINA DO MOTORISTA)'));
    content.push(createBody(
        'Todo motorista da frota própria, ao iniciar sua escala de trabalho na base operacional da ALPHA CANDIES e antes de realizar qualquer deslocamento com o veículo, deve cumprir rigorosamente o procedimento de inspeção física e preenchimento digital.'
    ));

    content.push(createNumberedStep('1', 'Acessar o formulário eletrônico de checklist através do QR Code afixado no para-brisa da cabine ou link oficial salvo no navegador do smartphone corporativo.'));
    content.push(createNumberedStep('2', 'Preencher os campos de cabeçalho inicial:'));
    content.push(createCheckBullet('Data da Vistoria: Informar a data do dia em que a inspeção está sendo realizada (formato DD/MM/AAAA);', '✓'));
    content.push(createCheckBullet('Modelo do Veículo: Selecionar o tipo de veículo em uso (FIORINO ou IVECO);', '✓'));
    content.push(createCheckBullet('Placa do Veículo: Selecionar a placa oficial correspondente ao veículo físico (Fiorinos: SUX8H84, SUE7D02, SVJ3H89, SUW7B16, STA0F48 | IVECO: FRG7C31, FPF8A23, FXI0C35, ECF3235, FJF7817);', '✓'));
    content.push(createCheckBullet('KM Atual do Veículo: Digitar a quilometragem exata indicada no odômetro no momento da vistoria (apenas números, sem pontos ou letras);', '✓'));
    content.push(createCheckBullet('Motorista: Selecionar ou digitar o nome completo do condutor titular responsável pela escala;', '✓'));
    content.push(createCheckBullet('Ajudante: Selecionar o ajudante escalado para a rota ou a opção "Sem Ajudante";', '✓'));
    content.push(createCheckBullet('Nome do Líder Atual: Indicar o encarregado responsável pelo turno no pátio (ex: Júlio, Gabriel).', '✓'));

    content.push(createNumberedStep('3', 'Realizar a verificação física e marcar OK ou NOK nos 29 itens padronizados de inspeção:'));
    content.push(createBullet('Sistema de freio (resposta e pressão do pedal), Freio de mão/estacionamento (retenção mecânica), Nível de óleo hidráulico (direção/freios) e Pedais (borrachas e acionamento).', 'Sistemas de Frenagem e Direção:'));
    content.push(createBullet('Nível de óleo do motor (medido na vareta antes da partida), Nível de água do radiador (reservatório de expansão), Tampas dos tanques (combustível e Arla) e Bateria (fixação, bornes limpos e carga).', 'Motorização e Fluidos:'));
    content.push(createBullet('Luz de freio, luz de ré, setas e pisca-alerta, Faróis (alto e baixo) e lanternas dianteiras/traseiras, Luzes indicadoras do painel de instrumentos e Buzina sonora.', 'Sistemas Elétricos e Iluminação:'));
    content.push(createBullet('Pneus (calibragem, desgaste e profundidade dos sulcos), Estepe (presença e calibragem calibrada) e Macaco hidráulico, triângulo de sinalização e chave de roda.', 'Rodagem e Equipamentos Obrigatórios:'));
    content.push(createBullet('Para-brisa (ausência de trincas ou impactos), Limpador e palhetas de borracha, Espelhos retrovisores externos/internos, Vidros laterais e Fechaduras/travas das portas da cabine.', 'Visibilidade e Cabine:'));
    content.push(createBullet('Limpeza do veículo (cabine interna e baú desinfetado), Estrutura e assoalho do baú, Portas do baú (trincos, borrachas e vedação térmica), Carrinho de carga metálico e Funcionamento do Thermo King (atingimento da temperatura de set-point e ausência de alarmes).', 'Compartimento de Carga e Refrigeração:'));
    content.push(createBullet('CRLV do veículo atualizado e de porte obrigatório, CNH compatível com a categoria do veículo inspecionado e Celular corporativo da empresa com bateria carregada.', 'Documentação e Comunicação:'));

    content.push(createNumberedStep('4', 'No campo "Há alguma observação a ser mencionada?", detalhar com clareza qualquer anomalia constatada. Esse campo é de preenchimento obrigatório sempre que houver itens marcados como NOK.'));
    content.push(createNumberedStep('5', 'Confirmar as declarações de ciência ("Declaro que o checklist foi realizado corretamente" e "Declaro ciência das condições do veículo") e clicar no botão "Enviar".'));

    // Notas da seção 4.1
    content.push(...createNoteBox(
        'É TERMINANTEMENTE PROIBIDO LIBERAR A SAÍDA DE VEÍCULOS QUE APRESENTEM ITENS DE SEGURANÇA CRÍTICA CLASSIFICADOS COMO "NOK" (SISTEMA DE FREIOS, DIREÇÃO COM FOLGA, PNEUS COM SULCO ABAIXO DO LIMITE LEGAL, FALHA TOTAL DE ILUMINAÇÃO NOTURNA OU FALHA NO THERMO KING PARA CARGAS RESFRIADAS). O MOTORISTA DEVE REPORTAR O PROBLEMA DE IMEDIATO À LIDERANÇA ANTES DE INICIAR O DESLOCAMENTO.'
    ));

    content.push(...createNoteBox(
        'CASO O VEÍCULO REALIZE UMA SEGUNDA VIAGEM NO MESMO DIA OU HAJA TROCA DE CONDUTOR ENTRE TURNOS, DEVERÁ SER PREENCHIDO UM NOVO CHECKLIST COMPLETO. O SISTEMA CAR VERIFY CONSOLIDARÁ AMBAS AS VISTORIAS NO CALENDÁRIO, DESTACANDO O SELO "2x" PARA FINS DE RASTREABILIDADE OPERACIONAL.'
    ));

    // Imagens do fluxo do motorista
    content.push(...createImagePlaceholder('1', 'Formulário Digital de Checklist (Acesso Mobile)', 'Visualização dos campos de identificação do veículo (Placa, KM, Motorista, Ajudante e Líder) no dispositivo móvel do condutor.'));
    content.push(...createImagePlaceholder('2', 'Seção de Vistoria dos 29 Itens Operacionais', 'Exibição das opções de resposta (OK / NOK) e campo obrigatório de observações para apontamento detalhado de avarias.'));

    // 4.2. SINCRONIZAÇÃO E INTEGRAÇÃO DE DADOS
    content.push(createSubTitle('4.2. INTEGRAÇÃO E FLUXO SISTÊMICO DE DADOS'));
    content.push(createBody(
        'O ecossistema CAR VERIFY conta com uma arquitetura moderna e automatizada de dados dividida em 3 camadas complementares:'
    ));
    content.push(createNumberedStep('1', 'No momento em que o motorista conclui o formulário, o gatilho "onFormSubmit" do Google Apps Script intercepta os dados brutos e efetua a gravação simultânea na Planilha Google Sheets e na API do Supabase em menos de 2 segundos.', 'Gatilho Imediato (Edge Trigger):'));
    content.push(createNumberedStep('2', 'O banco de dados relacional Supabase valida a consistência das respostas, normaliza a data através do algoritmo inteligente de resolução e persiste o registro na tabela "checklists".', 'Armazenamento em Nuvem (Supabase):'));
    content.push(createNumberedStep('3', 'Via protocolo WebSocket (Supabase Realtime), um evento de inserção é enviado para o painel web CAR VERIFY, provocando o recálculo dos indicadores e a atualização visual instantânea da tela sem necessidade de intervenção do usuário.', 'Transmissão em Tempo Real (Realtime):'));

    // 4.3. ACESSO E VISÃO GERAL DO CAR VERIFY
    content.push(createSubTitle('4.3. ACESSO E NAVEGAÇÃO NO PAINEL CAR VERIFY'));
    content.push(createBody(
        'O painel CAR VERIFY é uma aplicação web corporativa acessível em ambiente desktop e mobile através do endereço oficial homologado pela equipe de TI/Distribuição.'
    ));
    content.push(createBody(
        'Principais controles de interface presentes no topo da tela (Cabeçalho Superior):'
    ));
    content.push(createCheckBullet('Menu de Navegação Principal: Permite alternar rapidamente entre as telas "Início" (Visão Geral), "Veículos" (Dashboard Individual do Veículo), "Motoristas" (Gestão da Equipe) e o botão de "Apresentação PPTX";', '✓'));
    content.push(createCheckBullet('Seletor de Tema (Dark / Light): Permite escolher entre o modo escuro de alto contraste (ideal para visualização prolongada e telas de monitoramento) e o modo claro (ideal para apresentações e relatórios impressos);', '✓'));
    content.push(createCheckBullet('Botão de Sincronização Manual (Ícone circular de recarga): Força uma reconsulta completa aos servidores da nuvem caso a conexão do usuário tenha sofrido oscilação temporária.', '✓'));

    content.push(...createImagePlaceholder('3', 'Barra Superior e Menu Global do CAR VERIFY', 'Logotipo CAR VERIFY, botões de navegação (Início, Veículos, Motoristas), seletor de tema claro/escuro e botão de sincronização.', logoCarVerifyBuffer, 460, 100));

    // 4.4. TELA INICIAL (VISÃO GERAL / HOME DA FROTA)
    content.push(createSubTitle('4.4. TELA INICIAL (VISÃO GERAL / HOME DA FROTA)'));
    content.push(createBody(
        'A tela inicial do CAR VERIFY ("Visão Geral da Frota") é a central de comando operacional, apresentando em um único painel a integridade de todos os 10 veículos ativos da frota própria no mês selecionado.'
    ));

    content.push(createSubSubTitle('4.4.1. Controles e Filtros de Período'));
    content.push(createBody(
        'No canto superior direito da tela, encontram-se os recursos de seleção e relatório:'
    ));
    content.push(createCheckBullet('Seletor de Mês da Frota: Menu suspenso que permite alternar a visualização para qualquer mês do histórico operacional (ex: Outubro 2026, Setembro 2026), recalculando instantaneamente os percentuais de conformidade e odômetros de todos os carros;', '✓'));
    content.push(createCheckBullet('Botão "Apresentação PPTX": Acesso direto ao modal de geração e download dos relatórios executivos em PowerPoint.', '✓'));

    content.push(createSubSubTitle('4.4.2. Grade de Cartões Individuais dos Veículos'));
    content.push(createBody(
        'O painel organiza os veículos em cartões individuais dedicados para cada placa da frota (5 Fiorinos e 5 caminhões IVECO). Cada cartão contém:'
    ));
    content.push(createBullet('Exibição da placa oficial em destaque e badge indicando a categoria e modelo do veículo.', 'Identificação:'));
    content.push(createBullet('Índice de conformidade do veículo no mês (ex: 97%, 93%, 83%), acompanhado da legenda descritiva ("CONFORME" ou "SEM DADOS" caso o veículo não tenha operado no período).', 'Índice de Conformidade (%):'));
    content.push(createBullet('Linha de gradiente que indica visualmente o nível de atenção do veículo (Verde para conformidade alta ≥ 95%, Âmbar/Laranja para intermediária e Vermelho para atenção/crítica).', 'Barra Visual de Status:'));
    content.push(createBullet('Última quilometragem registrada no odômetro pelo condutor no mês (ex: 146.578 km, 282.900 km).', 'Quilometragem (KM):'));
    content.push(createBullet('Ao clicar em qualquer cartão de veículo, o usuário é direcionado imediatamente para a tela "Veículos", abrindo o calendário e a ficha técnica completa daquela placa.', 'Navegação Direta:'));

    content.push(createSubSubTitle('4.4.3. Gráfico de Conformidade Geral da Frota'));
    content.push(createBody(
        'Localizado na parte inferior da tela inicial, este gráfico de linha traça a trajetória e evolução histórica da conformidade média de toda a frota ao longo dos meses. Esse indicador permite à supervisão identificar tendências de melhoria ou deterioração na conservação dos veículos, fundamentando decisões de manutenção preventiva e reuniões com a equipe.'
    ));

    content.push(...createNoteBox(
        'O SUPERVISOR DE DISTRIBUIÇÃO E OS LÍDERES DE TURNO DEVEM REVISAR A TELA INICIAL AO MENOS DUAS VEZES AO DIA (ÀS 07:00H APÓS A SAÍDA MATUTINA E ÀS 17:00H NO RETORNO DE ROTA) PARA AUDITAR POSSÍVEIS DESVIOS DE PREENCHIMENTO E IDENTIFICAR VEÍCULOS COM ÍNDICES REBAIXADOS.'
    ));

    content.push(...createImagePlaceholder('4', 'Tela Inicial do CAR VERIFY (Visão Geral da Frota)', 'Painel com seletor de mês, botão PPTX, cartões de monitoramento individual das 10 placas (Conformidade, Status e KM) e Gráfico de Conformidade Geral da Frota.'));

    // 4.5. TELA DE VEÍCULOS E CALENDÁRIO OPERACIONAL
    content.push(createSubTitle('4.5. TELA DE VEÍCULOS E CALENDÁRIO OPERACIONAL (DASHBOARD INDIVIDUAL)'));
    content.push(createBody(
        'A tela de Veículos é o coração operacional do sistema, permitindo a auditoria minuciosa e histórica de cada veículo individualmente.'
    ));

    content.push(createNumberedStep('1', 'No topo da tela ou na lista de seleção rápida, clicar sobre a placa desejada para carregar todo o seu histórico mecânico e operacional.', 'Seleção do Veículo:'));
    content.push(createNumberedStep('2', 'O cabeçalho do veículo apresenta a placa em destaque, o modelo (FIORINO ou IVECO), a quilometragem atual (KM) com registro do último odômetro e os badges de conformidade e engajamento mensais daquele carro específico.', 'Painel do Veículo Selecionado:'));
    content.push(createNumberedStep('3', 'Interface em grade mensal onde cada dia do mês é mapeado com regras visuais claras:', 'Calendário Operacional Interativo:'));
    content.push(createCheckBullet('Dia Preenchido (Com Vistoria): O dia recebe destaque com tonalidade verde suave e um ponto indicador no rodapé da célula;', '✓'));
    content.push(createCheckBullet('Dia com Múltiplas Vistorias (Selo "2x"): Quando o mesmo veículo tem mais de um checklist registrado na mesma data, o calendário exibe um selo destacado "2x" (ou "3x"), permitindo rastrear ambas as saídas;', '✓'));
    content.push(createCheckBullet('Dia Atual (Hoje): Destacado com anel de foco circular para facilitar a rápida identificação do status de hoje;', '✓'));
    content.push(createCheckBullet('Dias sem Checklist: Exibidos de forma neutra, indicando dias em que o veículo não rodou ou houve ausência de envio.', '✓'));

    content.push(createNumberedStep('4', 'Ao clicar sobre qualquer dia com vistoria no calendário, o painel inferior carrega instantaneamente a ficha completa daquela vistoria:', 'Ficha Detalhada da Vistoria do Dia:'));
    content.push(createCheckBullet('Identificação da Equipe: Badges informativos exibindo o nome do Motorista condutor, Ajudante e Líder de turno responsável pela liberação;', '✓'));
    content.push(createCheckBullet('Sinalizador de Vistorias: Exibição da quantidade total de vistorias registradas na data (ex: "2x vistorias realizadas");', '✓'));
    content.push(createCheckBullet('Tabela Completa dos 29 Itens de Inspeção: Cada item avaliado é exibido com sua categoria técnica e respectivo badge colorido ("OK" em verde ou "NOK" em vermelho vívido);', '✓'));
    content.push(createCheckBullet('Observações do Condutor: Caixa de texto destacada contendo a transcrição integral das observações digitadas pelo motorista (ex: barulhos no eixo, lâmpada queimada, vazamento de óleo).', '✓'));

    content.push(...createNoteBox(
        'CASO UMA VISTORIA REGISTRE ITENS NOK, O LÍDER DE TURNO DEVERÁ COPIAR A DESCRIÇÃO E ABRIR O CHAMADO DE MANUTENÇÃO NA ORDEM DE SERVIÇO INTERNA. A RESOLUÇÃO DA AVARIA DEVE SER EVIDENCIADA NO CHECKLIST DO DIA SEGUINTE COMO "OK", COMPROVANDO O FECHAMENTO DO CICLO CORRETIVO.'
    ));

    content.push(...createImagePlaceholder('5', 'Calendário Operacional e Ficha de Vistoria do Veículo', 'Calendário com dias preenchidos, selo destacado "2x", identificação do motorista/líder e tabela de 29 itens com status OK/NOK.'));

    // 4.6. MÓDULO DE GESTÃO DE MOTORISTAS E EQUIPES
    content.push(createSubTitle('4.6. MÓDULO DE GESTÃO DE MOTORISTAS E EQUIPES'));
    content.push(createBody(
        'O módulo de motoristas foi desenvolvido para garantir a justiça no cálculo do engajamento e a gestão do quadro de condutores da empresa.'
    ));
    content.push(createBullet('Visualização de todos os condutores homologados na empresa, quantidade de vistorias registradas no período e índice de conformidade associado às suas conduções.', 'Cadastro e Status Operacional:'));
    content.push(createBullet('Permite que a liderança registre períodos de férias, licenças ou afastamentos médicos de cada colaborador. Quando um motorista está em férias, o sistema abate esses dias do cálculo de dias esperados, evitando penalização indevida nos indicadores do condutor e da equipe.', 'Controle de Férias e Afastamentos:'));

    content.push(...createImagePlaceholder('6', 'Módulo de Gestão de Motoristas e Férias', 'Listagem dos motoristas da frota, controle de status (Ativo / Férias / Afastado) e acompanhamento de vistorias realizadas.'));

    // 4.7. EXPORTAÇÃO EXECUTIVA E RELATÓRIOS (APRESENTAÇÃO POWERPOINT - PPTX)
    content.push(createSubTitle('4.7. EXPORTAÇÃO EXECUTIVA E RELATÓRIOS (APRESENTAÇÃO POWERPOINT - PPTX)'));
    content.push(createBody(
        'Para atender auditorias de qualidade, reuniões de diretoria e análises de desempenho do SGQ, o CAR VERIFY conta com um módulo nativo de geração automatizada de apresentações em PowerPoint (.pptx).'
    ));
    content.push(createNumberedStep('1', 'No cabeçalho do sistema, clicar no botão "Apresentação PPTX" (ícone de monitor/slides). Será aberta a janela modal de configuração.', 'Abertura do Módulo de Exportação:'));
    content.push(createNumberedStep('2', 'Definir o intervalo cronológico através dos menus suspensos "Mês Inicial" e "Mês Final" (ex: Janeiro de 2026 a Dezembro de 2026).', 'Seleção do Período de Análise:'));
    content.push(createNumberedStep('3', 'Definir os blocos de conteúdo desejados na apresentação:', 'Estrutura da Apresentação:'));
    content.push(createCheckBullet('[ x ] Relatório Compilado Geral da Frota: Gera slides panorâmicos com gráficos de conformidade, evolução temporal, engajamento consolidado e ranking dos veículos;', '✓'));
    content.push(createCheckBullet('[ x ] Relatório Mensal Detalhado por Veículo: Gera slides dedicados para cada placa da frota, contendo calendário de vistorias, odômetro e itens de atenção mecânica.', '✓'));
    content.push(createNumberedStep('4', 'Selecionar o tema gráfico desejado para os slides:', 'Escolha do Tema Visual:'));
    content.push(createCheckBullet('Tema Dark (Padrão Executivo): Fundo escuro premium, moderno, ideal para apresentações em projetores e reuniões de diretoria;', '✓'));
    content.push(createCheckBullet('Tema Light (Padrão Corporativo): Fundo claro limpo, ideal para impressão em papel e inclusão em pastas físicas de auditoria.', '✓'));
    content.push(createNumberedStep('5', 'Clicar no botão "Gerar e Baixar Apresentação". O sistema processará os dados e disparará o download automático do arquivo formatado e 100% editável.', 'Download do Arquivo:'));

    content.push(...createNoteBox(
        'AS APRESENTAÇÕES PPTX GERADAS DEVEM SER SALVAS NA PASTA COMPARTILHADA DA QUALIDADE AO FINAL DE CADA MÊS, SERVINDO DE EVIDÊNCIA FORMAL DE MONITORAMENTO DA FROTA DURANTE AS AUDITORIAS INTERNAS E EXTERNAS DE CERTIFICAÇÃO DA EMPRESA.'
    ));

    content.push(...createImagePlaceholder('7', 'Modal de Exportação de Apresentação PPTX', 'Interface de seleção de intervalo de meses, estrutura do relatório (Compilado / Detalhado), seleção de tema e botão de download.'));

    // 5. CONTROLE DE REVISÕES
    content.push(createTitle('5. CONTROLE DE REVISÕES'));

    const revisaoTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER_DARK },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER_DARK },
            left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER_DARK },
            right: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER_DARK },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER_DARK },
            insideVertical: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER_DARK }
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        shading: { type: ShadingType.CLEAR, fill: COLOR_BG_LIGHT },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'N°/Revisão', bold: true, size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        shading: { type: ShadingType.CLEAR, fill: COLOR_BG_LIGHT },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Descrição', bold: true, size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        shading: { type: ShadingType.CLEAR, fill: COLOR_BG_LIGHT },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Elaborado por:', bold: true, size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        shading: { type: ShadingType.CLEAR, fill: COLOR_BG_LIGHT },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Revisado por:', bold: true, size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        shading: { type: ShadingType.CLEAR, fill: COLOR_BG_LIGHT },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Aprovado por:', bold: true, size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        shading: { type: ShadingType.CLEAR, fill: COLOR_BG_LIGHT },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Data', bold: true, size: 18, font: FONT_FAMILY })] })]
                    })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({
                        margins: { top: 80, bottom: 80, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '00', size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        margins: { top: 80, bottom: 80, left: 60, right: 60 },
                        children: [new Paragraph({ children: [new TextRun({ text: 'Emissão Inicial – Implantação e Padronização da Rotina de Checklists da Frota Própria e Operação do Painel CAR VERIFY.', size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        margins: { top: 80, bottom: 80, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Gabriel Santos\nDistribuição e Frota', size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        margins: { top: 80, bottom: 80, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jullyene Garrido /\nWilliam Pereira\nQualidade', size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        margins: { top: 80, bottom: 80, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Reinaldo Carvalho\nSup. Distribuição', size: 18, font: FONT_FAMILY })] })]
                    }),
                    new TableCell({
                        margins: { top: 80, bottom: 80, left: 60, right: 60 },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '02/10/2026', size: 18, font: FONT_FAMILY })] })]
                    })
                ]
            })
        ]
    });

    content.push(revisaoTable);
    content.push(new Paragraph({ spacing: { after: 200 } }));

    return content;
}

// ─── GERAÇÃO FINAL DO ARQUIVO DOCX ──────────────────────
async function generateDocx() {
    console.log('Iniciando compilação da Instrução de Trabalho no padrão Alpha Candies...');

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: FONT_FAMILY,
                        size: 21,
                        color: COLOR_PRIMARY
                    }
                }
            }
        },
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 850,
                            bottom: 850,
                            left: 1000,
                            right: 1000
                        }
                    }
                },
                headers: {
                    default: buildDocumentHeader()
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({ text: 'CAR VERIFY · Sistema de Auditoria de Frota · ALPHA CANDIES', size: 16, color: COLOR_MUTED, font: FONT_FAMILY })
                                ]
                            })
                        ]
                    })
                },
                children: buildDocumentBody()
            }
        ]
    });

    const buffer = await Packer.toBuffer(doc);
    const outputPath = path.join(__dirname, '../Instrucao_de_Trabalho_CAR_VERIFY_139_DIS_IT.docx');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Documento Word gerado com sucesso em: ${outputPath}`);
    console.log(`Tamanho do arquivo: ${(buffer.length / 1024).toFixed(1)} KB`);
}

generateDocx().catch(err => {
    console.error('Erro ao gerar documento:', err);
    process.exit(1);
});
