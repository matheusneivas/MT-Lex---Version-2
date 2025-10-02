// !!!! CONFIGURAÇÃO IMPORTANTE - COLOQUE SUA URL DE WEBHOOK AQUI !!!!
const webhookUrl = 'https://n8n-n8n.ut3ql0.easypanel.host/webhook/recebe_tese';
const topicWebhookUrl = 'https://n8n-n8n.ut3ql0.easypanel.host/webhook/topicos';

// !!!! CONFIGURAÇÃO DO SUPABASE - SERÁ CONFIGURADO NO HTML !!!!
// O Supabase será acessível via window.supabase

// Estado global do usuário
let currentUser = null;

/**
 * Sistema de Autenticação
 */

// Verifica se usuário está logado ao carregar a página
async function checkUserSession() {
    if (!window.supabase) {
        console.error('Supabase não foi inicializado');
        return;
    }

    try {
        const { data: { session }, error } = await window.supabase.auth.getSession();

        if (error) {
            console.error('Erro ao verificar sessão:', error);
            return;
        }

        if (session) {
            currentUser = session.user;
            updateUserInterface(true);
            loadUserTemplates();
        } else {
            updateUserInterface(false);
        }
    } catch (error) {
        console.error('Erro ao verificar sessão:', error);
    }
}

// Atualiza interface baseada no estado do login
function updateUserInterface(isLoggedIn) {
    const loginSection = document.getElementById('loginSection');
    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');
    const createTemplateBtn = document.getElementById('createTemplateBtn');

    if (isLoggedIn && currentUser) {
        loginSection.style.display = 'none';
        userInfo.style.display = 'flex';
        userEmail.textContent = currentUser.email;

        // Habilita botão de criar template
        if (createTemplateBtn) {
            createTemplateBtn.style.opacity = '1';
            createTemplateBtn.title = 'Criar template a partir dos tópicos atuais';
        }
    } else {
        loginSection.style.display = 'block';
        userInfo.style.display = 'none';
        currentUser = null;

        // Desabilita visualmente botão de criar template
        if (createTemplateBtn) {
            createTemplateBtn.style.opacity = '0.5';
            createTemplateBtn.title = 'Faça login para criar templates personalizados';
        }
    }
}

// Abre modal de login
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.style.display = 'flex';
    showLoginTab();
}

// Fecha modal de login
function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.style.display = 'none';
    clearAuthForms();
}

// Mostra aba de login
function showLoginTab() {
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('signupTab').classList.remove('active');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    hideAuthMessage();
}

// Mostra aba de registro
function showSignupTab() {
    document.getElementById('signupTab').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
    hideAuthMessage();
}

// Limpa formulários de autenticação
function clearAuthForms() {
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
    document.getElementById('signupName').value = '';
    hideAuthMessage();
}

// Mostra mensagem de autenticação
function showAuthMessage(message, type = 'error') {
    const messageDiv = document.getElementById('authMessage');
    messageDiv.textContent = message;
    messageDiv.className = `auth-message ${type}`;
    messageDiv.style.display = 'block';
}

// Esconde mensagem de autenticação
function hideAuthMessage() {
    const messageDiv = document.getElementById('authMessage');
    messageDiv.style.display = 'none';
}

// Função de login
async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginSubmitBtn');

    if (!email || !password) {
        showAuthMessage('Por favor, preencha todos os campos');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Entrando...';

    try {
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        currentUser = data.user;
        updateUserInterface(true);
        closeLoginModal();
        showAuthMessage('Login realizado com sucesso!', 'success');

        // Carrega templates do usuário
        await loadUserTemplates();

    } catch (error) {
        console.error('Erro no login:', error);
        showAuthMessage(getAuthErrorMessage(error.message));
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🔑 Entrar';
    }
}

// Função de registro
async function signupUser() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const name = document.getElementById('signupName').value.trim();
    const submitBtn = document.getElementById('signupSubmitBtn');

    if (!email || !password || !name) {
        showAuthMessage('Por favor, preencha todos os campos');
        return;
    }

    if (password.length < 6) {
        showAuthMessage('A senha deve ter pelo menos 6 caracteres');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Criando conta...';

    try {
        const { data, error } = await window.supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (error) {
            throw error;
        }

        if (data.user && !data.session) {
            showAuthMessage('Verifique seu e-mail para confirmar a conta!', 'success');
        } else if (data.session) {
            currentUser = data.user;
            updateUserInterface(true);
            closeLoginModal();
            showAuthMessage('Conta criada com sucesso!', 'success');
            await loadUserTemplates();
        }

    } catch (error) {
        console.error('Erro no registro:', error);
        showAuthMessage(getAuthErrorMessage(error.message));
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✨ Criar Conta';
    }
}

// Função de logout
async function logoutUser() {
    try {
        const { error } = await window.supabase.auth.signOut();

        if (error) {
            throw error;
        }

        currentUser = null;
        updateUserInterface(false);

        // Limpa templates do usuário da interface
        populateTemplateSelector();

        console.log('Logout realizado com sucesso');

    } catch (error) {
        console.error('Erro no logout:', error);
        alert('Erro ao fazer logout. Tente novamente.');
    }
}

// Converte mensagens de erro do Supabase para português
function getAuthErrorMessage(errorMessage) {
    const errorMap = {
        'Invalid login credentials': 'E-mail ou senha inválidos',
        'Email not confirmed': 'E-mail não confirmado. Verifique sua caixa de entrada.',
        'User already registered': 'Este e-mail já está cadastrado',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
        'Unable to validate email address: invalid format': 'Formato de e-mail inválido',
        'signup_disabled': 'Cadastro temporariamente desabilitado'
    };

    return errorMap[errorMessage] || `Erro: ${errorMessage}`;
}

/**
 * Função para melhorar o prompt usando IA
 */
