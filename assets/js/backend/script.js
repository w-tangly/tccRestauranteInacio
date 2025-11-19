// URLs das planilhas
const PLANILHA_ESTABELECIMENTO = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSquPMvYwSaMOVmnAocofE_76axPlCNDFpX50dhQrjm58QWGpz4Uo9NwZVoTu9q4xaEnhbN5sXrtO6H/pub?gid=0&single=true&output=csv';
const PLANILHA_CATEGORIAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSquPMvYwSaMOVmnAocofE_76axPlCNDFpX50dhQrjm58QWGpz4Uo9NwZVoTu9q4xaEnhbN5sXrtO6H/pub?gid=665958301&single=true&output=csv';
const PLANILHA_ITENS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSquPMvYwSaMOVmnAocofE_76axPlCNDFpX50dhQrjm58QWGpz4Uo9NwZVoTu9q4xaEnhbN5sXrtO6H/pub?gid=261089774&single=true&output=csv';

// Estados dos dados
let estabelecimento = {
    nome: "Carregando...",
    descricao: "",
    telefone: "",
    endereco: "",
    horario: "",
    horario_abertura: "",
    horario_fechamento: "",
    dias_funcionamento: "",
};
let categorias = [];
let itens = [];
let categoriasComItens = [];
let categoriaAtiva = 1;
let carregando = true;
let carrinho = [];
let numeroMesa = null;
let tipoPedidoAtual = 'entrega';
let formaPagamentoAtual = null;

// 🚨 AVISO: Códigos de imagem não funcionam em hospedagem externa
// Para usar imagens, você deve:
// 1. Fazer upload das imagens para Google Drive, Dropbox ou outro serviço
// 2. Colocar as URLs públicas na planilha
// 3. Deixar este objeto vazio para hospedagem externa
const imagensProjeto = {
    // Removido para compatibilidade com hospedagem externa
    // Use URLs do Google Drive ou outros serviços na planilha
};

// ✨ FUNÇÃO: Converter URLs do Google Drive
function converterUrlParaImagemDireta(url) {
    if (!url || url.trim() === '') return null;

    // GOOGLE DRIVE - Múltiplos formatos para tentativa automática
    if (url.includes('drive.google.com')) {
        let fileId = null;

        // Formato 1: /file/d/ID/view
        let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
            fileId = match[1];
        }

        // Formato 2: id=ID (parâmetros)
        if (!fileId) {
            match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match) {
                fileId = match[1];
            }
        }

        if (fileId) {
            return {
                tipo: 'google-drive',
                formatos: [
                    `https://lh3.googleusercontent.com/d/${fileId}=w600-h400-k-rw`,
                    `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`,
                    `https://drive.google.com/uc?export=view&id=${fileId}`,
                    `https://docs.google.com/uc?export=view&id=${fileId}`,
                    `https://lh3.googleusercontent.com/d/${fileId}=w400`
                ]
            };
        }
    }

    // URL EXTERNA NORMAL
    else if (url.startsWith('http')) {
        return { tipo: 'url-simples', url: url };
    }

    return null;
}



// Função para converter CSV em array de objetos (melhorada)
function csvParaObjetos(csvText) {
    console.log('CSV recebido:', csvText);

    if (!csvText || csvText.trim() === '') {
        console.error('CSV vazio');
        return [];
    }

    const linhas = csvText.trim().split('\n');

    if (linhas.length < 2) {
        console.error('CSV deve ter pelo menos cabeçalho e uma linha de dados');
        return [];
    }

    // Processar cabeçalho
    const cabecalho = linhas[0].split(',').map(col => col.trim().replace(/"/g, ''));
    console.log('Cabeçalho:', cabecalho);

    // Processar linhas de dados
    const dados = [];
    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;

        // Melhor parsing de CSV considerando vírgulas dentro de aspas
        const valores = parseCSVLine(linha);
        const objeto = {};

        cabecalho.forEach((col, index) => {
            let valor = valores[index] || '';

            // Converter valores numéricos
            if (col === 'preco' && valor) {
                valor = parseFloat(valor.replace(',', '.')) || 0;
            }

            // Limpar aspas
            if (typeof valor === 'string') {
                valor = valor.replace(/^"|"$/g, '');
            }

            objeto[col] = valor;
        });

        dados.push(objeto);
    }

    console.log('Dados processados:', dados);
    return dados;
}

// Função para fazer parsing correto de linha CSV
function parseCSVLine(linha) {
    const resultado = [];
    let valorAtual = '';
    let dentroDeAspas = false;

    for (let i = 0; i < linha.length; i++) {
        const char = linha[i];

        if (char === '"') {
            dentroDeAspas = !dentroDeAspas;
        } else if (char === ',' && !dentroDeAspas) {
            resultado.push(valorAtual.trim());
            valorAtual = '';
        } else {
            valorAtual += char;
        }
    }

    resultado.push(valorAtual.trim());
    return resultado;
}

// Função para carregar dados das planilhas
async function carregarDados() {
    try {
        // Mostrar loading
        mostrarLoading();

        console.log('Iniciando carregamento das planilhas...');

        // Carregar estabelecimento
        console.log('Carregando estabelecimento...');
        const respEstabelecimento = await fetch(PLANILHA_ESTABELECIMENTO);
        if (!respEstabelecimento.ok) throw new Error('Erro ao carregar planilha Estabelecimento');

        const csvEstabelecimento = await respEstabelecimento.text();
        const dadosEstabelecimento = csvParaObjetos(csvEstabelecimento);

        if (dadosEstabelecimento.length > 0) {
            estabelecimento = dadosEstabelecimento[0];
            console.log('Estabelecimento carregado:', estabelecimento);
        } else {
            console.warn('Nenhum dado de estabelecimento encontrado');
        }

        // Carregar categorias
        console.log('Carregando categorias...');
        const respCategorias = await fetch(PLANILHA_CATEGORIAS);
        if (!respCategorias.ok) throw new Error('Erro ao carregar planilha Categorias');

        const csvCategorias = await respCategorias.text();
        categorias = csvParaObjetos(csvCategorias);
        console.log('Categorias carregadas:', categorias);

        // Carregar itens
        console.log('Carregando itens...');
        const respItens = await fetch(PLANILHA_ITENS);
        if (!respItens.ok) throw new Error('Erro ao carregar planilha Itens');

        const csvItens = await respItens.text();
        itens = csvParaObjetos(csvItens);
        console.log('Itens carregados:', itens);

        // Combinar categorias com itens
        categoriasComItens = categorias.map(categoria => ({
            ...categoria,
            itens: itens.filter(item => item.categoria_id == categoria.id)
        }));

        console.log('Categorias com itens:', categoriasComItens);

        // Se houver categorias, definir a primeira como ativa
        if (categorias.length > 0) {
            categoriaAtiva = parseInt(categorias[0].id);
        }

        carregando = false;
        ocultarLoading();
        carregarEstabelecimento();
        renderizarCategorias();
        renderizarItens();

        console.log('Carregamento concluído com sucesso!');

    } catch (error) {
        console.error('Erro detalhado ao carregar dados:', error);
        carregando = false;
        ocultarLoading();
        mostrarErroDetalhado(error.message);
    }
}

// Função para mostrar loading
function mostrarLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('cardapio').classList.add('hidden');
}

