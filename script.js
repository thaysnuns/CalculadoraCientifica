// ------------------------------------------------------
// ELEMENTOS
// ------------------------------------------------------
const display = document.getElementById('display');
const painelCientifica = document.querySelector('.cientifica');
const botaoCientifica = document.querySelector('.pullout');

// modo de ângulo
let modo = "deg"; // deg | rad

// ------------------------------------------------------
// MOSTRAR / ESCONDER CIENTÍFICA
// ------------------------------------------------------
botaoCientifica.addEventListener("click", (e) => {
    e.stopPropagation();
    painelCientifica.classList.toggle("mostrar");
});

// ------------------------------------------------------
// BOTÕES NORMAIS (IGNORA O BOTÃO pullout)
// ------------------------------------------------------
const botoes = document.querySelectorAll('button:not(.pullout)');
botoes.forEach(botao => {
    botao.addEventListener("click", () => {
        const valor = botao.textContent;

        if (valor === "=") {
            try {
                let tokens = tokenizar(display.value);
                let resultado = parse(tokens);
                display.value = resultado;
            } catch (err) {
                display.value = "Erro";
            }
            return;
        }

        if (valor === "C") {
            display.value = "";
            return;
        }

        if (valor === "Del") {
            display.value = display.value.slice(0, -1);
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

        if (valor === "Rad") {
            modo = "rad";
            return;
        }

        if (valor === "Deg") {
            modo = "deg";
            return;
        }

        display.value += valor;
    });
});


// ------------------------------------------------------
// TOKENIZADOR
// ------------------------------------------------------
function tokenizar(expressao) {
    let tokens = [];
    let numero = "";
    let funcao = "";

    for (let char of expressao) {

        if (!isNaN(char) || char === ".") {
            if (funcao !== "") {
                tokens.push(funcao);
                funcao = "";
            }
            numero += char;
        }

        else if (char.match(/[a-zA-Z]/)) {
            if (numero !== "") {
                tokens.push(numero);
                numero = "";
            }
            funcao += char;
        }

        else {
            if (numero !== "") {
                tokens.push(numero);
                numero = "";
            }
            if (funcao !== "") {
                tokens.push(funcao);
                funcao = "";
            }

            tokens.push(char); // inclui %, +, -, *, /, etc.
        }
    }

    if (numero !== "") tokens.push(numero);
    if (funcao !== "") tokens.push(funcao);

    return tokens;
}


// ------------------------------------------------------
// PARSER
// ------------------------------------------------------
function parse(tokens) {
    let i = 0;

    function parseExpressao() {
        let node = parseTermo();

        while (tokens[i] === "+" || tokens[i] === "-") {
            let op = tokens[i++];
            let right = parseTermo();
            node = { tipo: "binario", op, left: node, right };
        }

        return node;
    }

    function parseTermo() {
        let node = parsePercentual();

        while (tokens[i] === "*" || tokens[i] === "/" || tokens[i] === "^") {
            let op = tokens[i++];
            let right = parsePercentual();
            node = { tipo: "binario", op, left: node, right };
        }

        return node;
    }

    // 👇 NOVA CAMADA PARA %
    function parsePercentual() {
        let node = parseFator();

        while (tokens[i] === "%") {
            i++;
            node = { tipo: "percent", left: node };
        }

        return node;
    }

    function parseFator() {
        let token = tokens[i];

        if (!isNaN(token)) {
            i++;
            return { tipo: "numero", valor: parseFloat(token) };
        }

        if (token === "(") {
            i++;
            let node = parseExpressao();
            i++;
            return node;
        }

        if (token.match(/[a-zA-Z]+/)) {
            let nome = token.toLowerCase();
            i++;

            if (tokens[i] === "(") {
                i++;
                let arg = parseExpressao();
                i++;
                return { tipo: "funcao", nome, arg };
            }

            let arg = parseFator();
            return { tipo: "funcao", nome, arg };
        }

        throw "Token inesperado: " + token;
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
        let e = avaliar(node.left);
        let d = avaliar(node.right);

        switch (node.op) {
            case "+": return e + d;
            case "-": return e - d;
            case "*": return e * d;
            case "/": return e / d;
            case "^": return Math.pow(e, d);
        }
    }

    // 👇 MODELO B DE PORCENTAGEM
    if (node.tipo === "percent") {
        let base = avaliar(node.left);
        return base / 100;
    }

    if (node.tipo === "funcao") {
        let x = avaliar(node.arg);

        function toRad(v) {
            return modo === "deg" ? v * Math.PI / 180 : v;
        }

        switch (node.nome) {
            case "sen": return Math.sin(toRad(x));
            case "cos": return Math.cos(toRad(x));
            case "tg": return Math.tan(toRad(x));

            case "cotg": return 1 / Math.tan(toRad(x));
            case "sec": return 1 / Math.cos(toRad(x));
            case "cossec": return 1 / Math.sin(toRad(x));

            case "log": return Math.log10(x);
            case "ln": return Math.log(x);
            case "exp": return Math.exp(x);

            case "raiz": return Math.sqrt(x);
            case "inv": return 1 / x;

            case "fat": return fatorial(x);

            case "pi": return Math.PI;
            case "econst": return Math.E;

            default:
                throw "Função desconhecida: " + node.nome;
        }
    }

    throw "Erro no avaliador";
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