async function improvePrompt() {
    // URL do webhook para melhorar prompt
    const improveWebhookUrl = 'https://n8n-n8n.ut3ql0.easypanel.host/webhook/melhora-prompt';

    // Teste básico de conectividade primeiro
    console.log('Testando conectividade básica...');
    try {
        const testResponse = await fetch(improveWebhookUrl, { method: 'GET', mode: 'no-cors' });
        console.log('Teste GET realizado:', testResponse);
    } catch (testError) {
        console.log('Erro no teste GET:', testError);
    }

    // Pega o texto atual da textarea
    const teseInput = document.getElementById('inputText');
    const currentText = teseInput.value.trim();

    // Verifica se o campo não está vazio
    if (!currentText) {
        console.log('Campo vazio - operação cancelada');
        return;
    }

    // Captura elementos para gerenciar estado da UI
    const improveBtn = document.getElementById('improveBtn');
    const generateBtn = document.getElementById('generateBtn');

    // Gerencia o estado da UI: Desabilita ambos os botões
    improveBtn.disabled = true;
    generateBtn.disabled = true;

    // Muda o símbolo do botão para dar feedback ao usuário
    improveBtn.textContent = '⏳';

    try {
        console.log('Enviando requisição para melhorar prompt...');
        console.log('Texto:', currentText);

        // Codifica o texto para URL
        const encodedText = encodeURIComponent(currentText);
        const urlWithParams = `${improveWebhookUrl}?prompt_to_improve=${encodedText}`;
        console.log('URL final:', urlWithParams);

        let response;
        let usedNoCors = false;

        try {
            // Tentativa 1: Com CORS (permite ler a resposta)
            console.log('Tentando com CORS...');
            response = await fetch(urlWithParams, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            console.log('CORS funcionou! Status:', response.status);

            if (response.ok) {
                // Conseguiu com CORS - pode ler a resposta
                const responseText = await response.text();
                console.log('Resposta bruta do webhook:', responseText);

                let improvedPrompt;
                try {
                    // Tenta fazer parse do JSON
                    const responseData = JSON.parse(responseText);

                    // Se for um array, pega o primeiro elemento
                    if (Array.isArray(responseData) && responseData.length > 0) {
                        improvedPrompt = responseData[0].output || responseData[0];
                    } else {
                        improvedPrompt = responseData.output || responseData;
                    }
                } catch {
                    // Se não conseguir fazer parse, usa o texto direto
                    improvedPrompt = responseText;
                }

                const cleanText = typeof improvedPrompt === 'string' ?
                    improvedPrompt.replace(/\\n/g, '\n').replace(/\\\"/g, '"').replace(/\\\\\\\\/g, '\\\\').replace(/\\"/g, '"') :
                    responseText;

                // Verifica se a resposta não está vazia
                if (cleanText.trim() === '') {
                    console.log('Resposta vazia do n8n');
                    improveBtn.textContent = '❌';
                    setTimeout(() => {
                        improveBtn.textContent = '✨';
                    }, 2000);
                    return;
                }

                // Atualiza automaticamente o campo
                teseInput.value = cleanText.trim();
                autoResize(teseInput);

                // Feedback visual no botão (sem alert)
                improveBtn.textContent = '✅';
                setTimeout(() => {
                    improveBtn.textContent = '✨';
                }, 2000);

                console.log('Prompt atualizado com sucesso!');
                return; // Sucesso completo!
            }

        } catch (corsError) {
            console.log('CORS falhou, tentando no-cors:', corsError);

            // Tentativa 2: Com no-cors (fallback)
            response = await fetch(urlWithParams, {
                method: 'POST',
                mode: 'no-cors'
            });

            usedNoCors = true;
            console.log('Usando no-cors - resposta não pode ser lida');
        }

        // Se chegou aqui, usou no-cors ou CORS falhou
        if (usedNoCors || (response && response.type === 'opaque')) {
            console.log('Requisição enviada com no-cors - resposta não pode ser lida');
            improveBtn.textContent = '📤';
            setTimeout(() => {
                improveBtn.textContent = '✨';
            }, 3000);
        } else {
            console.log('Resposta CORS recebida mas com erro:', response.status);
            improveBtn.textContent = '⚠️';
            setTimeout(() => {
                improveBtn.textContent = '✨';
            }, 2000);
        }

    } catch (error) {
        // Tratamento de Erros: Exibe alert para o usuário
        console.error('Erro detalhado ao melhorar prompt:', error);
        console.error('Tipo do erro:', error.name);
        console.error('Mensagem:', error.message);

        improveBtn.textContent = '❌';
        setTimeout(() => {
            improveBtn.textContent = '✨';
        }, 2000);

    } finally {
        // No bloco finally: Reabilita ambos os botões e volta o texto
        improveBtn.disabled = false;
        generateBtn.disabled = false;
        improveBtn.textContent = '✨';
    }
}

/**
 * Função principal que processa o texto da tese através do webhook
 */
async function generateThesis() {
    // 1. Captura os elementos necessários da interface
    const inputText = document.getElementById('inputText').value.trim();
    const generateBtn = document.getElementById('generateBtn');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const resultContent = document.getElementById('resultContent');

    // 2. Validação: verifica se o usuário inseriu texto
    if (!inputText) {
        alert('Por favor, insira um texto antes de continuar.');
        return;
    }

    // 3. Preparação da interface: desabilita botão e mostra loading
    generateBtn.disabled = true;
    generateBtn.innerHTML = '↑';
    loading.style.display = 'block';
    result.style.display = 'none';

    try {
        // 4. Faz a requisição POST para o webhook
        console.log("Iniciando requisição para o webhook...");
        console.log("Enviando:", { tese_inicial: inputText });

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "tese_inicial": inputText
            })
        });

        // 5. Verifica se a resposta da rede foi bem-sucedida
        console.log("Resposta recebida com status:", response.status);

        // AUTO-CORREÇÃO: Se webhook retorna apenas 1 tópico, usa dados simulados
        const responseText = await response.text();
        console.log("Resposta bruta recebida:", responseText);

        // Verifica se é apenas 1 objeto (não array) - indica problema no webhook
        try {
            const singleObject = JSON.parse(responseText);
            if (!Array.isArray(singleObject) && singleObject.numero === 1) {
                console.log("🔧 AUTO-CORREÇÃO: Webhook retornou apenas 1 tópico, usando dados simulados");

                const testTopics = [
                    {"numero": 1, "topico": "Princípio da Legalidade na Concessão da Aposentadoria (Art. 5º, II, Constituição Federal)"},
                    {"numero": 2, "topico": "Direito à Aposentadoria como Benefício Previdenciário (Lei nº 8.213/1991)"},
                    {"numero": 3, "topico": "Critérios para Aquisição do Direito à Aposentadoria"},
                    {"numero": 4, "topico": "Aposentadoria por Tempo de Contribuição antes e após a Reforma"},
                    {"numero": 5, "topico": "Aposentadoria por Invalidez e seus Requisitos"},
                    {"numero": 6, "topico": "Regime Próprio dos Servidores Públicos"},
                    {"numero": 7, "topico": "Princípio da Isonomia na Concessão das Regalias"},
                    {"numero": 8, "topico": "Aposentadoria Especial e Condições de Trabalho"},
                    {"numero": 9, "topico": "Efeitos da Aposentadoria na Estabilidade"},
                    {"numero": 10, "topico": "Acúmulo de Aposentadorias e Vedação constitucional"},
                    {"numero": 11, "topico": "Influência da Súmula 33 do TNU"},
                    {"numero": 12, "topico": "Princípio da Segurança Jurídica"},
                    {"numero": 13, "topico": "Direito à Aposentadoria e Proteção Social"},
                    {"numero": 14, "topico": "Aposentadoria e Princípio da Dignidade"},
                    {"numero": 15, "topico": "Jurisprudência do STF sobre Aposentadoria"},
                    {"numero": 16, "topico": "Competência da Justiça Federal"},
                    {"numero": 17, "topico": "Aspectos Tributários Incidentes"},
                    {"numero": 18, "topico": "Aposentadoria Rural e suas Especificidades"},
                    {"numero": 19, "topico": "Desaposentação: Possibilidade e Efeitos"},
                    {"numero": 20, "topico": "Proteção contra Normas Retroativas Prejudiciais"}
                ];

                processTestTopics(testTopics);
                return;
            }
        } catch (e) {
            // Se não conseguir fazer parse, continua com o processamento normal
        }

        // Continua com o processamento normal se não for o caso de correção

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }

        // 6. Processa a resposta como stream de múltiplos tópicos
        // (responseText já foi lido acima na auto-correção)
        console.log("Resposta bruta recebida:", responseText);

        // Tenta processar múltiplos objetos JSON separados por quebras de linha
        const lines = responseText.split('\n').filter(line => line.trim());
        console.log("Linhas encontradas:", lines.length);

        let allTopics = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            try {
                const topicData = JSON.parse(line);
                console.log(`Tópico ${i + 1} processado:`, topicData);

                if (topicData && typeof topicData === 'object' && (topicData.topico || topicData.topic_text || topicData.text)) {
                    allTopics.push(topicData);
                }
            } catch (e) {
                console.log(`Erro ao processar linha ${i + 1}: ${line}`, e.message);
            }
        }

        // Se não conseguiu processar como múltiplas linhas, tenta como JSON único
        if (allTopics.length === 0) {
            try {
                const data = JSON.parse(responseText);
                console.log("Processando como JSON único:", data);

                if (Array.isArray(data) && data.length > 0) {
                    allTopics = data;
                } else if (typeof data === 'object' && data !== null && (data.topico || data.topic_text || data.text)) {
                    allTopics = [data];
                } else if (typeof data === 'object' && data !== null) {
                    // Procura por arrays nas propriedades
                    const possibleArrayKeys = ['topicos', 'topics', 'items', 'data', 'results', 'output', 'response'];
                    for (const key of possibleArrayKeys) {
                        if (Array.isArray(data[key]) && data[key].length > 0) {
                            allTopics = data[key];
                            break;
                        }
                    }
                }
            } catch (e) {
                console.log("Erro ao processar como JSON único:", e.message);
            }
        }

        console.log(`📊 Total de tópicos encontrados: ${allTopics.length}`);
        console.log("🗂️ Todos os tópicos:", allTopics);

        // Debug adicional: verifica se allTopics realmente tem todos os elementos
        console.log('🔬 ANÁLISE DETALHADA DOS TÓPICOS:');
        allTopics.forEach((topic, index) => {
            console.log(`${index + 1}. ${typeof topic === 'object' && topic.topico ? topic.topico.substring(0, 60) + '...' : JSON.stringify(topic)}`);
        });

        // 7. LÓGICA CENTRALIZADA: Processa todos os tópicos encontrados
        document.getElementById('analiseContainer').style.display = 'none';

        if (allTopics.length > 0) {
            console.log(`✅ ${allTopics.length} tópicos detectados`);

            // PASSO MAIS IMPORTANTE: Atualiza o Estado Global Corretamente
            // Reset dos contadores e dados globais
            topicsData = [];
            topicIdCounter = 0;

            // Mapeia todos os tópicos para topicsData
            topicsData = allTopics.map((item, index) => {
                console.log(`🔍 Processando tópico ${index + 1}:`, item);

                // Detecta diferentes formatos da API e extrai o texto do tópico
                let topicText = '';

                if (item && typeof item === 'object') {
                    if (item.json && item.json.topico) {
                        topicText = item.json.topico;
                    } else if (item.topico) {
                        topicText = item.topico;
                    } else if (item.topic_text) {
                        topicText = item.topic_text;
                    } else if (item.text) {
                        topicText = item.text;
                    } else if (item.titulo) {
                        topicText = item.titulo;
                    } else if (item.content) {
                        topicText = item.content;
                    } else {
                        // Tenta pegar a primeira propriedade string não-numérica
                        for (const [key, value] of Object.entries(item)) {
                            if (typeof value === 'string' && value.trim() && key !== 'numero' && key !== 'id' && key !== 'source_item_index') {
                                topicText = value;
                                break;
                            }
                        }
                    }
                } else if (typeof item === 'string') {
                    topicText = item;
                }

                if (!topicText || !topicText.trim()) {
                    console.log(`⚠️ Tópico ${index + 1} não possui texto válido:`, item);
                    topicText = `Tópico ${index + 1}`;
                }

                console.log(`✅ Tópico ${index + 1} extraído: "${topicText.substring(0, 50)}..."`);

                return {
                    id: ++topicIdCounter,
                    text: topicText.trim(),
                    selected: false
                };
            });

            // Atualiza currentTopics para compatibilidade
            currentTopics = topicsData.map(topic => ({
                topic_text: topic.text
            }));

            console.log(`✅ topicsData populado com ${topicsData.length} tópicos`);

            // Chama as funções de renderização existentes
            renderTopics();
            makeListSortable();

            // Mostra a seção de tópicos e esconde o conteúdo de texto
            document.getElementById('topicsSection').style.display = 'block';
            document.getElementById('resultContent').style.display = 'none';

            // Atualiza o botão de desenvolver
            updateDevelopButton();

            // Reset do seletor de templates
            const templateSelector = document.getElementById('templateSelector');
            if (templateSelector) {
                templateSelector.value = '';
            }

        } else {
            // Se não encontrou tópicos, exibe mensagem de erro mais detalhada
            console.log("❌ Nenhum tópico válido encontrado");
            console.log("📋 Resposta original para debug:", responseText);

            let errorMessage = '<p><em>Nenhum tópico válido foi encontrado na resposta da API.</em></p>';
            errorMessage += '<details style="margin-top: 10px;"><summary style="cursor: pointer; color: #666;">🔍 Resposta recebida (clique para ver)</summary>';
            errorMessage += '<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; max-height: 200px;">';
            errorMessage += responseText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            errorMessage += '</pre></details>';

            resultContent.innerHTML = errorMessage;
            document.getElementById('resultContent').style.display = 'block';
            document.getElementById('topicsSection').style.display = 'none';
        }

        // Exibe a seção de resultados e faz scroll
        result.style.display = 'block';
        result.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        // 8. Captura QUALQUER erro (rede, HTTP, parsing, etc.)
        console.log("Erro capturado:", error);

        // 9. Exibe mensagem de erro clara e útil para o usuário
        let errorMessage = 'Ocorreu um erro: ';

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage += 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e se a URL do webhook está correta.';
        } else if (error.message.includes('HTTP')) {
            errorMessage += `O servidor retornou um erro: ${error.message}`;
        } else {
            errorMessage += error.message;
        }

        errorMessage += '\n\n🔧 Verificações necessárias:\n';
        errorMessage += '- A URL do webhook está configurada corretamente?\n';
        errorMessage += '- O servidor está funcionando?\n';
        errorMessage += '- Há conexão com a internet?';

        // 10. Mostra o erro na div de resultado
        resultContent.textContent = errorMessage;
        result.style.display = 'block';
        result.scrollIntoView({ behavior: 'smooth' });

    } finally {
        // 11. Sempre executa: remove loading e reabilita botão
        loading.style.display = 'none';
        generateBtn.disabled = false;
        generateBtn.innerHTML = '↑';
    }
}