// Função para ocultar loading
function ocultarLoading() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('cardapio').classList.remove('hidden');
}

// Função para mostrar erro detalhado
function mostrarErroDetalhado(mensagem) {
    document.body.innerHTML = `
                <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div class="text-center max-w-md">
                        <div class="text-6xl mb-4">❌</div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">Erro ao carregar dados</h2>
                        <p class="text-gray-600 mb-4">${mensagem}</p>
                        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
                            <h3 class="font-bold text-yellow-800 mb-2">🔍 Verifique:</h3>
                            <ul class="text-sm text-yellow-700 space-y-1">
                                <li>• As planilhas estão preenchidas com dados</li>
                                <li>• As planilhas estão publicadas na web</li>
                                <li>• Os cabeçalhos estão corretos</li>
                                <li>• Abra o console do navegador (F12) para mais detalhes</li>
                            </ul>
                        </div>
                        <button onclick="location.reload()" class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
                            Tentar novamente
                        </button>
                    </div>
                </div>
            `;
}

// Função para verificar se o estabelecimento está aberto
function verificarHorarioFuncionamento() {
    const agora = new Date();
    const diaAtual = agora.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();
    const tempoAtual = horaAtual * 60 + minutoAtual; // Converter para minutos

    // Se não tiver horários específicos configurados, considerar sempre aberto
    if (!estabelecimento.horario_abertura || !estabelecimento.horario_fechamento) {
        return { aberto: true, motivo: '' };
    }

    // Verificar dias de funcionamento (se especificado)
    if (estabelecimento.dias_funcionamento && estabelecimento.dias_funcionamento.trim() !== '') {
        const diasPermitidos = estabelecimento.dias_funcionamento.toLowerCase().split(',').map(d => d.trim());
        const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
        const diaHoje = diasSemana[diaAtual];

        if (!diasPermitidos.includes(diaHoje) && !diasPermitidos.includes('todos')) {
            return {
                aberto: false,
                motivo: `Funcionamos apenas: ${estabelecimento.dias_funcionamento}`
            };
        }
    }

    // Converter horários de abertura e fechamento para minutos
    const [horaAbertura, minutoAbertura] = estabelecimento.horario_abertura.split(':').map(Number);
    const [horaFechamento, minutoFechamento] = estabelecimento.horario_fechamento.split(':').map(Number);

    const tempoAbertura = horaAbertura * 60 + minutoAbertura;
    const tempoFechamento = horaFechamento * 60 + minutoFechamento;

    // Verificar se está dentro do horário
    let estaAberto = false;

    if (tempoFechamento > tempoAbertura) {
        // Horário normal (ex: 09:00 às 18:00)
        estaAberto = tempoAtual >= tempoAbertura && tempoAtual <= tempoFechamento;
    } else {
        // Horário que cruza meia-noite (ex: 18:00 às 02:00)
        estaAberto = tempoAtual >= tempoAbertura || tempoAtual <= tempoFechamento;
    }

    if (!estaAberto) {
        return {
            aberto: false,
            motivo: `Horário de funcionamento: ${estabelecimento.horario_abertura} às ${estabelecimento.horario_fechamento}`
        };
    }

    return { aberto: true, motivo: '' };
}

