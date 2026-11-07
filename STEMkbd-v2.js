
(function () {
"use strict";

/* ============================================================
   Moodle STEM Keyboard - AST-first editor
   Exposes:
     window.MoodleStemKeyboard
     window.MoodleStemExpression

   2026-11-06: "/" makes a division structure - the term before it is the numerator, the denominator is a slot that
   takes anything (1+2, brackets, roots) until the right arrow (↱) leaves it. Before, "/" was an operator before one
   item (7/1+2 was 7/1 + 2). The value for Moodle has the same form as before (7/3, 7/(1+2), 2*x/3); answers saved
   before open as division structures and give the same value back.
   ============================================================ */

let NEXT_NODE_ID = 1;

function nodeId() {
    let id = NEXT_NODE_ID;
    NEXT_NODE_ID++;
    return id;
}

function makeExpression() {
    return { type: "expression", id: nodeId(), items: [] };
}

function makeNumber(value) {
    return { type: "number", id: nodeId(), value: value || "" };
}

function makeVariable(name) {
    return { type: "variable", id: nodeId(), name: name };
}

function makeConstant(name) {
    return { type: "constant", id: nodeId(), name: name };
}

function makeOperator(op, implicit) {
    return {
        type: "operator",
        id: nodeId(),
        op: op,
        implicit: implicit === true
    };
}

function makeGroup(expr, closed) {
    return {
        type: "group",
        id: nodeId(),
        expr: expr || makeExpression(),
        closed: closed === true
    };
}

function makeFraction() {
    return {
        type: "fraction",
        id: nodeId(),
        numerator: makeNumber(""),
        denominator: makeNumber("")
    };
}

function makeMixedFraction(whole) {
    return {
        type: "mixedFraction",
        id: nodeId(),
        whole: makeNumber(whole || ""),
        numerator: makeNumber(""),
        denominator: makeNumber("")
    };
}

function makeSqrt() {
    return {
        type: "sqrt",
        id: nodeId(),
        radicand: makeExpression()
    };
}

function makePower(base, fixedExponent) {
    return {
        type: "power",
        id: nodeId(),
        base: base,
        exponent:
            fixedExponent !== undefined
                ? makeNumber(String(fixedExponent))
                : makeExpression(),
        fixed: fixedExponent !== undefined
    };
}

function makePower10() {
    return {
        type: "power10",
        id: nodeId(),
        exponent: makeNumber("")
    };
}

function makeSubscript(base) {
    return {
        type: "subscript",
        id: nodeId(),
        base: base,
        index: makeNumber("")
    };
}

/* a / b: numerator and denominator are expressions */
function makeDivide(numerator, denominator) {
    return {
        type: "divide",
        id: nodeId(),
        numerator: numerator || makeExpression(),
        denominator: denominator || makeExpression()
    };
}

function makeEquation() {
    return {
        type: "equation",
        id: nodeId(),
        parts: [makeExpression()]
    };
}

function isDigit(ch) {
    return ch &&
        ch.length === 1 &&
        ch >= "0" &&
        ch <= "9";
}

function isLetter(ch) {
    return ch &&
        ch.length === 1 &&
        (
            (ch >= "A" && ch <= "Z") ||
            (ch >= "a" && ch <= "z")
        );
}

function isAtom(node) {
    if (!node) return false;

    return node.type === "number" ||
        node.type === "variable" ||
        node.type === "constant" ||
        node.type === "group" ||
        node.type === "fraction" ||
        node.type === "mixedFraction" ||
        node.type === "divide" ||
        node.type === "sqrt" ||
        node.type === "power" ||
        node.type === "power10" ||
        node.type === "subscript";
}

/* ============================================================
   VARIABLE DEFINITIONS
   ============================================================ */

function normalizeVariables(variables, variableMode) {
    let result = [];
    let i;
    let item;
    let parts;
    let value;

    if (
        variables &&
        Object.prototype.toString.call(variables) === "[object Array]"
    ) {
        for (i = 0; i < variables.length; i++) {
            item = variables[i];

            if (
                typeof item === "string" &&
                item !== ""
            ) {
                result.push({
                    value: item,
                    label: item
                });
            } else if (
                item &&
                typeof item === "object" &&
                typeof item.value === "string" &&
                item.value !== ""
            ) {
                result.push({
                    value: item.value,
                    label:
                        typeof item.label === "string" &&
                        item.label !== ""
                            ? item.label
                            : item.value
                });
            }
        }

        return result;
    }

    if (
        typeof variables === "string" &&
        variables !== ""
    ) {
        parts = variables.split(",");

        for (i = 0; i < parts.length; i++) {
            value = parts[i];

            while (
                value.length &&
                value.charAt(0) === " "
            ) {
                value = value.substring(1);
            }

            while (
                value.length &&
                value.charAt(value.length - 1) === " "
            ) {
                value = value.substring(0, value.length - 1);
            }

            if (value !== "") {
                result.push({
                    value: value,
                    label: value
                });
            }
        }

        return result;
    }

    if (variableMode === "xyz") {
        return [
            { value: "x", label: "x" },
            { value: "y", label: "y" },
            { value: "z", label: "z" }
        ];
    }

    if (variableMode === "A-Z") {
        return [];
    }

    return [
        { value: "x", label: "x" }
    ];
}

function findVariableDefinition(definitions, value) {
    let i;

    for (i = 0; i < definitions.length; i++) {
        if (definitions[i].value === value) {
            return definitions[i];
        }
    }

    return null;
}

/* ============================================================
   SERIALIZATION
   ============================================================ */

function serializeNode(node) {
    let i;
    let out;

    if (!node) return "";

    if (node.type === "number") {
        return node.value;
    }

    if (node.type === "variable") {
        return node.name;
    }

    if (node.type === "constant") {
        return node.name === "PI"
            ? "PI"
            : node.name;
    }

    if (node.type === "operator") {
        if (node.op === "*") {
            return "*";
        }

        return node.op;
    }

    if (node.type === "expression") {
        out = "";

        for (i = 0; i < node.items.length; i++) {
            out += serializeNode(node.items[i]);
        }

        return out;
    }

    if (node.type === "group") {
        return "(" + serializeNode(node.expr) +
            (node.closed ? ")" : "");
    }

    if (node.type === "fraction") {
        return "(" + node.numerator.value + "/" + node.denominator.value + ")";
    }

    if (node.type === "mixedFraction") {
        return "(" + node.whole.value + "+" + node.numerator.value + "/" + node.denominator.value + ")";
    }

    /*
     * As v2 wrote it: the numerator is one term (no + or - at its level), so it needs no brackets (2*x/3); the
     * denominator gets them unless it is one item (7/3, 7/(1+2) for a bracket the student typed, 7/(1+2) for 1+2
     * typed in the slot). A division in the denominator is bracketed: a/(b/c).
     */
    if (node.type === "divide") {
        out = serializeNode(node.denominator);

        if (
            node.denominator.items.length !== 1 ||
            node.denominator.items[0].type === "divide"
        ) {
            out = "(" + out + ")";
        }

        return serializeNode(node.numerator) + "/" + out;
    }

    if (node.type === "sqrt") {
        return "SQRT(" + serializeNode(node.radicand) + ")";
    }

    if (node.type === "power") {
        if (node.fixed) {
            return serializeNode(node.base) + "^" + serializeNode(node.exponent);
        }

        return serializeNode(node.base) +  "^(" + serializeNode(node.exponent) + ")";
    }

    if (node.type === "power10") {
        return "10^" + node.exponent.value;
    }

    if (node.type === "subscript") {
        return serializeNode(node.base) + "_" + node.index.value;
    }

    if (node.type === "equation") {
        out = "";

        for (i = 0; i < node.parts.length; i++) {
            if (i > 0) { out += "="; }
            out += serializeNode(node.parts[i]);
        }

        return out;
    }

    return "";
}

/* ============================================================
   LATEX RENDERING
   ============================================================ */

function htmlEntityToLatexLabel(label) {
    let start = label.indexOf("<sub>");
    let end;

    if (start >= 0) {
        end = label.indexOf("</sub>", start + 5);

        if (end >= 0) {
            return label.substring(0, start) + "_{" + label.substring(start + 5, end) + "}" + label.substring(end + 6);
        }
    }

    return label;
}

function variableLabel(definitions, value) {
    let def = findVariableDefinition(
            definitions,
            value
        );

    if (!def) {
        return value;
    }

    return htmlEntityToLatexLabel(
        def.label
    );
}

function cursorLatex() {
    return "\\mathord{\\vphantom{0}\\mid}";
}

/*
 * An empty answer gets no red ❗ (options.showErrors). Complete or not: isCompleteNode (MOODLE VALUE below) - the same
 * test that sends an empty value to Moodle; the text-based versions up to v1 showed the ❗ when their parser failed.
 */
function isEmptyAnswer(ast) {
    return ast.parts.length === 1 && ast.parts[0].items.length === 0;
}

function latexExpression(expr, definitions, active) {
    let items = expr.items;
    let out = "";
    let termItems = [];
    let i;
    let item;

    function renderTerm(list) {
        let result = "";
        let j;
        let op;
        let right;

        if (list.length === 0) {
            return "";
        }

        result = this.latexNode(
                list[0],
                definitions,
                active
            );

        j = 1;

        while (j < list.length) {
            op = list[j];

            if (
                !op ||
                op.type !== "operator"
            ) {
                result +=
                    this.latexNode(
                        op,
                        definitions,
                        active
                    );

                j++;
                continue;
            }

            /*
             * Operator without a following operand.
             * Display a placeholder.
             */
            if (j + 1 >= list.length) {
                if (op.op === "/") {
                    result = "\\frac{" + result + "}{\\square}";
                } else if (op.op === "*") {
                    result +=
                        (
                            op.implicit
                                ? "\\,"
                                : "\\times "
                        ) + "\\square";
                }

                break;
            }

            right = list[j + 1];

            if (op.op === "/") {
                result = "\\frac{" + result + "}{" + this.latexNode(
                        right,
                        definitions,
                        active
                    ) + "}";
            }

            else if (op.op === "*") {
                result +=
                    (
                        op.implicit
                            ? "\\,"
                            : "\\times "
                    ) + this.latexNode(
                        right,
                        definitions,
                        active
                    );
            }

            j += 2;
        }

        return result;
    }

    /*
     * + and - separate additive terms.
     * Multiplication/division are rendered inside each term.
     */
    for (i = 0; i < items.length; i++) {
        item = items[i];

        if (
            item.type === "operator" &&
            (
                item.op === "+" ||
                item.op === "-"
            )
        ) {
            if (termItems.length > 0) {
                out +=
                    renderTerm(
                        termItems
                    );

                termItems = [];
            }

            out += item.op;
        } else {
            termItems.push(item);
        }
    }

    if (termItems.length > 0) {
        out +=
            renderTerm(
                termItems
            );
    }

    if (
        active &&
        active.kind === "expression" &&
        active.nodeId === expr.id
    ) {
        out += cursorLatex();
    }

    return out;
}

MoodleStemKeyboard.prototype.latexNode = function (node, active) {
    let out;
    let i;
    let isActive;

    if (!node) return "";

    isActive = active && active.nodeId === node.id;

    if (node.type === "number") {
        if (isActive) {
            return (node.value || "") + cursorLatex();
        }

        return node.value || "\\square";
    }

    if (node.type === "variable") {
        return variableLabel(this.variableDefinitions, node.name);
    }

    if (node.type === "constant") {
        return node.name === "PI" ? "\\pi" : node.name;
    }

    if (node.type === "operator") {
        if (node.op === "*") {
            return node.implicit ? "\\," : this.timesOp + " ";
        }

        return node.op;
    }

    if (node.type === "expression") {
        return this.latexExpression(node, active);
    }

    if (node.type === "group") {
        if (node.closed) {
            return "(" + this.latexNode(node.expr, active) + ")";
        }

        return "(" + this.latexNode(node.expr, active);
    }

    if (node.type === "fraction") {
        return "\\frac{" + this.latexNode(node.numerator, active) + "}{" + this.latexNode(node.denominator, active) + "}";
    }

    if (node.type === "mixedFraction") {
        return this.latexNode(node.whole, active) + "\\frac{" + this.latexNode(node.numerator, active) + "}{" + this.latexNode(node.denominator, active) + "}";
    }

    /* an empty denominator shows □, or the cursor while it is being typed */
    if (node.type === "divide") {
        out = this.latexNode(node.denominator, active);

        return "\\frac{" + this.latexNode(node.numerator, active) + "}{" + (out === "" ? "\\square" : out) + "}";
    }

    if (node.type === "sqrt") {
        return "\\sqrt{" + this.latexNode(node.radicand, active) + "}";
    }

    if (node.type === "power") {
        return this.latexNode(node.base, null) + "^{" + this.latexNode(node.exponent, active) + "}";
    }

    if (node.type === "power10") {
        return "10^{" + this.latexNode(node.exponent, active) + "}";
    }

    if (node.type === "subscript") {
        return this.latexNode(node.base, null) + "_{\\scriptscriptstyle" + this.latexNode(node.index, active) + "}";
    }

    if (node.type === "equation") {
        out = "";

        for (i = 0; i < node.parts.length; i++) {
            if (i > 0) {
                out += "=";
            }

            out += this.latexNode(node.parts[i], active);
        }

        return out;
    }

    return "";
};

MoodleStemKeyboard.prototype.latexExpression = function (expr, active) {
    let items = expr.items;
    let out = "";
    let termItems = [];
    let i;
    let item;

    function renderTerm(list, self) {
        let result = "";
        let j;
        let op;
        let right;

        if (list.length === 0) return "";

        result = self.latexNode(list[0], active);
        j = 1;

        while (j < list.length) {
            op = list[j];

            if (!op || op.type !== "operator") {
                result += self.latexNode(op, active);
                j++;
                continue;
            }

            if (j + 1 >= list.length) {
                if (op.op === "/") {
                    result += "/";
                } else if (op.op === "*") {
                    result += op.implicit ? "\\," : self.timesOp + " ";
                }
                break;
            }

            right = list[j + 1];

            if (op.op === "/") {
                result =
                    "\\frac{" + result + "}{" + self.latexNode(right, active) + "}";
            } else if (op.op === "*") {
                result +=
                    (op.implicit ? "\\," : self.timesOp + " ") + self.latexNode(right, active);
            }

            j += 2;
        }

        return result;
    }

    for (i = 0; i < items.length; i++) {
        item = items[i];

        if (item.type === "operator" &&
            (item.op === "+" || item.op === "-")) {

            if (termItems.length > 0) {
                out += renderTerm(termItems, this);
                termItems = [];
            }

            out += item.op;
        } else {
            termItems.push(item);
        }
    }

    if (termItems.length > 0) {
        out += renderTerm(termItems, this);
    }

    if (active &&
        active.kind === "expression" &&
        active.nodeId === expr.id) {
        out += cursorLatex();
    }

    return out;
};
/* ============================================================
   PARSER
   Moodle string -> AST

   Parsing is needed for:
   - initialization from an existing Moodle value
   - expression analysis

   Editing itself does NOT manipulate this text.
   ============================================================ */

function AstParser(
    text,
    variableDefinitions,
    variableMode
) {
    this.s = text || "";
    this.pos = 0;
    this.variables = variableDefinitions || [];
    this.variableMode = variableMode || "x";
}

AstParser.prototype.peek = function () {
    if (this.pos >= this.s.length) {
        return "";
    }

    return this.s.charAt(this.pos);
};

AstParser.prototype.take = function (ch) {
    if (this.peek() === ch) {
        this.pos++;
        return true;
    }

    return false;
};

AstParser.prototype.matchVariable = function () {
    let best = "";
    let i;
    let value;

    for (i = 0; i < this.variables.length; i++ ) {
        value = this.variables[i].value;

        if (
            this.s.substring( this.pos, this.pos + value.length ) === value && value.length > best.length) {
            best = value;
        }
    }

    if (best !== "") {
        this.pos += best.length;
        return best;
    }

    if (
        this.variableMode === "A-Z" &&
        isLetter(this.peek())
    ) {
        best = this.peek();
        this.pos++;
        return best;
    }
    return "";
};

AstParser.prototype.parseEquation = function () {
    let eq = makeEquation();
    let expr;

    eq.parts = [];

    expr = this.parseExpression("");

    eq.parts.push(expr);

    while (this.peek() === "=") {
        this.pos++;

        eq.parts.push(
            this.parseExpression("")
        );
    }
    return eq;
};

AstParser.prototype.parseExpression = function (stopChar) {
    let expr = makeExpression();
    let expectingAtom = true;
    let atom;
    let ch;

    while (this.pos < this.s.length) {
        ch = this.peek();

        if (
            stopChar &&
            ch === stopChar
        ) {
            break;
        }

        if (
            !stopChar &&
            ch === "="
        ) {
            break;
        }

        if (
            ch === "+" ||
            ch === "-" ||
            ch === "*" ||
            ch === "/"
        ) {
            expr.items.push(
                makeOperator(ch, false)
            );

            this.pos++;
            expectingAtom = true;
            continue;
        }

        atom = this.parseAtom();

        if (!atom) {
            /*
             * Invalid/unrecognized input:
             * advance so the parser cannot loop forever.
             */
            this.pos++;
            continue;
        }

        if (
            !expectingAtom &&
            isAtom(atom)
        ) {
            expr.items.push(
                makeOperator("*", true)
            );
        }

        expr.items.push(atom);
        expectingAtom = false;
    }

    return expr;
};

AstParser.prototype.parseDigits = function () {
    let start = this.pos;
    let dots = 0;
    let ch;

    while (this.pos < this.s.length) {
        ch = this.peek();

        if (isDigit(ch)) {
            this.pos++;
        } else if (
            ch === "." &&
            dots === 0
        ) {
            dots++;
            this.pos++;
        } else {
            break;
        }
    }

    if (this.pos === start) {
        return null;
    }

    return makeNumber(
        this.s.substring(
            start,
            this.pos
        )
    );
};

AstParser.prototype.parseAtom = function () {
    let ch = this.peek();
    let base;
    let exp;
    let inside;
    let variableName;
    let indexStart;
    let indexValue;
    let saved;
    let fractionInfo;
    let power;
    let sub;
    let sqrt;

    if (ch === "") {
        return null;
    }

    if (
        isDigit(ch) ||
        ch === "."
    ) {
        base = this.parseDigits();

        if (this.peek() === "^") {
            this.pos++;

            if (this.take("(")) {
                exp = this.parseExpression(")");

                this.take(")");

                power = makePower(base);
                power.exponent = exp;

                return power;
            }

            exp = this.parseDigits();

            if (exp) {
                power = makePower(base);
                power.exponent = exp;
                power.fixed = false;

                return power;
            }
        }

        return base;
    }

    if (
        this.s.substring(
            this.pos,
            this.pos + 2
        ) === "PI"
    ) {
        this.pos += 2;

        return makeConstant("PI");
    }

    if (
        this.s.substring(
            this.pos,
            this.pos + 4
        ) === "SQRT"
    ) {
        this.pos += 4;

        if (this.take("(")) {
            inside = this.parseExpression(")");

            this.take(")");

            sqrt = makeSqrt();
            sqrt.radicand = inside;

            return sqrt;
        }

        return makeSqrt();
    }

    if (ch === "(") {
        saved = this.pos;

        fractionInfo = this.tryParseFractionLike();

        if (fractionInfo) {
            return fractionInfo;
        }

        this.pos = saved;
        this.pos++;

        inside = this.parseExpression(")");

        this.take(")");

        return makeGroup(
            inside,
            true
        );
    }

    variableName = this.matchVariable();

    if (variableName !== "") {
        base = makeVariable(variableName);

        if (this.peek() === "_") {
            this.pos++;
            indexStart = this.pos;

            while (isDigit(this.peek())) {
                this.pos++;
            }

            indexValue = this.s.substring(
                    indexStart,
                    this.pos
                );

            sub = makeSubscript(base);
            sub.index.value = indexValue;
            base = sub;
        }

        if (this.peek() === "^") {
            this.pos++;

            if (this.take("(")) {
                exp = this.parseExpression(")");

                this.take(")");

                power = makePower(base);
                power.exponent = exp;

                return power;
            }

            exp = this.parseDigits();

            if (exp) {
                power = makePower(base);
                power.exponent = exp;
                power.fixed = false;

                return power;
            }
        }

        return base;
    }

    return null;
};

AstParser.prototype.tryParseFractionLike = function () {
    let start = this.pos;
    let wholeStart;
    let whole;
    let numStart;
    let numerator;
    let denStart;
    let denominator;
    let frac;
    let mixed;

    if (!this.take("(")) {
        return null;
    }

    wholeStart = this.pos;

    while (isDigit(this.peek())) {
        this.pos++;
    }

    whole = this.s.substring(
            wholeStart,
            this.pos
        );

    if (whole === "") {
        this.pos = start;
        return null;
    }

    /*
     * (2/3)
     * is a fraction.
     */
    if (this.peek() === "/") {
        this.pos++;

        numStart = wholeStart;
        numerator = whole;

        denStart = this.pos;

        while (isDigit(this.peek())) {
            this.pos++;
        }

        denominator = this.s.substring(
                denStart,
                this.pos
            );

        if (
            denominator !== "" &&
            this.take(")")
        ) {
            frac = makeFraction();

            frac.numerator.value = numerator;

            frac.denominator.value = denominator;

            return frac;
        }

        this.pos = start;
        return null;
    }

    /*
     * (4+2/3)
     * is a mixed fraction.
     */
    if (this.peek() === "+") {
        this.pos++;
        numStart = this.pos;
        while (isDigit(this.peek())) {
            this.pos++;
        }

        numerator = this.s.substring(
                numStart,
                this.pos
            );

        if ( numerator === "" || !this.take("/") ) {
            this.pos = start;
            return null;
        }

        denStart = this.pos;

        while (isDigit(this.peek())) {
            this.pos++;
        }

        denominator = this.s.substring(
                denStart,
                this.pos
            );

        if (
            denominator !== "" &&
            this.take(")")
        ) {
            mixed = makeMixedFraction(whole);
            mixed.numerator.value = numerator;
            mixed.denominator.value = denominator;
            return mixed;
        }
    }

    this.pos = start;
    return null;
};

function parseToAst(
    text,
    variables,
    variableMode
) {
    let defs = normalizeVariables(
            variables,
            variableMode
        );

    let parser = new AstParser(
            text,
            defs,
            variableMode
        );

    return parser.parseEquation();
}

/* ============================================================
   AST SEARCH HELPERS
   ============================================================ */

function findNodeById(node, id) {
    let i;
    let found;

    if (!node) return null;

    if (node.id === id) {
        return node;
    }

    if (node.type === "equation") {
        for (
            i = 0;
            i < node.parts.length;
            i++
        ) {
            found = findNodeById(
                    node.parts[i],
                    id
                );

            if (found) return found;
        }
    } else if (node.type === "expression") {
        for (
            i = 0;
            i < node.items.length;
            i++
        ) {
            found = findNodeById(
                    node.items[i],
                    id
                );

            if (found) return found;
        }
    } else if (node.type === "group") {
        return findNodeById(
            node.expr,
            id
        );
    } else if (node.type === "fraction") {
        found = findNodeById(
                node.numerator,
                id
            );

        if (found) return found;

        return findNodeById(
            node.denominator,
            id
        );
    } else if (node.type === "mixedFraction") {
        found = findNodeById(
                node.whole,
                id
            );

        if (found) return found;

        found = findNodeById(
                node.numerator,
                id
            );

        if (found) return found;

        return findNodeById(
            node.denominator,
            id
        );
    } else if (node.type === "divide") {
        found = findNodeById(
                node.numerator,
                id
            );

        if (found) return found;

        return findNodeById(
            node.denominator,
            id
        );
    } else if (node.type === "sqrt") {
        return findNodeById(
            node.radicand,
            id
        );
    } else if (node.type === "power") {
        found = findNodeById(
                node.base,
                id
            );

        if (found) return found;

        return findNodeById(
            node.exponent,
            id
        );
    } else if (node.type === "power10") {
        return findNodeById(
            node.exponent,
            id
        );
    } else if (node.type === "subscript") {
        found = findNodeById(
                node.base,
                id
            );

        if (found) return found;

        return findNodeById(
            node.index,
            id
        );
    }

    return null;
}

function findParentInfo(node, childId) {
    let i;
    let info;

    if (!node) return null;

    if (node.type === "equation") {
        for (i = 0; i < node.parts.length; i++) {
            if (node.parts[i].id === childId) {
                return {
                    parent: node,
                    field: "parts",
                    index: i
                };
            }

            info = findParentInfo(
                node.parts[i],
                childId
            );

            if (info) return info;
        }
    }

    if (node.type === "expression") {
        for (i = 0; i < node.items.length; i++) {
            if (node.items[i].id === childId) {
                return {
                    parent: node,
                    field: "items",
                    index: i
                };
            }

            info = findParentInfo(
                node.items[i],
                childId
            );

            if (info) return info;
        }
    }

    if (node.type === "group") {
        if (node.expr.id === childId) {
            return {
                parent: node,
                field: "expr"
            };
        }

        return findParentInfo(
            node.expr,
            childId
        );
    }

    if (node.type === "fraction") {
        if (node.numerator.id === childId) {
            return {
                parent: node,
                field: "numerator"
            };
        }

        if (node.denominator.id === childId) {
            return {
                parent: node,
                field: "denominator"
            };
        }
    }

    if (node.type === "mixedFraction") {
        if (node.whole.id === childId) {
            return {
                parent: node,
                field: "whole"
            };
        }

        if (node.numerator.id === childId) {
            return {
                parent: node,
                field: "numerator"
            };
        }

        if (node.denominator.id === childId) {
            return {
                parent: node,
                field: "denominator"
            };
        }
    }

    if (node.type === "divide") {
        if (node.numerator.id === childId) {
            return {
                parent: node,
                field: "numerator"
            };
        }

        if (node.denominator.id === childId) {
            return {
                parent: node,
                field: "denominator"
            };
        }

        return findParentInfo(node.numerator, childId) ||
            findParentInfo(node.denominator, childId);
    }

    if (node.type === "sqrt") {
        if (node.radicand.id === childId) {
            return {
                parent: node,
                field: "radicand"
            };
        }

        return findParentInfo(
            node.radicand,
            childId
        );
    }

    if (node.type === "power") {
        if (node.base.id === childId) {
            return {
                parent: node,
                field: "base"
            };
        }

        if (node.exponent.id === childId) {
            return {
                parent: node,
                field: "exponent"
            };
        }

        info = findParentInfo(
            node.base,
            childId
        );

        if (info) return info;

        return findParentInfo(
            node.exponent,
            childId
        );
    }

    if (node.type === "power10") {
        if (node.exponent.id === childId) {
            return {
                parent: node,
                field: "exponent"
            };
        }
    }

    if (node.type === "subscript") {
        if (node.base.id === childId) {
            return {
                parent: node,
                field: "base"
            };
        }

        if (node.index.id === childId) {
            return {
                parent: node,
                field: "index"
            };
        }
    }

    return null;
}

function findOwningExpression(
    ast,
    nodeIdToFind
) {
    let info = findParentInfo(
            ast,
            nodeIdToFind
        );

    while (info) {
        if (
            info.parent.type ===
            "expression"
        ) {
            return info.parent;
        }

        info = findParentInfo(
                ast,
                info.parent.id
            );
    }

    return null;
}

function collectVariables(node, result) {
    let i;
    let name;

    if (!node) return;

    if (node.type === "variable") {
        name = node.name;

        for (i = 0; i < result.length; i++) {
            if (result[i] === name) {
                return;
            }
        }

        result.push(name);
        return;
    }

    if ( node.type === "subscript" &&
        node.base &&
        node.base.type === "variable" &&
        node.index &&
        node.index.type === "number" ) {
        name = node.base.name + "_" + node.index.value;

        for (i = 0; i < result.length; i++) {
            if (result[i] === name) {
                return;
            }
        }

        result.push(name);
        return;
    }

    if (node.type === "equation") {
        for (i = 0; i < node.parts.length; i++) {
            collectVariables(
                node.parts[i],
                result
            );
        }
    } else if (node.type === "expression") {
        for (i = 0; i < node.items.length; i++) {
            collectVariables(
                node.items[i],
                result
            );
        }
    } else if (node.type === "group") {
        collectVariables(
            node.expr,
            result
        );
    } else if (node.type === "fraction") {
        collectVariables(
            node.numerator,
            result
        );

        collectVariables(
            node.denominator,
            result
        );
    } else if (node.type === "mixedFraction") {
        collectVariables(
            node.whole,
            result
        );

        collectVariables(
            node.numerator,
            result
        );

        collectVariables(
            node.denominator,
            result
        );
    } else if (node.type === "divide") {
        collectVariables(node.numerator, result);
        collectVariables(node.denominator, result);
    } else if (node.type === "sqrt") {
        collectVariables(
            node.radicand,
            result
        );
    } else if (node.type === "power") {
        collectVariables(
            node.base,
            result
        );

        collectVariables(
            node.exponent,
            result
        );
    } else if (node.type === "power10") {
        collectVariables(
            node.exponent,
            result
        );
    } else if (node.type === "subscript") {
        collectVariables(
            node.base,
            result
        );

        collectVariables(
            node.index,
            result
        );
    }
}

/* ============================================================
   ANALYZER
   ============================================================ */

function classifyExpressionPart(
    expr,
    value
) {
    let result = {
        value: value
    };

    let vars = [];
    let items = expr.items;
    let node;

    if (
        !items ||
        items.length === 0
    ) {
        result.type = "invalid";
        return result;
    }

    if (items.length === 1) {
        node = items[0];

        if (node.type === "number") {
            result.type = node.value.indexOf(".") >= 0
                    ? "decimalNumber"
                    : "integer";

            return result;
        }

        if (node.type === "fraction") {
            result.type = "simpleFraction";

            result.numerator = node.numerator.value;

            result.denominator = node.denominator.value;

            return result;
        }

        if ( node.type === "mixedFraction" ) {
            result.type = "mixedFraction";
            result.whole = node.whole.value;
            result.numerator = node.numerator.value;
            result.denominator = node.denominator.value;
            return result;
        }

        if ( node.type === "constant" && node.name === "PI" ) {
            result.type = "constant";
            result.constant = "PI";
            return result;
        }

        if (node.type === "variable") {
            result.type = "variable";
            result.variable = node.name;

            return result;
        }

        if ( node.type === "subscript" && node.base &&  node.base.type === "variable" ) {
            result.type = "variable";
            result.variable = serializeNode(node);
            return result;
        }
    }

    collectVariables(
        expr,
        vars
    );

    if (vars.length > 0) {
        result.type = "algebraicExpression";

        result.variables = vars;
    } else {
        result.type = "arithmeticExpression";
    }

    return result;
}

function analyzeExpression(
    value,
    variables,
    variableMode
) {
    let text = typeof value === "string"
            ? value
            : "";

    let rawParts = text.split("=");

    let ast = parseToAst(
            text,
            variables,
            variableMode || "x"
        );

    let result = [];
    let i;

    for (
        i = 0;
        i < ast.parts.length;
        i++
    ) {
        result.push(
            classifyExpressionPart(
                ast.parts[i],
                i < rawParts.length
                    ? rawParts[i]
                    : serializeNode(
                        ast.parts[i]
                    )
            )
        );
    }

    return result;
}

window.MoodleStemExpression = {
    analyze: analyzeExpression,
    parse: parseToAst,
    serialize: serializeNode
};

/* ============================================================
   KEYBOARD CONSTRUCTOR
   ============================================================ */

function MoodleStemKeyboard(options) {
    options = options || {};
    this.divId = options.divId;
    this.displayId = options.displayId || null;
    this.displayWidth = options.displayWidth || 300;
    /*
     * inline: the answer box sits inside a line of text, like a <span> ("f(x) = [box] cm"). The box grows with the
     * answer; options.displayWidth, when given, fixes its width. Off by default: the box is a block, as before.
     */
    this.inline = options.inline === true;
    this.inlineWidth = options.displayWidth > 0 ? options.displayWidth : 0;
    /* showErrors: a red ❗ after an answer that is not complete (hasError is set either way). Off by default. */
    this.showErrors = options.showErrors === true;
    this.hasError = false;
    this.showKeyboardButton = options.showKeyboardButton === true;
    this.allowAlgebra = options.allowAlgebra === true;
    this.variableMode = options.variableMode || "x";
    this.variables = options.variables || null;
    this.variableDefinitions = normalizeVariables( this.variables, this.variableMode );
    this.allowSubscript = options.allowSubscript === true;
    this.power10 = options.power10 === true;
    this.showPi = options.showPi !== false;
    this.maxEquals = (
            typeof options.maxEquals === "number" && options.maxEquals > 0 )
            ? Math.floor( options.maxEquals ) : 0;

    this.withUnits = options.withUnits === true;
    this.unitCategories = options.unitCategories || null;
    this.showUnitNames = options.showUnitNames !== false;
    this.unitsKeyLabel = options.unitsKeyLabel || "UNITS";
    this.showGroupHeadings = options.showGroupHeadings === true;
    this.language = options.language || "en";
    this.readOnly = options.readOnly === true;
    this.timesOp = options.MulOp || "\\cdot";
    this.moodleTargetId = options.moodleTargetId || null;
    this.getParamFunc = typeof options.getParamFunc === "function"
            ? options.getParamFunc : null;

    this.setParamFunc = typeof options.setParamFunc === "function"
            ? options.setParamFunc  : null;
    this.ast = makeEquation();
    this.active = {
        kind: "expression",
        nodeId: this.ast.parts[0].id
    };

    this.selectedUnit = null;
    this.unitValue = "";
    this.unitScale = 1;
    this.root = null;
    this.display = null;
    this.popup = null;
    this.keyboardButton = null;
    this.unitPanel = null;
    this.variablePanel = null;
    this.varShift = false;
    this.varCaps = false;
    this.texts = this.getLanguageTexts();
    this.units = this.getDefaultUnits();
    this.init();
}

window.MoodleStemKeyboard = MoodleStemKeyboard;

/* ============================================================
   LANGUAGE TEXTS
   ============================================================ */

MoodleStemKeyboard.prototype.getLanguageTexts = function () {
    let texts = {
        en: {
            mixedFraction : "Enter fraction or mixed fraction",
            exit: "Exit current fraction, exponent, root or subscript",
            clearAll: "Clear the input field",
            deleteOne: "Delete",
            units: "Select units",
            closeUnits: "Close units",
            variables: "Enter variable",
            closeVariables: "Close variable keyboard",
            closeKeyboard: "Close keyboard",
            openKeyboard: "Open keyboard",
            shift: "Shift / Caps lock",
            subscript: "Enter variable subscript",
            power10: "Multiply by a power of 10"
        },

        he: {
            mixedFraction: "הזנת שבר או מספר מעורב",
            exit: "יציאה מהמבנה הנוכחי",
            clearAll: "מחיקת כל הביטוי",
            deleteOne: "מחיקה",
            units: "בחירת יחידות",
            closeUnits: "סגירת חלונית היחידות",
            variables: "הזנת משתנה",
            closeVariables: "סגירת מקלדת המשתנים",
            closeKeyboard: "סגירת המקלדת",
            openKeyboard: "פתיחת המקלדת",
            shift: "Shift / Caps lock",
            subscript: "הזנת אינדקס למשתנה",
            power10: "כפל בחזקה של 10"
        },

        ar: {
            mixedFraction: "إدخال كسر أو عدد كسري",
            exit: "الخروج من البنية الحالية",
            clearAll: "مسح التعبير بالكامل",
            deleteOne: "حذف",
            units: "اختيار الوحدات",
            closeUnits: "إغلاق نافذة الوحدات",
            variables: "إدخال متغير",
            closeVariables: "إغلاق لوحة المتغيرات",
            closeKeyboard: "إغلاق لوحة المفاتيح",
            openKeyboard: "فتح لوحة المفاتيح",
            shift: "Shift / Caps lock",
            subscript: "إدخال فهرس للمتغير",
            power10: "الضرب في قوة للعدد 10"
        }
    };

    return texts[this.language] ||
        texts.en;
};

/* ============================================================
   ACTIVE AST POSITION
   ============================================================ */

MoodleStemKeyboard.prototype.getCurrentExpression = function () {
    let node = findNodeById(
            this.ast,
            this.active.nodeId
        );

    let expr;

    if (
        node &&
        node.type === "expression"
    ) {
        return node;
    }

    expr = findOwningExpression(
            this.ast,
            this.active.nodeId
        );

    if (expr) {
        return expr;
    }

    return this.ast.parts[
        this.ast.parts.length - 1
    ];
};

MoodleStemKeyboard.prototype.getActiveNode = function () {
    return findNodeById(
        this.ast,
        this.active.nodeId
    );
};

MoodleStemKeyboard.prototype.setActiveExpression = function (expr) {
    this.active = {
        kind: "expression",
        nodeId: expr.id
    };
};

MoodleStemKeyboard.prototype.setActiveNumber = function (
    num,
    role,
    ownerId
) {
    this.active = {
        kind: "number",
        nodeId: num.id,
        role: role || "number",
        ownerId: ownerId || null
    };
};

MoodleStemKeyboard.prototype.lastItem = function (expr) {
    if (
        !expr ||
        !expr.items.length
    ) {
        return null;
    }

    return expr.items[
        expr.items.length - 1
    ];
};

MoodleStemKeyboard.prototype.lastAtom = function (expr) {
    let item = this.lastItem(expr);

    return isAtom(item)
        ? item
        : null;
};

MoodleStemKeyboard.prototype.lastIsOperator = function (expr) {
    let item = this.lastItem(expr);

    return item &&
        item.type === "operator";
};

MoodleStemKeyboard.prototype.appendAtom = function (atom) {
    let expr = this.getCurrentExpression();
    let last = this.lastItem(expr);

    if (last && isAtom(last)) {
        if (last.type === "number" && atom.type === "number") return false;

        expr.items.push(makeOperator("*", true));
    }

    expr.items.push(atom);
    this.setActiveExpression(expr);
    return true;
};

/* ============================================================
   NUMBER ENTRY
   ============================================================ */

MoodleStemKeyboard.prototype.insertDigit = function (digit) {
    let activeNode = this.getActiveNode();
    let expr;
    let last;

    if (this.readOnly) return;

    /* Numeric field inside fraction, power10, subscript, etc. */
    if (this.active.kind === "number" && activeNode && activeNode.type === "number") {
        activeNode.value += digit;
        this.render();
        return;
    }

    expr = this.getCurrentExpression();
    last = this.lastItem(expr);

    /* Continue an existing number. */
    if (last && last.type === "number") {
        last.value += digit;
        this.render();
        return;
    }

    /*
     * A digit may start a new number only at the beginning
     * of an expression or after an explicit operator.
     *
     * Therefore:
     *   a 8    -> blocked
     *   PI 8   -> blocked
     *   ) 8    -> blocked
     *   sqrt 8 -> blocked
     */
    if (last && last.type !== "operator") return;

    expr.items.push(makeNumber(digit));
    this.setActiveExpression(expr);
    this.render();
};

MoodleStemKeyboard.prototype.insertDecimal = function () {
    let activeNode = this.getActiveNode();

    let expr;
    let last;

    if (this.readOnly) return;

    if (
        this.active.kind === "number" &&
        activeNode &&
        activeNode.type === "number"
    ) {
        /*
         * Structured integer-only fields such as
         * power10 exponent and subscript do not
         * accept a decimal point.
         */
        if (
            this.active.role === "pow10" ||
            this.active.role === "subscript" ||
            this.active.role === "fractionNum" ||
            this.active.role === "fractionDen"
        ) {
            return;
        }

        if (
            activeNode.value.indexOf(".") < 0
        ) {
            activeNode.value +=
                activeNode.value === ""
                    ? "0."
                    : ".";
        }

        this.render();
        return;
    }

    expr = this.getCurrentExpression();

    last = this.lastItem(expr);

    if (
        last &&
        last.type === "number" &&
        last.value.indexOf(".") < 0
    ) {
        last.value += ".";
    } else {
        this.appendAtom(
            makeNumber("0.")
        );
    }

    this.render();
};

/* ============================================================
   EXIT FROM STRUCTURES
   ============================================================ */

MoodleStemKeyboard.prototype.canCloseActive = function () {
    let node = this.getActiveNode();

    if (
        this.active.kind ===
        "expression"
    ) {
        return true;
    }

    if (!node) {
        return false;
    }

    if (
        this.active.role === "pow10" ||
        this.active.role === "subscript"
    ) {
        return node.value !== "";
    }

    if (
        this.active.role === "fractionNum" ||
        this.active.role === "fractionDen"
    ) {
        return node.value !== "";
    }

    return true;
};

MoodleStemKeyboard.prototype.exitActiveStructure = function () {
    let info;
    let owner;
    let expr;

    if (
        this.active.kind ===
        "expression"
    ) {
        info = findParentInfo(
                this.ast,
                this.active.nodeId
            );

        if (
            info &&
            (
                info.parent.type === "sqrt" ||
                info.parent.type === "power" ||
                info.parent.type === "group" ||
                info.parent.type === "divide"
            )
        ) {
            owner = info.parent;

            expr = findOwningExpression(
                    this.ast,
                    owner.id
                );

            if (expr) {
                this.setActiveExpression(
                    expr
                );
            }
        }

        this.render();
        return;
    }

    if (!this.canCloseActive()) {
        return;
    }

    owner = this.active.ownerId
            ? findNodeById(
                this.ast,
                this.active.ownerId
            )
            : null;

    /*
     * In a fraction the right-arrow moves
     * numerator -> denominator -> outside.
     */
    if (
        owner &&
        owner.type === "fraction" &&
        this.active.role === "fractionNum"
    ) {
        this.setActiveNumber(
            owner.denominator,
            "fractionDen",
            owner.id
        );
    } else if (
        owner &&
        owner.type === "mixedFraction" &&
        this.active.role === "fractionNum"
    ) {
        this.setActiveNumber(
            owner.denominator,
            "fractionDen",
            owner.id
        );
    } else {
        expr = owner
                ? findOwningExpression(
                    this.ast,
                    owner.id
                )
                : findOwningExpression(
                    this.ast,
                    this.active.nodeId
                );

        if (expr) {
            this.setActiveExpression(
                expr
            );
        }
    }

    this.render();
};

MoodleStemKeyboard.prototype.closeActiveForOperator = function () {
    let owner;
    let expr;

    if (
        this.active.kind ===
        "expression"
    ) {
        return true;
    }

    if (!this.canCloseActive()) {
        return false;
    }

    owner = this.active.ownerId
            ? findNodeById(
                this.ast,
                this.active.ownerId
            )
            : null;

    expr = owner
            ? findOwningExpression(
                this.ast,
                owner.id
            )
            : findOwningExpression(
                this.ast,
                this.active.nodeId
            );

    if (expr) {
        this.setActiveExpression(
            expr
        );
    }

    return true;
};

/* ============================================================
   OPERATORS AND = ============================================================ */

MoodleStemKeyboard.prototype.insertOperator = function (op) {
    let expr;
    let last;

    if (this.readOnly) return;

    if (op === "/") {
        this.insertDivide();
        return;
    }

    if (!this.closeActiveForOperator()) {
        return;
    }

    expr = this.getCurrentExpression();

    last = this.lastItem(expr);

    /*
     * Unary + or - is allowed at the
     * beginning of an expression.
     */
    if (!last) {
        if (
            op === "+" ||
            op === "-"
        ) {
            expr.items.push(
                makeOperator(
                    op,
                    false
                )
            );
        }

        this.render();
        return;
    }

    /*
     * If an operator is already the last
     * item, replace it.
     */
    if (last.type === "operator") {
        last.op = op;
        last.implicit = false;

        this.render();
        return;
    }

    expr.items.push(
        makeOperator(
            op,
            false
        )
    );

    this.setActiveExpression(expr);

    this.render();
};

/*
 * "/": the term before the cursor (back to the last + or - at this level) becomes the numerator, as v2 drew it
 * (2x/3 = \frac{2x}{3}); the cursor goes into the empty denominator and stays there - through +, -, brackets - until
 * the right arrow (exitActiveStructure). After an operator ("2*" then "/") the "/" takes its place.
 */
MoodleStemKeyboard.prototype.insertDivide = function () {
    let expr;
    let last;
    let start;
    let numerator;
    let divide;

    if (!this.closeActiveForOperator()) {
        return;
    }

    expr = this.getCurrentExpression();
    last = this.lastItem(expr);

    if (
        last &&
        last.type === "operator" &&
        expr.items.length >= 2 &&
        expr.items[expr.items.length - 2].type !== "operator"
    ) {
        expr.items.pop();
        last = this.lastItem(expr);
    }

    if (
        !last ||
        last.type === "operator"
    ) {
        return;
    }

    start = expr.items.length;

    while (
        start > 0 &&
        !(
            expr.items[start - 1].type === "operator" &&
            (
                expr.items[start - 1].op === "+" ||
                expr.items[start - 1].op === "-"
            )
        )
    ) {
        start--;
    }

    numerator = makeExpression();
    numerator.items = expr.items.splice(start);

    divide = makeDivide(numerator, null);
    expr.items.push(divide);

    this.setActiveExpression(divide.denominator);

    this.render();
};

/*
 * A saved answer (v2's or v3's: 7/3, 7/(1+2), 2*x/3) read by the parser has "/" as an operator: here each a / b
 * becomes a division structure, as if typed in v3. A bracket around the whole denominator is the slot itself.
 * The parser and MoodleStemExpression.analyze are left as in v2.
 */
function buildDivides(node) {
    let items;
    let out;
    let start;
    let i;
    let item;
    let right;
    let numerator;
    let denominator;

    if (!node) return node;

    if (node.type === "equation") {
        for (i = 0; i < node.parts.length; i++) {
            buildDivides(node.parts[i]);
        }

        return node;
    }

    if (node.type === "group") {
        buildDivides(node.expr);
        return node;
    }

    if (node.type === "sqrt") {
        buildDivides(node.radicand);
        return node;
    }

    if (node.type === "power") {
        buildDivides(node.base);
        buildDivides(node.exponent);
        return node;
    }

    if (node.type !== "expression") {
        return node;
    }

    items = node.items;
    out = [];
    start = 0;

    for (i = 0; i < items.length; i++) {
        item = buildDivides(items[i]);

        if (
            item.type === "operator" &&
            (
                item.op === "+" ||
                item.op === "-"
            )
        ) {
            out.push(item);
            start = out.length;
            continue;
        }

        if (
            item.type === "operator" &&
            item.op === "/" &&
            out.length > start
        ) {
            right = items[i + 1];

            if (
                right &&
                right.type !== "operator"
            ) {
                buildDivides(right);

                if (
                    right.type === "group" &&
                    right.closed
                ) {
                    denominator = right.expr;
                } else {
                    denominator = makeExpression();
                    denominator.items.push(right);
                }

                i++;
            } else {
                denominator = makeExpression();
            }

            numerator = makeExpression();
            numerator.items = out.splice(start);

            out.push(makeDivide(numerator, denominator));
            continue;
        }

        out.push(item);
    }

    node.items = out;
    return node;
}

MoodleStemKeyboard.prototype.canInsertEquals = function () {
    let expr;
    let last;
    let activeNode;

    if (this.maxEquals <= 0) {
        return false;
    }

    if (
        this.ast.parts.length - 1 >=
        this.maxEquals
    ) {
        return false;
    }

    if (
        this.active.kind === "number"
    ) {
        activeNode = this.getActiveNode();

        if (
            !activeNode ||
            activeNode.type !== "number" ||
            activeNode.value === ""
        ) {
            return false;
        }

        /*
         * Cannot finish an equation while
         * only the numerator has been entered.
         */
        if (
            this.active.role ===
            "fractionNum"
        ) {
            return false;
        }
    } else if (
        this.active.kind !==
        "expression"
    ) {
        return false;
    }

    expr = this.getCurrentExpression();

    last = this.lastItem(expr);

    return !!(
        last &&
        isAtom(last)
    );
};

MoodleStemKeyboard.prototype.insertEquals = function () {
    let newExpr;

    if (!this.canInsertEquals()) {
        return;
    }

    if (!this.closeActiveForOperator()) {
        return;
    }

    newExpr = makeExpression();

    this.ast.parts.push(
        newExpr
    );

    this.setActiveExpression(
        newExpr
    );

    this.render();
};

/* ============================================================
   VARIABLES AND PI
   ============================================================ */

MoodleStemKeyboard.prototype.insertVariable = function (value) {
    if (this.readOnly) return;

    if (
        this.active.kind !==
        "expression"
    ) {
        if (!this.closeActiveForOperator()) {
            return;
        }
    }

    this.appendAtom(
        makeVariable(value)
    );

    this.render();
};

MoodleStemKeyboard.prototype.insertPi = function () {
    if (this.readOnly) return;

    if ( this.active.kind !== "expression" ) {
        if (!this.closeActiveForOperator()) {
            return;
        }
    }

    this.appendAtom( makeConstant("PI") );

    this.render();
};

/* ============================================================
   PARENTHESES
   ============================================================ */

MoodleStemKeyboard.prototype.insertOpenParenthesis = function () {
    let group;

    if (this.readOnly) return;

    if (
        this.active.kind !==
        "expression"
    ) {
        if (!this.closeActiveForOperator()) {
            return;
        }
    }

    group = makeGroup(
            null,
            false
        );

    this.appendAtom(group);

    this.setActiveExpression(
        group.expr
    );

    this.render();
};

MoodleStemKeyboard.prototype.canInsertCloseParenthesis = function () {
    let node = this.getActiveNode();

    let info;

    if (
        !node ||
        node.type !== "expression"
    ) {
        return false;
    }

    info = findParentInfo(
            this.ast,
            node.id
        );

    return !!(
        info &&
        info.parent.type === "group" &&
        !info.parent.closed
    );
};

MoodleStemKeyboard.prototype.insertCloseParenthesis = function () {
    let node;
    let info;
    let expr;

    if (
        !this.canInsertCloseParenthesis()
    ) {
        return;
    }

    node = this.getActiveNode();

    info = findParentInfo(
            this.ast,
            node.id
        );

    /*
     * The close parenthesis is represented
     * structurally rather than inserted into
     * a text string.
     */
    info.parent.closed = true;

    expr = findOwningExpression(
            this.ast,
            info.parent.id
        );

    if (expr) {
        this.setActiveExpression(
            expr
        );
    }

    this.render();
};

/* ============================================================
   SQUARE ROOT
   ============================================================ */

MoodleStemKeyboard.prototype.insertSqrt = function () {
    let sqrt;

    if (this.readOnly) return;

    /*
     * While typing the exponent of the
     * dedicated ×10^ key, sqrt is not valid.
     */
    if (
        this.active.role === "pow10"
    ) {
        return;
    }

    if (
        this.active.kind !==
        "expression"
    ) {
        if (!this.closeActiveForOperator()) {
            return;
        }
    }

    sqrt = makeSqrt();

    /*
     * appendAtom automatically creates
     * implicit multiplication when required.
     *
     * Example:
     * 3 followed by sqrt -> 3*SQRT(...)
     */
    this.appendAtom(sqrt);

    this.setActiveExpression(
        sqrt.radicand
    );

    this.render();
};

/* ============================================================
   POWERS
   ============================================================ */

MoodleStemKeyboard.prototype.canInsertPower = function () {
    let expr;
    let atom;

    if (this.readOnly) {
        return false;
    }

    if (
        this.active.kind !==
        "expression"
    ) {
        return false;
    }

    expr = this.getCurrentExpression();

    atom = this.lastAtom(expr);

    if (!atom) {
        return false;
    }

    /*
     * A power cannot itself immediately
     * receive another power.
     */
    /* nor a division (its value would read a/b^2): (a/b)² needs brackets */
    if (
        atom.type === "power" ||
        atom.type === "power10" ||
        atom.type === "divide"
    ) {
        return false;
    }

    return true;
};

MoodleStemKeyboard.prototype.insertFixedPower = function () {
    let expr;
    let base;
    let power;

    if (!this.canInsertPower()) {
        return;
    }

    expr = this.getCurrentExpression();

    base = expr.items.pop();

    power = makePower(
            base,
            2
        );

    expr.items.push(power);

    /*
     * x² is complete immediately.
     */
    this.setActiveExpression(
        expr
    );

    this.render();
};

MoodleStemKeyboard.prototype.insertPower = function () {
    let expr;
    let base;
    let power;

    if (!this.canInsertPower()) {
        return;
    }

    expr = this.getCurrentExpression();

    base = expr.items.pop();

    power = makePower(base);

    expr.items.push(power);

    /*
     * The cursor now lives structurally
     * inside the exponent expression.
     */
    this.setActiveExpression(
        power.exponent
    );

    this.render();
};

/* ============================================================
   SUBSCRIPT
   ============================================================ */

MoodleStemKeyboard.prototype.canInsertSubscript = function () {
    let expr;
    let atom;

    if ( !this.allowSubscript || this.readOnly ) {
        return false;
    }

    if ( this.active.kind !== "expression" ) {
        return false;
    }
    expr = this.getCurrentExpression();
    atom = this.lastAtom(expr);

    /*
     * Subscript is currently defined only
     * for a variable.
     */
    if ( !atom || atom.type !== "variable" ) {
        return false;
    }

    return true;
};

MoodleStemKeyboard.prototype.insertSubscript = function () {
    let expr;
    let base;
    let sub;

    if (
        !this.canInsertSubscript()
    ) {
        return;
    }

    expr = this.getCurrentExpression();

    base = expr.items.pop();

    sub = makeSubscript(base);

    expr.items.push(sub);

    this.setActiveNumber(
        sub.index,
        "subscript",
        sub.id
    );

    this.render();
};

/* ============================================================
   ×10^n
   ============================================================ */

MoodleStemKeyboard.prototype.canInsertPower10 = function () {
    let expr;
    let atom;

    if (
        !this.power10 ||
        this.readOnly
    ) {
        return false;
    }

    if (
        this.active.kind !==
        "expression"
    ) {
        return false;
    }

    expr = this.getCurrentExpression();

    atom = this.lastAtom(expr);

    /*
     * ×10^n requires a value before it.
     */
    return !!atom;
};

MoodleStemKeyboard.prototype.insertPowerOf10 = function () {
    let expr;
    let p10;

    if (
        !this.canInsertPower10()
    ) {
        return;
    }

    expr = this.getCurrentExpression();

    /*
     * The multiplication belongs to the AST.
     * No hidden text marker is needed.
     */
    expr.items.push(
        makeOperator(
            "*",
            false
        )
    );

    p10 = makePower10();

    expr.items.push(p10);

    /*
     * Only digits are accepted while this
     * numeric exponent node is active.
     */
    this.setActiveNumber(
        p10.exponent,
        "pow10",
        p10.id
    );

    this.render();
};

/* ============================================================
   FRACTION / MIXED FRACTION
   ============================================================ */

MoodleStemKeyboard.prototype.canInsertFraction = function () {
    let expr;
    let last;

    if (this.readOnly) {
        return false;
    }

    if (
        this.active.kind !==
        "expression"
    ) {
        return false;
    }

    expr = this.getCurrentExpression();

    last = this.lastItem(expr);

    /*
     * Beginning of an expression:
     * create an ordinary fraction.
     */
    if (!last) {
        return true;
    }

    /*
     * Immediately after an operator:
     * create an ordinary fraction.
     */
    if (
        last.type === "operator"
    ) {
        return true;
    }

    /*
     * Immediately after an integer:
     * convert that number into the whole
     * part of a mixed fraction.
     */
    if (
        last.type === "number" &&
        last.value.indexOf(".") < 0
    ) {
        return true;
    }

    return false;
};

MoodleStemKeyboard.prototype.insertMixedFractionPart = function () {
    let expr;
    let last;
    let frac;
    let whole;

    if (
        !this.canInsertFraction()
    ) {
        return;
    }

    expr = this.getCurrentExpression();

    last = this.lastItem(expr);

    if (
        last &&
        last.type === "number" &&
        last.value.indexOf(".") < 0
    ) {
        /*
         * Example:
         * user typed 4 and then presses
         * the fraction key.
         *
         * The number node becomes the whole
         * part of a mixedFraction node.
         */
        whole = last.value;

        expr.items.pop();

        frac = makeMixedFraction(
                whole
            );
    } else {
        frac = makeFraction();
    }

    expr.items.push(frac);

    this.setActiveNumber(
        frac.numerator,
        "fractionNum",
        frac.id
    );

    this.render();
};

/* ============================================================
   DELETE
   ============================================================ */

MoodleStemKeyboard.prototype.deleteOne = function () {
    let activeNode = this.getActiveNode();
    let owner;
    let expr;
    let last;
    let info;
    let index;

    if (this.readOnly) return;

    /*
     * Numeric child nodes
     */
    if (this.active.kind === "number" && activeNode && activeNode.type === "number") {

        /*
         * POWER OF 10
         * Delete exponent digits one at a time.
         * When empty, next DEL removes *10^ completely.
         */
        if (this.active.role === "pow10") {
            if (activeNode.value.length > 0) {
                activeNode.value = activeNode.value.substring(0, activeNode.value.length - 1);
                this.render();
                return;
            }

            owner = this.active.ownerId ? findNodeById(this.ast, this.active.ownerId) : null;

            if (owner) {
                expr = findOwningExpression(this.ast, owner.id);

                if (expr) {
                    info = findParentInfo(this.ast, owner.id);

                    if (info && info.parent === expr && info.field === "items") {
                        index = info.index;

                        if (index > 0 &&
                            expr.items[index - 1].type === "operator" &&
                            expr.items[index - 1].op === "*") {
                            expr.items.splice(index - 1, 2);
                        } else {
                            expr.items.splice(index, 1);
                        }

                        this.setActiveExpression(expr);
                    }
                }
            }

            this.render();
            return;
        }

        /*
         * SUBSCRIPT
         * Delete index digits one at a time.
         * When empty, next DEL removes the subscript
         * and restores the base variable.
         */
        if (this.active.role === "subscript") {
            if (activeNode.value.length > 0) {
                activeNode.value = activeNode.value.substring(0, activeNode.value.length - 1);
                this.render();
                return;
            }

            owner = this.active.ownerId ? findNodeById(this.ast, this.active.ownerId) : null;

            if (owner) {
                expr = findOwningExpression(this.ast, owner.id);

                if (expr) {
                    info = findParentInfo(this.ast, owner.id);

                    if (info && info.parent === expr && info.field === "items") {
                        expr.items[info.index] = owner.base;
                        this.setActiveExpression(expr);
                    }
                }
            }

            this.render();
            return;
        }

        /*
         * FRACTION / MIXED FRACTION
         * Delete numerator or denominator digits one at a time.
         * If the field is already empty, next DEL removes
         * the complete fraction object.
         */
        if (this.active.role === "fractionNum" || this.active.role === "fractionDen") {
            if (activeNode.value.length > 0) {
                activeNode.value = activeNode.value.substring(0, activeNode.value.length - 1);
                this.render();
                return;
            }

            owner = this.active.ownerId ? findNodeById(this.ast, this.active.ownerId) : null;

            if (owner) {
                expr = findOwningExpression(this.ast, owner.id);

                if (expr) {
                    info = findParentInfo(this.ast, owner.id);

                    if (info && info.parent === expr && info.field === "items") {
                        index = info.index;
                        expr.items.splice(index, 1);

                        /*
                         * If the fraction was preceded by implicit
                         * multiplication, remove that too.
                         */
                        if (index > 0 &&
                            expr.items[index - 1] &&
                            expr.items[index - 1].type === "operator" &&
                            expr.items[index - 1].op === "*" &&
                            expr.items[index - 1].implicit === true) {
                            expr.items.splice(index - 1, 1);
                        }

                        this.setActiveExpression(expr);
                    }
                }
            }

            this.render();
            return;
        }

        /*
         * Generic numeric field
         */
        if (activeNode.value.length > 0) {
            activeNode.value = activeNode.value.substring(0, activeNode.value.length - 1);
            this.render();
            return;
        }
    }

    /*
     * Cursor is inside a nested expression node
     * (group, sqrt, exponent). Top-level equation parts
     * fall through to the base expression deletion below.
     */
    if (this.active.kind === "expression" && activeNode && activeNode.type === "expression" &&
        this.ast.parts.indexOf(activeNode) === -1) {

        if (activeNode.items.length > 0) {
            last = activeNode.items[activeNode.items.length - 1];

            /*
             * A division: back into its denominator, deleting its last character (7/3 -> 7/).
             */
            if (last.type === "divide") {
                this.setActiveExpression(last.denominator);
                this.deleteOne();
                return;
            }

            /*
             * Numbers are deleted digit by digit.
             */
            else if (last.type === "number" && last.value.length > 1) {
                last.value = last.value.substring(0, last.value.length - 1);
            } else {
                /*
                 * Remove the complete last structural node.
                 */
                activeNode.items.pop();

                /*
                 * If that node was preceded by implicit multiplication,
                 * remove the implicit multiplication as well.
                 *
                 * Example:
                 * 8*x  where * is implicit
                 * DEL on x -> 8
                 */
                if (activeNode.items.length > 0) {
                    let previous = activeNode.items[activeNode.items.length - 1];

                    if (previous.type === "operator" &&
                        previous.op === "*" &&
                        previous.implicit === true) {
                        activeNode.items.pop();
                    }
                }
            }

            this.render();
            return;
        }

        /*
         * Empty nested expression:
         * determine which structure owns it.
         */
        info = findParentInfo(this.ast, activeNode.id);

        if (info) {
            owner = info.parent;
            expr = findOwningExpression(this.ast, owner.id);

            /*
             * Empty ordinary group:
             * remove the complete group.
             */
            if (owner.type === "group") {
                if (expr) {
                    let groupInfo = findParentInfo(this.ast, owner.id);

                    if (groupInfo && groupInfo.parent === expr && groupInfo.field === "items") {
                        index = groupInfo.index;
                        expr.items.splice(index, 1);

                        if (index > 0 &&
                            expr.items[index - 1] &&
                            expr.items[index - 1].type === "operator" &&
                            expr.items[index - 1].op === "*" &&
                            expr.items[index - 1].implicit === true) {
                            expr.items.splice(index - 1, 1);
                        }

                        this.setActiveExpression(expr);
                    }
                }
            }

            /*
             * Empty sqrt:
             * remove the complete sqrt node.
             */
            else if (owner.type === "sqrt") {
                if (expr) {
                    let sqrtInfo = findParentInfo(this.ast, owner.id);

                    if (sqrtInfo && sqrtInfo.parent === expr && sqrtInfo.field === "items") {
                        index = sqrtInfo.index;
                        expr.items.splice(index, 1);

                        if (index > 0 &&
                            expr.items[index - 1] &&
                            expr.items[index - 1].type === "operator" &&
                            expr.items[index - 1].op === "*" &&
                            expr.items[index - 1].implicit === true) {
                            expr.items.splice(index - 1, 1);
                        }

                        this.setActiveExpression(expr);
                    }
                }
            }

            /*
             * Empty denominator:
             * remove the division, the numerator stays (7/ DEL -> 7).
             */
            else if (owner.type === "divide") {
                if (expr) {
                    let divideInfo = findParentInfo(this.ast, owner.id);

                    if (divideInfo && divideInfo.parent === expr && divideInfo.field === "items") {
                        Array.prototype.splice.apply(
                            expr.items,
                            [divideInfo.index, 1].concat(owner.numerator.items)
                        );
                        this.setActiveExpression(expr);
                    }
                }
            }

            /*
             * Empty exponent:
             * remove the power operation but preserve the base.
             */
            else if (owner.type === "power") {
                if (expr) {
                    let powerInfo = findParentInfo(this.ast, owner.id);

                    if (powerInfo && powerInfo.parent === expr && powerInfo.field === "items") {
                        expr.items[powerInfo.index] = owner.base;
                        this.setActiveExpression(expr);
                    }
                }
            }
        }

        this.render();
        return;
    }

    /*
     * Base expression structural deletion
     */
    expr = this.getCurrentExpression();

    /*
     * Empty equation part:
     * remove the preceding "=" by removing this part.
     */
    if (!expr.items.length) {
        index = this.ast.parts.indexOf(expr);

        if (index > 0) {
            this.ast.parts.splice(index, 1);
            this.setActiveExpression(this.ast.parts[index - 1]);
        }

        this.render();
        return;
    }

    last = expr.items[expr.items.length - 1];

    /*
     * Number -> delete one digit.
     */
    if (last.type === "number" && last.value.length > 1) {
        last.value = last.value.substring(0, last.value.length - 1);
    }

    /*
     * Ordinary closed group:
     * first DEL removes only the closing parenthesis
     * and puts the cursor inside the group.
     */
    else if (last.type === "group") {
        if (last.closed) last.closed = false;
        this.setActiveExpression(last.expr);
    }

    /*
     * Division:
     * DEL goes back into the denominator and deletes its last character (7/3 -> 7/).
     */
    else if (last.type === "divide") {
        this.setActiveExpression(last.denominator);
        this.deleteOne();
        return;
    }

    /*
     * Other structural nodes:
     * delete the whole node.
     */
    else {
        expr.items.pop();

        /*
         * Remove preceding implicit multiplication as well.
         */
        if (expr.items.length > 0) {
            let previous = expr.items[expr.items.length - 1];

            if (previous.type === "operator" &&
                previous.op === "*" &&
                previous.implicit === true) {
                expr.items.pop();
            }
        }
    }

    this.render();
};

/* ============================================================
   CLEAR
   ============================================================ */

MoodleStemKeyboard.prototype.clearAll = function () {
    this.ast = makeEquation();

    this.setActiveExpression(
        this.ast.parts[0]
    );

    this.unitValue = "";
    this.unitScale = 1;
    this.selectedUnit = null;

    this.render();
};

/* ============================================================
   GENERIC INSERT
   ============================================================ */

MoodleStemKeyboard.prototype.insertText = function (txt) {
    if (
        txt === null ||
        txt === undefined ||
        txt === ""
    ) {
        return;
    }

    if (isDigit(txt)) {
        this.insertDigit(txt);
        return;
    }

    if (txt === ".") {
        this.insertDecimal();
        return;
    }

    if (
        txt === "+" ||
        txt === "-" ||
        txt === "*" ||
        txt === "/"
    ) {
        this.insertOperator(txt);
        return;
    }

    if (txt === "=") {
        this.insertEquals();
        return;
    }

    if (txt === "PI") {
        this.insertPi();
        return;
    }

    if (txt === "SQRT()") {
        this.insertSqrt();
        return;
    }

    if (txt === "(") {
        this.insertOpenParenthesis();
        return;
    }

    if (txt === ")") {
        this.insertCloseParenthesis();
        return;
    }

    if (
        this.allowAlgebra &&
        (
            findVariableDefinition(
                this.variableDefinitions,
                txt
            ) ||
            (
                this.variableMode === "A-Z" &&
                isLetter(txt)
            )
        )
    ) {
        this.insertVariable(txt);
    }
};

/* ============================================================
   PHYSICAL KEYBOARD
   ============================================================ */

MoodleStemKeyboard.prototype.handlePhysicalKey = function (e) {
    let key = e.key;
    let handled = false;

    if (this.readOnly) return;

    if (key === "Escape") {
        this.hideKeyboard();
        handled = true;
    }

    else if (isDigit(key)) {
        this.insertDigit(key);
        handled = true;
    }

    else if (
        key === "Enter" ||
        key === " "
    ) {
        handled = true;
    }

    else if (key === ".") {
        this.insertDecimal();
        handled = true;
    }

    else if (
        key === "+" ||
        key === "-" ||
        key === "*"
    ) {
        this.insertOperator(key);
        handled = true;
    }

    else if (key === "/") {
        this.insertOperator("/");
        handled = true;
    }

    else if (key === "=") {
        if (this.maxEquals > 0) {
            this.insertEquals();
        }

        handled = true;
    }

    else if (key === "^") {
        if (this.canInsertPower()) {
            this.insertPower();
        }

        handled = true;
    }

    else if (key === "(") {
        this.insertOpenParenthesis();
        handled = true;
    }

    else if (key === ")") {
        if (
            this.canInsertCloseParenthesis()
        ) {
            this.insertCloseParenthesis();
        }

        handled = true;
    }

    else if (
        key === "Backspace" ||
        key === "Delete"
    ) {
        this.deleteOne();
        handled = true;
    }

    else if (
        key === "ArrowRight"
    ) {
        this.exitActiveStructure();
        handled = true;
    }

    else if (
        this.isPhysicalVariableAllowed(
            key
        )
    ) {
        this.insertVariable(key);
        handled = true;
    }

    if (handled) {
        e.preventDefault();
        e.stopPropagation();
    }
};

MoodleStemKeyboard.prototype.isPhysicalVariableAllowed = function (key) {
    let i;

    if (
        !this.allowAlgebra ||
        !isLetter(key)
    ) {
        return false;
    }

    if (
        this.variableMode === "A-Z"
    ) {
        return true;
    }

    /*
     * Only single-letter configured variables
     * can be typed from the physical keyboard.
     *
     * Variables such as alpha, ab and t_0
     * are intentionally keyboard-button only.
     */
    for (
        i = 0;
        i < this.variableDefinitions.length;
        i++
    ) {
        if (
            this.variableDefinitions[i].value === key &&
            this.variableDefinitions[i].value.length === 1
        ) {
            return true;
        }
    }

    return false;
};

/* ============================================================
   MOODLE VALUE
   ============================================================ */

function isCompleteExpression(expr) {
    let items = expr.items;
    let i;
    let item;
    let expectingAtom = true;

    if (!items || items.length === 0) {
        return false;
    }

    for (i = 0; i < items.length; i++) {
        item = items[i];

        if (expectingAtom) {
            /*
             * Unary + or - is permitted only at
             * the beginning of the expression.
             */
            if (
                i === 0 &&
                item.type === "operator" &&
                (
                    item.op === "+" ||
                    item.op === "-"
                )
            ) {
                continue;
            }

            if (!isAtom(item)) {
                return false;
            }

            if (!isCompleteNode(item)) {
                return false;
            }

            expectingAtom = false;
        } else {
            if (
                item.type !== "operator"
            ) {
                return false;
            }

            expectingAtom = true;
        }
    }

    return !expectingAtom;
}

function isCompleteNode(node) {
    let i;

    if (!node) return false;

    if (node.type === "number") {
        return node.value !== "";
    }

    if (
        node.type === "variable" ||
        node.type === "constant"
    ) {
        return true;
    }

    if (node.type === "expression") {
        return isCompleteExpression(node);
    }

    if (node.type === "group") {
        return node.closed &&
            isCompleteExpression(
                node.expr
            );
    }

    if (node.type === "fraction") {
        return node.numerator.value !== "" &&
            node.denominator.value !== "";
    }

    if (node.type === "mixedFraction") {
        return node.whole.value !== "" &&
            node.numerator.value !== "" &&
            node.denominator.value !== "";
    }

    if (node.type === "divide") {
        return isCompleteExpression(node.numerator) &&
            isCompleteExpression(node.denominator);
    }

    if (node.type === "sqrt") {
        return isCompleteExpression(
            node.radicand
        );
    }

    if (node.type === "power") {
        if (node.fixed) {
            return isCompleteNode(
                node.base
            ) &&
            isCompleteNode(
                node.exponent
            );
        }

        return isCompleteNode(
            node.base
        ) &&
        isCompleteExpression(
            node.exponent
        );
    }

    if (node.type === "power10") {
        return node.exponent.value !== "";
    }

    if (node.type === "subscript") {
        return isCompleteNode(
            node.base
        ) &&
        node.index.value !== "";
    }

    if (node.type === "equation") {
        if (
            !node.parts ||
            node.parts.length === 0
        ) {
            return false;
        }

        for (
            i = 0;
            i < node.parts.length;
            i++
        ) {
            if (
                !isCompleteExpression(
                    node.parts[i]
                )
            ) {
                return false;
            }
        }

        return true;
    }

    return false;
}

MoodleStemKeyboard.prototype.getValueForMoodle = function () {
    if (
        !isCompleteNode(
            this.ast
        )
    ) {
        return "";
    }

    return serializeNode(
        this.ast
    );
};

MoodleStemKeyboard.prototype.getValue = function () {
    return this.getValueForMoodle();
};

MoodleStemKeyboard.prototype.setValueFromMoodle = function (data) {
    let value = "";

    if (
        typeof data === "string"
    ) {
        value = data;
    }

    else if (
        data &&
        typeof data === "object"
    ) {
        value = typeof data.expression ===
                "string"
                ? data.expression
                : "";

        if (this.withUnits) {
            this.unitValue = typeof data.unit ===
                    "string"
                    ? data.unit
                    : "";

            this.unitScale = typeof data.scale ===
                    "number"
                    ? data.scale
                    : 1;
        }
    }

    this.ast = buildDivides(
            parseToAst(
                value,
                this.variables,
                this.variableMode
            )
        );

    this.setActiveExpression(
        this.ast.parts[
            this.ast.parts.length - 1
        ]
    );
};

MoodleStemKeyboard.prototype.setValue = function (s) {
    this.setValueFromMoodle(s);
    this.render();
};

MoodleStemKeyboard.prototype.updateMoodleTarget = function () {
    let moodleValue = this.getValueForMoodle();

    let el;

    if (this.setParamFunc) {
        this.setParamFunc(
            moodleValue,
            this.unitValue || "",
            this.unitValue
                ? this.unitScale
                : 1
        );
    }

    if (!this.moodleTargetId) {
        return;
    }

    el = document.getElementById(
            this.moodleTargetId
        );

    if (!el) return;

    el.value = moodleValue;

    el.setAttribute(
        "dir",
        "ltr"
    );

    el.style.direction = "ltr";

    el.style.textAlign = "left";

    el.style.unicodeBidi = "plaintext";
};

/* ============================================================
   RENDERING
   ============================================================ */

MoodleStemKeyboard.prototype.render = function () {
    let latex = this.latexNode(
            this.ast,
            this.readOnly
                ? null
                : this.active
        );

    let unitLatex = this.getUnitLatex();

    if (!this.display) {
        return;
    }

    if (unitLatex) {
        latex +=
            "\\quad " + unitLatex;
    }

    this.display.innerHTML = "\\(" + latex + "\\)";

    this.hasError = !isEmptyAnswer(this.ast) && !isCompleteNode(this.ast);

    if (this.showErrors && this.hasError) {
        this.display.innerHTML += " ❗";
    }

    if (window.MathJax) {
        if ( typeof window.MathJax.typesetClear === "function" ) {
            window.MathJax.typesetClear( [this.display]  );
        }

        if (
            typeof window.MathJax.typesetPromise ===
            "function"
        ) {
            window.MathJax.typesetPromise(
                [this.display]
            );
        }

        else if (
            window.MathJax.Hub &&
            typeof window.MathJax.Hub.Queue ===
                "function"
        ) {
            window.MathJax.Hub.Queue(
                [
                    "Typeset",
                    window.MathJax.Hub,
                    this.display
                ]
            );
        }
    }

    this.updateButtonStates();
    this.updateMoodleTarget();
};

MoodleStemKeyboard.prototype.waitForMathJax = function () {
    let self = this;

    function checkMathJax() {
        if (
            window.MathJax &&
            (
                typeof window.MathJax.typesetPromise ===
                    "function" ||
                (
                    window.MathJax.Hub &&
                    typeof window.MathJax.Hub.Queue ===
                        "function"
                )
            )
        ) {
            if (self.display) {
                if (
                    typeof window.MathJax.typesetClear ===
                    "function"
                ) {
                    window.MathJax.typesetClear(
                        [self.display]
                    );
                }

                if (
                    typeof window.MathJax.typesetPromise ===
                    "function"
                ) {
                    window.MathJax.typesetPromise(
                        [self.display]
                    );
                } else {
                    window.MathJax.Hub.Queue(
                        [
                            "Typeset",
                            window.MathJax.Hub,
                            self.display
                        ]
                    );
                }
            }
        } else {
            setTimeout(
                checkMathJax,
                100
            );
        }
    }

    checkMathJax();
};

/* ============================================================
   INITIALIZATION
   ============================================================ */

MoodleStemKeyboard.prototype.init = function () {
    let host = document.getElementById(
            this.divId
        );

    let self = this;
    let initialValue = null;

    if (!host) return;

    this.root = document.createElement(
            "div"
        );

    this.root.style.position = "relative";

    this.root.style.fontFamily = "Arial, sans-serif";

    this.root.tabIndex = -1;

    if (this.inline) {
        this.root.style.display = "inline-block";
        this.root.style.verticalAlign = "middle";
        this.root.style.outline = "none";
    }

    this.root.onkeydown = function (e) {
        self.handlePhysicalKey(e);
    };

    host.appendChild(
        this.root
    );

    /*
     * Existing display supplied by harness.
     */
    if (this.displayId) {
        this.display = document.getElementById(
                this.displayId
            );

        this.externalDisplay = true;
    }

    /*
     * Otherwise create the display.
     */
    else {
        this.display = document.createElement(
                "div"
            );

        this.display.style.width = this.displayWidth + "px";

        this.display.style.minHeight = "44px";

        this.display.style.border = "1px solid #999";

        this.display.style.borderRadius = "6px";

        this.display.style.padding = "8px";

        this.display.style.cursor = "pointer";

        this.display.style.background = "#fff";

        this.display.style.fontSize = "22px";

        this.display.style.boxSizing = "border-box";

        this.display.style.overflowX = "auto";

        /* inline: one line high, as wide as the answer (or displayWidth) */
        if (this.inline) {
            this.display.style.display = "inline-block";
            this.display.style.verticalAlign = "middle";
            this.display.style.width = this.inlineWidth ? this.inlineWidth + "px" : "auto";
            this.display.style.minWidth = "3em";
            this.display.style.maxWidth = "100%";
            this.display.style.minHeight = "1.8em";
            this.display.style.padding = "4px 6px";
            this.display.style.fontSize = "1.15em";
            this.display.style.whiteSpace = "nowrap";
            this.display.style.overflowY = "hidden";     // grows with a fraction; no vertical scroll arrows
        }

        this.root.appendChild(
            this.display
        );

        this.externalDisplay = false;
    }

    if (!this.display) return;

    this.display.tabIndex = 0;

    this.display.style.direction = "ltr";

    this.display.style.textAlign = "left";

    this.display.onclick = function (e) {
        e.stopPropagation();

        if (!self.readOnly) {
            self.showKeyboard();
        }
    };

    if (
        this.showKeyboardButton &&
        !this.readOnly
    ) {
        this.createKeyboardButton();
    }

    this.popup = document.createElement(
            "div"
        );

    this.popup.style.position = this.externalDisplay
            ? "static"
            : "absolute";

    if (!this.externalDisplay) {
        this.popup.style.left = "0px";

        this.popup.style.top = this.inline ? "100%" : "55px";
    }

    if (this.inline) {
        this.popup.style.marginTop = "4px";
        this.popup.style.textAlign = "left";
        this.popup.style.whiteSpace = "normal";
    }

    this.popup.style.width = "360px";

    this.popup.style.border = "1px solid #555";

    this.popup.style.borderRadius = "8px";

    this.popup.style.background = "#f7f7f7";

    this.popup.style.padding = "6px";

    this.popup.style.boxShadow = "0 3px 12px rgba(0,0,0,0.25)";

    this.popup.style.zIndex = "99999";

    this.popup.style.display = "none";

    this.popup.onclick = function (e) {
        e.stopPropagation();
    };

    this.root.appendChild(
        this.popup
    );

    this.buildKeyboard();

    if (this.getParamFunc) {
        initialValue = this.getParamFunc();
    }

    if (
        initialValue !== null &&
        initialValue !== undefined
    ) {
        this.setValueFromMoodle(
            initialValue
        );
    }

    this.render();
    this.waitForMathJax();

    document.addEventListener(
        "click",
        function () {
            self.hideKeyboard();
        }
    );
};

/* ============================================================
   KEYBOARD ICON BUTTON
   ============================================================ */

MoodleStemKeyboard.prototype.createKeyboardButton = function () {
    let self = this;

    let wrapper = document.createElement("div");
    let button = document.createElement("button");
    let parent = this.display.parentNode;
    wrapper.style.display = "inline-flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "6px";

    /*
     * Keep icon/display positioning independent
     * of Moodle RTL page direction.
     */
    wrapper.style.direction = "ltr";
    parent.insertBefore(
        wrapper,
        this.display
    );

    button.type = "button";
    button.innerHTML = "⌨️";
    button.title = this.texts.openKeyboard;
    button.style.border = "none";
    button.style.background = "transparent";
    button.style.padding = "0";
    button.style.margin = "0";
    button.style.fontSize = this.inline ? "1.5em" : "36px";
    button.style.lineHeight = "1";
    button.style.cursor = "pointer";
    button.onclick = function (e) {
        e.stopPropagation();
        self.showKeyboard();
        self.root.focus();
    };

    wrapper.appendChild(button);
    wrapper.appendChild(this.display);
    this.keyboardButton = button;
};

/* ============================================================
   BUTTON CREATION
   ============================================================ */

MoodleStemKeyboard.prototype.addButton = function (
    parent,
    label,
    action,
    role,
    title
) {
    let self = this;

    let b = document.createElement(
            "button"
        );

    b.type = "button";

    b.innerHTML = "<big>&nbsp;" + label + "&nbsp;</big>";

    b.style.minWidth = "52px";

    b.style.height = "40px";

    b.style.margin = "2px";

    b.style.verticalAlign = "middle";

    b.style.backgroundColor = "#e0e0e0";

    b.style.border = "1px solid #555";

    b.style.borderRadius = "3px";

    if (title) {
        b.title = title;
    }

    if (role) {
        b.setAttribute(
            "data-role",
            role
        );
    }

    b.onclick = function (e) {
        e.stopPropagation();

        action(e);

        if (self.root) {
            self.root.focus();
        }
    };

    parent.appendChild(b);

    return b;
};

/* ============================================================
   MAIN KEYBOARD UI
   ============================================================ */

MoodleStemKeyboard.prototype.buildKeyboard = function () {
    let self = this;

    let title = document.createElement(
            "div"
        );

    let fnRow = document.createElement(
            "div"
        );

    let rows;
    let table;
    let r;
    let c;
    let tr;
    let td;
    let label;
    let closeButton;

    title.style.direction = "ltr";
    title.style.background = "#ddd";
    title.style.padding = "4px";
    title.style.borderRadius = "5px";
    title.style.marginBottom = "6px";
    title.innerHTML = "<table width='100%' cellpadding='0' cellspacing='0'>" +
        "<tr>" +
        "<td>Math Keyboard ⌨️</td>" +
        "<td align='right'>" +
        "<button type='button'>&#9746;</button>" +
        "</td>" +
        "</tr>" +
        "</table>";

    closeButton = title.getElementsByTagName(
            "button"
        )[0];

    closeButton.title = this.texts.closeKeyboard;
    closeButton.style.border = "none";
    closeButton.style.background = "transparent";
    closeButton.style.padding = "0";
    closeButton.style.fontSize = "20px";
    closeButton.style.cursor = "pointer";
    closeButton.onclick = function () {
        self.hideKeyboard();
    };

    this.popup.appendChild(
        title
    );

    /*
     * Internal display -> floating keyboard
     * can be dragged.
     */
    if (!this.externalDisplay) {
        title.style.cursor = "move";

        title.onmousedown = function (e) {
            let dx = e.clientX -
                self.popup.offsetLeft;

            let dy = e.clientY -
                self.popup.offsetTop;

            document.onmousemove = function (ev) {
                self.popup.style.left = (
                        ev.clientX - dx
                    ) + "px";

                self.popup.style.top = (
                        ev.clientY - dy
                    ) + "px";
            };

            document.onmouseup = function () {
                document.onmousemove = null;

                document.onmouseup = null;
            };
        };
    } else {
        title.style.cursor = "default";
    }

    /*
     * Function row is always LTR,
     * including inside Hebrew Moodle.
     */
    fnRow.style.marginBottom = "5px";
    fnRow.style.direction = "ltr";
    fnRow.style.textAlign = "left";
    this.popup.appendChild(
        fnRow
    );

    /*
     * Requested order:
     *
     * fraction
     * parentheses
     * sqrt
     * x²
     * x^
     * subscript
     * variables
     * pi
     * units
     */

    this.addButton(
        fnRow,
        "<span style='display:inline-block;text-align:center;" +
        "line-height:11px;min-width:18px;'>" +
        "<span style='display:block;'>□</span>" +
        "<span style='display:block;border-top:1px solid black;" +
        "width:18px;height:1px;position:relative;top:2px;'></span>" +
        "<span style='display:block;'>□</span>" +
        "</span>",
        function () {
            self.insertMixedFractionPart();
        },
        "fractionKey",
        this.texts.mixedFraction
    );

    this.addButton(
        fnRow,
        "(",
        function () {
            self.insertOpenParenthesis();
        },
        "openParenKey"
    );

    this.addButton(
        fnRow,
        ")",
        function () {
            self.insertCloseParenthesis();
        },
        "closeParenKey"
    );

    this.addButton(
        fnRow,
        "√",
        function () {
            self.insertSqrt();
        },
        "sqrtKey"
    );

    this.addButton(
        fnRow,
        "x²",
        function () {
            self.insertFixedPower();
        },
        "powerFixed"
    );

    this.addButton(
        fnRow,
        "x<sup>□</sup>",
        function () {
            self.insertPower();
        },
        "powerAny"
    );

    if (this.allowSubscript) {
        this.addButton(
            fnRow,
            "x<sub>□</sub>",
            function () {
                self.insertSubscript();
            },
            "subscriptKey",
            this.texts.subscript
        );
    }
    /*
     * PI is controlled independently.
     */
    if (this.showPi) {
        this.addButton(
            fnRow,
            "\\(\\pi\\)",
            function () {
                self.insertPi();
            },
            "piKey"
        );
    }

    /*
     * Variable buttons.
     */
    if (this.allowAlgebra) {
        if (
            this.variableMode ===
            "A-Z"
        ) {
            this.addButton(
                fnRow,
                "A-Z",
                function () {
                    self.showVariables();
                },
                "variablePanelKey",
                this.texts.variables
            );
        } else {
            this.addVariableButtons(
                fnRow
            );
        }
    }

 
    if (this.withUnits) {
        this.addButton(
            fnRow,
            this.unitsKeyLabel, // "UNITS",
            function () {
                self.showUnits();
            },
            "unitsKey",
            this.texts.units
        );
    }

    /*
     * Numeric keypad.
     *
     * Empty cells are intentionally preserved
     * so ↱ remains in a fixed position.
     */
    rows = [
        ["7", "8", "9", "DEL", "AC"],
        ["4", "5", "6", "*", "/"],
        ["1", "2", "3", "+", "-"],

        [
            "0",
            ".",

            this.power10
                ? "POWER10"
                : "",

            this.maxEquals > 0
                ? "="
                : "",

            "↱"
        ]
    ];

    table = document.createElement(
            "table"
        );

    table.style.borderCollapse = "separate";

    table.style.borderSpacing = "4px";

    table.style.direction = "ltr";

    this.popup.appendChild(
        table
    );

    for (
        r = 0;
        r < rows.length;
        r++
    ) {
        tr = document.createElement(
                "tr"
            );

        table.appendChild(tr);

        for (
            c = 0;
            c < rows[r].length;
            c++
        ) {
            td = document.createElement(
                    "td"
                );

            td.style.width = "62px";

            tr.appendChild(td);

            label = rows[r][c];

            this.addKeyToCell(
                td,
                label
            );
        }
    }
};

/* ============================================================
   VARIABLE BUTTONS
   ============================================================ */

MoodleStemKeyboard.prototype.addVariableButtons = function (parent) {
    let self = this;
    let vars = this.variableDefinitions;
    let i;
    let v;

    /*
     * Always align variables to the left,
     * regardless of Moodle page direction.
     */
    parent.style.direction = "ltr";

    parent.style.textAlign = "left";

    for (
        i = 0;
        i < vars.length;
        i++
    ) {
        v = vars[i];

        this.addButton(
            parent,

            "\\(" + v.label + "\\)",

            (
                function (value) {
                    return function () {
                        self.insertVariable(
                            value
                        );
                    };
                }
            )(v.value),

            "variableKey"
        );
    }
};

/* ============================================================
   KEYPAD BUTTON
   ============================================================ */

MoodleStemKeyboard.prototype.addKeyToCell = function (td, label) {
    let self = this;
    let b;

    /*
     * Keep the table cell but do not create
     * a blank button.
     *
     * This preserves the keypad geometry.
     */
    if (label === "") {
        return;
    }

    b = document.createElement(
            "button"
        );

    b.type = "button";

    if (
        label === "POWER10"
    ) {
        b.innerHTML = "<big>&times;10<sup>□</sup></big>";

        b.title = this.texts.power10;

        b.setAttribute(
            "data-role",
            "power10Key"
        );
    }

    else if (
        label === "*"
    ) {
        b.innerHTML = "&nbsp;&nbsp;" + "<big>&times;</big>" + "&nbsp;&nbsp;";

        b.setAttribute(
            "data-role",
            "operatorKey"
        );
    }

    else {
        b.innerHTML = "<big>&nbsp;&nbsp;" + label + "&nbsp;&nbsp;</big>";
    }
    b.style.width = "62px";
    b.style.height = "42px";
    b.style.verticalAlign = "middle";

    if (
        label >= "0" &&
        label <= "9"
    ) {
        b.setAttribute(
            "data-role",
            "digitKey"
        );
    }

    if (label === ".") {
        b.setAttribute(
            "data-role",
            "decimalKey"
        );
    }

    if (label === "=") {
        b.setAttribute(
            "data-role",
            "equalsKey"
        );
    }

    if ( label === "+" || label === "-" || label === "/" || label === "*" ) {
        b.setAttribute(
            "data-role",
            "operatorKey"
        );
    }

    if (label === "↱") {
        b.title = this.texts.exit;
    }

    if (label === "AC") {
        b.title = this.texts.clearAll;
    }

    if (label === "DEL") {
        b.title = this.texts.deleteOne;
    }

    b.onclick = function (e) {
        e.stopPropagation();

        if (label === "DEL") { self.deleteOne(); }
        else if (label === "AC") { self.clearAll(); }
        else if (label === "↱") { self.exitActiveStructure(); }
        else if ( label === "POWER10" ) { self.insertPowerOf10(); }
        else if (label === "/") { self.insertOperator("/"); }
        else if (label === "=") { self.insertEquals(); }
        else if (label === ".") { self.insertDecimal(); }
        else if ( label === "+" || label === "-" || label === "*" ) {
            self.insertOperator( label );
        }
        else if ( isDigit(label) ) { self.insertDigit(label);}
        if (self.root) { self.root.focus(); }
    };

    td.appendChild(b);
};

/* ============================================================
   ENABLE / DISABLE KEYS
   ============================================================ */

MoodleStemKeyboard.prototype.updateButtonStates = function () {
    let buttons;
    let i;
    let role;

    let inPow10 = this.active.role === "pow10";

    if (!this.popup) return;

    buttons = this.popup.getElementsByTagName( "button");

    for ( i = 0; i < buttons.length; i++ ) {
        role = buttons[i].getAttribute( "data-role" );

        if ( role === "equalsKey" ) {
            buttons[i].disabled = !this.canInsertEquals();
        }
        else if ( role === "closeParenKey" ) {
            buttons[i].disabled = !this.canInsertCloseParenthesis();
        }
        else if ( role === "powerFixed" || role === "powerAny" ) {
            buttons[i].disabled = !this.canInsertPower();
        }
        else if ( role === "subscriptKey" ) {
            buttons[i].disabled = !this.canInsertSubscript();
        }
        else if ( role === "power10Key" ) {
            buttons[i].disabled = !this.canInsertPower10();
        }
        else if ( role === "sqrtKey" ) {
            /*
             * sqrt is disabled only while
             * actively inside the power10
             * exponent.
             */
            buttons[i].disabled = inPow10;
        }

        else if ( role === "fractionKey" ) {
            buttons[i].disabled = !this.canInsertFraction();
        }
    }
};

/* ============================================================
   SHOW / HIDE
   ============================================================ */

MoodleStemKeyboard.prototype.showKeyboard = function () {
    if (
        !this.popup ||
        this.readOnly
    ) {
        return;
    }

    this.popup.style.display = "block";

    if (this.inline && !this.externalDisplay) {
        this.keepPopupInPage();
    }

    if (this.inline) {
        this.root.focus({ preventScroll: true });
    } else {
        this.root.focus();
    }
};

/*
 * inline: the box can be anywhere in a line, so the keyboard under it may run past the right edge of the page -
 * shifted left to fit (not past the left edge).
 */
MoodleStemKeyboard.prototype.keepPopupInPage = function () {
    let pageWidth = document.documentElement.clientWidth;
    let rect;
    let shift;

    this.popup.style.left = "0px";
    rect = this.popup.getBoundingClientRect();
    shift = Math.min(
            Math.max(0, rect.right - (pageWidth - 8)),
            Math.max(0, rect.left - 8)
        );

    if (shift > 0) {
        this.popup.style.left = (-shift) + "px";
    }
};

MoodleStemKeyboard.prototype.hideKeyboard = function () {
    if (!this.popup) return;

    this.popup.style.display = "none";

    if (
        this.unitPanel &&
        this.unitPanel.parentNode
    ) {
        this.unitPanel.parentNode.removeChild(
            this.unitPanel
        );

        this.unitPanel = null;
    }

    if (
        this.variablePanel &&
        this.variablePanel.parentNode
    ) {
        this.variablePanel.parentNode.removeChild(
            this.variablePanel
        );

        this.variablePanel = null;
    }
};

/* ============================================================
   A-Z VARIABLE PANEL
   ============================================================ */

MoodleStemKeyboard.prototype.refreshVariablePanelLetters = function (panel) {
    let cells = panel.getElementsByTagName(
            "td"
        );

    let i;
    let b;
    let ch;

    let upper = this.varShift ||
        this.varCaps;

    for (
        i = 0;
        i < cells.length;
        i++
    ) {
        b = cells[i].getElementsByTagName(
                "button"
            )[0];

        if (
            b &&
            b.getAttribute(
                "data-var-letter"
            ) === "1"
        ) {
            ch = b.getAttribute(
                    "data-base-letter"
                );

            b.innerHTML = "<big>&nbsp;" +
                (
                    upper
                        ? ch
                        : ch.toLowerCase()
                ) + "&nbsp;</big>";
        }
    }
};

MoodleStemKeyboard.prototype.showVariables = function () {
    let self = this;

    let panel;
    let header;
    let table;
    let tr;
    let td;
    let i;
    let ch;
    let b;
    let shiftButton;
    let closeButton;

    if (
        this.variablePanel &&
        this.variablePanel.parentNode
    ) {
        this.variablePanel.parentNode.removeChild(
            this.variablePanel
        );

        this.variablePanel = null;
        return;
    }

    panel = document.createElement(
            "div"
        );

    panel.style.position = "absolute";

    panel.style.direction = "ltr";

    panel.style.textAlign = "left";

    panel.style.left = "10px";

    panel.style.top = "48px";

    panel.style.width = "330px";

    panel.style.background = "#fff";

    panel.style.border = "1px solid #999";

    panel.style.padding = "4px";

    panel.style.zIndex = "100000";

    panel.onclick = function (e) {
        e.stopPropagation();
    };

    header = document.createElement(
            "div"
        );

    header.innerHTML = "<table width='100%' cellpadding='0' cellspacing='0'>" +
        "<tr>" +
        "<td>Variables</td>" +
        "<td align='right'></td>" +
        "</tr>" +
        "</table>";

    panel.appendChild(
        header
    );

    closeButton = document.createElement(
            "button"
        );

    closeButton.type = "button";

    closeButton.innerHTML = "&#9746;";

    closeButton.title = this.texts.closeVariables;

    closeButton.style.border = "none";

    closeButton.style.background = "transparent";

    closeButton.style.padding = "0";

    closeButton.style.fontSize = "20px";

    closeButton.style.cursor = "pointer";

    closeButton.onclick = function () {
        if (panel.parentNode) {
            panel.parentNode.removeChild(
                panel
            );
        }

        self.variablePanel = null;
        self.root.focus();
    };

    header.getElementsByTagName(
        "td"
    )[1].appendChild(
        closeButton
    );

    shiftButton = document.createElement(
            "button"
        );

    shiftButton.type = "button";

    shiftButton.title = this.texts.shift;

    shiftButton.style.backgroundColor = "#e0e0e0";

    shiftButton.style.border = "1px solid #555";

    shiftButton.style.borderRadius = "3px";

    function refreshShiftButton() {
        if (self.varCaps) {
            shiftButton.innerHTML = "<big>&#8657;</big><br>" +
                "<span style='display:block;border-top:2px solid black;" +
                "width:12px;margin:auto;'></span>";
        }

        else if (self.varShift) {
            shiftButton.innerHTML = "<big>⇧</big><br>" +
                "<span style='display:block;border-top:2px solid black;" +
                "width:12px;margin:auto;'></span>";
        }

        else {
            shiftButton.innerHTML = "<big>⇧</big><br>" +
                "<span style='display:block;border-top:2px solid #e0e0e0;" +
                "width:12px;margin:auto;'> </span>";
        }
    }

    refreshShiftButton();

    shiftButton.onclick = function (e) {
        e.stopPropagation();

        if (
            !self.varShift &&
            !self.varCaps
        ) {
            self.varShift = true;
        }

        else if (
            self.varShift &&
            !self.varCaps
        ) {
            self.varShift = false;
            self.varCaps = true;
        }

        else {
            self.varShift = false;
            self.varCaps = false;
        }

        refreshShiftButton();

        self.refreshVariablePanelLetters(
            panel
        );

        self.root.focus();
    };

    panel.appendChild(
        shiftButton
    );

    table = document.createElement(
            "table"
        );

    table.setAttribute(
        "cellpadding",
        "2"
    );

    table.setAttribute(
        "cellspacing",
        "2"
    );

    table.style.direction = "ltr";

    table.style.textAlign = "left";

    panel.appendChild(
        table
    );

    for (
        i = 65;
        i <= 90;
        i++
    ) {
        if (
            (i - 65) % 7 === 0
        ) {
            tr = document.createElement(
                    "tr"
                );

            table.appendChild(
                tr
            );
        }

        td = document.createElement(
                "td"
            );

        tr.appendChild(td);

        ch = String.fromCharCode(i);

        b = document.createElement(
                "button"
            );

        b.type = "button";

        b.setAttribute(
            "data-var-letter",
            "1"
        );

        b.setAttribute(
            "data-base-letter",
            ch
        );

        b.innerHTML = "<big>&nbsp;" + ch.toLowerCase() + "&nbsp;</big>";

        b.onclick = (
            function (base) {
                return function (e) {
                    let val;

                    e.stopPropagation();

                    val = (
                            self.varShift ||
                            self.varCaps
                        )
                            ? base
                            : base.toLowerCase();

                    self.insertVariable(
                        val
                    );

                    if (
                        self.varShift &&
                        !self.varCaps
                    ) {
                        self.varShift = false;

                        refreshShiftButton();

                        self.refreshVariablePanelLetters(
                            panel
                        );
                    }

                    self.root.focus();
                };
            }
        )(ch);

        td.appendChild(b);
    }

    this.variablePanel = panel;

    this.popup.appendChild(
        panel
    );
};

/* ============================================================
   DEFAULT UNITS
   ============================================================ */

MoodleStemKeyboard.prototype.getDefaultUnits = function () {
    return [
        {
            value: "mm",
            scale: 0.001,
            category: "measurements",
            group: "length",
            symbol: "mm",
            latex: "\\mathrm{mm}",
            en: "millimeter",
            he: "מילימטר",
            ar: "مليمتر"
        },

        {
            value: "cm",
            scale: 0.01,
            category: "measurements",
            group: "length",
            symbol: "cm",
            latex: "\\mathrm{cm}",
            en: "centimeter",
            he: "סנטימטר",
            ar: "سنتيمتر"
        },

        {
            value: "m",
            scale: 1,
            category: "measurements",
            group: "length",
            symbol: "m",
            latex: "\\mathrm{m}",
            en: "meter",
            he: "מטר",
            ar: "متر"
        },

        {
            value: "km",
            scale: 1000,
            category: "measurements",
            group: "length",
            symbol: "km",
            latex: "\\mathrm{km}",
            en: "kilometer",
            he: "קילומטר",
            ar: "كيلومتر"
        },

        {
            value: "cm^2",
            scale: 0.0001,
            category: "measurements",
            group: "area",
            symbol: "cm²",
            latex: "\\mathrm{cm^2}",
            en: "square centimeter",
            he: "סנטימטר רבוע",
            ar: "سنتيمتر مربع"
        },

        {
            value: "m^2",
            scale: 1,
            category: "measurements",
            group: "area",
            symbol: "m²",
            latex: "\\mathrm{m^2}",
            en: "square meter",
            he: "מטר רבוע",
            ar: "متر مربع"
        },

        {
            value: "km^2",
            scale: 1000000,
            category: "measurements",
            group: "area",
            symbol: "km²",
            latex: "\\mathrm{km^2}",
            en: "square kilometer",
            he: "קילומטר רבוע",
            ar: "كيلومتر مربع"
        },

        {
            value: "cm^3",
            scale: 0.000001,
            category: "measurements",
            group: "volume",
            symbol: "cm³",
            latex: "\\mathrm{cm^3}",
            en: "cubic centimeter",
            he: "סנטימטר מעוקב",
            ar: "سنتيمتر مكعب"
        },

        {
            value: "m^3",
            scale: 1,
            category: "measurements",
            group: "volume",
            symbol: "m³",
            latex: "\\mathrm{m^3}",
            en: "cubic meter",
            he: "מטר מעוקב",
            ar: "متر مكعب"
        },

        {
            value: "L",
            scale: 0.001,
            category: "measurements",
            group: "volume",
            symbol: "L",
            latex: "\\mathrm{L}",
            en: "liter",
            he: "ליטר",
            ar: "لتر"
        },

        {
            value: "s",
            scale: 1,
            category: "motion",
            group: "time",
            symbol: "s",
            latex: "\\mathrm{s}",
            en: "second",
            he: "שנייה",
            ar: "ثانية"
        },

        {
            value: "min",
            scale: 60,
            category: "motion",
            group: "time",
            symbol: "min",
            latex: "\\mathrm{min}",
            en: "minute",
            he: "דקה",
            ar: "دقيقة"
        },

        {
            value: "h",
            scale: 3600,
            category: "motion",
            group: "time",
            symbol: "h",
            latex: "\\mathrm{h}",
            en: "hour",
            he: "שעה",
            ar: "ساعة"
        },

        {
            value: "m/s",
            scale: 1,
            category: "motion",
            group: "speed",
            symbol: "m/s",
            latex: "\\frac{\\mathrm{m}}{\\mathrm{s}}",
            en: "meter per second",
            he: "מטר לשנייה",
            ar: "متر في الثانية"
        },

        {
            value: "km/h",
            scale: 1000 / 3600,
            category: "motion",
            group: "speed",
            symbol: "km/h",
            latex: "\\frac{\\mathrm{km}}{\\mathrm{h}}",
            en: "kilometer per hour",
            he: "קילומטר לשעה",
            ar: "كيلومتر في الساعة"
        },

        {
            value: "m/s^2",
            scale: 1,
            category: "motion",
            group: "acceleration",
            symbol: "m/s²",
            latex: "\\frac{\\mathrm{m}}{\\mathrm{s^2}}",
            en: "meter per second squared",
            he: "מטר לשנייה בריבוע",
            ar: "متر في الثانية المربعة"
        },

        {
            value: "g",
            scale: 0.001,
            category: "mass",
            group: "mass",
            symbol: "g",
            latex: "\\mathrm{g}",
            en: "gram",
            he: "גרם",
            ar: "غرام"
        },

        {
            value: "kg",
            scale: 1,
            category: "mass",
            group: "mass",
            symbol: "kg",
            latex: "\\mathrm{kg}",
            en: "kilogram",
            he: "קילוגרם",
            ar: "كيلوغرام"
        },
        {
            value: "°",
            scale: 1,
            category: "math",
            group: "math",
            symbol: "&deg;",
            latex: "\\mathrm{&deg;}",
            en: "degrees",
            he: "מעלות",
            ar: "درجات"
        },
        {
            value: "%",
            scale: 0.01,
            category: "math",
            group: "math",
            symbol: "%",
            latex: "\\mathrm{\\%}",
            en: "percent",
            he: "אחוז",
            ar: "بالمئة"
        }
    ];
};

MoodleStemKeyboard.prototype.getUnitByValue = function (value) {
    let i;

    for (
        i = 0;
        i < this.units.length;
        i++
    ) {
        if (
            this.units[i].value ===
            value
        ) {
            return this.units[i];
        }
    }

    return null;
};

MoodleStemKeyboard.prototype.getUnitLatex = function () {
    let unit = this.getUnitByValue(
            this.unitValue
        );

    if (!unit) {
        return "";
    }

    return unit.latex ||
        "\\mathrm{" + unit.value + "}";
};

MoodleStemKeyboard.prototype.getUnitName = function (unit) {
    return unit[this.language] ||
        unit.en ||
        unit.value;
};

MoodleStemKeyboard.prototype.isUnitCategoryEnabled = function (category) {
    let i;

    if (!this.unitCategories) {
        return true;
    }

    for (
        i = 0;
        i < this.unitCategories.length;
        i++
    ) {
        if (
            this.unitCategories[i] ===
            category
        ) {
            return true;
        }
    }

    return false;
};

MoodleStemKeyboard.prototype.getUnitCategoryName = function (category) {
    let names = {
        measurements: {
            en: "Measurements",
            he: "מידות",
            ar: "القياسات"
        },

        motion: {
            en: "Motion",
            he: "תנועה",
            ar: "الحركة"
        },

        mass: {
            en: "Mass",
            he: "מסה",
            ar: "الكتلة"
        }, 
        math: {
            en: "Mathematical",
            he: "מתמטיות",
            ar: "رياضية"
        }
    };

    if (!names[category]) {
        return category;
    }

    return names[category][this.language] ||
        names[category].en;
};

MoodleStemKeyboard.prototype.getUnitGroupName = function (group) {
    let names = {
        length: {
            en: "Length",
            he: "אורך",
            ar: "الطول"
        },

        area: {
            en: "Area",
            he: "שטח",
            ar: "المساحة"
        },

        volume: {
            en: "Volume",
            he: "נפח",
            ar: "الحجم"
        },

        time: {
            en: "Time",
            he: "זמן",
            ar: "الزمن"
        },

        speed: {
            en: "Speed",
            he: "מהירות",
            ar: "السرعة"
        },

        acceleration: {
            en: "Acceleration",
            he: "תאוצה",
            ar: "التسارع"
        },

        mass: {
            en: "Mass",
            he: "מסה",
            ar: "الكتلة"
        }
    };

    if (!names[group]) {
        return group;
    }

    return names[group][this.language] ||
        names[group].en;
};

MoodleStemKeyboard.prototype.selectUnit = function (unit) {
    this.unitValue = unit.value;
    this.unitScale = unit.scale;

    if ( this.unitPanel && this.unitPanel.parentNode ) {
        this.unitPanel.parentNode.removeChild( this.unitPanel );
        this.unitPanel = null;
    }

    this.render();
    this.root.focus();
};

MoodleStemKeyboard.prototype.clearUnit = function () {
    this.unitValue = "";
    this.unitScale = 1;

    if (
        this.unitPanel &&
        this.unitPanel.parentNode
    ) {
        this.unitPanel.parentNode.removeChild(
            this.unitPanel
        );

        this.unitPanel = null;
    }

    this.render();
    this.root.focus();
};

/* ============================================================
   UNIT PANEL
   ============================================================ */

MoodleStemKeyboard.prototype.showUnits = function () {
    let self = this;

    let panel;
    let header;
    let closeButton;
    let categories;
    let categoryIndex;
    let category;
    let categoryTitle;
    let table;
    let tr;
    let td;
    let button;
    let previousGroup;
    let unit;
    let i;
    let row;

    if (
        this.unitPanel &&
        this.unitPanel.parentNode
    ) {
        this.unitPanel.parentNode.removeChild(
            this.unitPanel
        );

        this.unitPanel = null;
        return;
    }

    panel = document.createElement(
            "div"
        );

    panel.style.position = "absolute";

    panel.style.direction = "ltr";

    panel.style.left = "10px";

    panel.style.top = "48px";

    panel.style.width = "330px";

    panel.style.background = "#fff";

    panel.style.border = "1px solid #999";

    panel.style.padding = "6px";

    panel.style.zIndex = "100000";

    panel.onclick = function (e) {
        e.stopPropagation();
    };

    header = document.createElement(
            "div"
        );

    header.innerHTML = "<table width='100%' cellpadding='0' cellspacing='0' dir='ltr'>" + "<tr>" + "<td>" +

        (
            this.language === "he" ? "יחידות"
                : (  this.language === "ar"  ? "الوحدات"  : "Units" )
        ) +

        "</td>" +
        "<td align='right'></td>" +
        "</tr>" +
        "</table>";

    panel.appendChild(
        header
    );

    closeButton = document.createElement(
            "button"
        );

    closeButton.type = "button";

    closeButton.innerHTML = "&#9746;";

    closeButton.title = this.texts.closeUnits;

    closeButton.style.border = "none";

    closeButton.style.background = "transparent";

    closeButton.style.padding = "0";

    closeButton.style.fontSize = "20px";

    closeButton.style.cursor = "pointer";

    closeButton.onclick = function () {
        if (panel.parentNode) {
            panel.parentNode.removeChild(
                panel
            );
        }

        self.unitPanel = null;
        self.root.focus();
    };

    header.getElementsByTagName(
        "td"
    )[1].appendChild(
        closeButton
    );

    row = document.createElement(
            "div"
        );

    row.style.textAlign = "right";

    button = document.createElement(
            "button"
        );

    button.type = "button";

    button.innerHTML = this.language === "he"
            ? "ללא יחידות"
            : (
                this.language === "ar"
                    ? "بدون وحدة"
                    : "No unit"
            );

    button.onclick = function () {
        self.clearUnit();
    };

    row.appendChild(
        button
    );

    panel.appendChild(
        row
    );

    categories = [
        "math",
        "measurements",
        "motion",
        "mass"
    ];

    for ( categoryIndex = 0; categoryIndex < categories.length; categoryIndex++ ) {
        category = categories[categoryIndex];

        if ( !this.isUnitCategoryEnabled( category ) ) {
            continue;
        }

        categoryTitle = document.createElement( "div" );

        categoryTitle.innerHTML = "<b>" + this.getUnitCategoryName( category ) + "</b>";
        categoryTitle.style.marginTop = "8px";
        categoryTitle.style.marginBottom = "4px";

        if (  this.language === "he" || this.language === "ar" ) {
            categoryTitle.setAttribute("dir","rtl" );
            categoryTitle.style.textAlign = "right";
        }

        panel.appendChild( categoryTitle );

        table = document.createElement( "table");
        table.setAttribute( "cellpadding", "2");
        table.setAttribute( "cellspacing", "2");
        table.setAttribute("width", "100%" );
        panel.appendChild( table );

        previousGroup = "";

        for ( i = 0; i < this.units.length; i++ ) {
            unit = this.units[i];

            if ( unit.category !== category ) {
                continue;
            }

            if ( previousGroup !== unit.group ) {
                if ( previousGroup !== "" ) {
                    tr = document.createElement( "tr" );
                    td = document.createElement( "td" );

                    td.setAttribute( "colspan", "2" );
                    td.innerHTML = "&nbsp;";
                    tr.appendChild(td);
                    table.appendChild( tr );
                }

                if ( this.showGroupHeadings ) {
                    tr = document.createElement( "tr" );
                    td = document.createElement( "td" );

                    td.setAttribute( "colspan", "2" );

                    td.innerHTML = "<b>" + this.getUnitGroupName(
                            unit.group
                        ) + "</b>";

                    tr.appendChild(td);
                    table.appendChild( tr );
                }

                previousGroup = unit.group;
            }

            tr = document.createElement( "tr" );
            table.appendChild( tr );

            if ( this.showUnitNames ) {
                td = document.createElement( "td" );
                td.innerHTML = this.getUnitName( unit );
                tr.appendChild(td);
            }

            td = document.createElement( "td" );
            td.setAttribute( "align", "right" );
            td.setAttribute( "dir", "ltr" );

            if ( !this.showUnitNames ) {
                td.setAttribute( "colspan", "2" );
            }

            tr.appendChild(td);

            button = document.createElement( "button" );
            button.type = "button";
            button.innerHTML = unit.symbol;
            button.title = this.getUnitName( unit );

            button.onclick = ( function ( selectedUnit ) {
                    return function () {
                        self.selectUnit( selectedUnit );
                    };
                }
            )(unit);

            td.appendChild( button );
        }
    }

    this.unitPanel = panel;

    this.popup.appendChild( panel );
};
})();