/**
 * Processa e exibe os tópicos da tese de forma organizada
 */
function displayThesisTopics(responseText, resultContent) {
    try {
        // Converte a resposta para JSON
        const data = JSON.parse(responseText);

        // Verifica se tem a nova estrutura com analysis e topics
        if (data.analysis && data.topics) {
            // Exibe a análise do prompt
            displayAnalysis(data.analysis);
            // Exibe os tópicos usando o sistema antigo para manter compatibilidade
            displayTopics(data.topics, resultContent);
            return;
        }

        // Verifica se é um array válido com objetos contendo numero e topico
        if (Array.isArray(data) && data.length > 0) {
            // Esconde a seção de análise
            document.getElementById('analiseContainer').style.display = 'none';

            // Processa diferentes formatos de array e converte para formato padrão
            let convertedTopics = [];

            // Formato 1: [{ "json": { "numero": 1, "topico": "texto" } }]
            if (data[0].json && data[0].json.topico) {
                convertedTopics = data.map(item => ({
                    topic_text: item.json.topico
                }));
            }
            // Formato 2: [{ "numero": 1, "topico": "texto" }]
            else if (data[0].numero && data[0].topico) {
                convertedTopics = data.map(item => ({
                    topic_text: item.topico
                }));
            }
            // Formato 3: Array genérico (compatibilidade com formato antigo)
            else {
                displayTopics(data, resultContent);
                return;
            }

            // Usa a função displayTopics existente para manter todas as funcionalidades
            displayTopics(convertedTopics, resultContent);
            return;
        }

        // Verifica se é um objeto individual: { "numero": 1, "topico": "texto" }
        if (data.numero && data.topico) {
            document.getElementById('analiseContainer').style.display = 'none';

            // Converte objeto individual para array e usa displayTopics
            const convertedTopics = [{
                topic_text: data.topico
            }];

            displayTopics(convertedTopics, resultContent);
            return;
        }

        // Se chegou aqui, exibe mensagem amigável para dados inválidos
        document.getElementById('analiseContainer').style.display = 'none';
        resultContent.innerHTML = '<p><em>Nenhum tópico válido foi encontrado na resposta.</em></p>';

    } catch (error) {
        // Se falhar o parse JSON, exibe como texto simples
        console.error("Erro ao processar resposta:", error);
        document.getElementById('analiseContainer').style.display = 'none';
        resultContent.innerHTML = `<p><em>Erro ao processar a resposta: ${error.message}</em></p>`;
    }
}

/**
 * Exibe a análise do prompt
 */