// Função para carregar dados do estabelecimento na interface
function carregarEstabelecimento() {
    const nomeEstab = estabelecimento.nome || 'Nome não informado';

    // Header principal
    document.getElementById('nomeEstabelecimento').textContent = nomeEstab;
    document.getElementById('descricaoEstabelecimento').textContent = estabelecimento.descricao || '';
    document.getElementById('telefoneEstabelecimento').textContent = estabelecimento.telefone || '';
    document.getElementById('enderecoEstabelecimento').textContent = estabelecimento.endereco || '';

    // Header compacto
    document.getElementById('nomeCompacto').textContent = nomeEstab;

    // Footer
    document.getElementById('nomeFooter').textContent = nomeEstab;
    document.getElementById('telefoneFooter').textContent = estabelecimento.telefone || '';
    document.getElementById('enderecoFooter').textContent = estabelecimento.endereco || '';

    // Mostrar status de funcionamento
    const statusFuncionamento = verificarHorarioFuncionamento();
    const horarioTexto = estabelecimento.horario || '';
    const statusTexto = statusFuncionamento.aberto ? '🟢 Aberto' : '🔴 Fechado';
    const statusTextoCompacto = statusFuncionamento.aberto ? '🟢 Aberto' : '🔴 Fechado';

    document.getElementById('horarioEstabelecimento').innerHTML = `${horarioTexto} ${statusTexto}`;
    document.getElementById('statusCompacto').textContent = statusTextoCompacto;

    // Atualizar carrinho e botões se estiver fechado
    if (!statusFuncionamento.aberto) {
        mostrarAvisoFechado(statusFuncionamento.motivo);
    }

}

// Função para formatar preço
function formatarPreco(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

// Função para renderizar categorias
function renderizarCategorias() {
    const categoriasNav = document.getElementById('categoriasNav');
    if (!categoriasNav) return;

    categoriasNav.innerHTML = '';

    categorias.forEach(categoria => {
        const botao = document.createElement('button');
        botao.className = `categoria-btn px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${categoria.id == categoriaAtiva
                ? 'ativa'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`;
        botao.textContent = `${categoria.icone} ${categoria.nome}`;
        botao.onclick = () => {
            categoriaAtiva = parseInt(categoria.id);
            renderizarCategorias();
            renderizarItens();
        };
        categoriasNav.appendChild(botao);
    });
}

// Função para renderizar itens
function renderizarItens() {
    const categoriaAtual = categoriasComItens.find(cat => cat.id == categoriaAtiva);
    const tituloCategoria = document.getElementById('tituloCategoria');
    const listaItens = document.getElementById('listaItens');

    if (!categoriaAtual || !tituloCategoria || !listaItens) return;

    tituloCategoria.innerHTML = `${categoriaAtual.icone} ${categoriaAtual.nome}`;
    listaItens.innerHTML = '';

    if (!categoriaAtual.itens || categoriaAtual.itens.length === 0) {
        listaItens.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-2">🍽️</div>
                        <p>Nenhum item disponível nesta categoria</p>
                    </div>
                `;
        return;
    }

    categoriaAtual.itens.forEach(item => {
        // Verificar disponibilidade de forma mais robusta
        const itemDisponivel = item.disponivel === 'TRUE' || item.disponivel === true || item.disponivel === 'true';

        // Garantir que o preço seja um número
        let preco = 0;
        if (typeof item.preco === 'number') {
            preco = item.preco;
        } else if (typeof item.preco === 'string') {
            preco = parseFloat(item.preco.replace(',', '.')) || 0;
        }

        const precoFormatado = formatarPreco(preco);

        // ✨ PROCESSAR URL DA IMAGEM - COM SISTEMA DE FALLBACK
        let imagemConfig = null;
        if (item.imagem_url && item.imagem_url.trim() !== '') {
            const urlLimpa = item.imagem_url.trim();

            // PROCESSAR URL COM FUNÇÃO MELHORADA
            imagemConfig = converterUrlParaImagemDireta(urlLimpa);


        }

        const itemDiv = document.createElement('div');
        itemDiv.className = `item-card bg-white rounded-lg shadow-md overflow-hidden ${!itemDisponivel ? 'opacity-60' : ''}`;

        // 🔧 GERAR HTML DA IMAGEM COM SISTEMA DE FALLBACK
        let htmlImagem = '';
        if (imagemConfig) {
            if (imagemConfig.tipo === 'google-drive') {
                // Sistema de múltiplas tentativas para Google Drive
                const fallbackUrls = imagemConfig.formatos.map((url, index) =>
                    `this.src='${url}'; this.onerror=${index === imagemConfig.formatos.length - 1 ? 'mostrarErroImagem(this)' : 'null'};`
                ).join(' ');

                htmlImagem = `
                        <div class="md:w-1/3">
                            <img
                                src="${imagemConfig.formatos[0]}"
                                alt="${item.nome}"
                                class="w-full h-48 md:h-48 object-contain bg-gray-50 rounded-lg"
                                onload=""
                                onerror="${fallbackUrls}"
                                loading="lazy"
                            />
                        </div>`;
            } else {
                // URL simples (Dropbox, URLs externas)
                htmlImagem = `
                        <div class="md:w-1/3">
                            <img
                                src="${imagemConfig.url}"
                                alt="${item.nome}"
                                class="w-full h-48 md:h-48 object-contain bg-gray-50"
                                onload=""
                                onerror="mostrarErroImagem(this);"
                                loading="lazy"
                            />
                        </div>`;
            }
        } else {
            htmlImagem = `
                    <div class="md:w-1/3 bg-gray-100 flex items-center justify-center rounded-lg">
                        <div class="text-center p-4">
                            <div class="text-4xl mb-2">🍽️</div>
                            <p class="text-gray-500 text-sm">Sem imagem</p>
                        </div>
                    </div>`;
        }

        itemDiv.innerHTML = `
                    <div class="flex flex-col md:flex-row">
                        ${htmlImagem}
                        <div class="${imagemConfig ? 'flex-1' : 'w-full'} p-4">
                            <div class="flex justify-between items-start mb-2">
                                <h3 class="text-lg font-semibold text-gray-800">${item.nome}</h3>
                                ${!itemDisponivel ? `
                                    <span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                        Indisponível
                                    </span>
                                ` : ''}
                            </div>
                            <p class="text-gray-600 text-sm mb-3">${item.descricao}</p>
                            <div class="flex justify-between items-center">
                                <span class="text-2xl font-bold text-yellow-600">
                                    ${precoFormatado}
                                </span>
                                <button
                                    id="btn-${item.id}"
                                    class="btn-pedido px-4 py-2 rounded-lg font-medium transition-all ${itemDisponivel
                ? 'bg-yellow-500 text-white hover:bg-orange-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }"
                                    ${!itemDisponivel ? 'disabled' : ''}
                                    onclick="${itemDisponivel ? `adicionarAoCarrinhoComVerificacao('${item.id}', '${item.nome.replace(/'/g, "\\'")}', ${preco})` : ''}"
                                >
                                    ${itemDisponivel ? '🛒 Adicionar' : 'Indisponível'}
                                </button>
                            </div>
                        </div>
                    </div>
                `;

        listaItens.appendChild(itemDiv);
    });
}

