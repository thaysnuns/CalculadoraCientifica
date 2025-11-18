// -------------------------------
// script.js — Calculadora Sábia
// -------------------------------

/* ELEMENTOS */
const display = document.getElementById("display");
const painelCientifica = document.querySelector(".cientifica");
const botaoPullout = document.querySelector(".pullout");

const btnRad = document.getElementById("btnRad");
const btnDeg = document.getElementById("btnDeg");

/* Modo angular */
let modo = "deg"; // 'deg' ou 'rad'

/* MOSTRAR / ESCONDER CIENTÍFICA */
if (botaoPullout) {
  botaoPullout.addEventListener("click", (e) => {
    e.stopPropagation();
    painelCientifica.classList.toggle("mostrar");
  });
}

/* DESTACAR BOTÕES RAD / DEG */
function atualizarBotoesModo() {
  if (btnRad) btnRad.classList.toggle("ativo", modo === "rad");
  if (btnDeg) btnDeg.classList.toggle("ativo", modo === "deg");
}
atualizarBotoesModo();

/* LÓGICA DE CLIQUES (ignora o botão pullout) */
const botoes = document.querySelectorAll("button:not(.pullout)");
botoes.forEach((botao) => {
  botao.addEventListener("click", () => {
    const v = botao.textContent.trim();

    // Ações principais
    if (v === "=") return calcular();
    if (v === "C") return (display.value = "");
    if (v === "Del") return (display.value = display.value.slice(0, -1));

    // Funções / tokens especiais que inserem texto específico
    if (v === "1/x") {
      display.value += "inv(";
      return;
    }
    if (v === "π") {
      display.value += "π";
      return;
    }
    if (v === "e") {
      display.value += "e";
      return;
    }
    if (v === "!") {
      display.value += "!";
      return;
    }
    if (v === "%") {
      display.value += "%";
      return;
    }
    if (v === "^") {
      display.value += "^";
      return;
    }

    // Rad / Deg
    if (v === "Rad") {
      modo = "rad";
      atualizarBotoesModo();
      recalcularInstantaneo();
      return;
    }
    if (v === "Deg") {
      modo = "deg";
      atualizarBotoesModo();
      recalcularInstantaneo();
      return;
    }

    // funções textuais (sen, cos, tg, ln, log, exp, raiz, cotg, sec, cossec)
    // adiciona o texto da própria tecla, deixando o usuário escrever parênteses manualmente se quiser
    display.value += v;
  });
});

/* recalcular automático ao trocar modo */
function recalcularInstantaneo() {
  if (!display.value.trim()) return;
  try { calcular(); } catch { /* ignora */ }
}

/* FUNÇÃO CENTRAL: calcular */
function calcular() {
  const expr = display.value;
  const tokens = tokenizar(expr);
  const arvore = parse(tokens);
  const resultado = avaliar(arvore);
  display.value = formatarResultado(resultado);
}

/* ------------------ TOKENIZADOR ------------------ */
function tokenizar(expressao) {
  let tokens = [];
  let numero = "";
  let palavra = "";

  for (let ch of expressao) {
    // dígitos / ponto
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      if (palavra) {
        tokens.push(palavra);
        palavra = "";
      }
      numero += ch;
      continue;
    }

    // letras e π e símbolos de palavra
    if (/[a-zA-Zπ]/.test(ch)) {
      if (numero) {
        tokens.push(numero);
        numero = "";
      }
      if (ch === "π") {
        tokens.push("pi");
      } else {
        palavra += ch;
      }
      continue;
    }

    // operador ou símbolo
    if (numero) {
      tokens.push(numero);
      numero = "";
    }
    if (palavra) {
      tokens.push(palavra);
      palavra = "";
    }
    // ignora espaços
    if (ch.trim() === "") continue;
    tokens.push(ch);
  }

  if (numero) tokens.push(numero);
  if (palavra) tokens.push(palavra);

  return tokens;
}