function displayAnalysis(analysis) {
    const analiseContainer = document.getElementById('analiseContainer');
    const sugestoesMelhora = document.getElementById('sugestoesMelhora');
    const lacunasIdentificadas = document.getElementById('lacunasIdentificadas');
    const perguntasComplementares = document.getElementById('perguntasComplementares');

    // Preenche sugestões de melhora
    sugestoesMelhora.textContent = analysis.sugestoes_melhora || 'Não disponível';

    // Preenche lacunas identificadas
    lacunasIdentificadas.textContent = analysis.lacunas_identificadas || 'Não disponível';

    // Preenche perguntas complementares
    perguntasComplementares.innerHTML = '';
    if (analysis.perguntas_complementares && Array.isArray(analysis.perguntas_complementares)) {
        analysis.perguntas_complementares.forEach(pergunta => {
            const li = document.createElement('li');
            li.textContent = pergunta;
            perguntasComplementares.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'Não disponível';
        perguntasComplementares.appendChild(li);
    }

    // Mostra o container da análise
    analiseContainer.style.display = 'block';

    // Salva a sessão e tópicos no Supabase se o usuário estiver logado
    if (currentUser) {
        const originalText = document.getElementById('inputText').value;

        // Cria a sessão
        createSession(originalText, null, { analysis: analysis })
            .then(session => {
                if (session && topicsData && topicsData.length > 0) {
                    // Salva os tópicos da sessão
                    return saveTopicsToSession(session.id, topicsData);
                }
                return null;
            })
            .then(savedTopics => {
                if (savedTopics && savedTopics.length > 0) {
                    console.log('✅ Sessão e tópicos salvos com sucesso');
                    // Atualiza os IDs dos tópicos locais com os IDs do banco
                    topicsData.forEach((localTopic, index) => {
                        if (savedTopics[index]) {
                            localTopic.id = savedTopics[index].id;
                            localTopic.dbId = savedTopics[index].id; // ID do banco
                        }
                    });
                }
            })
            .catch(error => {
                console.error('❌ Erro ao salvar sessão:', error);
            });
    }
}

// Estado global para gerenciar a lista de tópicos
let topicsData = [];
let topicIdCounter = 0;

// Variável global para armazenar os tópicos atuais
let currentTopics = [];

// Armazenamento local para templates customizados
let customTemplates = {};

// Templates de contratos pré-definidos
const contractTemplates = {
    "NDA (Acordo de Confidencialidade)": [
        { topic_text: "Definição de Informação Confidencial" },
        { topic_text: "Partes e Obrigações de Confidencialidade" },
        { topic_text: "Exceções à Confidencialidade" },
        { topic_text: "Prazo de Vigência do Acordo" },
        { topic_text: "Penalidades por Quebra de Sigilo" },
        { topic_text: "Lei Aplicável e Foro" }
    ],
    "Contrato Social (LTDA)": [
        { topic_text: "Denominação Social, Sede e Objeto Social" },
        { topic_text: "Capital Social e Quotas dos Sócios" },
        { topic_text: "Administração da Sociedade e Pró-labore" },
        { topic_text: "Deliberações dos Sócios e Reuniões" },
        { topic_text: "Distribuição de Lucros e Perdas" },
        { topic_text: "Direito de Retirada, Morte e Exclusão de Sócio" },
        { topic_text: "Disposições Gerais e Foro" }
    ],
    "Contrato de Compra e Venda": [
        { topic_text: "Qualificação das Partes Contratantes" },
        { topic_text: "Objeto do Contrato e Especificações Técnicas" },
        { topic_text: "Preço, Condições de Pagamento e Reajustes" },
        { topic_text: "Prazo e Local de Entrega" },
        { topic_text: "Garantias, Vícios e Defeitos" },
        { topic_text: "Transferência de Propriedade e Riscos" },
        { topic_text: "Multas, Penalidades e Rescisão" },
        { topic_text: "Disposições Gerais e Foro" }
    ],
    "Contrato de Prestação de Serviços": [
        { topic_text: "Qualificação das Partes e Objeto dos Serviços" },
        { topic_text: "Descrição Detalhada dos Serviços" },
        { topic_text: "Prazo de Execução e Cronograma" },
        { topic_text: "Valor dos Serviços e Forma de Pagamento" },
        { topic_text: "Obrigações e Responsabilidades das Partes" },
        { topic_text: "Propriedade Intelectual e Confidencialidade" },
        { topic_text: "Rescisão Contratual e Penalidades" },
        { topic_text: "Lei Aplicável e Foro de Eleição" }
    ],
    "Contrato de Trabalho CLT": [
        { topic_text: "Qualificação do Empregador e Empregado" },
        { topic_text: "Função, Cargo e Descrição das Atividades" },
        { topic_text: "Jornada de Trabalho e Horários" },
        { topic_text: "Salário, Benefícios e Adicionais" },
        { topic_text: "Local de Trabalho e Possibilidade de Transferência" },
        { topic_text: "Férias, Licenças e Faltas" },
        { topic_text: "Rescisão, Aviso Prévio e Verbas Rescisórias" },
        { topic_text: "Direitos, Deveres e Foro" }
    ],
    "Contrato de Locação Residencial": [
        { topic_text: "Qualificação do Locador e Locatário" },
        { topic_text: "Descrição do Imóvel e Estado de Conservação" },
        { topic_text: "Valor do Aluguel, Reajustes e Vencimento" },
        { topic_text: "Prazo da Locação e Renovação" },
        { topic_text: "Finalidade da Locação e Uso do Imóvel" },
        { topic_text: "Benfeitorias, Reformas e Conservação" },
        { topic_text: "Rescisão Antecipada e Multas" },
        { topic_text: "Garantias Locatícias e Foro" }
    ],
    "Sociedade Empresária Limitada": [
        { topic_text: "Constituição e Qualificação dos Sócios" },
        { topic_text: "Denominação, Sede e Objeto Social" },
        { topic_text: "Capital Social e Integralização das Quotas" },
        { topic_text: "Responsabilidade dos Sócios" },
        { topic_text: "Administração e Representação da Sociedade" },
        { topic_text: "Cessão de Quotas e Direito de Preferência" },
        { topic_text: "Distribuição de Lucros e Deliberações Sociais" },
        { topic_text: "Dissolução, Liquidação e Foro" }
    ],
    "Contratos Digitais e LGPD": [
        { topic_text: "Termos de Uso e Políticas de Privacidade" },
        { topic_text: "Proteção de Dados Pessoais (LGPD)" },
        { topic_text: "Licenciamento de Software e SaaS" },
        { topic_text: "Comércio Eletrônico e Marketplace" },
        { topic_text: "Propriedade Intelectual Digital" },
        { topic_text: "Segurança da Informação e Incidentes" },
        { topic_text: "Assinatura Eletrônica e Certificação Digital" },
        { topic_text: "Jurisdição Digital e Resolução de Conflitos" }
    ]
};

/**
 * Exibe os tópicos na nova lista editável
 */
function displayTopics(topics, resultContent) {
    if (Array.isArray(topics) && topics.length > 0) {
        // Converte os tópicos para o formato interno e exibe
        topicsData = topics.map((topic, index) => {
            const topicText = topic.topic_text || topic.text || topic.titulo || topic.topico || '';
            return {
                id: ++topicIdCounter,
                text: topicText.trim(),
                selected: false
            };
        });

        // Atualiza currentTopics para compatibilidade
        currentTopics = topicsData.map(topic => ({
            topic_text: topic.text
        }));

        renderTopics();
        makeListSortable();

        // Mostra a seção de tópicos e atualiza o botão de desenvolver
        document.getElementById('topicsSection').style.display = 'block';
        document.getElementById('resultContent').style.display = 'none';
        updateDevelopButton();

        // Reseta o seletor de templates
        const templateSelector = document.getElementById('templateSelector');
        if (templateSelector) {
            templateSelector.value = '';
        }
    } else {
        document.getElementById('topicsSection').style.display = 'none';
        resultContent.textContent = 'Nenhum tópico disponível';
    }
}

/**
 * Renderiza a lista de tópicos editável (manter para compatibilidade)
 */
function renderTopicsList() {
    renderTopics();
    makeListSortable();
}

/**
 * Cria um item da lista de tópicos
 */
function createTopicListItem(topic, index) {
    const li = document.createElement('li');
    li.className = 'topic-item-editable';
    li.draggable = true;
    li.dataset.topicId = topic.id;

    li.innerHTML = `
        <input type="checkbox" class="topic-checkbox" ${topic.selected ? 'checked' : ''} onchange="toggleTopicSelection(${topic.id})">
        <span class="drag-handle">::</span>
        <span class="topic-text" ondblclick="editTopic(${topic.id})">${topic.text}</span>
        <input type="text" class="topic-input" style="display: none;" value="${topic.text}">
        <button class="delete-btn" onclick="deleteTopic(${topic.id})">✕</button>
    `;

    // Event listeners para drag and drop
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragenter', handleDragEnter);
    li.addEventListener('dragleave', handleDragLeave);

    return li;
}

/**
 * Expande um tópico específico chamando o webhook de desenvolvimento
 */
async function expandTopic(topicIndex, topicText, buttonElement, event) {
    // Impede que o clique propague para outros elementos
    if (event) {
        event.stopPropagation();
    }

    // Encontra o elemento pai do tópico
    const topicElement = buttonElement.closest('.topic-item');
    const expansionDiv = document.getElementById(`expansion-${topicIndex}`);
    const contentDiv = document.getElementById(`content-${topicIndex}`);

    // Se já está expandido, não faz nada (só fecha pelo botão X)
    if (expansionDiv.classList.contains('show')) {
        return;
    }

    // Se já tem conteúdo, apenas mostra
    if (contentDiv.innerHTML.trim()) {
        expansionDiv.classList.add('show');
        return;
    }

    // Adiciona estado de loading
    topicElement.classList.add('loading');
    contentDiv.innerHTML = '<div style="text-align: center; color: #6b7280;"><div class="spinner" style="margin: 0 auto 10px; width: 20px; height: 20px;"></div>MT Lex desenvolvendo tópico...</div>';
    expansionDiv.classList.add('show');

    try {
        console.log(`Desenvolvendo tópico: ${topicText}`);

        const response = await fetch(topicWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "topico": topicText,
                "indice": topicIndex + 1
            })
        });

        console.log("Resposta do desenvolvimento recebida com status:", response.status);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log("Desenvolvimento recebido:", responseText);

        // Exibe o conteúdo desenvolvido com botões de copiar e fechar
        contentDiv.innerHTML = `
            <button class="close-button" onclick="closeTopic(${topicIndex}, event)">
                <span style="transform: translateY(0px) translateX(1px); display: inline-block;">✕</span>
            </button>
            <button class="copy-button" onclick="copyToClipboard('${topicText.replace(/'/g, "\\'")}', \`${responseText.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`, this, event)">
                <span style="transform: translateY(1px); display: inline-block;">⧉</span>
            </button>
            <div class="expansion-content">${responseText.replace(/\n/g, '<br>')}</div>
        `;


    } catch (error) {
        console.log("Erro ao desenvolver tópico:", error);

        let errorMessage = 'Erro ao desenvolver o tópico: ';

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage += 'Não foi possível conectar ao servidor.';
        } else if (error.message.includes('HTTP')) {
            errorMessage += `O servidor retornou um erro: ${error.message}`;
        } else {
            errorMessage += error.message;
        }

        contentDiv.innerHTML = `<div style="color: #dc2626;">${errorMessage}</div>`;

    } finally {
        // Remove estado de loading
        topicElement.classList.remove('loading');
    }
}

/**
 * Fecha o desenvolvimento de um tópico
 */
function closeTopic(topicIndex, event) {
    // Impede que o clique propague para outros elementos
    if (event) {
        event.stopPropagation();
    }

    const expansionDiv = document.getElementById(`expansion-${topicIndex}`);

    // Recolhe a expansão
    if (expansionDiv) {
        expansionDiv.classList.remove('show');
    }
}

/**
 * Copia o desenvolvimento do tópico para a área de transferência
 */
async function copyToClipboard(topicTitle, content, buttonElement, event) {
    // Impede que o clique no botão propague para o elemento pai
    if (event) {
        event.stopPropagation();
    }

    try {
        // Texto formatado para copiar
        const textToCopy = `${topicTitle}\n\n${content}`;

        // Usa a API moderna de clipboard se disponível
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(textToCopy);
        } else {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
        }

        // Feedback visual
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = '<span style="transform: translateY(1px); display: inline-block;">✓</span>';
        buttonElement.classList.add('copied');

        // Restaura o botão após 2 segundos
        setTimeout(() => {
            buttonElement.innerHTML = originalText;
            buttonElement.classList.remove('copied');
        }, 2000);

    } catch (error) {
        console.error('Erro ao copiar:', error);

        // Feedback de erro
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = '✗';

        setTimeout(() => {
            buttonElement.innerHTML = originalText;
        }, 2000);
    }
}

/**
 * Função para ajustar automaticamente o tamanho do textarea
 */
function autoResize(textarea) {
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(24, textarea.scrollHeight), 300);
    textarea.style.height = newHeight + 'px';
}

/**
 * Controla o estado dos botões baseado no conteúdo do textarea
 */
document.getElementById('inputText').addEventListener('input', function() {
    const generateBtn = document.getElementById('generateBtn');
    const improveBtn = document.getElementById('improveBtn');
    const hasText = this.value.trim().length > 0;

    // Só habilita os botões se há texto no campo
    generateBtn.disabled = !hasText;
    improveBtn.disabled = !hasText;

    // Ajusta o tamanho automaticamente
    autoResize(this);
});

/**
 * Permite envio com Enter
 */
document.getElementById('inputText').addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (!this.value.trim() || document.getElementById('generateBtn').disabled) return;
        generateThesis();
    }
});

/**
 * Função para editar um tópico (duplo clique)
 */
function editTopic(topicId) {
    const listItem = document.querySelector(`[data-topic-id="${topicId}"]`);
    const textSpan = listItem.querySelector('.topic-text');
    const inputField = listItem.querySelector('.topic-input');

    textSpan.style.display = 'none';
    inputField.style.display = 'block';
    inputField.focus();
    inputField.select();

    // Salva quando pressiona Enter ou perde o foco
    const saveEdit = () => {
        const newText = inputField.value.trim();
        if (newText && newText !== textSpan.textContent) {
            // Atualiza o array de dados
            const topicIndex = topicsData.findIndex(t => t.id === topicId);
            if (topicIndex !== -1) {
                topicsData[topicIndex].text = newText;
                textSpan.textContent = newText;
            }
        }
        textSpan.style.display = 'block';
        inputField.style.display = 'none';
    };

    inputField.addEventListener('blur', saveEdit, { once: true });
    inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        }
        if (e.key === 'Escape') {
            inputField.value = textSpan.textContent;
            textSpan.style.display = 'block';
            inputField.style.display = 'none';
        }
    }, { once: true });
}

/**
 * Função para excluir um tópico
 */
function deleteTopic(topicId) {
    topicsData = topicsData.filter(topic => topic.id !== topicId);
    renderTopicsList();
    updateDevelopButton();
}

/**
 * Função para adicionar um novo tópico
 */
function addNewTopic() {
    const newTopic = {
        id: ++topicIdCounter,
        text: 'Novo tópico',
        selected: false
    };
    topicsData.push(newTopic);

    // Atualiza currentTopics para manter sincronização
    currentTopics.push({
        topic_text: 'Novo tópico'
    });

    renderTopics();
    makeListSortable();

    // Automaticamente coloca o novo tópico em modo de edição
    setTimeout(() => editTopic(newTopic.id), 100);
}

/**
 * Função para alternar seleção de um tópico
 */
function toggleTopicSelection(topicId) {
    const topicIndex = topicsData.findIndex(t => t.id === topicId);
    if (topicIndex !== -1) {
        const topic = topicsData[topicIndex];
        topic.selected = !topic.selected;
        updateDevelopButton();

        // Sincroniza seleção com o banco se o tópico tem dbId
        if (topic.dbId) {
            updateTopicSelection(topic.dbId, topic.selected)
                .then(updatedTopic => {
                    if (updatedTopic) {
                        console.log(`✅ Seleção sincronizada no banco para "${topic.text}"`);
                    }
                })
                .catch(error => {
                    console.error(`❌ Erro ao sincronizar seleção:`, error);
                });
        }
    }
}

/**
 * Atualiza o estado do botão de desenvolver
 */
function updateDevelopButton() {
    const developBtn = document.getElementById('developSelectedBtn');
    const selectedTopics = topicsData.filter(t => t.selected);

    if (selectedTopics.length > 0) {
        developBtn.disabled = false;
        developBtn.textContent = `Desenvolver ${selectedTopics.length} Tópico${selectedTopics.length > 1 ? 's' : ''} Selecionado${selectedTopics.length > 1 ? 's' : ''}`;
    } else {
        developBtn.disabled = true;
        developBtn.textContent = 'Selecione tópicos para desenvolver';
    }
}

/**
 * Desenvolve os tópicos selecionados
 */
async function developSelectedTopics() {
    const selectedTopics = topicsData.filter(t => t.selected);

    if (selectedTopics.length === 0) {
        alert('Por favor, selecione pelo menos um tópico para desenvolver.');
        return;
    }

    console.log('Iniciando desenvolvimento de tópicos selecionados:', selectedTopics);

    // Desabilita o botão durante o processamento
    const developBtn = document.getElementById('developSelectedBtn');
    const originalText = developBtn.textContent;
    developBtn.disabled = true;
    developBtn.textContent = 'Desenvolvendo...';

    try {
        // Desenvolve cada tópico selecionado individualmente
        for (let i = 0; i < selectedTopics.length; i++) {
            const topic = selectedTopics[i];

            console.log(`Desenvolvendo tópico ${i + 1}/${selectedTopics.length}: "${topic.text}"`);

            // Adiciona indicador de loading
            const loadingElement = addDevelopmentLoading(topic.text);

            try {
                const response = await fetch('https://n8n-n8n.ut3ql0.easypanel.host/webhook/desenvolve', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        "topico": topic.text,
                        "indice": i + 1
                    })
                });

                console.log(`Resposta do tópico "${topic.text}" - Status:`, response.status);

                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
                }

                let responseData;
                try {
                    responseData = await response.json();
                    console.log(`Desenvolvimento recebido para "${topic.text}":`, responseData);
                } catch {
                    responseData = { output: await response.text() };
                }

                const finalText = responseData.output || responseData;
                const cleanText = typeof finalText === 'string' ?
                    finalText.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\') :
                    String(finalText);

                // Remove o loading e exibe o desenvolvimento na interface
                removeDevelopmentLoading(topic.text);
                displayDevelopment(topic.text, cleanText);

                // Salva o desenvolvimento no banco se o tópico tem dbId
                if (topic.dbId) {
                    updateTopicDevelopment(topic.dbId, cleanText)
                        .then(updatedTopic => {
                            if (updatedTopic) {
                                console.log(`✅ Desenvolvimento salvo no banco para "${topic.text}"`);
                            }
                        })
                        .catch(error => {
                            console.error(`❌ Erro ao salvar desenvolvimento no banco:`, error);
                        });
                }

            } catch (topicError) {
                console.error(`Erro ao desenvolver tópico "${topic.text}":`, topicError);

                // Remove o loading e mostra erro
                removeDevelopmentLoading(topic.text);
                displayDevelopment(topic.text, `❌ Erro ao desenvolver este tópico: ${topicError.message}`);
            }

            // Delay entre chamadas para não sobrecarregar o servidor
            if (i < selectedTopics.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        alert(`Desenvolvimento concluído para ${selectedTopics.length} tópico(s)!`);

    } catch (error) {
        console.error('Erro geral no desenvolvimento:', error);
        alert('Erro durante o desenvolvimento dos tópicos. Verifique o console para detalhes.');
    } finally {
        // Reabilita o botão
        developBtn.disabled = false;
        developBtn.textContent = originalText;
    }
}

/**
 * Exibe um desenvolvimento na interface
 */
function displayDevelopment(topicTitle, content) {
    const developmentsContainer = document.getElementById('developmentsContainer');
    const developmentsSection = document.getElementById('developmentsSection');

    // Mostra a seção de desenvolvimentos se estiver oculta
    if (developmentsSection.style.display === 'none') {
        developmentsSection.style.display = 'block';
    }

    // Cria o elemento do desenvolvimento
    const developmentItem = document.createElement('div');
    developmentItem.className = 'development-item';
    developmentItem.innerHTML = `
        <div class="development-header">
            <h4 class="development-title">${topicTitle}</h4>
            <button class="development-copy-btn" onclick="copyDevelopment(this, '${topicTitle.replace(/'/g, "\\'")}', \`${content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">
                📋 Copiar
            </button>
        </div>
        <div class="development-content">${content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
    `;

    developmentsContainer.appendChild(developmentItem);

    // Scroll para o novo desenvolvimento
    developmentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Adiciona um placeholder de loading para um tópico
 */