// Função para mostrar aviso de estabelecimento fechado
function mostrarAvisoFechado(motivo) {
    // Verificar se já existe aviso
    let avisoExistente = document.getElementById('avisoFechado');
    if (avisoExistente) {
        avisoExistente.remove();
    }

    // Criar novo aviso
    const aviso = document.createElement('div');
    aviso.id = 'avisoFechado';
    aviso.className = 'bg-red-50 border border-red-200 rounded-lg p-4 mb-6';
    aviso.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="text-2xl">🔴</div>
                    <div>
                        <h3 class="font-bold text-red-800 mb-1">Estabelecimento Fechado</h3>
                        <p class="text-red-700 text-sm">${motivo}</p>
                        <p class="text-red-600 text-xs mt-1">Não é possível fazer pedidos no momento</p>
                    </div>
                </div>
            `;

    // Inserir após o header
    const main = document.querySelector('main .max-w-4xl');
    main.insertBefore(aviso, main.firstChild);

    // Desabilitar todos os botões de adicionar
    desabilitarBotoesAdicionar();
}

// Função para desabilitar botões de adicionar ao carrinho
function desabilitarBotoesAdicionar() {
    const botoes = document.querySelectorAll('.btn-pedido:not([disabled])');
    botoes.forEach(botao => {
        if (!botao.disabled) {
            botao.disabled = true;
            botao.classList.remove('bg-orange-500', 'hover:bg-orange-600');
            botao.classList.add('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            botao.textContent = '🔴 Fechado';
        }
    });
}

// Função para habilitar botões de adicionar ao carrinho
function habilitarBotoesAdicionar() {
    const botoes = document.querySelectorAll('.btn-pedido[disabled]');
    botoes.forEach(botao => {
        const itemId = botao.id.replace('btn-', '');
        const item = itens.find(i => i.id === itemId);

        if (item && (item.disponivel === 'TRUE' || item.disponivel === true || item.disponivel === 'true')) {
            botao.disabled = false;
            botao.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            botao.classList.add('bg-orange-500', 'text-white', 'hover:bg-orange-600');
            botao.textContent = '🛒 Adicionar';
        }
    });
}

// Funções do carrinho
function adicionarAoCarrinhoComVerificacao(id, nome, preco) {
    const statusFuncionamento = verificarHorarioFuncionamento();

    if (!statusFuncionamento.aberto) {
        mostrarFeedback(`❌ ${statusFuncionamento.motivo}`, 'error');
        return;
    }

    adicionarAoCarrinho(id, nome, preco);
}

function adicionarAoCarrinho(id, nome, preco) {
    // Verificar se o item já está no carrinho
    const itemExistente = carrinho.find(item => item.id === id);

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({
            id: id,
            nome: nome,
            preco: preco,
            quantidade: 1
        });
    }

    atualizarCarrinho();

    // Animação do botão que foi clicado
    const botao = document.getElementById(`btn-${id}`);
    if (botao) {
        botao.classList.add('item-adicionado');
        setTimeout(() => {
            botao.classList.remove('item-adicionado');
        }, 600);
    }

    // Mostrar feedback visual
    mostrarFeedback(`${nome} adicionado ao carrinho!`, 'success');
}

function removerDoCarrinho(id) {
    carrinho = carrinho.filter(item => item.id !== id);
    atualizarCarrinho();
}

function alterarQuantidade(id, novaQuantidade) {
    if (novaQuantidade <= 0) {
        removerDoCarrinho(id);
        return;
    }

    const item = carrinho.find(item => item.id === id);
    if (item) {
        item.quantidade = novaQuantidade;
        atualizarCarrinho();
    }
}

function limparCarrinho() {
    carrinho = [];
    atualizarCarrinho();
}

// Funções do modal do carrinho
function abrirModalCarrinho() {
    document.getElementById('modalCarrinho').classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Previne scroll do body
}

function fecharModalCarrinho() {
    document.getElementById('modalCarrinho').classList.add('hidden');
    document.body.style.overflow = 'auto'; // Restaura scroll do body
}

function atualizarCarrinho() {
    const carrinhoFlutuante = document.getElementById('carrinhoFlutuante');
    const badgeQuantidade = document.getElementById('badgeQuantidade');
    const badgeTotal = document.getElementById('badgeTotal');
    const itensCarrinhoModal = document.getElementById('itensCarrinhoModal');
    const totalCarrinhoModal = document.getElementById('totalCarrinhoModal');
    const quantidadeItensModal = document.getElementById('quantidadeItensModal');
    const carrinhoVazio = document.getElementById('carrinhoVazio');
    const footerModal = document.getElementById('footerModal');

    if (carrinho.length === 0) {
        // Esconder carrinho flutuante
        carrinhoFlutuante.classList.add('hidden');

        // Mostrar estado vazio no modal
        carrinhoVazio.classList.remove('hidden');
        itensCarrinhoModal.classList.add('hidden');
        footerModal.classList.add('hidden');
        return;
    }

    // Mostrar carrinho flutuante
    carrinhoFlutuante.classList.remove('hidden');
    carrinhoVazio.classList.add('hidden');
    itensCarrinhoModal.classList.remove('hidden');
    footerModal.classList.remove('hidden');

    // Calcular totais
    let totalItens = 0;
    let totalPreco = 0;

    carrinho.forEach(item => {
        totalItens += item.quantidade;
        totalPreco += item.preco * item.quantidade;
    });

    // Atualizar badges do carrinho flutuante
    badgeQuantidade.textContent = totalItens;
    badgeTotal.textContent = formatarPreco(totalPreco);

    // Atualizar modal
    totalCarrinhoModal.textContent = formatarPreco(totalPreco);
    quantidadeItensModal.textContent = `${totalItens} item${totalItens !== 1 ? 's' : ''}`;

    // Renderizar itens no modal
    itensCarrinhoModal.innerHTML = '';

    carrinho.forEach(item => {
        const subtotal = item.preco * item.quantidade;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm';
        itemDiv.innerHTML = `
                    <div class="flex items-center gap-3">
                        <!-- Info do item -->
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-800">${item.nome}</h4>
                            <div class="text-sm text-gray-600">
                                ${formatarPreco(item.preco)} × ${item.quantidade}
                            </div>
                            <div class="text-lg font-bold text-green-600 mt-1">
                                ${formatarPreco(subtotal)}
                            </div>
                        </div>
                        
                        <!-- Controles de quantidade -->
                        <div class="flex items-center gap-2">
                            <button 
                                onclick="alterarQuantidade('${item.id}', ${item.quantidade - 1})" 
                                class="w-8 h-8 bg-gray-200 text-gray-700 rounded-full text-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
                            >
                                −
                            </button>
                            <span class="w-8 text-center font-bold text-lg">${item.quantidade}</span>
                            <button 
                                onclick="alterarQuantidade('${item.id}', ${item.quantidade + 1})" 
                                class="w-8 h-8 bg-gray-200 text-gray-700 rounded-full text-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
                            >
                                +
                            </button>
                        </div>
                        
                        <!-- Botão remover -->
                        <button 
                            onclick="removerDoCarrinho('${item.id}')" 
                            class="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors"
                            title="Remover item"
                        >
                            🗑️
                        </button>
                    </div>
                `;
        itensCarrinhoModal.appendChild(itemDiv);
    });
}

function enviarPedidoCompleto() {
    // Função mantida para compatibilidade - redireciona para modal de entrega
    abrirModalEntrega();
}

function enviarPedidoSimples() {
    if (carrinho.length === 0) {
        mostrarFeedback('Seu carrinho está vazio!', 'error');
        return;
    }

    // Verificar horário de funcionamento antes de enviar
    const statusFuncionamento = verificarHorarioFuncionamento();
    if (!statusFuncionamento.aberto) {
        mostrarFeedback(`❌ Não é possível enviar pedidos. ${statusFuncionamento.motivo}`, 'error');
        return;
    }

    const telefone = estabelecimento.telefone.replace(/\D/g, '');

    // Iniciar mensagem com informação da mesa (se disponível)
    let mensagem = `Olá! Gostaria de fazer o seguinte pedido:\n\n`;
    if (numeroMesa) {
        mensagem = `🪑 *MESA ${numeroMesa}*\n\nOlá! Gostaria de fazer o seguinte pedido:\n\n`;
    }

    let total = 0;
    carrinho.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        total += subtotal;
        mensagem += `• ${item.nome}\n`;
        mensagem += `  Qtd: ${item.quantidade} × ${formatarPreco(item.preco)} = ${formatarPreco(subtotal)}\n\n`;
    });

    mensagem += `💰 TOTAL: ${formatarPreco(total)}\n\n`;

    // Adicionar mesa no final também se disponível
    if (numeroMesa) {
        mensagem += `📍 Mesa: ${numeroMesa}\n\n`;
    }

    mensagem += `Obrigado!`;

    const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');

    // Fechar modal e limpar carrinho após enviar
    fecharModalCarrinho();
    limparCarrinho();
    mostrarFeedback('Pedido enviado com sucesso!', 'success');
}

function mostrarFeedback(mensagem, tipo = 'success') {
    // Criar elemento de feedback
    const feedback = document.createElement('div');
    const corFundo = tipo === 'success' ? 'bg-green-500' :
        tipo === 'error' ? 'bg-red-500' : 'bg-blue-500';

    feedback.className = `fixed top-4 right-4 ${corFundo} text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform`;
    feedback.textContent = mensagem;

    document.body.appendChild(feedback);

    // Animar entrada
    setTimeout(() => {
        feedback.classList.remove('translate-x-full');
    }, 100);

    // Remover após 4 segundos (mais tempo para mensagens de erro)
    const duracao = tipo === 'error' ? 4000 : 3000;
    setTimeout(() => {
        feedback.classList.add('translate-x-full');
        setTimeout(() => {
            if (document.body.contains(feedback)) {
                document.body.removeChild(feedback);
            }
        }, 300);
    }, duracao);
}

// Função para verificar horário periodicamente
function iniciarVerificacaoHorario() {
    // Verificar a cada minuto
    setInterval(() => {
        const statusAnterior = verificarHorarioFuncionamento();
        carregarEstabelecimento();

        // Se mudou o status, recarregar a página
        const statusAtual = verificarHorarioFuncionamento();
        if (statusAnterior.aberto !== statusAtual.aberto) {
            location.reload();
        }
    }, 60000); // 60 segundos
}

// FUNÇÃO PARA MOSTRAR ERRO DE IMAGEM
function mostrarErroImagem(imgElement) {
    imgElement.style.display = 'none';
    imgElement.parentElement.innerHTML = `
                <div class="bg-gray-100 text-center p-4 rounded-lg h-48 md:h-48 flex flex-col justify-center">
                    <div class="text-4xl mb-2">🍽️</div>
                    <p class="text-gray-500 text-sm">Sem imagem</p>
                </div>
            `;
}



// Funções do modal de entrega
function abrirModalEntrega() {
    if (carrinho.length === 0) {
        mostrarFeedback('Seu carrinho está vazio!', 'error');
        return;
    }

    document.getElementById('modalEntrega').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Atualizar resumo do pedido
    atualizarResumoPedidoEntrega();

    // Se for mesa, definir como retirada por padrão
    if (numeroMesa) {
        selecionarTipoPedido('retirada');
    }
}

function fecharModalEntrega() {
    document.getElementById('modalEntrega').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function selecionarTipoPedido(tipo) {
    tipoPedidoAtual = tipo;

    // Atualizar botões
    const btnEntrega = document.getElementById('btnEntrega');
    const btnRetirada = document.getElementById('btnRetirada');
    const enderecoSection = document.getElementById('enderecoSection');

    if (tipo === 'entrega') {
        btnEntrega.className = 'tipo-pedido-btn bg-blue-50 border-2 border-blue-300 p-3 rounded-lg text-center transition';
        btnRetirada.className = 'tipo-pedido-btn bg-gray-100 border-2 border-transparent p-3 rounded-lg text-center transition hover:bg-gray-200';
        enderecoSection.classList.remove('hidden');
    } else {
        btnEntrega.className = 'tipo-pedido-btn bg-gray-100 border-2 border-transparent p-3 rounded-lg text-center transition hover:bg-gray-200';
        btnRetirada.className = 'tipo-pedido-btn bg-blue-50 border-2 border-blue-300 p-3 rounded-lg text-center transition';
        enderecoSection.classList.add('hidden');
    }
}

function selecionarPagamento(forma) {
    formaPagamentoAtual = forma;

    // Atualizar botões
    document.querySelectorAll('.pagamento-btn').forEach(btn => {
        btn.className = 'pagamento-btn bg-gray-100 border-2 border-transparent p-3 rounded-lg text-center transition hover:bg-gray-50';
    });

    // Destacar botão selecionado
    const cores = {
        'dinheiro': 'bg-green-50 border-green-300',
        'cartao': 'bg-blue-50 border-blue-300',
        'pix': 'bg-purple-50 border-purple-300'
    };

    event.target.closest('.pagamento-btn').className = `pagamento-btn ${cores[forma]} border-2 p-3 rounded-lg text-center transition`;

    // Mostrar/esconder campo de troco
    const dinheiroTroco = document.getElementById('dinheiroTroco');
    if (forma === 'dinheiro') {
        dinheiroTroco.classList.remove('hidden');
    } else {
        dinheiroTroco.classList.add('hidden');
    }
}

async function buscarCEP() {
    const cep = document.getElementById('cepCliente').value.replace(/\D/g, '');

    if (cep.length !== 8) {
        mostrarFeedback('CEP deve ter 8 dígitos!', 'error');
        return;
    }

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (data.erro) {
            mostrarFeedback('CEP não encontrado!', 'error');
            return;
        }

        // Preencher campos
        document.getElementById('ruaCliente').value = data.logradouro || '';
        document.getElementById('bairroCliente').value = data.bairro || '';
        document.getElementById('cidadeCliente').value = data.localidade || '';

        mostrarFeedback('CEP encontrado!', 'success');

        // Focar no campo número
        document.getElementById('numeroCliente').focus();

    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        mostrarFeedback('Erro ao buscar CEP. Tente novamente.', 'error');
    }
}

function atualizarResumoPedidoEntrega() {
    const resumo = document.getElementById('resumoPedidoEntrega');
    const total = document.getElementById('totalPedidoEntrega');

    let htmlResumo = '';
    let totalPreco = 0;

    carrinho.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        totalPreco += subtotal;
        htmlResumo += `
                    <div class="flex justify-between">
                        <span>${item.quantidade}x ${item.nome}</span>
                        <span>${formatarPreco(subtotal)}</span>
                    </div>
                `;
    });

    resumo.innerHTML = htmlResumo;
    total.textContent = formatarPreco(totalPreco);
}

function validarFormularioEntrega() {
    const nome = document.getElementById('nomeCliente').value.trim();
    const telefone = document.getElementById('telefoneCliente').value.trim();

    if (!nome) {
        mostrarFeedback('Por favor, preencha seu nome!', 'error');
        return false;
    }

    if (!telefone) {
        mostrarFeedback('Por favor, preencha seu telefone!', 'error');
        return false;
    }

    if (!formaPagamentoAtual) {
        mostrarFeedback('Por favor, selecione a forma de pagamento!', 'error');
        return false;
    }

    // Validar endereço se for entrega
    if (tipoPedidoAtual === 'entrega') {
        const rua = document.getElementById('ruaCliente').value.trim();
        const numero = document.getElementById('numeroCliente').value.trim();
        const bairro = document.getElementById('bairroCliente').value.trim();
        const cidade = document.getElementById('cidadeCliente').value.trim();

        if (!rua || !numero || !bairro || !cidade) {
            mostrarFeedback('Por favor, preencha todos os campos de endereço!', 'error');
            return false;
        }
    }

    return true;
}

function enviarPedidoEntrega() {
    if (!validarFormularioEntrega()) {
        return;
    }

    // Verificar horário de funcionamento
    const statusFuncionamento = verificarHorarioFuncionamento();
    if (!statusFuncionamento.aberto) {
        mostrarFeedback(`❌ Não é possível enviar pedidos. ${statusFuncionamento.motivo}`, 'error');
        return;
    }

    // Coletar dados do formulário
    const nome = document.getElementById('nomeCliente').value.trim();
    const telefone = document.getElementById('telefoneCliente').value.trim();
    const observacoes = document.getElementById('observacoesCliente').value.trim();

    // Dados de endereço (se entrega)
    let enderecoCompleto = '';
    if (tipoPedidoAtual === 'entrega') {
        const rua = document.getElementById('ruaCliente').value.trim();
        const numero = document.getElementById('numeroCliente').value.trim();
        const bairro = document.getElementById('bairroCliente').value.trim();
        const cidade = document.getElementById('cidadeCliente').value.trim();
        const complemento = document.getElementById('complementoCliente').value.trim();
        const referencia = document.getElementById('referenciaCliente').value.trim();

        enderecoCompleto = `${rua}, ${numero}${complemento ? ` - ${complemento}` : ''}\n${bairro} - ${cidade}`;
        if (referencia) {
            enderecoCompleto += `\nReferência: ${referencia}`;
        }
    }

    // Dados de pagamento
    let pagamentoTexto = '';
    const formasPagamento = {
        'dinheiro': '💵 Dinheiro',
        'cartao': '💳 Cartão',
        'pix': '📱 PIX'
    };
    pagamentoTexto = formasPagamento[formaPagamentoAtual];

    if (formaPagamentoAtual === 'dinheiro') {
        const troco = document.getElementById('trocoCliente').value.trim();
        if (troco) {
            pagamentoTexto += ` - Troco para ${troco}`;
        }
    }

    // Montar mensagem do WhatsApp
    const telefoneEstab = estabelecimento.telefone.replace(/\D/g, '');
    let mensagem = '';

    // Cabeçalho
    if (tipoPedidoAtual === 'entrega') {
        mensagem = `🚚 *PEDIDO PARA ENTREGA*\n\n`;
        if (numeroMesa) {
            mensagem += `🪑 Mesa ${numeroMesa} solicitou entrega\n\n`;
        }
    } else {
        mensagem = `🏪 *PEDIDO PARA RETIRADA*\n\n`;
        if (numeroMesa) {
            mensagem += `🪑 Mesa ${numeroMesa}\n\n`;
        }
    }

    // Dados do cliente
    mensagem += `👤 *Cliente:* ${nome}\n`;
    mensagem += `📱 *Telefone:* ${telefone}\n\n`;

    // Endereço (se entrega)
    if (tipoPedidoAtual === 'entrega') {
        mensagem += `📍 *Endereço de entrega:*\n${enderecoCompleto}\n\n`;
    }

    // Itens do pedido
    mensagem += `🛒 *ITENS DO PEDIDO:*\n\n`;
    let total = 0;
    carrinho.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        total += subtotal;
        mensagem += `• ${item.nome}\n`;
        mensagem += `  Qtd: ${item.quantidade} × ${formatarPreco(item.preco)} = ${formatarPreco(subtotal)}\n\n`;
    });

    mensagem += `💰 *TOTAL: ${formatarPreco(total)}*\n\n`;

    // Forma de pagamento
    mensagem += `💳 *Pagamento:* ${pagamentoTexto}\n\n`;

    // Observações
    if (observacoes) {
        mensagem += `📝 *Observações:* ${observacoes}\n\n`;
    }

    mensagem += `Obrigado!`;

    // Enviar para WhatsApp
    const url = `https://wa.me/55${telefoneEstab}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');

    // Fechar modais e limpar carrinho
    fecharModalEntrega();
    fecharModalCarrinho();
    limparCarrinho();
    mostrarFeedback('Pedido enviado com sucesso!', 'success');
}