/* ------------------ PARSER ------------------ */
function parse(tokens) {
  let i = 0;
  const tokenAtual = () => tokens[i];

  function parseExpressao() {
    let node = parseTermo();
    while (tokenAtual() === "+" || tokenAtual() === "-") {
      const op = tokenAtual(); i++;
      const right = parseTermo();
      node = { tipo: "binario", op, left: node, right };
    }
    return node;
  }

  function parseTermo() {
    let node = parseExpoente();
    while (tokenAtual() === "*" || tokenAtual() === "/") {
      const op = tokenAtual(); i++;
      const right = parseExpoente();
      node = { tipo: "binario", op, left: node, right };
    }
    return node;
  }

  function parseExpoente() {
    let node = parsePosfix();
    while (tokenAtual() === "^") {
      const op = tokenAtual(); i++;
      const right = parsePosfix();
      node = { tipo: "binario", op, left: node, right };
    }
    return node;
  }

  // pós-fixos: ! e % (suportamos % como pós-fixo)
  function parsePosfix() {
    let node = parseFator();
    while (tokenAtual() === "!" || tokenAtual() === "%") {
      const t = tokenAtual(); i++;
      if (t === "!") node = { tipo: "fact", arg: node }; // fatorial
      else if (t === "%") node = { tipo: "percent", left: node }; // porcentagem (postfix)
    }
    return node;
  }

  function parseFator() {
    const tok = tokenAtual();
    if (tok === undefined) throw "Token inesperado: fim";

    // número
    if (!isNaN(tok)) {
      i++;
      return { tipo: "numero", valor: parseFloat(tok) };
    }

    // parênteses
    if (tok === "(") {
      i++;
      const node = parseExpressao();
      if (tokenAtual() !== ")") throw "Parêntese faltando";
      i++;
      return node;
    }

    // palavra (função ou constante)
    if (/^[a-zA-Z]+$/.test(tok) || tok === "pi") {
      const nome = tok.toLowerCase();
      i++;

      // constantes simples
      if (nome === "pi") return { tipo: "numero", valor: Math.PI };
      if (nome === "e" || nome === "econst") return { tipo: "numero", valor: Math.E };

      // função com parênteses: sen( ... )
      if (tokenAtual() === "(") {
        i++; // pula "("
        const arg = parseExpressao();
        if (tokenAtual() !== ")") throw "Parêntese faltando";
        i++; // pula ")"
        return { tipo: "funcao", nome, arg };
      }

      // função sem parênteses: sen30 (argumento é outro fator)
      const arg = parseFator();
      return { tipo: "funcao", nome, arg };
    }

    throw "Token inesperado: " + tok;
  }

  const arvore = parseExpressao();
  return arvore;
}

/* ------------------ AVALIADOR ------------------ */
function avaliar(node) {
  if (!node || !node.tipo) throw "Node inválido";

  if (node.tipo === "numero") return node.valor;

  if (node.tipo === "fact") {
    const v = avaliar(node.arg);
    return fatorial(v);
  }

  if (node.tipo === "percent") {
    // percent sozinho vira decimal (10% -> 0.1)
    const leftVal = avaliar(node.left);
    return leftVal / 100;
  }

  if (node.tipo === "binario") {
    const e = avaliar(node.left);
    const rightNode = node.right;

    // se o right for porcentagem (postfix), usamos MODELO B
    if (rightNode && rightNode.tipo === "percent") {
      const percBase = avaliar(rightNode.left); // ex: 10 -> 10%
      const frac = percBase / 100;

      switch (node.op) {
        case "+": return e + e * frac;
        case "-": return e - e * frac;
        case "*": return e * frac;
        case "/": return e / frac;
        case "^": return Math.pow(e, frac);
      }
    } else {
      const d = avaliar(rightNode);
      switch (node.op) {
        case "+": return e + d;
        case "-": return e - d;
        case "*": return e * d;
        case "/": return e / d;
        case "^": return Math.pow(e, d);
      }
    }
  }

  if (node.tipo === "funcao") {
    const argVal = avaliar(node.arg);

    function toRad(v) { return modo === "deg" ? v * Math.PI / 180 : v; }
    // sempre ajustar precisão nos trig e resultados sensíveis
    switch (node.nome) {
      case "sen": return ajustarPrecisao(Math.sin(toRad(argVal)));
      case "cos": return ajustarPrecisao(Math.cos(toRad(argVal)));
      case "tg": return ajustarPrecisao(Math.tan(toRad(argVal)));

      case "cotg": return ajustarPrecisao(1 / Math.tan(toRad(argVal)));
      case "sec": return ajustarPrecisao(1 / Math.cos(toRad(argVal)));
      case "cossec": return ajustarPrecisao(1 / Math.sin(toRad(argVal)));

      case "log": return ajustarPrecisao(Math.log10(argVal));
      case "ln": return ajustarPrecisao(Math.log(argVal));
      case "exp": return ajustarPrecisao(Math.exp(argVal));

      case "raiz": return ajustarPrecisao(Math.sqrt(argVal));
      case "inv": return ajustarPrecisao(1 / argVal);

      default: throw "Função desconhecida: " + node.nome;
    }
  }

  throw "Erro no avaliador";
}

/* ------------------ FATORIAL ------------------ */
function fatorial(n) {
  n = Math.floor(n);
  if (n < 0) return NaN;
  if (n === 0) return 1;
  let r = 1;
  for (let i = 1; i <= n; i++) r *= i;
  return r;
}

/* ------------------ FORMATAÇÃO / PRECISÃO ------------------ */
function ajustarPrecisao(v) {
  if (!isFinite(v)) return v;
  if (Math.abs(v) < 1e-12) return 0;
  if (Object.is(v, -0)) return 0;
  return v;
}

function formatarResultado(v) {
  if (typeof v !== "number" || isNaN(v) || !isFinite(v)) return String(v);

  if (Number.isInteger(v)) return String(v);

  const sig = 12;
  if (Math.abs(v) >= 1e9 || Math.abs(v) < 1e-6) {
    return Number(v).toExponential(10);
  }

  let s = Number(v).toPrecision(sig);
  if (s.indexOf(".") !== -1) s = s.replace(/(?:\.0+|(\.\d+?)0+)$/, "$1");
  return s;
}

/* fim do arquivo */