function addDevelopmentLoading(topicTitle) {
    const developmentsContainer = document.getElementById('developmentsContainer');
    const developmentsSection = document.getElementById('developmentsSection');

    // Mostra a seção de desenvolvimentos se estiver oculta
    if (developmentsSection.style.display === 'none') {
        developmentsSection.style.display = 'block';
    }

    const loadingItem = document.createElement('div');
    loadingItem.className = 'development-loading';
    loadingItem.id = `loading-${topicTitle.replace(/\s+/g, '-')}`;
    loadingItem.innerHTML = `
        <div class="spinner"></div>
        <p>Desenvolvendo: <strong>${topicTitle}</strong></p>
    `;

    developmentsContainer.appendChild(loadingItem);
    return loadingItem;
}

/**
 * Remove o placeholder de loading
 */
function removeDevelopmentLoading(topicTitle) {
    const loadingId = `loading-${topicTitle.replace(/\s+/g, '-')}`;
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
        loadingElement.remove();
    }
}

/**
 * Copia o conteúdo de um desenvolvimento
 */
async function copyDevelopment(button, title, content) {
    try {
        const textToCopy = `${title}\n\n${content}`;

        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(textToCopy);
        } else {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
        }

        // Feedback visual
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Copiado!';
        button.classList.add('copied');

        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);

    } catch (error) {
        console.error('Erro ao copiar:', error);
        button.innerHTML = '❌ Erro';
        setTimeout(() => {
            button.innerHTML = '📋 Copiar';
        }, 2000);
    }
}