// Máscara para CEP
document.addEventListener('DOMContentLoaded', function () {
    const cepInput = document.getElementById('cepCliente');
    if (cepInput) {
        cepInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 5) {
                value = value.replace(/(\d{5})(\d{1,3})/, '$1-$2');
            }
            e.target.value = value;
        });
    }
});

// Tornar funções acessíveis globalmente
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.adicionarAoCarrinhoComVerificacao = adicionarAoCarrinhoComVerificacao;
window.removerDoCarrinho = removerDoCarrinho;
window.alterarQuantidade = alterarQuantidade;
window.limparCarrinho = limparCarrinho;
window.enviarPedidoCompleto = enviarPedidoCompleto;
window.mostrarErroImagem = mostrarErroImagem;
window.abrirModalCarrinho = abrirModalCarrinho;
window.fecharModalCarrinho = fecharModalCarrinho;
window.abrirModalEntrega = abrirModalEntrega;
window.fecharModalEntrega = fecharModalEntrega;
window.selecionarTipoPedido = selecionarTipoPedido;
window.selecionarPagamento = selecionarPagamento;
window.buscarCEP = buscarCEP;
window.enviarPedidoEntrega = enviarPedidoEntrega;
window.enviarPedidoSimples = enviarPedidoSimples;

// Função para controlar header compacto no mobile
function iniciarControleMobileHeader() {
    let ultimaPosicao = 0;
    let headerCompactoVisivel = false;

    const headerPrincipal = document.getElementById('headerPrincipal');
    const headerCompacto = document.getElementById('headerCompacto');
    const categoriasNavContainer = document.getElementById('categoriasNavContainer');

    function atualizarHeaderMobile() {
        const posicaoAtual = window.pageYOffset || document.documentElement.scrollTop;
        const alturaHeader = headerPrincipal.offsetHeight;

        // Verificar se é mobile (largura menor que 768px)
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            // Mostrar header compacto quando rolar para baixo e passar do header principal
            if (posicaoAtual > alturaHeader && !headerCompactoVisivel) {
                headerCompacto.classList.add('visivel');
                headerCompactoVisivel = true;

                // Ajustar posição das categorias para compensar header fixo
                categoriasNavContainer.style.top = '60px'; // Altura do header compacto
            }
            // Esconder header compacto quando voltar ao topo
            else if (posicaoAtual <= alturaHeader && headerCompactoVisivel) {
                headerCompacto.classList.remove('visivel');
                headerCompactoVisivel = false;

                // Resetar posição das categorias
                categoriasNavContainer.style.top = '0';
            }
        } else {
            // No desktop, sempre esconder header compacto
            if (headerCompactoVisivel) {
                headerCompacto.classList.remove('visivel');
                headerCompactoVisivel = false;
                categoriasNavContainer.style.top = '0';
            }
        }

        ultimaPosicao = posicaoAtual;
    }

    // Escutar eventos de scroll com throttle para performance
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                atualizarHeaderMobile();
                ticking = false;
            });
            ticking = true;
        }
    });

    // Escutar mudanças de tamanho da tela
    window.addEventListener('resize', atualizarHeaderMobile);
}

