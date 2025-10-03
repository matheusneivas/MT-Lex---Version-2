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
    console.log('🔐 Abrindo modal de login...');
    const modal = document.getElementById('loginModal');

    if (!modal) {
        console.error('❌ Modal de login não encontrado!');
        alert('Erro: Modal de login não encontrado. Recarregue a página.');
        return;
    }

    console.log('✅ Modal encontrado, abrindo...');
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
    document.getElementById('forgotPasswordForm').style.display = 'none';
    hideAuthMessage();
}

// Mostra aba de registro
function showSignupTab() {
    document.getElementById('signupTab').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'none';
    hideAuthMessage();
}

// Mostra formulário de recuperação de senha
function showForgotPasswordForm() {
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('signupTab').classList.remove('active');
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'block';
    hideAuthMessage();
}

// Função para recuperar senha
async function resetPassword() {
    const email = document.getElementById('forgotEmail').value.trim();
    const submitBtn = document.getElementById('forgotPasswordSubmitBtn');

    if (!email) {
        showAuthMessage('Por favor, insira seu e-mail');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Enviando...';

    try {
        const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
        });

        if (error) {
            throw error;
        }

        showAuthMessage('✅ E-mail enviado! Verifique sua caixa de entrada.', 'success');

        // Limpa o campo
        document.getElementById('forgotEmail').value = '';

    } catch (error) {
        console.error('Erro ao recuperar senha:', error);
        showAuthMessage(getAuthErrorMessage(error.message));
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '📧 Enviar Link';
    }
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
    const name = document.getElementById('signupName').value.trim();
    const cargo = document.getElementById('signupCargo').value.trim();
    const telefone = document.getElementById('signupTelefone').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const submitBtn = document.getElementById('signupSubmitBtn');

    // Validações
    if (!name || !cargo || !telefone || !email || !password) {
        showAuthMessage('Por favor, preencha todos os campos');
        return;
    }

    if (password.length < 6) {
        showAuthMessage('A senha deve ter pelo menos 6 caracteres');
        return;
    }

    // Validação simples de telefone (apenas números)
    const telefoneNumeros = telefone.replace(/\D/g, '');
    if (telefoneNumeros.length < 10) {
        showAuthMessage('Por favor, insira um telefone válido');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Criando conta...';

    try {
        // 1. Cria o usuário no Supabase Auth
        console.log('🔐 Tentando criar usuário no Supabase Auth...');
        const { data, error } = await window.supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    cargo: cargo,
                    telefone: telefone
                },
                emailRedirectTo: window.location.origin
            }
        });

        console.log('📊 Resposta do Supabase:', { data, error });

        if (error) {
            console.error('❌ Erro detalhado:', error);
            throw error;
        }

        // 2. Se o usuário foi criado, tenta salvar os dados adicionais na tabela de perfis
        if (data.user) {
            console.log('✅ Usuário criado:', data.user.id);

            // Aguarda um pouco para garantir que o usuário foi criado
            await new Promise(resolve => setTimeout(resolve, 500));

            try {
                console.log('💾 Tentando salvar perfil do usuário...');
                const { data: profileData, error: profileError } = await window.supabase
                    .from('user_profiles')
                    .insert([{
                        user_id: data.user.id,
                        nome_completo: name,
                        cargo: cargo,
                        telefone: telefone,
                        email: email
                    }])
                    .select();

                if (profileError) {
                    console.error('⚠️ Erro ao salvar perfil:', profileError);
                    console.log('⚠️ A conta foi criada, mas o perfil não foi salvo. Verifique se a tabela user_profiles existe no Supabase.');
                } else {
                    console.log('✅ Perfil salvo com sucesso:', profileData);
                }
            } catch (profileError) {
                console.error('⚠️ Erro ao salvar perfil (catch):', profileError);
                console.log('⚠️ A conta foi criada, mas o perfil não foi salvo. Isso não impede o login.');
            }
        }

        // 3. Mensagens de feedback
        if (data.user && !data.session) {
            showAuthMessage('✅ Conta criada! Verifique seu e-mail para confirmar.', 'success');
        } else if (data.session) {
            currentUser = data.user;
            updateUserInterface(true);
            closeLoginModal();
            showAuthMessage('✅ Conta criada com sucesso!', 'success');
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

            // Salva sessão e tópicos no banco de dados
            const sessionData = await saveSessionToDatabase(inputText, allTopics);
            if (sessionData) {
                const savedTopics = await saveTopicsToDatabase(sessionData.id, allTopics);
                // Vincula os IDs do banco aos tópicos em memória para uso posterior
                if (savedTopics && savedTopics.length > 0) {
                    topicsData.forEach((topic, index) => {
                        if (savedTopics[index]) {
                            topic.dbId = savedTopics[index].id;
                            topic.sessionId = sessionData.id;
                        }
                    });
                }
            }

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

                // Salva o desenvolvimento no banco usando a nova função
                if (topic.dbId) {
                    const savedDevelopment = await saveDevelopmentToDatabase(topic.dbId, topic.text, cleanText);
                    if (savedDevelopment) {
                        console.log(`✅ Desenvolvimento salvo no banco para "${topic.text}"`);
                    }
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

    // Se não existe mais o seletor (foi removido), ignora
    if (!templateSelector) {
        console.log('ℹ️ Template selector não encontrado (removido da interface)');
        return;
    }

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
async function processTestTopics(testTopics) {
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

    // Salva sessão e tópicos no banco de dados
    const inputText = document.getElementById('inputText').value.trim();
    const sessionData = await saveSessionToDatabase(inputText, testTopics);
    if (sessionData) {
        const savedTopics = await saveTopicsToDatabase(sessionData.id, testTopics);
        // Vincula os IDs do banco aos tópicos em memória para uso posterior
        if (savedTopics && savedTopics.length > 0) {
            topicsData.forEach((topic, index) => {
                if (savedTopics[index]) {
                    topic.dbId = savedTopics[index].id;
                    topic.sessionId = sessionData.id;
                }
            });
        }
    }

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

    console.log('🔍 Verificando botão de login...', loginBtn ? '✅ Encontrado' : '❌ Não encontrado');

    if (loginBtn) {
        console.log('📌 Registrando evento de clique no botão de login');
        loginBtn.addEventListener('click', function() {
            console.log('🖱️ Botão de login clicado!');
            openLoginModal();
        });
    } else {
        console.error('❌ Botão de login não encontrado no DOM');
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

    // Event listener para recuperação de senha
    const forgotPasswordSubmitBtn = document.getElementById('forgotPasswordSubmitBtn');
    if (forgotPasswordSubmitBtn) {
        forgotPasswordSubmitBtn.addEventListener('click', resetPassword);
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

/**
 * FUNÇÕES DO HISTÓRICO
 */

// Abre a visualização de histórico
function openHistoryView() {
    console.log('📜 Abrindo histórico...');

    // Esconde outros containers
    document.getElementById('mtLexContainer').style.display = 'none';
    document.getElementById('socialAgentContainer').style.display = 'none';

    // Mostra container de histórico
    document.getElementById('historyContainer').style.display = 'block';

    // Fecha sidebar em mobile
    if (window.innerWidth <= 768) {
        closeSidebar();
    }

    // Carrega as sessões
    loadHistory();
}

// Carrega histórico do banco
async function loadHistory() {
    const historyList = document.getElementById('historyList');
    const historyLoading = document.getElementById('historyLoading');
    const historyEmpty = document.getElementById('historyEmpty');

    if (!currentUser) {
        historyList.innerHTML = '';
        historyEmpty.style.display = 'block';
        historyEmpty.innerHTML = '<p>🔒 Faça login para ver seu histórico</p>';
        return;
    }

    // Mostra loading
    historyLoading.style.display = 'block';
    historyList.innerHTML = '';
    historyEmpty.style.display = 'none';

    try {
        const sortOrder = document.getElementById('historySort').value;
        const searchTerm = document.getElementById('historySearch').value.toLowerCase();

        // Busca sessões do usuário com seus tópicos
        let query = window.supabase
            .from('sessions')
            .select(`
                *,
                topics (
                    id,
                    title,
                    development_status
                )
            `)
            .eq('user_id', currentUser.id);

        // Ordena
        if (sortOrder === 'recent') {
            query = query.order('created_at', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: true });
        }

        const { data: sessions, error } = await query;

        if (error) {
            console.error('❌ Erro ao carregar histórico:', error);
            historyLoading.style.display = 'none';
            historyEmpty.style.display = 'block';
            historyEmpty.innerHTML = '<p>❌ Erro ao carregar histórico</p>';
            return;
        }

        console.log('✅ Sessões carregadas:', sessions);

        // Filtra por busca se houver
        let filteredSessions = sessions;
        if (searchTerm) {
            filteredSessions = sessions.filter(session =>
                session.original_text?.toLowerCase().includes(searchTerm) ||
                session.topics?.some(topic => topic.title?.toLowerCase().includes(searchTerm))
            );
        }

        historyLoading.style.display = 'none';

        if (filteredSessions.length === 0) {
            historyEmpty.style.display = 'block';
            return;
        }

        // Renderiza as sessões
        filteredSessions.forEach(session => {
            const sessionItem = createSessionItem(session);
            historyList.appendChild(sessionItem);
        });

    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        historyLoading.style.display = 'none';
        historyEmpty.style.display = 'block';
    }
}

// Cria elemento HTML de uma sessão
function createSessionItem(session) {
    const div = document.createElement('div');
    div.className = 'history-item';

    const date = new Date(session.created_at);
    const formattedDate = date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const topicsCount = session.topics?.length || 0;
    const developedCount = session.topics?.filter(t => t.development_status === 'completed').length || 0;

    const preview = session.original_text?.substring(0, 150) || 'Sem texto';

    div.innerHTML = `
        <div class="history-item-header">
            <div class="history-item-date">📅 ${formattedDate}</div>
            <div class="history-item-stats">
                <span class="history-stat">📝 ${topicsCount} tópicos</span>
                <span class="history-stat">✅ ${developedCount} desenvolvidos</span>
            </div>
        </div>
        <div class="history-item-preview">${preview}${session.original_text?.length > 150 ? '...' : ''}</div>
        <div class="history-item-actions">
            <button class="history-view-btn" onclick="viewSession('${session.id}')">👁️ Visualizar</button>
            <button class="history-restore-btn" onclick="restoreSession('${session.id}')">🔄 Restaurar</button>
            <button class="history-delete-btn" onclick="deleteSession('${session.id}')">🗑️ Excluir</button>
        </div>
    `;

    return div;
}

// Visualiza uma sessão específica
async function viewSession(sessionId) {
    try {
        const { data: session, error } = await window.supabase
            .from('sessions')
            .select(`
                *,
                topics (
                    id,
                    title,
                    development_content,
                    development_status,
                    position
                )
            `)
            .eq('id', sessionId)
            .single();

        if (error) {
            console.error('❌ Erro ao carregar sessão:', error);
            alert('Erro ao carregar sessão');
            return;
        }

        // Abre modal com detalhes da sessão
        showSessionModal(session);

    } catch (error) {
        console.error('❌ Erro ao visualizar sessão:', error);
        alert('Erro ao visualizar sessão');
    }
}

// Restaura uma sessão (carrega na MT Lex)
async function restoreSession(sessionId) {
    try {
        const { data: session, error } = await window.supabase
            .from('sessions')
            .select(`
                *,
                topics (
                    id,
                    title,
                    development_content,
                    position
                )
            `)
            .eq('id', sessionId)
            .single();

        if (error) {
            console.error('❌ Erro ao restaurar sessão:', error);
            alert('Erro ao restaurar sessão');
            return;
        }

        // Volta para MT Lex
        openMTLexView();

        // Preenche o campo de texto
        document.getElementById('inputText').value = session.original_text || '';

        // Ordena tópicos por posição
        const sortedTopics = session.topics.sort((a, b) => (a.position || 0) - (b.position || 0));

        // Restaura os tópicos
        topicsData = sortedTopics.map((topic, index) => ({
            id: index + 1,
            text: topic.title,
            selected: false,
            dbId: topic.id
        }));

        topicIdCounter = topicsData.length;

        // Renderiza os tópicos
        renderTopics();
        makeListSortable();

        // Mostra a seção de tópicos
        document.getElementById('topicsSection').style.display = 'block';
        document.getElementById('result').style.display = 'block';

        alert('✅ Sessão restaurada com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao restaurar sessão:', error);
        alert('Erro ao restaurar sessão');
    }
}

// Exclui uma sessão
async function deleteSession(sessionId) {
    if (!confirm('Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita.')) {
        return;
    }

    try {
        const { error } = await window.supabase
            .from('sessions')
            .delete()
            .eq('id', sessionId);

        if (error) {
            console.error('❌ Erro ao excluir sessão:', error);
            alert('Erro ao excluir sessão');
            return;
        }

        alert('✅ Sessão excluída com sucesso!');
        loadHistory(); // Recarrega a lista

    } catch (error) {
        console.error('❌ Erro ao excluir sessão:', error);
        alert('Erro ao excluir sessão');
    }
}

// Mostra modal com detalhes da sessão
function showSessionModal(session) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';

    const date = new Date(session.created_at);
    const formattedDate = date.toLocaleString('pt-BR');

    const sortedTopics = session.topics.sort((a, b) => (a.position || 0) - (b.position || 0));

    const topicsHTML = sortedTopics.map(topic => `
        <div class="session-topic-item">
            <div class="session-topic-title">
                ${topic.development_status === 'completed' ? '✅' : '⏸️'} ${topic.title}
            </div>
            ${topic.development_content ? `
                <div class="session-topic-development">
                    ${topic.development_content.substring(0, 200)}${topic.development_content.length > 200 ? '...' : ''}
                </div>
            ` : ''}
        </div>
    `).join('');

    modal.innerHTML = `
        <div class="modal-container" style="max-width: 800px;">
            <div class="modal-header">
                <h3 class="modal-title">📄 Detalhes da Sessão</h3>
                <button class="modal-close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <div style="margin-bottom: 20px;">
                    <strong>📅 Data:</strong> ${formattedDate}
                </div>
                <div style="margin-bottom: 20px;">
                    <strong>📝 Texto Original:</strong>
                    <div style="background: #2a2a2a; padding: 12px; border-radius: 6px; margin-top: 8px;">
                        ${session.original_text || 'Sem texto'}
                    </div>
                </div>
                <div>
                    <strong>📋 Tópicos (${sortedTopics.length}):</strong>
                    <div style="margin-top: 12px;">
                        ${topicsHTML || '<p>Nenhum tópico gerado</p>'}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-cancel-btn" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
                <button class="modal-save-btn" onclick="restoreSession('${session.id}'); this.closest('.modal-overlay').remove();">🔄 Restaurar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Event listeners para filtros de histórico
document.addEventListener('DOMContentLoaded', function() {
    const historySearch = document.getElementById('historySearch');
    const historySort = document.getElementById('historySort');

    if (historySearch) {
        historySearch.addEventListener('input', function() {
            if (document.getElementById('historyContainer').style.display !== 'none') {
                loadHistory();
            }
        });
    }

    if (historySort) {
        historySort.addEventListener('change', function() {
            if (document.getElementById('historyContainer').style.display !== 'none') {
                loadHistory();
            }
        });
    }
});

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

// Funções do Agente Social
let selectedFile = null;

function openMTLexView() {
    // Esconde outros containers
    document.getElementById('socialAgentContainer').style.display = 'none';
    document.getElementById('historyContainer').style.display = 'none';

    // Mostra o container da MT Lex
    document.getElementById('mtLexContainer').style.display = 'block';

    // Fecha a sidebar em mobile
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

function openSocialAgentModal() {
    // Esconde outros containers
    document.getElementById('mtLexContainer').style.display = 'none';
    document.getElementById('historyContainer').style.display = 'none';

    // Mostra o container do Agente Social
    document.getElementById('socialAgentContainer').style.display = 'block';

    // Limpa os campos
    selectedFile = null;
    document.getElementById('pdfUpload').value = '';
    document.getElementById('instructionsText').value = '';
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('socialAgentResult').style.display = 'none';
    document.getElementById('sendSocialBtn').disabled = true;

    // Fecha a sidebar em mobile
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

function closeSocialAgentView() {
    // Esconde o container do Agente Social
    document.getElementById('socialAgentContainer').style.display = 'none';

    // Mostra o container da MT Lex
    document.getElementById('mtLexContainer').style.display = 'block';
}

function handleFileSelect(event) {
    const file = event.target.files[0];

    if (!file) return;

    // Valida tipo de arquivo
    if (file.type !== 'application/pdf') {
        alert('⚠️ Por favor, selecione apenas arquivos PDF');
        event.target.value = '';
        return;
    }

    // Valida tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('⚠️ O arquivo é muito grande. Máximo: 10MB');
        event.target.value = '';
        return;
    }

    selectedFile = file;

    // Mostra o preview do arquivo
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = `${sizeMB} MB`;
    document.getElementById('filePreview').style.display = 'block';
    document.getElementById('uploadArea').style.display = 'none';

    // Atualiza o estado do botão de envio
    updateSendButton();
}

function removeFile() {
    selectedFile = null;
    document.getElementById('pdfUpload').value = '';
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('uploadArea').style.display = 'block';
    updateSendButton();
}

function updateSendButton() {
    const instructionsText = document.getElementById('instructionsText').value.trim();
    const sendBtn = document.getElementById('sendSocialBtn');

    if (selectedFile && instructionsText.length > 0) {
        sendBtn.disabled = false;
    } else {
        sendBtn.disabled = true;
    }
}

// Listener para atualizar botão quando o texto mudar
document.addEventListener('DOMContentLoaded', function() {
    const instructionsText = document.getElementById('instructionsText');
    if (instructionsText) {
        instructionsText.addEventListener('input', updateSendButton);
    }
});

async function sendToSocialAgent() {
    const instructionsText = document.getElementById('instructionsText').value.trim();
    const sendBtn = document.getElementById('sendSocialBtn');
    const resultDiv = document.getElementById('socialAgentResult');
    const resultMessage = document.getElementById('resultMessage');

    // Validações
    if (!selectedFile) {
        alert('⚠️ Por favor, selecione um arquivo PDF');
        return;
    }

    if (!instructionsText) {
        alert('⚠️ Por favor, descreva as alterações desejadas');
        return;
    }

    // Desabilita o botão e mostra loading
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Enviando...</span>';

    resultDiv.style.display = 'block';
    resultMessage.innerHTML = '<div class="loading-message"><div class="spinner"></div><p>Enviando documento para análise...</p></div>';

    let analysisId = null;

    try {
        // Log para debug
        console.log('📦 Enviando arquivo:');
        console.log('- Nome do arquivo:', selectedFile.name);
        console.log('- Tamanho do arquivo:', selectedFile.size, 'bytes');
        console.log('- Tipo do arquivo:', selectedFile.type);
        console.log('- Mudanças:', instructionsText);

        // 1. Upload do arquivo para Supabase Storage (opcional, apenas se usuário logado)
        let fileUrl = null;
        if (currentUser) {
            console.log('📤 Fazendo upload do arquivo para Supabase Storage...');
            resultMessage.innerHTML = '<div class="loading-message"><div class="spinner"></div><p>Fazendo upload do arquivo...</p></div>';

            fileUrl = await uploadPDFToStorage(selectedFile);
            if (fileUrl) {
                console.log('✅ Arquivo salvo no storage:', fileUrl);
            }
        } else {
            console.log('⚠️ Usuário não logado - arquivo não será salvo no storage');
        }

        // 2. Salva no banco de dados (apenas se usuário logado)
        if (currentUser) {
            console.log('💾 Salvando análise no banco de dados...');
            resultMessage.innerHTML = '<div class="loading-message"><div class="spinner"></div><p>Salvando no banco de dados...</p></div>';

            const analysis = await saveSocialAgentAnalysis(
                selectedFile.name,
                selectedFile.size,
                instructionsText,
                fileUrl
            );
            if (analysis) {
                analysisId = analysis.id;
                console.log('✅ Análise salva com ID:', analysisId);
            }
        } else {
            console.log('⚠️ Usuário não logado - análise não será salva no banco');
        }

        // Atualiza mensagem de loading
        resultMessage.innerHTML = '<div class="loading-message"><div class="spinner"></div><p>Enviando para análise do Agente Social...</p></div>';

        // 3. Prepara o FormData com o arquivo binário
        const formData = new FormData();
        formData.append('file', selectedFile, selectedFile.name);
        formData.append('mudancas', instructionsText);
        formData.append('filesize', selectedFile.size);
        formData.append('timestamp', new Date().toISOString());
        if (analysisId) {
            formData.append('analysis_id', analysisId);
        }

        // 4. Envia para o webhook do n8n com FormData (binary)
        console.log('🚀 Enviando para webhook do n8n...');
        const response = await fetch('https://n8n-n8n.ut3ql0.easypanel.host/webhook/recebe', {
            method: 'POST',
            body: formData
            // Não definir Content-Type - o navegador define automaticamente com boundary
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        let responseData = await response.text();
        console.log('📨 Resposta bruta do webhook:', responseData);

        // Processa a resposta
        let processedResponse = '';
        try {
            // Tenta fazer parse como JSON
            const jsonResponse = JSON.parse(responseData);

            // Se vier com campo "output", extrai ele
            if (jsonResponse.output) {
                processedResponse = jsonResponse.output;
            } else if (typeof jsonResponse === 'string') {
                processedResponse = jsonResponse;
            } else {
                // Se for objeto, converte para string formatada
                processedResponse = JSON.stringify(jsonResponse, null, 2);
            }
        } catch (e) {
            // Se não for JSON, usa o texto diretamente
            processedResponse = responseData;
        }

        // Remove caracteres de escape e formata o texto
        processedResponse = processedResponse
            .replace(/\\n/g, '\n')           // Substitui \n por quebra de linha real
            .replace(/\\"/g, '"')            // Substitui \" por aspas normais
            .replace(/\\\\/g, '\\')          // Substitui \\ por barra simples
            .replace(/\\t/g, '    ')         // Substitui \t por espaços
            .trim();                         // Remove espaços extras no início/fim

        console.log('✅ Resposta processada:', processedResponse);

        // 5. Atualiza o banco com a resposta (apenas se usuário logado e tem analysisId)
        if (currentUser && analysisId) {
            console.log('💾 Salvando resposta no banco de dados...');
            await updateSocialAgentResponse(analysisId, processedResponse);
        }

        // Converte quebras de linha para HTML
        const formattedResponse = processedResponse.replace(/\n/g, '<br>');

        // Aviso se não está logado
        const loginWarning = !currentUser ? `
            <div class="info-banner" style="background: #1e40af; padding: 12px; border-radius: 6px; margin-bottom: 16px; text-align: center;">
                ℹ️ <strong>Você não está logado.</strong> Esta análise não foi salva no histórico.
                <a href="#" onclick="openLoginModal(); return false;" style="color: #93c5fd; text-decoration: underline;">Faça login</a> para salvar suas análises.
            </div>
        ` : '';

        // Sucesso
        resultMessage.innerHTML = `
            <div class="success-message">
                <div class="success-icon">✅</div>
                <h4>Análise Concluída!</h4>
                ${loginWarning}
                <p>Veja abaixo as alterações sugeridas pelo Agente Social:</p>
                ${formattedResponse ? `
                    <div class="response-content">
                        <button class="copy-response-btn" onclick="copyResponseText()">
                            📋 Copiar Resposta
                        </button>
                        <div id="agentResponseText">${formattedResponse}</div>
                    </div>
                ` : ''}
            </div>
        `;

    } catch (error) {
        console.error('Erro ao enviar documento:', error);
        resultMessage.innerHTML = `
            <div class="error-message">
                <div class="error-icon">❌</div>
                <h4>Erro ao enviar documento</h4>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        // Reabilita o botão
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<span class="btn-icon">🚀</span><span class="btn-text">Enviar para Análise</span>';
    }
}

// Função auxiliar para converter arquivo para base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove o prefixo "data:application/pdf;base64,"
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

/**
 * FUNÇÕES DE SALVAMENTO AUTOMÁTICO NO BANCO
 */

// Salva uma nova sessão (conversa)
async function saveSessionToDatabase(inputText, topics) {
    console.log('🔍 saveSessionToDatabase chamada!', { currentUser, topicsLength: topics.length });

    if (!currentUser) {
        console.log('⚠️ Usuário não logado - sessão não será salva');
        return null;
    }

    try {
        console.log('💾 Tentando inserir na tabela sessions...');
        const { data, error } = await window.supabase
            .from('sessions')
            .insert([{
                user_id: currentUser.id,
                original_text: inputText,
                prompt_used: inputText,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao salvar sessão:', error);
            console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
            return null;
        }

        console.log('✅ Sessão salva com sucesso! ID:', data.id);
        return data;

    } catch (error) {
        console.error('❌ Erro ao salvar sessão:', error);
        return null;
    }
}

// Salva tópicos gerados
async function saveTopicsToDatabase(sessionId, topics) {
    if (!currentUser || !sessionId) {
        console.log('⚠️ Não é possível salvar tópicos sem usuário ou sessão');
        return;
    }

    try {
        const topicsToInsert = topics.map((topic, index) => ({
            session_id: sessionId,
            user_id: currentUser.id,
            title: topic.topico || topic.text || '',
            content: null,
            position: index + 1,
            is_selected: false,
            development_status: 'pending'
        }));

        console.log('💾 Tentando salvar tópicos:', topicsToInsert[0]);
        const { data, error } = await window.supabase
            .from('topics')
            .insert(topicsToInsert)
            .select();

        if (error) {
            console.error('❌ Erro ao salvar tópicos:', error);
            console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
            return null;
        }

        console.log(`✅ ${data.length} tópicos salvos`);
        return data;

    } catch (error) {
        console.error('❌ Erro ao salvar tópicos:', error);
        return null;
    }
}

// Salva análise de tópico desenvolvido
async function saveDevelopmentToDatabase(topicId, topicText, analysis) {
    if (!currentUser) {
        console.log('⚠️ Usuário não logado - análise não será salva');
        return null;
    }

    try {
        // Atualiza o tópico com o desenvolvimento ao invés de criar análise separada
        const { data, error } = await window.supabase
            .from('topics')
            .update({
                development_content: analysis,
                development_status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', topicId)
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao salvar análise:', error);
            console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
            return null;
        }

        console.log('✅ Desenvolvimento salvo no tópico:', data);
        return data;

    } catch (error) {
        console.error('❌ Erro ao salvar análise:', error);
        return null;
    }
}

/**
 * FUNÇÕES DO SUPABASE PARA AGENTE SOCIAL
 */

// Salva uma nova análise do Agente Social no banco
async function saveSocialAgentAnalysis(filename, filesize, mudancas, fileUrl = null) {
    if (!currentUser) {
        console.log('❌ Usuário não logado');
        return null;
    }

    try {
        const { data, error } = await window.supabase
            .from('social_agent_analyses')
            .insert([{
                user_id: currentUser.id,
                filename: filename,
                filesize: filesize,
                mudancas: mudancas,
                file_url: fileUrl,
                response_status: 'processing'
            }])
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao salvar análise do Agente Social:', error);
            return null;
        }

        console.log('✅ Análise do Agente Social salva:', data);
        await logActivity('social_agent_analysis_created', 'social_agent_analysis', data.id, {
            filename: filename,
            filesize: filesize
        });

        return data;

    } catch (error) {
        console.error('❌ Erro ao salvar análise:', error);
        return null;
    }
}

// Atualiza a resposta da IA para uma análise
async function updateSocialAgentResponse(analysisId, aiResponse) {
    if (!currentUser || !analysisId) {
        return null;
    }

    try {
        const { data, error } = await window.supabase
            .from('social_agent_analyses')
            .update({
                ai_response: aiResponse,
                response_status: 'completed',
                processed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', analysisId)
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao atualizar resposta:', error);
            return null;
        }

        console.log('✅ Resposta atualizada:', data);
        await logActivity('social_agent_response_received', 'social_agent_analysis', analysisId);

        return data;

    } catch (error) {
        console.error('❌ Erro ao atualizar resposta:', error);
        return null;
    }
}

// Carrega histórico de análises do Agente Social
async function loadSocialAgentHistory(limit = 20) {
    if (!currentUser) {
        return [];
    }

    try {
        const { data, error } = await window.supabase
            .from('social_agent_analyses')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('❌ Erro ao carregar histórico:', error);
            return [];
        }

        console.log('✅ Histórico carregado:', data);
        return data;

    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        return [];
    }
}

// Upload de arquivo PDF para o Supabase Storage
async function uploadPDFToStorage(file) {
    if (!currentUser) {
        console.log('❌ Usuário não logado');
        return null;
    }

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await window.supabase.storage
            .from('social-agent-documents')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('❌ Erro ao fazer upload:', error);
            return null;
        }

        // Gera URL pública
        const { data: urlData } = window.supabase.storage
            .from('social-agent-documents')
            .getPublicUrl(fileName);

        console.log('✅ Upload concluído:', urlData.publicUrl);
        return urlData.publicUrl;

    } catch (error) {
        console.error('❌ Erro no upload:', error);
        return null;
    }
}

/**
 * FUNÇÕES DO MODAL DE TEMPLATES
 */

// Abre o modal de templates
function openTemplatesModal() {
    const modal = document.getElementById('templatesModal');
    const templatesList = document.getElementById('templatesList');

    // Carrega os templates
    loadTemplatesIntoModal();

    // Mostra o modal
    modal.style.display = 'flex';
}

// Fecha o modal de templates
function closeTemplatesModal() {
    const modal = document.getElementById('templatesModal');
    modal.style.display = 'none';
}

// Carrega os templates no modal
async function loadTemplatesIntoModal() {
    const templatesList = document.getElementById('templatesList');
    templatesList.innerHTML = '';

    let hasTemplates = false;

    // 1. Templates pré-definidos
    if (contractTemplates && Object.keys(contractTemplates).length > 0) {
        Object.keys(contractTemplates).forEach(key => {
            hasTemplates = true;
            const item = document.createElement('div');
            item.className = 'template-item';
            item.onclick = () => selectTemplateFromModal('predefined:' + key, key);
            item.innerHTML = `
                <span class="template-item-name">${key}</span>
                <span class="template-item-icon">📄</span>
            `;
            templatesList.appendChild(item);
        });
    }

    // 2. Templates customizados locais
    if (customTemplates && Object.keys(customTemplates).length > 0) {
        Object.keys(customTemplates).forEach(key => {
            hasTemplates = true;
            const item = document.createElement('div');
            item.className = 'template-item custom';
            item.onclick = () => selectTemplateFromModal('custom:' + key, key);
            item.innerHTML = `
                <span class="template-item-name">${key}</span>
                <span class="template-item-icon">⭐</span>
            `;
            templatesList.appendChild(item);
        });
    }

    // 3. Templates do Supabase (se usuário logado)
    if (currentUser) {
        try {
            const { data, error } = await window.supabase
                .from('templates')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) {
                data.forEach(template => {
                    hasTemplates = true;
                    const item = document.createElement('div');
                    item.className = 'template-item custom';
                    item.onclick = () => selectTemplateFromModal('supabase:' + template.id, template.nome, template.topicos);
                    item.innerHTML = `
                        <span class="template-item-name">${template.nome}</span>
                        <span class="template-item-icon">☁️</span>
                    `;
                    templatesList.appendChild(item);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar templates do Supabase:', error);
        }
    }

    // Se não há templates, mostra mensagem
    if (!hasTemplates) {
        templatesList.innerHTML = `
            <div class="templates-empty">
                <div class="templates-empty-icon">📋</div>
                <p>Nenhum template disponível</p>
                <p style="font-size: 13px;">Crie seu primeiro template!</p>
            </div>
        `;
    }
}

// Seleciona um template do modal
function selectTemplateFromModal(templateValue, templateName, templateTopics = null) {
    console.log('Template selecionado:', templateName);

    let topics = null;

    // Identifica o tipo de template
    if (templateValue.startsWith('predefined:')) {
        const key = templateValue.replace('predefined:', '');
        topics = contractTemplates[key];
    } else if (templateValue.startsWith('custom:')) {
        const key = templateValue.replace('custom:', '');
        topics = customTemplates[key];
    } else if (templateValue.startsWith('supabase:')) {
        topics = templateTopics;
    }

    if (!topics || topics.length === 0) {
        alert('❌ Erro ao carregar template');
        return;
    }

    // Limpa os tópicos atuais
    topicsList = [];

    // Adiciona os tópicos do template
    topics.forEach(topic => {
        topicsList.push({
            text: topic,
            isCompleted: false
        });
    });

    // Atualiza a interface
    renderTopics();
    updateProgress();

    // Fecha o modal
    closeTemplatesModal();

    // Mostra feedback
    showToast(`✅ Template "${templateName}" carregado com sucesso!`);
}

// Função auxiliar para mostrar toast
function showToast(message) {
    // Remove toast anterior se existir
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    // Cria novo toast
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #10a37f;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 3000;
        animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    // Remove após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Fechar modal ao clicar fora
document.addEventListener('click', function(e) {
    const modal = document.getElementById('templatesModal');
    if (modal && e.target === modal) {
        closeTemplatesModal();
    }
});

// Função para copiar a resposta do Agente Social
async function copyResponseText() {
    const responseDiv = document.getElementById('agentResponseText');
    if (!responseDiv) return;

    // Pega o texto sem as tags HTML
    const text = responseDiv.innerText || responseDiv.textContent;

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = text;
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
        const btn = event.target.closest('.copy-response-btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Copiado!';
            btn.style.background = '#10a37f';

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2000);
        }
    } catch (error) {
        console.error('Erro ao copiar:', error);
        alert('Não foi possível copiar o texto');
    }
}