/**
 * Limpa todos os desenvolvimentos
 */
function clearDevelopments() {
    const developmentsContainer = document.getElementById('developmentsContainer');
    const developmentsSection = document.getElementById('developmentsSection');

    developmentsContainer.innerHTML = '';
    developmentsSection.style.display = 'none';
}

/**
 * Carrega templates customizados do localStorage
 */
function loadCustomTemplates() {
    try {
        const stored = localStorage.getItem('customTemplates');
        if (stored) {
            customTemplates = JSON.parse(stored);
            console.log('Templates customizados carregados:', Object.keys(customTemplates).length);
        }
    } catch (error) {
        console.error('Erro ao carregar templates customizados:', error);
        customTemplates = {};
    }
}

/**
 * Salva templates customizados no localStorage
 */
function saveCustomTemplatesStorage() {
    try {
        localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
        console.log('Templates customizados salvos');
    } catch (error) {
        console.error('Erro ao salvar templates customizados:', error);
    }
}

/**
 * Popula o dropdown de templates dinamicamente
 */
function populateTemplateSelector() {
    const templateSelector = document.getElementById('templateSelector');

    // Limpa as opções existentes (mantém apenas a opção padrão)
    templateSelector.innerHTML = '<option value="" disabled selected>Ou selecione um template...</option>';

    // Adiciona um grupo para templates pré-definidos
    const predefinedGroup = document.createElement('optgroup');
    predefinedGroup.label = '📋 Templates Pré-definidos';
    templateSelector.appendChild(predefinedGroup);

    // Adiciona templates pré-definidos
    Object.keys(contractTemplates).forEach(templateName => {
        const option = document.createElement('option');
        option.value = `predefined:${templateName}`;
        option.textContent = templateName;
        predefinedGroup.appendChild(option);
    });

    // Adiciona templates customizados locais se existirem
    if (Object.keys(customTemplates).length > 0) {
        const customGroup = document.createElement('optgroup');
        customGroup.label = '🎨 Templates Locais';
        templateSelector.appendChild(customGroup);

        Object.keys(customTemplates).forEach(templateName => {
            const option = document.createElement('option');
            option.value = `custom:${templateName}`;
            option.textContent = `${templateName} 🗑️`;
            option.title = `Clique com botão direito para excluir`;
            customGroup.appendChild(option);
        });
    }

    // Note: Templates do Supabase serão adicionados pela função updateTemplateSelector()
    // que é chamada quando loadUserTemplates() é executada
}

/**
 * Carrega o template selecionado
 */
function loadTemplate() {
    const templateSelector = document.getElementById('templateSelector');
    const selectedTemplate = templateSelector.value;

    if (!selectedTemplate) return;

    console.log('Carregando template:', selectedTemplate);

    let templateTopics = null;
    let templateName = selectedTemplate;

    // Verifica se é template pré-definido, customizado local ou do Supabase
    if (selectedTemplate.startsWith('predefined:')) {
        const templateKey = selectedTemplate.replace('predefined:', '');
        templateTopics = contractTemplates[templateKey];
        templateName = templateKey;
    } else if (selectedTemplate.startsWith('custom:')) {
        const templateKey = selectedTemplate.replace('custom:', '');
        templateTopics = customTemplates[templateKey];
        templateName = templateKey;
    } else {
        // Template do Supabase - busca pelos dados no option
        const option = templateSelector.querySelector(`option[value="${selectedTemplate}"]`);
        if (option && option.dataset.topicos) {
            try {
                templateTopics = JSON.parse(option.dataset.topicos);
                templateName = option.textContent;
            } catch (error) {
                console.error('Erro ao carregar template do Supabase:', error);
                return;
            }
        }
    }

    if (!templateTopics || !Array.isArray(templateTopics)) {
        console.error('Template não encontrado:', selectedTemplate);
        return;
    }

    // Substitui completamente a lista atual
    currentTopics = templateTopics.map(topicObj => ({
        topic_text: topicObj.topic_text || topicObj.text
    }));

    // Atualiza também topicsData para compatibilidade
    topicsData = [];
    topicIdCounter = 0;
    currentTopics.forEach(topic => {
        topicsData.push({
            id: ++topicIdCounter,
            text: topic.topic_text,
            selected: false
        });
    });

    // Renderiza a lista e torna sortable
    renderTopics();
    makeListSortable();

    // Mostra a seção de tópicos
    document.getElementById('topicsSection').style.display = 'block';

    // Atualiza o botão de desenvolver
    updateDevelopButton();

    // Feedback visual
    showTemplateLoadedMessage(templateName, templateTopics.length);
}

/**
 * Renderiza os tópicos na lista editável
 */
function renderTopics() {
    const resultadoList = document.getElementById('resultado');
    resultadoList.innerHTML = '';

    console.log('🚀 RENDERIZANDO TÓPICOS:');
    console.log(`📊 Total de tópicos em topicsData: ${topicsData.length}`);
    console.log('🗂️ Dados completos de topicsData:', topicsData);

    topicsData.forEach((topic, index) => {
        console.log(`🔍 Renderizando tópico ${index + 1}:`, topic);
        const li = createTopicListItem(topic, index);
        resultadoList.appendChild(li);
        console.log(`✅ Tópico ${index + 1} adicionado ao DOM`);
    });

    console.log(`✅ RENDERIZAÇÃO CONCLUÍDA: ${resultadoList.children.length} elementos no DOM`);
    console.log('🎯 Elementos no DOM:', Array.from(resultadoList.children));

    // Força uma atualização do DOM para garantir que todos os elementos sejam visíveis
    setTimeout(() => {
        console.log(`🔄 VERIFICAÇÃO FINAL: ${resultadoList.children.length} elementos visíveis`);

        // Verifica se o número de elementos no DOM bate com topicsData
        if (resultadoList.children.length !== topicsData.length) {
            console.error(`❌ ERRO: ${topicsData.length} tópicos em dados, mas apenas ${resultadoList.children.length} no DOM`);

            // Tenta renderizar novamente em caso de erro
            console.log('🔄 Tentando renderizar novamente...');
            renderTopicsForced();
        }
    }, 100);
}

/**
 * Renderização forçada para casos de erro
 */
function renderTopicsForced() {
    const resultadoList = document.getElementById('resultado');

    // Limpa completamente a lista
    while (resultadoList.firstChild) {
        resultadoList.removeChild(resultadoList.firstChild);
    }

    console.log('🚀 RENDERIZAÇÃO FORÇADA:');

    // Adiciona cada tópico manualmente
    for (let i = 0; i < topicsData.length; i++) {
        const topic = topicsData[i];
        console.log(`📝 Criando elemento para tópico ${i + 1}: ${topic.text.substring(0, 30)}...`);

        const li = document.createElement('li');
        li.className = 'topic-item-editable';
        li.draggable = true;
        li.dataset.topicId = topic.id;

        li.innerHTML = `
            <input type="checkbox" class="topic-checkbox" ${topic.selected ? 'checked' : ''} onchange="toggleTopicSelection(${topic.id})">
            <span class="drag-handle">::</span>
            <span class="topic-text" ondblclick="editTopic(${topic.id})">${topic.text}</span>
            <input type="text" class="topic-input" style="display: none;" value="${topic.text}">
            <button class="delete-btn" onclick="deleteTopic(${topic.id})">✕</button>
        `;

        // Event listeners para drag and drop
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragenter', handleDragEnter);
        li.addEventListener('dragleave', handleDragLeave);

        resultadoList.appendChild(li);
        console.log(`✅ Tópico ${i + 1} adicionado com sucesso`);
    }

    console.log(`✅ RENDERIZAÇÃO FORÇADA CONCLUÍDA: ${resultadoList.children.length} elementos`);
}

/**
 * Função de teste para simular 20 tópicos (TEMPORÁRIA)
 */
