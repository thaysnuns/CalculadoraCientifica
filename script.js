const display = document.getElementById('display');
const botoes = document.querySelectorAll('button');


const botaoCientifica = document.querySelector(".pullout");
const painelCientifica = document.querySelector(".cientifica");

botaoCientifica.addEventListener("click", (e) => {
    e.stopPropagation(); 
    painelCientifica.classList.toggle("mostrar");
});



botoes.forEach(botao => {
    botao.addEventListener('click', () => {
        const valor = botao.textContent;

        if (valor === "=") {
            let tokens = tokenizar(display.value);
            let resultado = parse(tokens);
            display.value = resultado;
            return;
        }

        if (valor === "C") {
            display.value = "";
            return;
        }

        if (valor === "1/x") {
            display.value += "inv(";
            return;
        }

        if (valor === "π") {
            display.value += "pi";
            return;
        }

        if (valor === "e") {
            display.value += "econst";
            return;
        }
        if (valor === "Del"){
            display.value = display.value.slice(0, -1);
            return;
        }

        if (valor === "Modo Científico") return;

        display.value += valor;
    });
});


// ------------------------------------------------------
// TOKENIZADOR
// ------------------------------------------------------
function tokenizar(expressao) {
    let tokens = [];
    let numeroAtual = "";
    let funcaoAtual = "";

    for (let char of expressao) {

        if (!isNaN(char) || char === ".") {

            if (funcaoAtual !== "") {
                tokens.push(funcaoAtual);
                funcaoAtual = "";
            }

            numeroAtual += char;
        }

        else if (char.match(/[a-zA-Z]/)) {

            if (numeroAtual !== "") {
                tokens.push(numeroAtual);
                numeroAtual = "";
            }

            funcaoAtual += char;
        }

        else {
            if (numeroAtual !== "") {
                tokens.push(numeroAtual);
                numeroAtual = "";
            }

            if (funcaoAtual !== "") {
                tokens.push(funcaoAtual);
                funcaoAtual = "";
            }

            tokens.push(char);
        }
    }

    if (numeroAtual !== "") tokens.push(numeroAtual);
    if (funcaoAtual !== "") tokens.push(funcaoAtual);

    return tokens;
}


// ------------------------------------------------------
// PARSER COMPLETO
// ------------------------------------------------------

function parse(tokens) {
    let i = 0;

    function parseExpressao() {
        let node = parseTermo();

        while (tokens[i] === "+" || tokens[i] === "-") {
            let operador = tokens[i];
            i++;
            let direito = parseTermo();
            node = { tipo: "binario", operador, esquerdo: node, direito };
        }

        return node;
    }

    function parseTermo() {
        let node = parseFator();

        while (tokens[i] === "*" || tokens[i] === "/") {
            let operador = tokens[i];
            i++;
            let direito = parseFator();
            node = { tipo: "binario", operador, esquerdo: node, direito };
        }

        return node;
    }

    function parseFator() {
        let token = tokens[i];

        // número
        if (!isNaN(token)) {
            i++;
            return { tipo: "numero", valor: parseFloat(token) };
        }

        // parênteses
        if (token === "(") {
            i++;
            let node = parseExpressao();
            i++; // pula ")"
            return node;
        }

        // funções: sen, cos, tan, raiz, log etc
        if (token.match(/[a-zA-Z]+/)) {
            let nomeFuncao = token;
            i++;

            // Função com parênteses → sen(30)
            if (tokens[i] === "(") {
                i++; // "("
                let argumento = parseExpressao();
                i++; // ")"
                return { tipo: "funcao", nome: nomeFuncao, argumento };
            }

            // Função sem parênteses → sen30
            let argumento = parseFator();
            return { tipo: "funcao", nome: nomeFuncao, argumento };
        }

        throw new Error("Token inesperado: " + token);
    }

    let arvore = parseExpressao();
    return avaliar(arvore);
}


// ------------------------------------------------------
// AVALIADOR
// ------------------------------------------------------

function avaliar(node) {

    if (node.tipo === "numero") return node.valor;

    if (node.tipo === "binario") {
        let e = avaliar(node.esquerdo);
        let d = avaliar(node.direito);

        switch (node.operador) {
            case "+": return e + d;
            case "-": return e - d;
            case "*": return e * d;
            case "/": return e / d;
            case "^": return Math.pow(e, d);
        }
    }

    if (node.tipo === "funcao") {
        let arg = avaliar(node.argumento);

        switch (node.nome.toLowerCase()) {

            case "sen": return Math.sin(arg);
            case "cos": return Math.cos(arg);
            case "tg": return Math.tan(arg);

            case "log": return Math.log10(arg);
            case "ln": return Math.log(arg);

            case "raiz": return Math.sqrt(arg);
            case "exp": return Math.exp(arg);

            case "sec": return 1 / Math.cos(arg);
            case "cossec": return 1 / Math.sin(arg);
            case "cotg": return 1 / Math.tan(arg);

            case "rad": return arg * (Math.PI / 180);

            case "inv": return 1 / arg;

            default:
                throw "Função desconhecida: " + node.nome;
        }
    }

    throw "Node inválido";
}


// ------------------------------------------------------
// FATORIAL
// ------------------------------------------------------

function fatorial(n) {
    if (n < 0) return NaN;
    if (n === 0) return 1;
    let r = 1;
    for (let i = 1; i <= n; i++) r *= i;
    return r;
}