// Função para forçar esconder barra de endereço no mobile
function esconderBarraEndereco() {
    // Forçar scroll mínimo para esconder barra de endereço
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            window.scrollTo(0, 1);
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 1);
        }, 100);
    }
}

// Função para obter número da mesa da URL
function obterNumeroMesa() {
    const urlParams = new URLSearchParams(window.location.search);
    const mesa = urlParams.get('mesa');

    if (mesa && !isNaN(mesa) && parseInt(mesa) > 0) {
        numeroMesa = parseInt(mesa);
        return numeroMesa;
    }

    // Verificar se tem mesa no final da URL (formato: /mesa/5)
    const pathname = window.location.pathname;
    const mesaMatch = pathname.match(/\/mesa\/(\d+)$/);
    if (mesaMatch) {
        numeroMesa = parseInt(mesaMatch[1]);
        return numeroMesa;
    }

    // Verificar se tem mesa no hash (formato: #mesa5)
    const hash = window.location.hash;
    const hashMatch = hash.match(/#mesa(\d+)$/);
    if (hashMatch) {
        numeroMesa = parseInt(hashMatch[1]);
        return numeroMesa;
    }

    return null;
}

// Função para mostrar informação da mesa no header
function mostrarInfoMesa() {
    if (!numeroMesa) return;

    // Criar elemento de informação da mesa
    const infoMesa = document.createElement('div');
    infoMesa.className = 'bg-blue-500 text-white text-center py-2 px-4';
    infoMesa.innerHTML = `
                <div class="flex items-center justify-center gap-2">
                    <span class="text-lg">🪑</span>
                    <span class="font-bold">Mesa ${numeroMesa}</span>
                </div>
            `;

    // Inserir após o header principal
    const headerPrincipal = document.getElementById('headerPrincipal');
    headerPrincipal.parentNode.insertBefore(infoMesa, headerPrincipal.nextSibling);

    // Adicionar também no header compacto
    const statusCompacto = document.getElementById('statusCompacto');
    const infoMesaCompacta = document.createElement('div');
    infoMesaCompacta.className = 'text-xs font-medium bg-blue-500 text-white px-2 py-1 rounded-full ml-2';
    infoMesaCompacta.innerHTML = `🪑 Mesa ${numeroMesa}`;
    statusCompacto.parentNode.insertBefore(infoMesaCompacta, statusCompacto.nextSibling);
}

// Inicializar aplicação
obterNumeroMesa();
carregarDados();

// Mostrar info da mesa após carregar
setTimeout(() => {
    mostrarInfoMesa();
}, 500);

// Iniciar verificação de horário
iniciarVerificacaoHorario();

// Iniciar controle do header mobile
iniciarControleMobileHeader();

// Esconder barra de endereço quando carregado
window.addEventListener('load', esconderBarraEndereco);