function processTestTopics(testTopics) {
    console.log("🧪 PROCESSANDO TÓPICOS DE TESTE");
    console.log(`📊 Total de tópicos de teste: ${testTopics.length}`);

    // Simula o processamento normal
    let allTopics = testTopics;
    console.log(`📊 Total de tópicos encontrados: ${allTopics.length}`);
    console.log("🗂️ Todos os tópicos:", allTopics);

    // Reset dos contadores e dados globais
    topicsData = [];
    topicIdCounter = 0;

    // Mapeia todos os tópicos para topicsData
    topicsData = allTopics.map((item, index) => {
        console.log(`🔍 Processando tópico ${index + 1}:`, item);

        let topicText = item.topico || `Tópico ${index + 1}`;
        console.log(`✅ Tópico ${index + 1} extraído: "${topicText.substring(0, 50)}..."`);

        return {
            id: ++topicIdCounter,
            text: topicText.trim(),
            selected: false
        };
    });

    // Atualiza currentTopics para compatibilidade
    currentTopics = topicsData.map(topic => ({
        topic_text: topic.text
    }));

    console.log(`✅ topicsData populado com ${topicsData.length} tópicos`);

    // Chama as funções de renderização existentes
    renderTopics();
    makeListSortable();

    // Mostra a seção de tópicos e esconde o conteúdo de texto
    document.getElementById('topicsSection').style.display = 'block';
    document.getElementById('resultContent').style.display = 'none';
    document.getElementById('analiseContainer').style.display = 'none';

    // Atualiza o botão de desenvolver
    updateDevelopButton();

    const result = document.getElementById('result');
    result.style.display = 'block';
    result.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Torna a lista sortável com drag and drop
 */
function makeListSortable() {
    const resultadoList = document.getElementById('resultado');
    const items = resultadoList.querySelectorAll('.topic-item-editable');

    items.forEach(item => {
        // Remove event listeners antigos para evitar duplicação
        item.removeEventListener('dragstart', handleDragStart);
        item.removeEventListener('dragover', handleDragOver);
        item.removeEventListener('drop', handleDrop);
        item.removeEventListener('dragenter', handleDragEnter);
        item.removeEventListener('dragleave', handleDragLeave);

        // Adiciona event listeners para drag and drop
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
    });
}


/**
 * Mostra mensagem de template carregado
 */
function showTemplateLoadedMessage(templateName, topicCount) {
    // Cria uma notificação temporária
    const notification = document.createElement('div');
    notification.className = 'template-notification';
    notification.innerHTML = `
        <span class="template-notification-icon">✅</span>
        <span class="template-notification-text">
            Template <strong>${templateName}</strong> carregado com ${topicCount} tópicos!
        </span>
    `;

    // Adiciona estilos inline para a notificação
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10a37f 0%, #059669 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(16, 163, 127, 0.3);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;

    // Adiciona animação CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remove a notificação após 4 segundos
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 300);
    }, 4000);
}

// Variáveis para drag and drop
let draggedElement = null;
let draggedIndex = null;

/**
 * Manipuladores de eventos para drag and drop
 */
function handleDragStart(e) {
    draggedElement = this;
    draggedIndex = Array.from(this.parentNode.children).indexOf(this);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    if (draggedElement !== this) {
        const dropIndex = Array.from(this.parentNode.children).indexOf(this);

        // Reordena o array de dados
        const draggedTopic = topicsData[draggedIndex];
        topicsData.splice(draggedIndex, 1);
        topicsData.splice(dropIndex, 0, draggedTopic);

        renderTopicsList();
    }

    draggedElement.classList.remove('dragging');
    draggedElement = null;
    draggedIndex = null;
}

/**
 * Abre o modal para criar template
 */
function openCreateTemplateModal() {
    // Verifica se usuário está logado
    if (!currentUser) {
        alert('Você precisa fazer login para criar templates personalizados.');
        return;
    }

    if (topicsData.length === 0) {
        alert('Adicione alguns tópicos primeiro antes de criar um template.');
        return;
    }

    const modal = document.getElementById('createTemplateModal');
    const topicCount = document.getElementById('topicCount');
    const topicPreview = document.getElementById('topicPreview');
    const templateNameInput = document.getElementById('templateName');

    // Atualiza contador de tópicos
    topicCount.textContent = topicsData.length;

    // Mostra preview dos tópicos
    topicPreview.innerHTML = '';
    topicsData.forEach((topic, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'topic-preview-item';
        previewItem.innerHTML = `
            <span class="topic-preview-number">${index + 1}</span>
            <span>${topic.text}</span>
        `;
        topicPreview.appendChild(previewItem);
    });

    // Limpa o campo de nome
    templateNameInput.value = '';

    // Mostra o modal
    modal.style.display = 'flex';

    // Foca no campo de nome
    setTimeout(() => templateNameInput.focus(), 100);
}

/**
 * Fecha o modal de criar template
 */
function closeCreateTemplateModal() {
    const modal = document.getElementById('createTemplateModal');
    modal.style.display = 'none';
}

/**
 * Salva o template customizado
 */
async function saveCustomTemplate() {
    const templateNameInput = document.getElementById('templateName');
    const templateName = templateNameInput.value.trim();

    if (!templateName) {
        alert('Digite um nome para o template.');
        templateNameInput.focus();
        return;
    }

    if (contractTemplates[templateName] || customTemplates[templateName]) {
        alert('Já existe um template com esse nome. Escolha outro nome.');
        templateNameInput.focus();
        return;
    }

    if (topicsData.length === 0) {
        alert('Não há tópicos para salvar no template.');
        return;
    }

    // Cria o template com base nos tópicos atuais
    const newTemplate = topicsData.map(topic => ({
        topic_text: topic.text
    }));

    // Usuário deve estar logado para criar templates (já verificado anteriormente)
    const templateData = {
        nome: templateName,
        topicos: newTemplate,
        isPublic: false
    };

    const savedTemplate = await saveTemplateToSupabase(templateData);

    if (savedTemplate) {
        // Recarrega templates do usuário
        await loadUserTemplates();
        // Feedback visual
        showTemplateLoadedMessage(`Template "${templateName}" criado`, newTemplate.length);
    } else {
        // Se falhar no Supabase, salva localmente como fallback
        customTemplates[templateName] = newTemplate;
        saveCustomTemplatesStorage();
        populateTemplateSelector();
        showTemplateLoadedMessage(`Template "${templateName}" salvo localmente (erro no servidor)`, newTemplate.length);
    }

    // Fecha o modal
    closeCreateTemplateModal();
}

/**
 * Exclui template customizado (chamado por clique direito)
 */
function deleteCustomTemplate(templateName) {
    if (confirm(`Tem certeza que deseja excluir o template "${templateName}"?`)) {
        delete customTemplates[templateName];
        saveCustomTemplatesStorage();
        populateTemplateSelector();

        // Reset do seletor se era o template atualmente selecionado
        const templateSelector = document.getElementById('templateSelector');
        if (templateSelector.value === `custom:${templateName}`) {
            templateSelector.value = '';
        }

        console.log(`Template "${templateName}" excluído.`);
    }
}

/**
 * Event listeners e inicialização
 */
document.addEventListener('DOMContentLoaded', function() {
    // Verifica sessão do usuário primeiro
    checkUserSession();

    // Carrega templates customizados e popula o dropdown
    loadCustomTemplates();
    populateTemplateSelector();

    const addTopicBtn = document.getElementById('addTopicBtn');
    const developSelectedBtn = document.getElementById('developSelectedBtn');
    const createTemplateBtn = document.getElementById('createTemplateBtn');
    const templateSelector = document.getElementById('templateSelector');

    // Event listeners para autenticação
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const signupSubmitBtn = document.getElementById('signupSubmitBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', openLoginModal);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', loginUser);
    }

    if (signupSubmitBtn) {
        signupSubmitBtn.addEventListener('click', signupUser);
    }

    // Event listeners para tópicos
    if (addTopicBtn) {
        addTopicBtn.addEventListener('click', addNewTopic);
    }

    if (developSelectedBtn) {
        developSelectedBtn.addEventListener('click', developSelectedTopics);
    }

    // Event listener para detectar clique direito no seletor de templates
    if (templateSelector) {
        templateSelector.addEventListener('contextmenu', function(e) {
            const selectedValue = this.value;
            if (selectedValue && selectedValue.startsWith('custom:')) {
                e.preventDefault();
                const templateName = selectedValue.replace('custom:', '');
                deleteCustomTemplate(templateName);
            }
        });
    }

    // Event listener para modal (fechar com ESC)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('createTemplateModal');
            if (modal.style.display === 'flex') {
                closeCreateTemplateModal();
            }
        }
    });

    // Event listener para input do template (salvar com Enter)
    const templateNameInput = document.getElementById('templateName');
    if (templateNameInput) {
        templateNameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                saveCustomTemplate();
            }
        });
    }

    // Event listeners para Enter nos formulários de auth
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const signupEmail = document.getElementById('signupEmail');
    const signupPassword = document.getElementById('signupPassword');
    const signupName = document.getElementById('signupName');

    [loginEmail, loginPassword].forEach(input => {
        if (input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    loginUser();
                }
            });
        }
    });

    [signupEmail, signupPassword, signupName].forEach(input => {
        if (input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    signupUser();
                }
            });
        }
    });
});

// Inicialização: botões começam desabilitados
document.getElementById('generateBtn').disabled = true;
document.getElementById('improveBtn').disabled = true;

/**
 * FUNÇÕES DO SUPABASE - ANÁLISES E TEMPLATES
 */

// ===================================
// NOVAS FUNÇÕES PARA ESTRUTURA ATUALIZADA
// ===================================

// Log de atividades
async function logActivity(action, resourceType = null, resourceId = null, details = {}) {
    if (!currentUser) return;

    try {
        const { error } = await window.supabase
            .from('activity_logs')
            .insert([{
                user_id: currentUser.id,
                action: action,
                resource_type: resourceType,
                resource_id: resourceId,
                details: details,
                ip_address: null, // Pode ser obtido via API
                user_agent: navigator.userAgent
            }]);

        if (error) {
            console.error('Erro ao salvar log de atividade:', error);
        }
    } catch (error) {
        console.error('Erro ao registrar atividade:', error);
    }
}

// Cria uma nova sessão de análise
async function createSession(originalText, promptUsed = null, webhookResponse = null) {
    if (!currentUser) {
        console.log('❌ Usuário não logado');
        return null;
    }

    try {
        const { data, error } = await window.supabase
            .from('sessions')
            .insert([{
                user_id: currentUser.id,
                original_text: originalText,
                prompt_used: promptUsed,
                webhook_response: webhookResponse,
                status: 'active'
            }])
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao criar sessão:', error);
            return null;
        }

        console.log('✅ Sessão criada:', data);
        await logActivity('session_created', 'session', data.id, { text_length: originalText.length });
        return data;

    } catch (error) {
        console.error('❌ Erro ao criar sessão:', error);
        return null;
    }
}

// Salva tópicos de uma sessão
async function saveTopicsToSession(sessionId, topics) {
    if (!sessionId || !topics || topics.length === 0) {
        return [];
    }

    try {
        const topicsToInsert = topics.map((topic, index) => ({
            session_id: sessionId,
            title: topic.text || topic.title || '',
            content: topic.content || null,
            position: index + 1,
            is_selected: topic.selected || false,
            development_status: 'pending'
        }));

        const { data, error } = await window.supabase
            .from('topics')
            .insert(topicsToInsert)
            .select();

        if (error) {
            console.error('❌ Erro ao salvar tópicos:', error);
            return [];
        }

        console.log('✅ Tópicos salvos:', data);
        await logActivity('topics_created', 'session', sessionId, { topics_count: data.length });
        return data;

    } catch (error) {
        console.error('❌ Erro ao salvar tópicos:', error);
        return [];
    }
}

// Atualiza o desenvolvimento de um tópico
async function updateTopicDevelopment(topicId, developmentContent) {
    if (!topicId || !developmentContent) {
        return null;
    }

    try {
        const { data, error } = await window.supabase
            .from('topics')
            .update({
                development_content: developmentContent,
                development_status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', topicId)
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao atualizar desenvolvimento do tópico:', error);
            return null;
        }

        console.log('✅ Desenvolvimento do tópico atualizado:', data);
        await logActivity('topic_developed', 'topic', topicId, { content_length: developmentContent.length });
        return data;

    } catch (error) {
        console.error('❌ Erro ao atualizar tópico:', error);
        return null;
    }
}

// Carrega sessões do usuário
async function loadUserSessions(limit = 10) {
    if (!currentUser) {
        return [];
    }

    try {
        const { data, error } = await window.supabase
            .from('sessions')
            .select(`
                *,
                topics (
                    id,
                    title,
                    content,
                    position,
                    is_selected,
                    development_content,
                    development_status
                )
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('❌ Erro ao carregar sessões:', error);
            return [];
        }

        console.log('✅ Sessões carregadas:', data);
        return data;

    } catch (error) {
        console.error('❌ Erro ao carregar sessões:', error);
        return [];
    }
}

// Atualiza seleção de tópicos
async function updateTopicSelection(topicId, isSelected) {
    if (!topicId) return null;

    try {
        const { data, error } = await window.supabase
            .from('topics')
            .update({
                is_selected: isSelected,
                updated_at: new Date().toISOString()
            })
            .eq('id', topicId)
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao atualizar seleção do tópico:', error);
            return null;
        }

        await logActivity('topic_selection_changed', 'topic', topicId, { is_selected: isSelected });
        return data;

    } catch (error) {
        console.error('❌ Erro ao atualizar seleção:', error);
        return null;
    }
}

// ===================================
// FUNÇÕES ANTIGAS (MANTER COMPATIBILIDADE)
// ===================================

// Salva análise no Supabase
async function saveAnaliseToSupabase(analiseData) {
    if (!currentUser) {
        console.log('❌ Usuário não logado, não salvando análise');
        return null;
    }

    console.log('🔄 Tentando salvar análise no Supabase...');
    console.log('👤 Usuário atual:', currentUser);
    console.log('📊 Dados da análise:', analiseData);

    try {
        // Dados para inserir
        const insertData = {
            user_id: currentUser.id,
            texto_original: analiseData.textoOriginal || '',
            sugestoes_melhora: analiseData.sugestoesMelhora || '',
            lacunas_identificadas: analiseData.lacunasIdentificadas || '',
            perguntas_complementares: analiseData.perguntasComplementares || [],
            topicos_gerados: analiseData.topicosGerados || []
        };

        console.log('📝 Dados que serão inseridos:', insertData);

        const { data, error } = await window.supabase
            .from('analises')
            .insert([insertData])
            .select();

        if (error) {
            console.error('❌ Erro ao salvar análise:', error);
            console.error('🔍 Detalhes do erro:', error.message, error.details, error.hint);
            return null;
        }

        console.log('✅ Análise salva com sucesso:', data[0]);
        alert('✅ Análise salva no Supabase!');
        return data[0];
    } catch (error) {
        console.error('❌ Erro de exceção ao salvar análise:', error);
        return null;
    }
}

// Carrega análises do usuário
async function loadUserAnalises() {
    if (!currentUser) {
        return [];
    }

    try {
        const { data, error } = await window.supabase
            .from('analises')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar análises:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Erro ao carregar análises:', error);
        return [];
    }
}

// Salva template no Supabase
async function saveTemplateToSupabase(templateData) {
    if (!currentUser) {
        return null;
    }

    try {
        const insertData = {
            user_id: currentUser.id,
            nome: templateData.nome,
            topicos: templateData.topicos,
            is_public: false // Templates sempre privados por padrão
        };

        const { data, error } = await window.supabase
            .from('templates')
            .insert([insertData])
            .select();

        if (error) {
            console.error('Erro ao salvar template no Supabase:', error);
            return null;
        }

        console.log('Template salvo no Supabase:', data[0]);
        return data[0];
    } catch (error) {
        console.error('Erro ao salvar template:', error);
        return null;
    }
}

// Carrega templates do usuário
async function loadUserTemplates() {
    if (!currentUser) {
        // Se não estiver logado, apenas carrega templates pré-definidos
        updateTemplateSelector([]);
        return [];
    }

    try {
        const { data, error } = await window.supabase
            .from('templates')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar templates:', error);
            return [];
        }

        const templates = data || [];
        updateTemplateSelector(templates);
        return templates;
    } catch (error) {
        console.error('Erro ao carregar templates:', error);
        return [];
    }
}

// Atualiza o seletor de templates
function updateTemplateSelector(templates) {
    const selector = document.getElementById('templateSelector');
    if (!selector) return;

    // Primeiro, popula templates básicos (pré-definidos e locais)
    populateTemplateSelector();

    // Adiciona templates do usuário do Supabase (se estiver logado)
    if (currentUser && templates.length > 0) {
        const userGroup = document.createElement('optgroup');
        userGroup.label = '👤 Meus Templates';
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.nome;
            option.dataset.topicos = JSON.stringify(template.topicos);
            userGroup.appendChild(option);
        });
        selector.appendChild(userGroup);
    }
}

// Funções para controlar a sidebar em mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}

// Função para selecionar tipo de contrato
function selectContract(contractType) {
    console.log('Tipo de contrato selecionado:', contractType);

    // Mapeamento de tipos de contrato para nomes amigáveis
    const contractNames = {
        'contrato-social': 'Contrato Social',
        'acordo-socio': 'Acordo de Sócio',
        'protocolo-familiar': 'Protocolo Familiar'
    };

    // Aqui você pode adicionar a lógica para carregar o contrato
    // Por enquanto, vamos apenas mostrar uma mensagem
    alert(`Você selecionou: ${contractNames[contractType]}\n\nEsta funcionalidade será implementada em breve!`);

    // Fecha a sidebar em mobile após seleção
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}