(function () {
window.MoodleStemKeyboard = MoodleStemKeyboard;

function MoodleStemKeyboard(options) {
    options = options || {};
    this.divId = options.divId;
    this.displayId = options.displayId || null;
    this.displayWidth = options.displayWidth || "300";
    this.allowAlgebra = options.allowAlgebra === true;
    this.variableMode = options.variableMode || "x";  /* "x", "xyz", or "A-Z" */
    this.variables = options.variables || null;      /* strings or { value, label } objects */
    this.allowSubscript = options.allowSubscript === true;
    this.maxEquals = (typeof options.maxEquals === "number" && options.maxEquals > 0) ? Math.floor(options.maxEquals) : 0;
    this.withUnits = options.withUnits === true;
    this.units = this.getDefaultUnits();
    this.unitCategories = options.unitCategories || null;
    this.showUnitNames = options.showUnitNames !== false;
    this.showGroupHeadings = options.showGroupHeadings === true;
    this.showKeyboardButton = options.showKeyboardButton === true;
    this.keyboardButton = null;
    this.language = options.language || "en";
    this.texts = this.getLanguageTexts();
    this.unitValue = "";
    this.unitScale = 1;
    this.unitPanel = null;
    this.showPi = options.showPi !== false;
    this.Power10 = options.power10 === true;
    this.power10Marker = "\uE002";
    this.readOnly = options.readOnly === true;
    this.value = "";
    this.timesOp = options.MulOp || "\\cdot";
    this.implicitMul = "\uE001";
    this.cursor = 0;
    this.hasError = false;
    this.moodleTargetId = options.moodleTargetId || null;
    this.getParamFunc = (typeof options.getParamFunc === "function") ? options.getParamFunc : null;
    this.setParamFunc = (typeof options.setParamFunc === "function") ? options.setParamFunc : null;
    this.debug = options.debug === true;
    this.variablePanel = null;
    this.varShift = false;
    this.varCaps = false;
    /* Logical editing context for cursor rendering and navigation.
       base = normal expression line, den = denominator, exp = exponent,
       num = numerator, rad = root, sub = variable subscript. */
    this.cursorContext = "base";
    this.mixedMode = "";
    this.root = null;
    this.display = null;
    this.popup = null;
    this.dragBar = null;
    this.isDragging = false;
    this.dragDX = 0;
    this.dragDY = 0;
    this.init();
}

MoodleStemKeyboard.prototype.createKeyboardButton = function () {
    let self = this;
    let wrapper = document.createElement("div");
    let button = document.createElement("button");
    let parent = this.display.parentNode;

    wrapper.style.display = "inline-flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "6px";
    wrapper.style.direction = "ltr";

    parent.insertBefore(wrapper, this.display);

    button.type = "button";
    button.innerHTML = "⌨️";
    button.title = this.texts.openKeyboard;

    button.style.border = "none";
    button.style.background = "transparent";
    button.style.padding = "0";
    button.style.margin = "0";
    button.style.fontSize = "36px";
    button.style.lineHeight = "1";
    button.style.cursor = "pointer";

    button.onclick = function (e) {
        e.stopPropagation();
        self.showKeyboard();
        self.root.focus();
    };

    /* Button on the left, display on the right */
    wrapper.appendChild(button);
    wrapper.appendChild(this.display);

    this.keyboardButton = button;
};

MoodleStemKeyboard.prototype.getLanguageTexts = function () {
    let texts = {
        en: {
            mixedFraction: "Enter fraction or mixed fraction",
            exit: "Exit current fraction, exponent or root",
            clearAll: "Clear the input field",
            deleteOne: "Delete last symbol",
            units: "Select units",
            closeUnits: "Close units",
            variables: "Enter variable",
            closeVariables: "Close variable keyboard",
            closeKeyboard: "Close keyboard",
            subscript: "Enter variable subscript",
            shift: "Shift / Caps lock",
            powerOf10: "Multiply by a power of 10",
            openKeyboard: "Open keyboard"
        },

        he: {
            mixedFraction: "הזנת שבר או מספר מעורב",
            exit: "יציאה מהשבר, החזקה או השורש הנוכחיים",
            clearAll: "מחיקת כל הביטוי",
            deleteOne: "מחיקת הסימן האחרון",
            units: "בחירת יחידות",
            closeUnits: "סגירת חלונית היחידות",
            variables: "הזנת משתנה",
            closeVariables: "סגירת מקלדת המשתנים",
            closeKeyboard: "סגירת המקלדת",
            subscript: "הזנת אינדקס למשתנה",
            shift: "Shift / Caps lock",
            powerOf10: "כפל בחזקה של 10",
            openKeyboard: "פתיחת המקלדת"
        },

        ar: {
            mixedFraction: "إدخال كسر أو عدد كسري",
            exit: "الخروج من الكسر أو الأس أو الجذر الحالي",
            clearAll: "مسح التعبير بالكامل",
            deleteOne: "حذف الرمز الأخير",
            units: "اختيار الوحدات",
            closeUnits: "إغلاق نافذة الوحدات",
            variables: "إدخال متغير",
            closeVariables: "إغلاق لوحة المتغيرات",
            closeKeyboard: "إغلاق لوحة المفاتيح",
            subscript: "إدخال فهرس للمتغير",
            shift: "Shift / Caps lock",
            powerOf10: "الضرب في قوة للعدد 10",
            openKeyboard: "فتح لوحة المفاتيح"
        }
    };

    return texts[this.language] || texts.en;
};

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
        }
    ];
};

MoodleStemKeyboard.prototype.getUnitCategoryName = function (category) {
    var names = {
        measurements: { en: "Measurements", he: "מידות", ar: "القياسات" },
        motion: { en: "Motion", he: "תנועה", ar: "الحركة" },
        mass: { en: "Mass", he: "מסה", ar: "الكتلة" }
    };

    if (!names[category]) return category;
    return names[category][this.language] || names[category].en;
};

MoodleStemKeyboard.prototype.init = function () {
    var host = document.getElementById(this.divId);
    var self = this;
    if (!host) return;

    this.root = document.createElement("div");
    this.root.style.position = "relative";
    
    this.root.style.fontFamily = "Arial, sans-serif";

    this.root.tabIndex = -1;

    this.root.onkeydown = function (e) {
        self.handlePhysicalKey(e);
    };

    host.appendChild(this.root);
    
    if (this.displayId) {
        this.display = document.getElementById(this.displayId);
        this.externalDisplay = true;
    } else {
        this.display = document.createElement("div");
        this.display.style.width = this.displayWidth + "px";
        this.display.style.boxSizing = "border-box";
        this.display.style.overflowX = "auto";
        this.root.appendChild(this.display);
        this.externalDisplay = false;
    }

    this.display.tabIndex = 0;
    this.display.style.direction = "ltr";
    this.display.style.textAlign = "left";
    if (!this.displayId) {
        this.display.style.minHeight = "44px";
        this.display.style.border = "1px solid #999";
        this.display.style.borderRadius = "6px";
        this.display.style.padding = "8px";
        this.display.style.cursor = "pointer";
        this.display.style.background = "#fff";
        this.display.style.fontSize = "22px";
        this.display.style.boxSizing = "border-box";
    }
    this.display.onclick = function (e) {
        e.stopPropagation();
        if (!self.readOnly) self.showKeyboard();
    };
    
    if (this.showKeyboardButton && !this.readOnly) {
        this.createKeyboardButton();
    }
    this.popup = document.createElement("div");

    if (this.externalDisplay) {
        this.popup.style.position = "static";
    } else {
        this.popup.style.position = "absolute";
        this.popup.style.left = "0px";
        this.popup.style.top = "55px";
    }
    
    this.popup.style.width = "360px";
    this.popup.style.border = "1px solid #555";
    this.popup.style.borderRadius = "8px";
    this.popup.style.background = "#f7f7f7";
    this.popup.style.padding = "6px";
    this.popup.style.boxShadow = "0 3px 12px rgba(0,0,0,0.25)";
    this.popup.style.zIndex = "99999";
    this.popup.style.display = "none";
    this.popup.onclick = function (e) { e.stopPropagation(); };


    this.root.appendChild(this.popup);

    this.buildKeyboard();

    this.mathJaxReady = false;
    this.waitForMathJax();

    document.addEventListener("click", function () {
        self.hideKeyboard();
    });
    let initialValue = null;

    if (this.getParamFunc) {
        initialValue = this.getParamFunc();
    }

    if (initialValue && typeof initialValue === "object") {
        this.value = typeof initialValue.expression === "string" ? initialValue.expression : "";
        this.unitValue = typeof initialValue.unit === "string" ? initialValue.unit : "";
        this.unitScale = typeof initialValue.scale === "number" ? initialValue.scale : 1;
    } else if (typeof initialValue === "string") {
        this.value = initialValue;
        this.unitValue = "";
        this.unitScale = 1;
    } else {
        this.value = "";
        this.unitValue = "";
        this.unitScale = 1;
    }

    this.cursor = this.value.length;
    this.cursorContext = "base";
    this.mixedMode = "";

    this.render();
};

MoodleStemKeyboard.prototype.handlePhysicalKey = function (e) {
    let key = e.key;
    let handled = false;

    if (this.readOnly) return;

    if (key === "Escape") {
        this.hideKeyboard();
        handled = true;
    }

    /* Digits */
    else if (key >= "0" && key <= "9") {
        this.insertText(key);
        handled = true;
    }

    /* Enter */
    else if (key === "Enter" || key === " ") {
        handled = true;
    }
    /* Decimal point */
    else if (key === ".") {
        this.insertText(".");
        handled = true;
    }

    /* Arithmetic operators */
    else if (key === "+" || key === "-" || key === "*") {
        this.insertText(key);
        handled = true;
    }

    else if (key === "/") {
        this.insertDivide();
        handled = true;
    }

    /* Equal sign */
   else if (key === "=" && this.maxEquals > 0) {
        if (this.canInsertEquals()) {
            this.insertText("=");
        }
        handled = true;
    }

    /* General exponent */
    else if (key === "^") {
        if (this.canInsertPower()) {
            this.insertPower();
        }
        handled = true;
    }

    /* Parentheses */
    else if (key === "(") {
        this.insertText("(");
        handled = true;
    }
    else if (key === ")") {
        if (this.canInsertCloseParenthesis()) {
            this.insertText(")");
        }
        handled = true;
    }

    /* Delete previous symbol */
    else if (key === "Backspace" || key === "Delete") {
        this.deleteOne();
        handled = true;
    }

    /* Exit current fraction / exponent / root */
    else if (key === "ArrowRight") {
        this.moveRight();
        handled = true;
    }

    /* Letter variables */
    else if (this.isPhysicalVariableAllowed(key)) {
        this.insertText(key);
        handled = true;
    }

    if (handled) {
        e.preventDefault();
        e.stopPropagation();
    }
};

MoodleStemKeyboard.prototype.canInsertEquals = function () {
    let count = 0;
    let i;

    if (this.maxEquals <= 0) return false;

    for (i = 0; i < this.value.length; i++) {
        if (this.value.charAt(i) === "=") count++;
    }

    return count < this.maxEquals;
};

MoodleStemKeyboard.prototype.isPhysicalVariableAllowed = function (key) {
    let vars;
    let i;

    if (!this.allowAlgebra) return false;
    if (!this.isVariableText(key)) return false;

    /*
       A-Z mode accepts any English letter.
       Preserve the case actually typed by the user.
    */
    if (this.variableMode === "A-Z") return true;

    vars = this.getVariableList();

    for (i = 0; i < vars.length; i++) {
        if (vars[i].value === key && vars[i].value.length === 1) return true;
    }

    return false;
};

MoodleStemKeyboard.prototype.waitForMathJax = function () {
    let self = this;

    function checkMathJax() {
        if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
            self.mathJaxReady = true;

            if (self.display) {
                if (typeof window.MathJax.typesetClear === "function") {
                    window.MathJax.typesetClear([self.display]);
                }

                window.MathJax.typesetPromise([self.display]);
            }
        } else {
            setTimeout(checkMathJax, 100);
        }
    }

    checkMathJax();
};

MoodleStemKeyboard.prototype.buildKeyboard = function () {
    var self = this;
    var title = document.createElement("div");
    title.style.direction = "ltr";
    title.style.cursor = "move";
    title.style.background = "#ddd";
    title.style.padding = "4px";
    title.style.borderRadius = "5px";
    title.style.marginBottom = "6px";
    title.innerHTML = "<table width='100%' cellpadding='0' cellspacing='0'><tr><td>Math Keyboard ⌨️</td>"+
                      "<td align='right'><button type='button' title='Close'>&#9746;</button></td></tr></table>";
    title.getElementsByTagName("button")[0].style.border = "none";
    title.getElementsByTagName("button")[0].title = this.texts.closeKeyboard;
    title.getElementsByTagName("button")[0].style.background = "transparent";
    title.getElementsByTagName("button")[0].style.padding = "0";
    title.getElementsByTagName("button")[0].style.cursor = "pointer";
    title.getElementsByTagName("button")[0].style.fontSize = "20px";
    title.getElementsByTagName("button")[0].onclick = function () { self.hideKeyboard(); };
    this.popup.appendChild(title);
    this.dragBar = title;

    if (!this.externalDisplay) {
        title.style.cursor = "move";

        title.onmousedown = function (e) {
            self.isDragging = true;
            self.dragDX = e.clientX - self.popup.offsetLeft;
            self.dragDY = e.clientY - self.popup.offsetTop;

            document.onmousemove = function (ev) {
                if (!self.isDragging) return;

                self.popup.style.left = (ev.clientX - self.dragDX) + "px";
                self.popup.style.top = (ev.clientY - self.dragDY) + "px";
            };

            document.onmouseup = function () {
                self.isDragging = false;
                document.onmousemove = null;
                document.onmouseup = null;
            };
        };
    } else {
        title.style.cursor = "default";
        title.onmousedown = null;
    }

    var fnRow = document.createElement("div");
    fnRow.style.marginBottom = "5px";
    fnRow.style.direction = "ltr";
    this.popup.appendChild(fnRow);
    this.addButton(
        fnRow,
        "<span style='display:inline-block;text-align:center;line-height:11px;min-width:18px;'>" +
            "<span style='display:block;'>□</span>" +
            "<span style='display:block;border-top:1px solid black;width:18px;height:1px;position:relative;top:2px;'></span>" +
            "<span style='display:block;'>□</span>" +
        "</span>",
        function () { self.insertMixedFractionPart(); },
        "mixedFractionKey",
        this.texts.mixedFraction
    );
    this.addButton(fnRow, "(", function () { self.insertText("("); }, "functionKey");
    this.addButton(
        fnRow,
        ")",
        function () {
            if (self.canInsertCloseParenthesis()) {
                self.insertText(")");
            }
        },
        "closeParenKey"
    );
this.addButton(
    fnRow,
    "√",
    function () {
        self.insertText("SQRT()");
        self.cursor--;
        self.cursorContext = "rad";
        self.mixedMode = "";
        self.render();
    },
    "sqrtKey"
);
    this.addButton(fnRow, "x²", function () { self.insertFixedPower(); }, "powerFixed");
    this.addButton(fnRow, "x<sup>□</sup>", function () { self.insertPower(); }, "powerAny");
    if (this.allowSubscript) {
        this.addButton(fnRow, "x<sub>□</sub>", function () { self.insertSubscript(); }, "subscriptKey", this.texts.subscript);
    }

    if (this.showPi) {
        this.addButton(
            fnRow,
            "\\(\\pi\\)",
            function () {
                self.insertText("PI");
            },
            "atomKey"
        );
    }

    if (this.allowAlgebra) {
        if (this.variableMode === "A-Z") {
            this.addButton(fnRow, "A-Z", function () { self.showVariables(); }, "atomKey", this.texts.variables);
        } else {
            this.addVariableButtons(fnRow);
        }
    }

    if (this.withUnits) {
        this.addButton(fnRow, "UNITS", function () { self.showUnits(); }, "unitsKey", this.texts.units);
    }
    
    let rows = [
    ["7", "8", "9", "DEL", "AC"],
    ["4", "5", "6", "*", "/"],
    ["1", "2", "3", "+", "-"],
    ["0", ".", (this.Power10 ? "POWER10" : ""), (this.maxEquals > 0 ? "=" : ""), "↱"]
    ];

    var table = document.createElement("table");
    table.style.borderCollapse = "separate";
    table.style.borderSpacing = "4px";
    table.style.direction = "ltr";

    this.popup.appendChild(table);

    var r, c, tr, td, label;
    for (r = 0; r < rows.length; r++) {
        tr = document.createElement("tr");
        table.appendChild(tr);
        for (c = 0; c < rows[r].length; c++) {
            td = document.createElement("td");
            td.style.width = "62px";
            tr.appendChild(td);
            label = rows[r][c];
            this.addKeyToCell(td, label);
        }
    }
};

MoodleStemKeyboard.prototype.getVariableList = function () {
    let result = [];
    let src = this.variables;
    let i, parts, item, value, label;

    if (src && Object.prototype.toString.call(src) === "[object Array]") {
        for (i = 0; i < src.length; i++) {
            item = src[i];

            if (typeof item === "string" && item !== "") {
                result.push({ value: item, label: item });
            } else if (item && typeof item === "object" && typeof item.value === "string" && item.value !== "") {
                value = item.value;
                label = (typeof item.label === "string" && item.label !== "") ? item.label : value;
                result.push({ value: value, label: label });
            }
        }
        return result;
    }

    if (typeof src === "string" && src !== "") {
        parts = src.split(",");
        for (i = 0; i < parts.length; i++) {
            value = parts[i];
            while (value.length > 0 && value.charAt(0) === " ") value = value.substring(1);
            while (value.length > 0 && value.charAt(value.length - 1) === " ") value = value.substring(0, value.length - 1);
            if (value !== "") result.push({ value: value, label: value });
        }
        return result;
    }

    if (this.variableMode === "xyz") {
        return [
            { value: "x", label: "x" },
            { value: "y", label: "y" },
            { value: "z", label: "z" }
        ];
    }

    return [{ value: "x", label: "x" }];
};

MoodleStemKeyboard.prototype.getVariableDefinition = function (value) {
    let vars = this.getVariableList();
    let i;

    for (i = 0; i < vars.length; i++) {
        if (vars[i].value === value) return vars[i];
    }

    return null;
};

MoodleStemKeyboard.prototype.isConfiguredVariableValue = function (value) {
    return this.getVariableDefinition(value) !== null;
};

MoodleStemKeyboard.prototype.getVariableLabel = function (value) {
    let underscore = value.indexOf("_");
    let baseValue = underscore >= 0 ? value.substring(0, underscore) : value;
    let indexValue = underscore >= 0 ? value.substring(underscore + 1) : "";
    let definition = this.getVariableDefinition(baseValue);
    let label = definition ? definition.label : baseValue;

    if (indexValue !== "") return label + "_{" + indexValue + "}";
    return label;
};

MoodleStemKeyboard.prototype.getVariableEndingAt = function (pos) {
    let vars = this.getVariableList();
    let best = null;
    let i, value, start;

    for (i = 0; i < vars.length; i++) {
        value = vars[i].value;
        start = pos - value.length;

        if (start >= 0 && this.value.substring(start, pos) === value) {
            if (!best || value.length > best.value.length) best = vars[i];
        }
    }

    return best;
};

MoodleStemKeyboard.prototype.matchConfiguredVariable = function (p) {
    let vars = this.getVariableList();
    let best = null;
    let i, value;

    for (i = 0; i < vars.length; i++) {
        value = vars[i].value;

        if (p.s.substring(p.pos, p.pos + value.length) === value) {
            if (!best || value.length > best.length) best = value;
        }
    }

    if (best) {
        p.pos += best.length;
        return best;
    }

    return "";
};

MoodleStemKeyboard.prototype.addVariableButtons = function (parent) {
    let self = this;
    let vars = this.getVariableList();
    let i, v;

    parent.style.direction = "ltr";
    parent.style.textAlign = "left";

    for (i = 0; i < vars.length; i++) {
        v = vars[i];

        this.addButton(
            parent,
            "\\(" + v.label + "\\)",
            (function (value) {
                return function () {
                    self.insertText(value);
                };
            })(v.value),
            "atomKey"
        );
    }
};

MoodleStemKeyboard.prototype.addButton = function (parent, label, action, role, title) {
    let self = this;
    var b = document.createElement("button");
    b.type = "button";
    b.innerHTML = "<big>&nbsp;" + label + "&nbsp;</big>";
    b.style.minWidth = "52px";
    b.style.height = "40px";
    b.style.margin = "2px";
    b.style.verticalAlign = "middle";
    b.style.backgroundColor = "#e0e0e0";
    b.style.border = "1px solid #555";
    b.style.borderRadius = "3px";
    b.onclick = function (e) {
        action(e);

        if (self.root) {
            self.root.focus();
        }
    };

    if (title) b.title = title;
    if (role) b.setAttribute("data-role", role);
    parent.appendChild(b);
    return b;
};

MoodleStemKeyboard.prototype.addKeyToCell = function (td, label) {
    var self = this;
    var b = document.createElement("button");
    b.type = "button";
    if (label === "") {
        return;
        b.innerHTML = "&nbsp;";
        b.disabled = true;
    } else if (label === "π") {
        b.innerHTML = "<big>&nbsp;&nbsp;<i>&pi;</i>&nbsp;&nbsp;</big>";
    } else if (label === "*") {
        b.innerHTML = "&nbsp;&nbsp;<big>&times;</big>&nbsp;&nbsp;";
    } else {
        b.innerHTML = "<big>&nbsp;&nbsp;" + label + "&nbsp;&nbsp;</big>";
    }
    b.style.width = "62px";
    b.style.height = "42px";
    b.style.verticalAlign = "middle";

    if (label === "↱") {
        b.title = this.texts.exit;
    } else if (label === "AC") {
        b.title = this.texts.clearAll;
    } else if (label === "DEL") {
        b.title = this.texts.deleteOne  ;
    } else if (label === "POWER10") {
        b.innerHTML = "<big>&times;10<sup>□</sup></big>";
        b.title = this.texts.powerOf10;
        b.setAttribute("data-role", "powerOf10Key");
    }

    if (label >= "0" && label <= "9") {
        b.setAttribute("data-role", "digitKey");
    }
    if (label === ".") {
        b.setAttribute("data-role", "decimalKey");
    }
    if (label === "=") {
        b.setAttribute("data-role", "equalsKey");
    } else if (label === "+" || label === "-" || label === "*" || label === "/") {
        b.setAttribute("data-role", "operatorKey");
    }
    if (label === "PI" || label === "π") {
        b.setAttribute("data-role", "atomKey");
    }

    b.onclick = function () {
        if (label === "") return;
        if (label === "DEL") self.deleteOne();
        else if (label === "AC") self.clearAll();
        else if (label === "↱") self.moveRight();
        else if (label === "PI" || label === "π") self.insertText("PI");
        else if (label === "/") self.insertDivide();
        else if (label === "=") {
            if (self.canInsertEquals()) {
                self.insertText("=");
            }
        } else if (label === "POWER10") { self.insertPowerOf10(); }
        else self.insertText(label);
        if (self.root) {
            self.root.focus();
        }
    };
    td.appendChild(b);
};

MoodleStemKeyboard.prototype.refreshVariablePanelLetters = function (panel) {
    var cells = panel.getElementsByTagName("td");
    var i, b, ch, upper;
    upper = this.varShift || this.varCaps;
    for (i = 0; i < cells.length; i++) {
        b = cells[i].getElementsByTagName("button")[0];
        if (b && b.getAttribute("data-var-letter") === "1") {
            ch = b.getAttribute("data-base-letter");
            b.innerHTML = "<big>&nbsp;" + (upper ? ch : ch.toLowerCase()) + "&nbsp;</big>";
        }
    }
};

MoodleStemKeyboard.prototype.showVariables = function () {
    var self = this;
    var panel, header, table, tr, td, i, ch, b, shiftButton, closeButton;

    if (this.variablePanel && this.variablePanel.parentNode) {
        this.variablePanel.parentNode.removeChild(this.variablePanel);
        this.variablePanel = null;
        return;
    }

    panel = document.createElement("div");
    panel.style.position = "absolute";
    panel.style.direction = "ltr";
    panel.style.left = "10px";
    panel.style.top = "48px";
    panel.style.width = "330px";
    panel.style.background = "#fff";
    panel.style.border = "1px solid #999";
    panel.style.padding = "4px";
    panel.style.zIndex = "100000";
    panel.onclick = function (e) { e.stopPropagation(); };

    header = document.createElement("div");
    header.innerHTML = "<table width='100%' cellpadding='0' cellspacing='0'><tr><td>Variables</td><td align='right'></td></tr></table>";
    panel.appendChild(header);
    closeButton = document.createElement("button");
    closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.innerHTML = "&#9746;";
    closeButton.title = this.texts.closeVariables;
    closeButton.style.border = "none";
    closeButton.style.background = "transparent";
    closeButton.style.padding = "0";
    closeButton.style.margin = "0";
    closeButton.style.fontSize = "20px";
    closeButton.style.lineHeight = "20px";
    closeButton.style.cursor = "pointer";
    closeButton.onclick = function () {
        if (panel.parentNode) panel.parentNode.removeChild(panel);
        self.variablePanel = null;
        self.root.focus();
    };
    header.getElementsByTagName("td")[1].appendChild(closeButton);

    shiftButton = document.createElement("button");
    shiftButton.type = "button";
    shiftButton.innerHTML = "<big>⇧</big>";

    shiftButton.style.backgroundColor = "#e0e0e0";
    shiftButton.style.border = "1px solid #555";
    shiftButton.style.borderRadius = "3px";

    refreshShiftButton();
    shiftButton.title = this.texts.shift;

function refreshShiftButton() {
    if (self.varCaps) {
        shiftButton.innerHTML = "<big>&#8657</big><br><span style='display:block;border-top:2px solid black;width:12px;margin:auto;'></span>";
    } else if (self.varShift) {
        shiftButton.innerHTML = "<big>⇧</big><br><span style='display:block;border-top:2px solid black;width:12px;margin:auto;'></span>";
    } else {
        shiftButton.innerHTML = "<big>⇧</big><br><span style='display:block;border-top:2px solid #e0e0e0;width:12px;margin:auto;'> </span>";
    }
}
shiftButton.onclick = function (e) {
    e.stopPropagation();

    if (!self.varShift && !self.varCaps) {
        self.varShift = true;
    } else if (self.varShift && !self.varCaps) {
        self.varShift = false;
        self.varCaps = true;
    } else {
        self.varShift = false;
        self.varCaps = false;
    }

    refreshShiftButton();
    self.refreshVariablePanelLetters(panel);
};

panel.appendChild(shiftButton);

    table = document.createElement("table");
    table.setAttribute("cellpadding", "2");
    table.setAttribute("cellspacing", "2");
    panel.appendChild(table);

    for (i = 65; i <= 90; i++) {
        if ((i - 65) % 7 === 0) {
            tr = document.createElement("tr");
            table.appendChild(tr);
        }
        td = document.createElement("td");
        tr.appendChild(td);
        ch = String.fromCharCode(i);
        b = document.createElement("button");
        b.type = "button";
        b.setAttribute("data-var-letter", "1");
        b.setAttribute("data-base-letter", ch);
        b.innerHTML = "<big>&nbsp;" + ch.toLowerCase() + "&nbsp;</big>";
        b.onclick = (function (base, button) {
            return function (e) {
                var val;
                e.stopPropagation();
                val = (self.varShift || self.varCaps) ? base : base.toLowerCase();
                self.insertText(val);
                if (self.varShift && !self.varCaps) {
                    self.varShift = false;
                    refreshShiftButton();
                    self.refreshVariablePanelLetters(panel);
                }
            };
        })(ch, b);
        td.appendChild(b);
    }

    this.variablePanel = panel;
    this.popup.appendChild(panel);
    this.refreshVariablePanelLetters(panel);
};


MoodleStemKeyboard.prototype.getUnitByValue = function (value) {
    var i;
    for (i = 0; i < this.units.length; i++) {
        if (this.units[i] && this.units[i].value === value) return this.units[i];
    }
    return null;
};

MoodleStemKeyboard.prototype.isUnitCategoryEnabled = function (category) {
    var i;

    if (!this.unitCategories) return true;

    for (i = 0; i < this.unitCategories.length; i++) {
        if (this.unitCategories[i] === category) return true;
    }

    return false;
};
MoodleStemKeyboard.prototype.findUnit = function (value) {
    var i;

    for (i = 0; i < this.units.length; i++) {
        if (this.units[i].value === value) return this.units[i];
    }

    return null;
};

MoodleStemKeyboard.prototype.getUnitName = function (unit) {
    return unit[this.language] || unit.en || unit.value;
};

MoodleStemKeyboard.prototype.getUnitLatex = function () {
    var unit = this.getUnitByValue(this.unitValue);
    if (!unit) return "";
    if (unit.latex) return unit.latex;
    return "\\mathrm{" + this.safeText(unit.value || "") + "}";
};

MoodleStemKeyboard.prototype.selectUnit = function (unit) {
    this.unitValue = unit.value;
    this.unitScale = unit.scale;

    if (this.unitPanel && this.unitPanel.parentNode) {
        this.unitPanel.parentNode.removeChild(this.unitPanel);
        this.unitPanel = null;
    }

    this.render();
    this.root.focus();
};

MoodleStemKeyboard.prototype.clearUnit = function () {
    this.unitValue = "";
    this.unitScale = 1;

    if (this.unitPanel && this.unitPanel.parentNode) {
        this.unitPanel.parentNode.removeChild(this.unitPanel);
        this.unitPanel = null;
    }

    this.render();
};

MoodleStemKeyboard.prototype.getUnitGroupName = function (group) {
    var names = {
        length: { en: "Length", he: "אורך", ar: "الطول" },
        area: { en: "Area", he: "שטח", ar: "المساحة" },
        volume: { en: "Volume", he: "נפח", ar: "الحجم" },

        time: { en: "Time", he: "זמן", ar: "الزمن" },
        speed: { en: "Speed", he: "מהירות", ar: "السرعة" },
        acceleration: { en: "Acceleration", he: "תאוצה", ar: "التسارع" },

        mass: { en: "Mass", he: "מסה", ar: "الكتلة" }
    };

    if (!names[group]) return group;
    return names[group][this.language] || names[group].en;
};

MoodleStemKeyboard.prototype.showUnits = function () {
    var self = this;
    var panel, header, closeButton;
    var categories = ["measurements", "motion", "mass"];
    var categoryIndex, category, categoryTitle;
    var table, tr, td, button;
    var previousGroup, unit, i;

    if (this.unitPanel && this.unitPanel.parentNode) {
        this.unitPanel.parentNode.removeChild(this.unitPanel);
        this.unitPanel = null;
        return;
    }

    panel = document.createElement("div");
    panel.style.position = "absolute";
    panel.style.direction = "ltr";

    panel.style.left = "10px";
    panel.style.top = "48px";
    panel.style.width = "330px";
    panel.style.background = "#fff";
    panel.style.border = "1px solid #999";
    panel.style.padding = "6px";
    panel.style.zIndex = "100000";
    panel.onclick = function (e) { e.stopPropagation(); };

    header = document.createElement("div");
    header.innerHTML = "<table width='100%' cellpadding='0' cellspacing='0' dir='ltr'><tr><td dir='" +
        ((this.language === "he" || this.language === "ar") ? "rtl" : "ltr") + "'>" + "&nbsp;" +
        (this.language === "he" ? "יחידות" : (this.language === "ar" ? "الوحدات" : "Units")) +
        "</td><td align='right' width='1%'></td></tr></table>";

    panel.appendChild(header);

    closeButton = document.createElement("button");
    closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.innerHTML = "&#9746;";
    closeButton.title = this.texts.closeUnits;
    closeButton.style.border = "none";
    closeButton.style.background = "transparent";
    closeButton.style.padding = "0";
    closeButton.style.margin = "0";
    closeButton.style.fontSize = "20px";
    closeButton.style.lineHeight = "20px";
    closeButton.style.cursor = "pointer";
    closeButton.onclick = function () {
        if (panel.parentNode) panel.parentNode.removeChild(panel);
        self.unitPanel = null;
        self.root.focus();
    };

    header.getElementsByTagName("td")[1].appendChild(closeButton);

    tr = document.createElement("div");
    tr.style.marginTop = "8px";

    row = document.createElement("div");
    row.style.textAlign = "right";

    button = document.createElement("button");
    button.type = "button";
    button.innerHTML = this.language === "he" ? "ללא יחידות" :
                    (this.language === "ar" ? "بدون وحدة" : "No unit");
    button.onclick = function () { self.clearUnit(); };

    row.appendChild(button);
    panel.appendChild(row);

    panel.appendChild(tr);


    for (categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
        category = categories[categoryIndex];

        if (!this.isUnitCategoryEnabled(category)) continue;

        categoryTitle = document.createElement("div");
        categoryTitle.innerHTML = "<b>" + this.getUnitCategoryName(category) + "</b>";
        categoryTitle.style.marginTop = "8px";
        categoryTitle.style.marginBottom = "4px";

        if (this.language === "he" || this.language === "ar") {
            categoryTitle.setAttribute("dir", "rtl");
            categoryTitle.style.textAlign = "right";
        }

        panel.appendChild(categoryTitle);

        table = document.createElement("table");
        table.setAttribute("cellpadding", "2");
        table.setAttribute("cellspacing", "2");
        table.setAttribute("width", "100%");
        panel.appendChild(table);

        previousGroup = "";
        tr = null;

        for (i = 0; i < this.units.length; i++) {
            unit = this.units[i];

            if (unit.category !== category) continue;

            if (previousGroup !== unit.group) {

            if (previousGroup !== "") {
                tr = document.createElement("tr");
                td = document.createElement("td");
                td.setAttribute("colspan", "2");
                td.innerHTML = "&nbsp;";
                tr.appendChild(td);
                table.appendChild(tr);
            }

            if (this.showGroupHeadings) {
                tr = document.createElement("tr");

                td = document.createElement("td");
                td.setAttribute("colspan", "2");
                td.innerHTML = "<b>" + this.getUnitGroupName(unit.group) + "</b>";

                if (this.language === "he" || this.language === "ar") {
                    td.setAttribute("dir", "rtl");
                    td.setAttribute("align", "right");
                }

                tr.appendChild(td);
                table.appendChild(tr);
            }

            previousGroup = unit.group;
        }

            tr = document.createElement("tr");
            table.appendChild(tr);

            if (this.showUnitNames) {
                td = document.createElement("td");
                td.setAttribute("dir", this.language === "he" || this.language === "ar" ? "rtl" : "ltr");
                td.innerHTML = this.getUnitName(unit);
                tr.appendChild(td);
            }

            td = document.createElement("td");
            td.setAttribute("align", "right");
            td.setAttribute("dir", "ltr");

            if (!this.showUnitNames) {
                td.setAttribute("colspan", "2");
            }

            tr.appendChild(td);

            button = document.createElement("button");
            button.type = "button";
            button.innerHTML = unit.symbol;
            button.title = this.getUnitName(unit);

            button.onclick = (function (selectedUnit) {
                return function () {
                    self.selectUnit(selectedUnit);
                };
            })(unit);

            td.appendChild(button);
        }
    }

   
    this.unitPanel = panel;
    this.popup.appendChild(panel);
};

MoodleStemKeyboard.prototype.showKeyboard = function () {
    this.popup.style.display = "block";
    this.root.focus();

};

MoodleStemKeyboard.prototype.hideKeyboard = function () {
    this.popup.style.display = "none";
    if (this.unitPanel && this.unitPanel.parentNode) {
        this.unitPanel.parentNode.removeChild(this.unitPanel);
        this.unitPanel = null;
    }
};


MoodleStemKeyboard.prototype.isContextExitChar = function (ch) {
    return ch === ")";
};

MoodleStemKeyboard.prototype.setCursorContextAfterInsert = function (txt) {
    if (txt === "+" || txt === "-" || txt === "*" || txt === "/" || txt === "=") {
        if (this.cursorContext === "base") this.cursorContext = "base";
        return;
    }
    if (txt === "SQRT()") {
        this.cursorContext = "rad";
        return;
    }
};

MoodleStemKeyboard.prototype.canInsertCloseParenthesis = function () {
    let balance = 0;
    let i;
    let ch;

    for (i = 0; i < this.cursor; i++) {
        ch = this.value.charAt(i);

        if (ch === "(") balance++;
        else if (ch === ")") balance--;
    }

    return balance > 0;
};

MoodleStemKeyboard.prototype.canInsertPowerOf10 = function () {
    if (!this.Power10 || this.readOnly) return false;
    if (this.cursorContext !== "base") return false;
    return this.canInsertBinaryOperatorAt(this.cursor);
};

MoodleStemKeyboard.prototype.insertPowerOf10 = function () {
    if (!this.canInsertPowerOf10()) return;

    this.value =
        this.value.substring(0, this.cursor) +
        this.power10Marker + "*10^" +
        this.value.substring(this.cursor);

    this.cursor += 5;
    this.cursorContext = "pow10";
    this.mixedMode = "";

    this.render();
};

MoodleStemKeyboard.prototype.isVariableText = function (txt) {
    if (this.isConfiguredVariableValue(txt)) return true;
    return this.variableMode === "A-Z" && txt.length === 1 &&
        ((txt >= "A" && txt <= "Z") || (txt >= "a" && txt <= "z"));
};

MoodleStemKeyboard.prototype.previousTokenKindBeforeCursor = function () {
    var ch;

    if (this.cursor <= 0) return "";

    if (this.cursor >= 2 && this.value.substring(this.cursor - 2, this.cursor) === "PI") return "pi";

    /* A completed indexed variable ends with digits, but is still one variable. */
    if (this.findIndexedVariableStartBefore(this.cursor) >= 0) return "variable";
    if (this.getVariableEndingAt(this.cursor)) return "variable";

    ch = this.value.charAt(this.cursor - 1);

    if ((ch >= "0" && ch <= "9") || ch === ".") return "number";
    if (ch === ")") return "closeParen";
    if (this.variableMode === "A-Z" && ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z"))) return "variable";


    return "";
};

MoodleStemKeyboard.prototype.nextTokenKindFromText = function (txt) {
    if (this.isDigitOrDecimal(txt)) return "number";
    if (txt === "PI") return "pi";
    if (txt === "(") return "openParen";
    if (txt === "SQRT()") return "sqrt";
    if (this.isVariableText(txt)) return "variable";
    return "";
};

MoodleStemKeyboard.prototype.shouldInsertImplicitMultiply = function (txt) {
    var prev, next;

    if (this.mixedMode === "num" || this.mixedMode === "den") return false;
    if (this.cursorContext === "sub") return false;

    prev = this.previousTokenKindBeforeCursor();
    next = this.nextTokenKindFromText(txt);

    /* Do not split a multi-digit number. Example: 345 must remain NUMBER 345. */
    if (prev === "number" && next === "number") return false;

    /* number followed by variable or PI */
    if (prev === "number" && (next === "variable" || next === "pi")) return true;

    /* variable followed by variable: xy = x*y */
    if (prev === "variable" && next === "variable") return true;

    /* indexed or ordinary variable followed by a number */
    if (prev === "variable" && next === "number") return true;

    /* number before parenthesis: 2(x+1) */
    if (prev === "number" && next === "openParen") return true;

    /* number after parenthesis: (x+1)2 */
    if (prev === "closeParen" && next === "number") return true;

    /* parenthesized expression followed by a variable, PI, or sqrt:
       (2+3)x, (2+3)PI, (2+3)sqrt(5).
       This also covers many completed compound objects whose textual form
       ends with a closing parenthesis, such as ordinary fractions, editable
       powers, roots, and mixed fractions. */
    if (prev === "closeParen" && (next === "variable" || next === "pi" || next === "sqrt")) return true;

    /* number before sqrt: 2sqrt(3).
       This also covers fixed powers such as 2^2sqrt(3), because the last
       completed token before sqrt is the exponent number. */
    if (prev === "number" && next === "sqrt") return true;

    /* variable before sqrt: xsqrt(3). */
    if (prev === "variable" && next === "sqrt") return true;

    /* PI before sqrt: PIsqrt(3). PI behaves like a constant number. */
    if (prev === "pi" && next === "sqrt") return true;

    return false;
};

MoodleStemKeyboard.prototype.shouldExitDenominatorBeforeImplicitText = function (txt) {
    var next;

    if (this.mixedMode !== "") return false;
    if (this.cursorContext !== "den") return false;
    if (this.cursor >= this.value.length) return false;
    if (this.value.charAt(this.cursor) !== ")") return false;

    /* The denominator is still empty: /()
       The next atom belongs inside the denominator. */
    if (this.cursor > 0 && this.value.charAt(this.cursor - 1) === "(") {
        return false;
    }

    next = this.nextTokenKindFromText(txt);

    /*
       A variable, PI or sqrt after a COMPLETED denominator
       means multiplication by the whole fraction.

       1/2x  -> (1/2)*x

       But:

       1/() + x being entered
       x belongs inside the denominator.
    */
    return next === "variable" ||
           next === "pi" ||
           next === "sqrt";
};

MoodleStemKeyboard.prototype.isArithmeticOperatorText = function (txt) {
    return txt === "+" || txt === "-" || txt === "*" || txt === "/";
};

MoodleStemKeyboard.prototype.previousCharIsArithmeticOperator = function () {
    if (this.cursor <= 0) return false;
    return this.isArithmeticOperatorText(this.value.charAt(this.cursor - 1));
};

MoodleStemKeyboard.prototype.canInsertBinaryOperatorAt = function (pos) {
    var prev;
    if (pos <= 0) return false;
    prev = this.value.charAt(pos - 1);
    if (prev === "(" || prev === "=" || this.isArithmeticOperatorText(prev) || prev === "^") return false;
    return true;
};

MoodleStemKeyboard.prototype.insertArithmeticOperator = function (op) {
    var replacePos;

    if (this.readOnly) return;
    if (this.mixedMode === "num" || this.mixedMode === "den") return;
    if (this.cursorContext === "sub") return;

    if (this.previousCharIsArithmeticOperator()) {
        replacePos = this.cursor - 1;
        if ((op === "*" || op === "/") && !this.canInsertBinaryOperatorAt(replacePos)) return;
        this.value = this.value.substring(0, replacePos) + op + this.value.substring(this.cursor);
        this.cursor = replacePos + 1;
        this.cursorContext = "base";
        this.render();
        return;
    }

    if ((op === "*" || op === "/") && !this.canInsertBinaryOperatorAt(this.cursor)) return;

    this.value = this.value.substring(0, this.cursor) + op + this.value.substring(this.cursor);
    this.cursor++;
    this.cursorContext = "base";
    this.mixedMode = "";
    this.render();
};

MoodleStemKeyboard.prototype.insertText = function (txt) {
    if (this.readOnly) return;
    var prefix = "";

    if (this.isArithmeticOperatorText(txt)) {
        this.insertArithmeticOperator(txt);
        return;
    }

    if (!this.isInsertAllowed(txt)) return;

    if (this.shouldExitDenominatorBeforeImplicitText(txt)) {
        this.cursor++;
        this.cursorContext = "base";
    }

    if (this.shouldInsertImplicitMultiply(txt)) prefix = this.implicitMul;
    this.value = this.value.substring(0, this.cursor) + prefix + txt + this.value.substring(this.cursor);
    this.cursor += prefix.length + txt.length;
    if (this.mixedMode === "num") {
        this.cursorContext = "num";
    } else if (this.mixedMode === "den") {
        this.cursorContext = "den";
    } else {
        this.setCursorContextAfterInsert(txt);
    }
    this.render();
};

MoodleStemKeyboard.prototype.insertFixedPower = function () {
    if (this.readOnly) return;
    if (!this.canInsertPower()) return;
    this.value = this.value.substring(0, this.cursor) + "^2" + this.value.substring(this.cursor);
    this.cursor += 2;
    this.cursorContext = "base";
    this.render();
};

MoodleStemKeyboard.prototype.insertPower = function () {
    if (this.readOnly) return;
    if (!this.canInsertPower()) return;
    this.insertText("^()");
    this.cursor--;
    this.cursorContext = "exp";
    this.render();
};

MoodleStemKeyboard.prototype.insertDivide = function () {
    var replacePos;

    if (this.readOnly) return;
    if (this.mixedMode === "num" || this.mixedMode === "den") return;
    if (this.cursorContext === "sub") return;

    if (this.previousCharIsArithmeticOperator()) {
        replacePos = this.cursor - 1;
        if (!this.canInsertBinaryOperatorAt(replacePos)) return;
        this.value = this.value.substring(0, replacePos) + "/()" + this.value.substring(this.cursor);
        this.cursor = replacePos + 2;
        this.cursorContext = "den";
        this.mixedMode = "";
        this.render();
        return;
    }

    if (!this.canInsertBinaryOperatorAt(this.cursor)) return;
    if (!this.isInsertAllowed("/")) return;

    this.value = this.value.substring(0, this.cursor) + "/()" + this.value.substring(this.cursor);
    this.cursor += 2;
    this.cursorContext = "den";
    this.mixedMode = "";
    this.render();
};

MoodleStemKeyboard.prototype.previousCharIsDigit = function () {
    if (this.cursor <= 0) return false;
    var ch = this.value.charAt(this.cursor - 1);
    return ch >= "0" && ch <= "9";
};

MoodleStemKeyboard.prototype.isUnarySignAt = function (pos) {
    var before, ch;
    if (pos < 0) return false;
    ch = this.value.charAt(pos);
    if (ch !== "-" && ch !== "+") return false;
    if (pos === 0) return true;
    before = this.value.charAt(pos - 1);
    return before === "(" || before === "=" || before === "+" || before === "-" || before === "*" || before === "/" || before === "^";
};

MoodleStemKeyboard.prototype.isUnaryMinusAt = function (pos) {
    return this.value.charAt(pos) === "-" && this.isUnarySignAt(pos);
};

MoodleStemKeyboard.prototype.isUnaryPlusAt = function (pos) {
    return this.value.charAt(pos) === "+" && this.isUnarySignAt(pos);
};

MoodleStemKeyboard.prototype.findWholeNumberStartBeforeCursor = function () {
    var i;
    if (!this.previousCharIsDigit()) return -1;
    i = this.cursor - 1;
    while (i >= 0) {
        if (!(this.value.charAt(i) >= "0" && this.value.charAt(i) <= "9")) break;
        i--;
    }
    if (this.isUnarySignAt(i)) return i;
    return i + 1;
};

MoodleStemKeyboard.prototype.canInsertMixedFraction = function () {
    let start, i, ch, prev;

    if (this.readOnly) return false;
    if (this.cursorContext === "sub") return false;
    if (this.mixedMode === "num" || this.mixedMode === "den") return false;

    /* Empty expression */
    if (this.cursor === 0) return true;
    /* Beginning of an empty denominator created by the divide operator: /() */
    if (this.cursorContext === "den" &&
        this.cursor > 0 &&
        this.value.charAt(this.cursor - 1) === "(" &&
        this.cursor < this.value.length &&
        this.value.charAt(this.cursor) === ")") {
        return true;
    }
    prev = this.value.charAt(this.cursor - 1);

    /* Simple fraction after an operator or '=' */
    if (prev === "+" || prev === "-" || prev === "*" || prev === "/" || prev === "=" || prev === "(") return true;

    /* Ordinary divide creates /() and puts the cursor inside the denominator.
       Allow a fraction template inside an empty denominator. */
    if (prev === "(" && this.cursor >= 2 && this.value.charAt(this.cursor - 2) === "/") return true;

    /* Otherwise this must be a mixed fraction following a whole number. */
    if (!this.previousCharIsDigit()) return false;

    start = this.findWholeNumberStartBeforeCursor();
    if (start < 0) return false;

    for (i = start; i < this.cursor; i++) {
        ch = this.value.charAt(i);

        if (i === start && (ch === "-" || ch === "+") && this.isUnarySignAt(i)) continue;
        if (!(ch >= "0" && ch <= "9")) return false;
    }

    if (start > 0) {
        ch = this.value.charAt(start - 1);

        if ((ch >= "0" && ch <= "9") || ch === "." ||
            this.isVariableText(ch)) return false;
    }

    if (this.cursor < this.value.length) {
        ch = this.value.charAt(this.cursor);

        if ((ch >= "0" && ch <= "9") || ch === "." ||
            this.isVariableText(ch)) return false;
    }

    return true;
};

MoodleStemKeyboard.prototype.insertMixedFractionPart = function () {
    let start, whole, before, after, insertText, sign, unsignedWhole, prev;
    let simpleFraction;
    let atEmptyDenominator;

    if (this.readOnly) return;
    if (!this.canInsertMixedFraction()) return;

    prev = this.cursor > 0 ? this.value.charAt(this.cursor - 1) : "";

    atEmptyDenominator = this.cursorContext === "den" &&
    this.cursor > 0 &&
    this.value.charAt(this.cursor - 1) === "(" &&
    this.cursor < this.value.length &&
    this.value.charAt(this.cursor) === ")";

    simpleFraction = this.cursor === 0 ||
    atEmptyDenominator || prev === "+" || prev === "-" || prev === "*" || prev === "/" || prev === "=" || prev === "(";

    if (simpleFraction) {
        this.value = this.value.substring(0, this.cursor) + "(/)" + this.value.substring(this.cursor);
        this.cursor++;
        this.cursorContext = "num";
        this.mixedMode = "num";
        this.render();
        return;
    }

    start = this.findWholeNumberStartBeforeCursor();
    if (start < 0) return;

    whole = this.value.substring(start, this.cursor);
    before = this.value.substring(0, start);
    after = this.value.substring(this.cursor);

    sign = "";
    unsignedWhole = whole;

    if (whole.length > 1 && (whole.charAt(0) === "-" || whole.charAt(0) === "+") && this.isUnarySignAt(start)) {
        sign = whole.charAt(0);
        unsignedWhole = whole.substring(1);
    }

    insertText = sign + "(" + unsignedWhole + "+/)";
    this.value = before + insertText + after;

    this.cursor = start + sign.length + 1 + unsignedWhole.length + 1;
    this.cursorContext = "num";
    this.mixedMode = "num";

    this.render();
};

MoodleStemKeyboard.prototype.isOperator = function (ch) {
    return ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^" || ch === "=";
};

MoodleStemKeyboard.prototype.findIndexedVariableStartBefore = function (pos) {
    let i = pos - 1;
    let underscore;
    let baseEnd;

    if (i < 0 || !(this.value.charAt(i) >= "0" && this.value.charAt(i) <= "9")) return -1;

    while (i >= 0 && this.value.charAt(i) >= "0" && this.value.charAt(i) <= "9") i--;
    underscore = i;

    if (underscore < 0 || this.value.charAt(underscore) !== "_") return -1;

    baseEnd = underscore;
    if (!this.getVariableEndingAt(baseEnd)) return -1;

    return baseEnd;
};

MoodleStemKeyboard.prototype.canInsertSubscript = function () {
    if (!this.allowSubscript || this.readOnly) return false;
    if (this.cursorContext === "sub") return false;
    if (this.cursor <= 0) return false;
    if (this.findIndexedVariableStartBefore(this.cursor) >= 0) return false;
    return this.getVariableEndingAt(this.cursor) !== null;
};

MoodleStemKeyboard.prototype.insertSubscript = function () {
    if (!this.canInsertSubscript()) return;

    this.value = this.value.substring(0, this.cursor) + "_" + this.value.substring(this.cursor);
    this.cursor++;
    this.cursorContext = "sub";
    this.mixedMode = "";
    this.render();
};

MoodleStemKeyboard.prototype.canInsertPower = function () {
    let prev;

    if (this.cursor <= 0) return false;

    /* No nested/general power while entering ×10^ exponent. */
    if (this.cursorContext === "pow10") return false;

    /* ×10^n is a completed power expression. */
    if (this.isAfterClosedPower10()) return false;

    prev = this.value.charAt(this.cursor - 1);

    if (this.isOperator(prev) || prev === "(") return false;

    return true;
};

MoodleStemKeyboard.prototype.isAfterClosedFixedPower = function () {
    if (this.cursor < 2) return false;
    return this.value.substring(this.cursor - 2, this.cursor) === "^2";
};

MoodleStemKeyboard.prototype.isDigit = function (txt) {
    return txt.length === 1 && txt >= "0" && txt <= "9";
};

MoodleStemKeyboard.prototype.isDigitOrDecimal = function (txt) {
    if (txt.length !== 1) return false;
    return (txt >= "0" && txt <= "9") || txt === ".";
};

MoodleStemKeyboard.prototype.isAtomStartText = function (txt) {
    if (this.isDigitOrDecimal(txt)) return true;
    if (txt === "PI") return true;
    if (txt === "(") return true;
    if (txt === "SQRT()") return true;
    if (txt.length === 1 && ((txt >= "A" && txt <= "Z") || (txt >= "a" && txt <= "z"))) return true;
    return false;
};

MoodleStemKeyboard.prototype.power10HasExponent = function () {
    if (this.cursorContext !== "pow10") return false;
    if (this.cursor <= 0) return false;

    let ch = this.value.charAt(this.cursor - 1);
    return ch >= "0" && ch <= "9";
};

MoodleStemKeyboard.prototype.isInsertAllowed = function (txt) {
    if (this.cursorContext === "sub" ) {
        return this.isDigit(txt);
    }

    if (this.cursorContext === "pow10") {
        if (this.isDigit(txt)) return true;

        if (this.power10HasExponent()) {
            if (txt === "+" || txt === "-" || txt === "*" ||
                txt === "/" || txt === "=") {
                return true;
            }
        }

        return false;
    }

    if (this.mixedMode === "num" || this.mixedMode === "den") {
        return this.isDigit(txt);
    }

    if (txt === "^2" || txt === "^()") return this.canInsertPower();

    /* After x², the power is closed. The next key must be an operation,
       navigation, delete, or clear. This prevents values such as 2^24. */
    if (this.isAfterClosedFixedPower() &&
        this.isAtomStartText(txt)) {
        return false;
    }

    /*
    * After a completed ×10^n, sqrt is allowed and will be
    * inserted using implicit multiplication.
    * Other atoms are still blocked.
    */
    if (this.isAfterClosedPower10() &&
        this.isAtomStartText(txt) &&
        txt !== "SQRT()") {
        return false;
    }

    return true;
};

MoodleStemKeyboard.prototype.isAfterClosedPower10 = function () {
    let i;

    if (!this.Power10) return false;
    if (this.cursor <= 0) return false;

    i = this.cursor - 1;

    /* Skip exponent digits */
    while (i >= 0 &&
           this.value.charAt(i) >= "0" &&
           this.value.charAt(i) <= "9") {
        i--;
    }

    /* Must have at least one exponent digit */
    if (i === this.cursor - 1) return false;

    /*
     * Immediately before the exponent must be:
     * marker * 10 ^
     */
    if (i >= 4 &&
        this.value.substring(i - 4, i + 1) ===
            this.power10Marker + "*10^") {
        return true;
    }

    return false;
};

MoodleStemKeyboard.prototype.findMatchingOpenParen = function (closePos) {
    var depth = 0;
    var i;
    for (i = closePos; i >= 0; i--) {
        var ch = this.value.charAt(i);
        if (ch === ")") depth++;
        else if (ch === "(") {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
};

MoodleStemKeyboard.prototype.findAtomicSqrtStartBefore = function (pos) {
    /* Returns the index of SQRT when pos is immediately after a full SQRT(...)
       element. Otherwise returns -1. */
    if (pos <= 0) return -1;
    if (this.value.charAt(pos - 1) !== ")") return -1;

    var openPos = this.findMatchingOpenParen(pos - 1);
    if (openPos < 4) return -1;

    if (this.value.substring(openPos - 4, openPos) === "SQRT") {
        return openPos - 4;
    }

    return -1;
};

MoodleStemKeyboard.prototype.isInsideEmptySqrtCell = function () {
    /* Example: value is 2+SQRT() and cursor is before the closing parenthesis. */
    if (this.cursor < 5) return false;
    if (this.cursor >= this.value.length) return false;
    if (this.value.charAt(this.cursor) !== ")") return false;
    return this.value.substring(this.cursor - 5, this.cursor) === "SQRT(";
};

MoodleStemKeyboard.prototype.getAstChildren = function (node) {
    let result = [];

    if (!node) return result;

    if (node.type === "binary") {
        if (node.left) result.push(node.left);
        if (node.right) result.push(node.right);
    } else if (node.type === "unary" || node.type === "group" || node.type === "sqrt" || node.type === "cursorAfter") {
        if (node.child) result.push(node.child);
    } else if (node.type === "subscript") {
        if (node.base) result.push(node.base);
        if (node.index) result.push(node.index);
    } else if (node.type === "equation" && node.sides) {
        let i;
        for (i = 0; i < node.sides.length; i++) result.push(node.sides[i]);
    }

    return result;
};

MoodleStemKeyboard.prototype.findAstPathAtCursor = function (node, cursor, path) {
    let currentPath = path || [];
    let children;
    let i;
    let found;

    if (!node || typeof node.start !== "number" || typeof node.end !== "number") return null;
    if (!(node.start < cursor && cursor <= node.end)) return null;

    currentPath = currentPath.concat([node]);
    children = this.getAstChildren(node);

    for (i = 0; i < children.length; i++) {
        found = this.findAstPathAtCursor(children[i], cursor, currentPath);
        if (found) return found;
    }

    return currentPath;
};

MoodleStemKeyboard.prototype.findFractionNodeInPath = function (path) {
    let i;
    let node;

    for (i = path.length - 1; i >= 0; i--) {
        node = path[i];
        if (node.type === "group" &&
            (this.getSimpleFractionGroupParts(node) || this.getMixedGroupParts(node))) {
            return node;
        }
    }

    return null;
};

MoodleStemKeyboard.prototype.getAstDeleteRange = function (path, target) {
    let index = path.indexOf(target);
    let parent;

    if (index <= 0) {
        return { start: target.start, end: target.end };
    }

    parent = path[index - 1];

    /* Removing the right operand of a binary operation also removes its operator. */
    if (parent.type === "binary" && parent.right === target) {
        return { start: parent.left.end, end: target.end };
    }

    /* A child cannot be removed from these wrappers without corrupting the syntax. */
    if ((parent.type === "group" && parent.child === target) ||
        (parent.type === "sqrt" && parent.child === target) ||
        (parent.type === "unary" && parent.child === target) ||
        (parent.type === "subscript" && (parent.base === target || parent.index === target))) {
        return this.getAstDeleteRange(path, parent);
    }

    return { start: target.start, end: target.end };
};

MoodleStemKeyboard.prototype.deleteOne = function () {
    let parsed;
    let path;
    let target;
    let fractionNode;
    let range;
    let ch;

    if (this.readOnly || this.cursor <= 0) return;

    if (this.cursorContext === "pow10") {
        let ch = this.value.charAt(this.cursor - 1);

        /* Delete exponent digits one at a time. */
        if (ch >= "0" && ch <= "9") {
            this.value =
                this.value.substring(0, this.cursor - 1) +
                this.value.substring(this.cursor);

            this.cursor--;
            this.render();
            return;
        }

        /* Empty exponent: remove marker + *10^ completely. */
        if (this.cursor >= 5 &&
            this.value.substring(this.cursor - 5, this.cursor) ===
                this.power10Marker + "*10^") {

            this.value =
                this.value.substring(0, this.cursor - 5) +
                this.value.substring(this.cursor);

            this.cursor -= 5;
            this.cursorContext = "base";

            this.render();
            return;
        }
    }

    /*
    * While editing a fraction or mixed fraction, DEL removes
    * the complete fraction object.
    *
    * Examples:
    * (2|/)       -> empty
    * (4+2|/)     -> empty
    * (4+2/3|)    -> empty
    */
    if (this.mixedMode === "num" || this.mixedMode === "den") {
        let openPos = -1;
        let closePos = -1;
        let depth = 0;
        let i;
        let start;

        /* Find the outer opening parenthesis containing the fraction. */
        for (i = this.cursor - 1; i >= 0; i--) {
            if (this.value.charAt(i) === ")") {
                depth++;
            } else if (this.value.charAt(i) === "(") {
                if (depth === 0) {
                    openPos = i;
                    break;
                }
                depth--;
            }
        }

        
        if (openPos >= 0) {
            depth = 0;

            /* Find its matching closing parenthesis. */
            for (i = openPos; i < this.value.length; i++) {
                if (this.value.charAt(i) === "(") {
                    depth++;
                } else if (this.value.charAt(i) === ")") {
                    depth--;

                    if (depth === 0) {
                        closePos = i;
                        break;
                    }
                }
            }
        }

        if (openPos >= 0 && closePos >= 0) {
            start = openPos;

            /* Include a unary sign belonging to the fraction/mixed number. */
            if (start > 0 &&
                (this.value.charAt(start - 1) === "+" ||
                this.value.charAt(start - 1) === "-") &&
                this.isUnarySignAt(start - 1)) {
                start--;
            }

            this.value =
                this.value.substring(0, start) +
                this.value.substring(closePos + 1);

            this.cursor = start;
            this.cursorContext = "base";
            this.mixedMode = "";

            this.render();
            return;
        }
    }
    parsed = this.parseFull(this.value, false);

    /* If the expression is temporarily incomplete, fall back to the safe local edit. */
    if (!parsed.ok || !parsed.ast) {
        if (this.cursorContext === "sub") {
            ch = this.value.charAt(this.cursor - 1);
            if ((ch >= "0" && ch <= "9") || ch === "_") {
                this.value = this.value.substring(0, this.cursor - 1) + this.value.substring(this.cursor);
                this.cursor--;
                if (ch === "_") this.cursorContext = "base";
                this.render();
                return;
            }
        }

        this.value = this.value.substring(0, this.cursor - 1) + this.value.substring(this.cursor);
        this.cursor--;
        this.cursorContext = "base";
        this.render();
        return;
    }

    path = this.findAstPathAtCursor(parsed.ast, this.cursor, []);

    if (!path || path.length === 0) {
        this.value = this.value.substring(0, this.cursor - 1) + this.value.substring(this.cursor);
        this.cursor--;
        this.cursorContext = "base";
        this.render();
        return;
    }

    target = path[path.length - 1];

    /*
    * Ordinary parenthesized expression:
    *
    * (4+5)|  -> DEL -> (4+5|
    *
    * The group itself is NOT atomic. If the cursor is immediately
    * after its closing parenthesis, delete only that ")".
    *
    * Fraction and mixed-fraction groups are handled separately below.
    */
    if (target.type === "group" &&
        target.end === this.cursor &&
        this.value.charAt(this.cursor - 1) === ")" &&
        !this.getSimpleFractionGroupParts(target) &&
        !this.getMixedGroupParts(target)) {

        this.value =
            this.value.substring(0, this.cursor - 1) +
            this.value.substring(this.cursor);

        this.cursor--;
        this.cursorContext = "base";
        this.render();
        return;
    }

    /* A fraction-key structure is atomic, even while its denominator is being edited. */
    fractionNode = this.findFractionNodeInPath(path);
    if (fractionNode) target = fractionNode;

    /* While actively editing a subscript, its numeric index remains digit-editable. */
    if (this.cursorContext === "sub" && target.type === "number") {
        this.value = this.value.substring(0, this.cursor - 1) + this.value.substring(this.cursor);
        this.cursor--;
        this.render();
        return;
    }

    /* A completed subscript is one atomic variable, even though its last child is a number. */
    if (this.cursorContext !== "sub") {
        let i;
        for (i = path.length - 1; i >= 0; i--) {
            if (path[i].type === "subscript" && path[i].end === this.cursor) {
                target = path[i];
                break;
            }
        }
    }

    /* Multi-digit numbers are edited digit by digit.
       A one-character number is removed as an AST operand, together with its operator when needed. */
    if (target.type === "number" && target.value && target.value.length > 1) {
        this.value = this.value.substring(0, this.cursor - 1) + this.value.substring(this.cursor);
        this.cursor--;
        this.render();
        return;
    }

    range = this.getAstDeleteRange(path, target);

    this.value = this.value.substring(0, range.start) + this.value.substring(range.end);
    this.cursor = range.start;
    this.cursorContext = "base";
    this.mixedMode = "";
    this.render();
};

MoodleStemKeyboard.prototype.clearAll = function () {
    if (this.readOnly) return;
    this.value = "";
    this.unitValue = "";
    this.unitScale = 1;
    this.selectedUnit = null;
    this.implicitMul = "\uE001";
    this.cursor = 0;
    this.cursorContext = "base";
    this.mixedMode = "";
    this.render();
};

MoodleStemKeyboard.prototype.findSqrtEndAt = function (pos) {
    if (this.value.substring(pos, pos + 4) !== "SQRT") return -1;
    if (this.value.charAt(pos + 4) !== "(") return pos + 4;
    var depth = 0;
    var i;
    for (i = pos + 4; i < this.value.length; i++) {
        if (this.value.charAt(i) === "(") depth++;
        else if (this.value.charAt(i) === ")") {
            depth--;
            if (depth === 0) return i + 1;
        }
    }
    return pos + 4;
};

MoodleStemKeyboard.prototype.moveLeft = function () {
    var sqrtStart;

    if (this.mixedMode === "den") {
        /* From denominator start back to numerator end. */
        if (this.value.charAt(this.cursor - 1) === "(") {
            var slash = this.cursor - 2;
            if (this.value.charAt(slash) === "/") {
                var numClose = slash - 1;
                if (this.value.charAt(numClose) === ")") {
                    this.cursor = numClose;
                    this.cursorContext = "num";
                    this.mixedMode = "num";
                    this.render();
                    return;
                }
            }
        }
    }

    if (this.cursor > 0) {
        sqrtStart = this.findAtomicSqrtStartBefore(this.cursor);

        if (sqrtStart >= 0) {
            this.cursor = sqrtStart;
        } else if (this.isInsideEmptySqrtCell()) {
            this.cursor = this.cursor - 5;
        } else if (this.value.substring(this.cursor - 2, this.cursor) === "PI") {
            this.cursor -= 2;
        } else if (this.value.substring(this.cursor - 4, this.cursor) === "SQRT") {
            this.cursor -= 4;
        } else {
            this.cursor--;
        }
    }

    this.cursorContext = "base";
    this.mixedMode = "";
    this.render();
};


MoodleStemKeyboard.prototype.editPreviousStructure = function () {
    /*
       Edit is not a left arrow. It re-enters the closest completed editable
       structure immediately before the cursor.

       Examples:
       1/(2+3)|   -> 1/(2+3|)
       2^(3+4)|   -> 2^(3+4|)
       SQRT(5)|   -> SQRT(5|)
       (5+(7)/(9))| -> (5+(7)/(9|))
    */
    var closePos, openPos, innerClose, innerOpen;

    if (this.readOnly) return;
    if (this.cursor <= 0) return;

    closePos = this.cursor - 1;

    /* Mixed number entity: (whole+(num)/(den)) .
       When cursor is after the outer ), enter the denominator first. */
    if (this.value.charAt(closePos) === ")") {
        openPos = this.findMatchingOpenParen(closePos);

        if (openPos >= 0) {
            innerClose = closePos - 1;
            if (this.value.charAt(innerClose) === ")") {
                innerOpen = this.findMatchingOpenParen(innerClose);
                if (innerOpen > 0 && this.value.charAt(innerOpen - 1) === "/") {
                    this.cursor = innerClose;
                    this.cursorContext = "den";
                    this.mixedMode = "den";
                    this.render();
                    return;
                }
            }

            /* Completed square-root. */
            if (openPos >= 4 && this.value.substring(openPos - 4, openPos) === "SQRT") {
                this.cursor = closePos;
                this.cursorContext = "rad";
                this.mixedMode = "";
                this.render();
                return;
            }

            /* Completed exponent written as ^(...). */
            if (openPos > 0 && this.value.charAt(openPos - 1) === "^") {
                this.cursor = closePos;
                this.cursorContext = "exp";
                this.mixedMode = "";
                this.render();
                return;
            }

            /* Completed denominator written as /(...). */
            if (openPos > 0 && this.value.charAt(openPos - 1) === "/") {
                this.cursor = closePos;
                this.cursorContext = "den";
                this.mixedMode = "";
                this.render();
                return;
            }
        }
    }

    /* If the cursor is after PI, edit cannot enter it; it is atomic.
       Same for a fixed x²: the exponent is closed and not editable. */
    this.render();
};

MoodleStemKeyboard.prototype.moveRight = function () {
    var end;

    if (this.mixedMode === "num") {
        if (this.value.charAt(this.cursor) === "/") {
            this.cursor++;
            this.cursorContext = "den";
            this.mixedMode = "den";
            this.render();
            return;
        }
    }

    if (this.mixedMode === "den") {
        if (this.value.charAt(this.cursor) === ")") {
            this.cursor++;
            this.cursorContext = "base";
            this.mixedMode = "";
            this.render();
            return;
        }
    }

    if (this.cursorContext === "pow10") {
        this.cursorContext = "base";
        this.mixedMode = "";
        this.render();
        return;
    }

    /* If the cursor is at the end of a denominator/exponent/root cell,
       pressing right arrow should move the logical cursor out of that cell. */
    if (this.cursorContext !== "base") {
        if (this.cursor < this.value.length && this.isContextExitChar(this.value.charAt(this.cursor))) {
            this.cursor++;
        }
        this.cursorContext = "base";
        this.mixedMode = "";
        this.render();
        return;
    }

    if (this.value.substring(this.cursor, this.cursor + 2) === "PI") {
        this.cursor += 2;
    } else if (this.value.substring(this.cursor, this.cursor + 4) === "SQRT") {
        end = this.findSqrtEndAt(this.cursor);
        this.cursor = end;
    } else if (this.cursor < this.value.length) {
        this.cursor++;
    }

    this.cursorContext = "base";
    this.mixedMode = "";
    this.render();
};

MoodleStemKeyboard.prototype.setValueFromMoodle = function (s) {
    if (typeof s !== "string") s = "";
    this.value = s;
    this.cursor = this.value.length;
    this.cursorContext = "base";
    this.mixedMode = "";
    this.render();
};

MoodleStemKeyboard.prototype.loadValueFromMoodle = function () {
    let data;

    if (!this.getParamFunc) return;

    data = this.getParamFunc();

    if (typeof data === "string") {
        this.value = data;
        return;
    }

    if (data && typeof data === "object") {
        this.value = data.expression || "";

        if (this.withUnits) {
            this.unitValue = data.unit || "";
            this.unitScale = typeof data.scale === "number" ? data.scale : 1;
        }
    }
};

MoodleStemKeyboard.prototype.getValueForMoodle = function () {
    let result = this.parseFull(this.value, false);

    if (!result.ok) return "";

    return this.value.split(this.implicitMul).join("*")
    .split(this.power10Marker).join("");
};

MoodleStemKeyboard.prototype.setValue = function (s) {
    this.setValueFromMoodle(s);
};

MoodleStemKeyboard.prototype.getValue = function () {
    return this.getValueForMoodle();
};

MoodleStemKeyboard.prototype.updateMoodleTarget = function () {
    var moodleValue = this.getValueForMoodle();
    var el;

    if (this.setParamFunc) {
        this.setParamFunc(moodleValue, this.unitValue || "", this.unitValue ? this.unitScale : 1);
    }

    if (!this.moodleTargetId) return;
    el = document.getElementById(this.moodleTargetId);
    if (!el) return;
    el.value = moodleValue;
    el.setAttribute("dir", "ltr");
    el.style.direction = "ltr";
    el.style.textAlign = "left";
    el.style.unicodeBidi = "plaintext";
};

MoodleStemKeyboard.prototype.render = function () {
    var displayValue = this.value.substring(0, this.cursor) + "\uE000" + this.value.substring(this.cursor);
    var displayResult = this.toLatex(displayValue, true, this.cursorContext);
    var validationResult = this.parseFull(this.value, false);
    var html;

    var unitLatex = this.getUnitLatex();
    if (unitLatex !== "") {
        html = "\\(" + displayResult.latex + "\\;" + unitLatex + "\\)";
    } else {
        html = "\\(" + displayResult.latex + "\\)";
    }

    if (this.value !== "" && !validationResult.ok) {
        html += " ❗";
        this.hasError = true;
    } else {
        this.hasError = false;
    }

   if (window.MathJax && window.MathJax.typesetClear) {
    window.MathJax.typesetClear([this.display]);
    }

    this.display.innerHTML = html;

    if (window.MathJax) {
        if (typeof window.MathJax.typesetPromise === "function") {
            window.MathJax.typesetPromise([this.display]);
        } else if (window.MathJax.Hub && typeof window.MathJax.Hub.Queue === "function") {
            window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, this.display]);
        }
    }

    this.updatePowerButtonState();
    this.updateMoodleTarget();
};

MoodleStemKeyboard.prototype.updatePowerButtonState = function () {
    let buttons = this.popup.getElementsByTagName("button");
    let canPower = this.canInsertPower();
    let canSubscript = this.canInsertSubscript();
    let canCloseParen = this.canInsertCloseParenthesis();
    let blockAtomAfterSquare = this.isAfterClosedFixedPower();
    let inMixedCell = (this.mixedMode === "num" || this.mixedMode === "den");
    let canPower10 = this.canInsertPowerOf10();
    let inPower10 = this.cursorContext === "pow10";
    let role, i;

    for (i = 0; i < buttons.length; i++) {
        role = buttons[i].getAttribute("data-role");

        if (role === "equalsKey") {
            buttons[i].disabled = !this.canInsertEquals();
            continue;
        }
        if (role === "sqrtKey") {
            buttons[i].disabled = inPower10;
            continue;
        }

        if (role === "subscriptKey") {
            buttons[i].disabled = !canSubscript;
            continue;
        }

        if (inMixedCell) {
            if (role === "digitKey") {
                buttons[i].disabled = false;
            } else if (role === "decimalKey" ||
                       role === "operatorKey" ||
                       role === "atomKey" ||
                       role === "functionKey" ||
                       role === "powerAny" ||
                       role === "powerFixed" ||
                       role === "mixedFractionKey" ||
                       role === "unitsKey") {
                buttons[i].disabled = true;
            } else if (role === "closeParenKey") {
                buttons[i].disabled = !canCloseParen;
                continue;
            }
            continue;
        }

        if (role === "powerAny" || role === "powerFixed") {
            buttons[i].disabled = !canPower;
        } else if (role === "mixedFractionKey") {
            buttons[i].disabled = !this.canInsertMixedFraction();
        } else if (role === "digitKey" || role === "decimalKey" || role === "atomKey") {
            buttons[i].disabled = blockAtomAfterSquare;
        } else if (role === "powerOf10Key") {
            buttons[i].disabled = !canPower10;
            continue;
        } else {
            buttons[i].disabled = false;
        }
    }
};

/* ===================== PARSER ===================== */

MoodleStemKeyboard.prototype.makeParser = function (s) {
    return { s: s, pos: 0 };
};

MoodleStemKeyboard.prototype.peek = function (p) {
    if (p.pos >= p.s.length) return "";
    return p.s.charAt(p.pos);
};

MoodleStemKeyboard.prototype.take = function (p, ch) {
    if (this.peek(p) === ch) {
        p.pos++;
        return true;
    }
    return false;
};

MoodleStemKeyboard.prototype.parseFull = function (s, allowCursor, cursorContext) {
    var p = this.makeParser(s);
    p.cursorContext = cursorContext || "base";
    var ast;

    if (s === "") {
        return { ok: true, ast: null, pos: 0, error: "" };
    }

    ast = this.parseEquation(p, allowCursor === true);

    if (!ast) {
        return { ok: false, error: "empty or invalid expression", ast: null, pos: p.pos };
    }

    if (p.pos !== p.s.length) {
        return { ok: false, error: "unexpected character", ast: ast, pos: p.pos };
    }

    if (this.treeHasError(ast, allowCursor === true)) {
        return { ok: false, error: "incomplete expression", ast: ast, pos: p.pos };
    }

    return { ok: true, ast: ast, pos: p.pos, error: "" };
};

MoodleStemKeyboard.prototype.treeHasError = function (node, allowCursor) {
    var k;
    if (!node) return false;
    if (node.type === "missing" || node.type === "error") return true;
    if (node.missingClose === true) return true;
    if (node.type === "cursor") return allowCursor !== true;
    for (k in node) {
        if (node.hasOwnProperty(k) && node[k] && typeof node[k] === "object") {
            if (this.treeHasError(node[k], allowCursor)) return true;
        }
    }
    return false;
};

MoodleStemKeyboard.prototype.parseEquation = function (p, allowCursor) {
    let first = this.parseAddSub(p, allowCursor);
    let right;
    let sides;
    let equalsCount = 0;

    if (!first) return null;

    sides = [first];

    while (this.peek(p) === "=") {
        if (equalsCount >= this.maxEquals) {
            return null;
        }

        p.pos++;
        right = this.parseAddSub(p, allowCursor);

        if (!right) return null;

        sides.push(right);
        equalsCount++;
    }

    if (sides.length === 1) {
        return first;
    }

    return {
        type: "equation",
        sides: sides
    };
};

MoodleStemKeyboard.prototype.parseAddSub = function (p, allowCursor) {
    let node = this.parseMulDiv(p, allowCursor);
    let op, right;
    if (!node) return null;

    while (this.peek(p) === "+" || this.peek(p) === "-") {
        op = this.peek(p);
        p.pos++;
        right = this.parseMulDiv(p, allowCursor);
        if (!right) right = { type: "missing", start: p.pos, end: p.pos };
        node = { type: "binary", op: op, left: node, right: right, start: node.start, end: right.end };
    }

    if (allowCursor === true && this.peek(p) === "\uE000") {
        p.pos++;
        node = { type: "cursorAfter", child: node, start: node.start, end: p.pos };
    }

    return node;
};

MoodleStemKeyboard.prototype.parseMulDiv = function (p, allowCursor) {
    let node = this.parsePower(p, allowCursor);
    let op;
    let right;
    let markerPos;
    let markedPower10;

    if (!node) return null;

    while (true) {
        markedPower10 = false;
        markerPos = p.pos;

        /*
         * A POWER10 marker is valid only immediately before "*".
         * Keep it in the source string so AST start/end positions
         * remain compatible with this.value.
         */
        if (this.peek(p) === this.power10Marker) {
            p.pos++;

            if (this.peek(p) === "*") {
                markedPower10 = true;
            } else {
                p.pos = markerPos;
            }
        }

        if (this.peek(p) !== "*" &&
            this.peek(p) !== "/" &&
            this.peek(p) !== this.implicitMul) {
            break;
        }

        op = this.peek(p);
        p.pos++;

        right = this.parsePower(p, allowCursor);

        if (!right) {
            right = {
                type: "missing",
                start: p.pos,
                end: p.pos
            };
        }

        if (op === "*" || op === this.implicitMul) {
            node = {
                type: "binary",
                op: (op === this.implicitMul ? "impmul" : "*"),
                left: node,
                right: right,
                start: node.start,
                end: right.end
            };

            /*
             * Remember that this multiplication came from
             * the ×10^ key.
             */
            if (markedPower10) {
                node.power10 = true;
                node.power10MarkerPos = markerPos;
            }

        } else {
            node = this.attachDivideToRightmostFactor(node, right);

            /*
             * If attachDivideToRightmostFactor() does not already
             * preserve ranges, make sure the resulting node does.
             */
            if (typeof node.start !== "number") node.start = node.left.start;
            if (typeof node.end !== "number") node.end = node.right.end;
        }
    }

    if (allowCursor === true &&
        this.peek(p) === "\uE000") {

        p.pos++;

        node = {
            type: "cursorAfter",
            child: node,
            start: node.start,
            end: p.pos
        };
    }

    return node;
};

MoodleStemKeyboard.prototype.attachDivideToRightmostFactor = function (node, denominator) {
    if (node && node.type === "binary" && (node.op === "*" || node.op === "impmul")) {
        let newRight = this.attachDivideToRightmostFactor(node.right, denominator);
        return {
            type: "binary",
            op: node.op,
            left: node.left,
            right: newRight,
            start: node.start,
            end: newRight.end
        };
    }

    return {
        type: "binary",
        op: "/",
        left: node,
        right: denominator,
        start: node.start,
        end: denominator.end
    };
};

MoodleStemKeyboard.prototype.shouldAttachCursorInsideAtom = function (p) {
    return p.cursorContext === "den" || p.cursorContext === "exp" || p.cursorContext === "num" || p.cursorContext === "rad" || p.cursorContext === "sub";
};

MoodleStemKeyboard.prototype.parsePower = function (p, allowCursor) {
    let node = this.parseUnary(p, allowCursor);
    let right;
    let start, ch, indexNode;

    if (!node) return null;

    if (this.peek(p) === "_" && node.type === "variable") {
        p.pos++;
        start = p.pos;

        while (p.pos < p.s.length) {
            ch = p.s.charAt(p.pos);
            if (!(ch >= "0" && ch <= "9")) break;
            p.pos++;
        }

        if (p.pos > start) {
            indexNode = { type: "number", value: p.s.substring(start, p.pos), start: start, end: p.pos };

            if (allowCursor === true && this.peek(p) === "\uE000") {
                p.pos++;
                indexNode = { type: "cursorAfter", child: indexNode, start: indexNode.start, end: p.pos };
            }
        } else if (allowCursor === true && this.peek(p) === "\uE000") {
            let cursorStart = p.pos;
            p.pos++;
            indexNode = { type: "cursor", start: cursorStart, end: p.pos };
        } else {
            indexNode = { type: "missing", start: start, end: start };
        }

        node = { type: "subscript", base: node, index: indexNode, start: node.start, end: indexNode.end };
    }

    if (this.peek(p) === "^") {
        p.pos++;
        right = this.parsePower(p, allowCursor); /* right associative */
        if (!right) right = { type: "missing", start: p.pos, end: p.pos };
        node = { type: "binary", op: "^", left: node, right: right, start: node.start, end: right.end };
    }

    if (allowCursor === true && this.peek(p) === "\uE000" && this.shouldAttachCursorInsideAtom(p)) {
        p.pos++;
        node = { type: "cursorAfter", child: node, start: node.start, end: p.pos };
    }

    return node;
};

MoodleStemKeyboard.prototype.parseUnary = function (p, allowCursor) {
    if (this.peek(p) === "-" || this.peek(p) === "+") {
        let start = p.pos;
        let op = this.peek(p);
        let child;
        p.pos++;
        child = this.parseUnary(p, allowCursor) || { type: "missing", start: p.pos, end: p.pos };
        return { type: "unary", op: op, child: child, start: start, end: child.end };
    }
    return this.parseAtom(p, allowCursor);
};

MoodleStemKeyboard.prototype.parseAtom = function (p, allowCursor) {
    let ch = this.peek(p);
    let start = p.pos;
    let inside;
    let configuredVariable;

    if (ch === "") return null;

    if (ch === "\uE000") {
        p.pos++;
        if (allowCursor === true) return { type: "cursor", start: start, end: p.pos };
        return { type: "error", label: "cursor not allowed", start: start, end: p.pos };
    }

    if ((ch >= "0" && ch <= "9") || ch === ".") {
        while (p.pos < p.s.length) {
            ch = p.s.charAt(p.pos);
            if (!((ch >= "0" && ch <= "9") || ch === ".")) break;
            p.pos++;
        }
        return { type: "number", value: p.s.substring(start, p.pos), start: start, end: p.pos };
    }

    if (p.s.substring(p.pos, p.pos + 2) === "PI") {
        p.pos += 2;
        return { type: "pi", start: start, end: p.pos };
    }

    if (p.s.substring(p.pos, p.pos + 4) === "SQRT") {
        p.pos += 4;
        if (this.take(p, "(")) {
            inside = this.parseAddSub(p, allowCursor);
            if (!inside) inside = { type: "missing", start: p.pos, end: p.pos };
            if (!this.take(p, ")")) {
                return { type: "sqrt", child: inside, missingClose: true, start: start, end: p.pos };
            }
            return { type: "sqrt", child: inside, start: start, end: p.pos };
        }
        return { type: "sqrt", child: { type: "missing", start: p.pos, end: p.pos }, start: start, end: p.pos };
    }

    if (ch === "(") {
        p.pos++;
        inside = this.parseAddSub(p, allowCursor);
        if (!inside) inside = { type: "missing", start: p.pos, end: p.pos };
        if (!this.take(p, ")")) {
            return { type: "group", child: inside, missingClose: true, start: start, end: p.pos };
        }
        return { type: "group", child: inside, start: start, end: p.pos };
    }

    configuredVariable = this.matchConfiguredVariable(p);
    if (configuredVariable !== "") {
        return { type: "variable", name: configuredVariable, start: start, end: p.pos };
    }

    if (this.variableMode === "A-Z" && ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z"))) {
        p.pos++;
        return { type: "variable", name: ch, start: start, end: p.pos };
    }

    return null;
};

/* ===================== AST TO LATEX ===================== */

MoodleStemKeyboard.prototype.precedence = function (node) {
    if (!node) return 100;
    if (node.type === "equation") return 5;
    if (node.type === "binary") {
        if (node.op === "=") return 5;
        if (node.op === "+" || node.op === "-") return 10;
        if (node.op === "*" || node.op === "/" || node.op === "impmul") return 20;
        if (node.op === "^") return 30;
    }
    if (node.type === "unary") return 25;
    return 100;
};

MoodleStemKeyboard.prototype.toLatex = function (s, allowCursor, forcedCursorContext) {
    var result = this.parseFull(s, allowCursor === true, forcedCursorContext || "base");
    var latex;

    if (result.ast) {
        latex = this.latexFromNode(result.ast, 0, "", forcedCursorContext || "");
    } else {
        latex = "\\mid";
    }

    if (!result.ok && result.pos < s.length) {
        latex += "\\;\\text{" + this.safeText(s.substring(result.pos)) + "}";
    }

    if (this.debug && result.ast) {
        this.dumpTree(result.ast);
    }

    return { ok: result.ok, latex: latex, ast: result.ast, error: result.error, pos: result.pos };
};

MoodleStemKeyboard.prototype.safeText = function (s) {
    var out = "";
    var i, ch;
    for (i = 0; i < s.length; i++) {
        ch = s.charAt(i);
        if (ch === "\uE000") out += "|";
        else if (ch === "\uE001") out += "*";
        else if (ch === "\\") out += "\\backslash ";
        else if (ch === "{") out += "\\{";
        else if (ch === "}") out += "\\}";
        else if (ch === this.power10Marker) out += "";
        else out += ch;
    }
    return out;
};

MoodleStemKeyboard.prototype.getMixedGroupParts = function (node) {
    var add, frac;

    if (!node || node.type !== "group") return null;
    add = node.child;
    if (!add || add.type !== "binary" || add.op !== "+") return null;

    frac = add.right;
    if (!frac || frac.type !== "binary" || frac.op !== "/") return null;

    if (!add.left || add.left.type !== "number") return null;

    return {
        whole: add.left,
        numerator: frac.left,
        denominator: frac.right
    };
};

MoodleStemKeyboard.prototype.cursorLatex = function (side) {
    /*
       The cursor must be rendered in the math style of the position where
       the next key will be inserted. Do not force \scriptsize inside a
       denominator or exponent: MathJax already applies the correct style
       when the cursor is inside the denominator/exponent braces.

       - Inside exponent: the surrounding ^{...} makes it script-sized.
       - Inside denominator/numerator/root: the surrounding structure places
         it in the correct vertical position.
       - Outside any structure: add a small space before the cursor so it is
         clearly after the fraction/power, not inside it.
    */
    if ( this.readOnly)
        return "";

    if (side === "exp") return "\\mathord{\\vphantom{0}\\mid}";
    if (side === "den") return "\\mathord{\\vphantom{0}\\mid}";
    if (side === "num") return "\\mathord{\\vphantom{0}\\mid}";
    if (side === "rad") return "\\mathord{\\vphantom{0}\\mid}";
    if (side === "sub") return "\\mathord{\\vphantom{0}\\mid}";

    return "\\,\\mathord{\\vphantom{0}\\mid}";
};

MoodleStemKeyboard.prototype.getSimpleFractionGroupParts = function (node) {
    let frac;

    if (!node || node.type !== "group") return null;

    frac = node.child;
    if (!frac || frac.type !== "binary" || frac.op !== "/") return null;

    return {
        numerator: frac.left,
        denominator: frac.right
    };
};

MoodleStemKeyboard.prototype.latexFromNode = function (node, parentPrec, side, forcedCursorContext) {
    var s, lp, rp, myPrec;
    if (!node) return "\\square";

    if (node.type === "number") return node.value;
    if (node.type === "variable") return this.getVariableLabel(node.name);
    if (node.type === "pi") return "\\pi";
    if (node.type === "subscript") {
        return this.latexFromNode(node.base, 100, "base", forcedCursorContext) +
            "_{" + this.latexFromNode(node.index, 0, "sub", forcedCursorContext) + "}";
    }
    if (node.type === "cursor") return this.cursorLatex(forcedCursorContext || side);
    if (node.type === "cursorAfter") return this.latexFromNode(node.child, parentPrec, side, forcedCursorContext) + this.cursorLatex(forcedCursorContext || side);
    if (node.type === "missing") return "\\square";
    if (node.type === "error") return "\\square";

    if (node.type === "equation") {
        var eqParts = [];
        var eqIndex;
        for (eqIndex = 0; eqIndex < node.sides.length; eqIndex++) {
            eqParts.push(this.latexFromNode(node.sides[eqIndex], 0, "", forcedCursorContext));
        }
        return eqParts.join("=");
    }

    if (node.type === "group") {
        var mixedParts = this.getMixedGroupParts(node);
        if (mixedParts) {
            return this.latexFromNode(mixedParts.whole, 0, "", forcedCursorContext) +
                   "\\frac{" + this.latexFromNode(mixedParts.numerator, 0, "num", forcedCursorContext) +
                   "}{" + this.latexFromNode(mixedParts.denominator, 0, "den", forcedCursorContext) + "}";
        }
        var simpleFractionParts = this.getSimpleFractionGroupParts(node);

        if (simpleFractionParts) {
            return "\\frac{" +
                this.latexFromNode(simpleFractionParts.numerator, 0, "num", forcedCursorContext) +
                "}{" +
                this.latexFromNode(simpleFractionParts.denominator, 0, "den", forcedCursorContext) +
                "}";
        }

        if (node.missingClose === true) {
            return "(" + this.latexFromNode(node.child, 0, "", forcedCursorContext);
        }
        if (side === "exp" || side === "den" || side === "num" || side === "rad" || side === "sub") {
            return this.latexFromNode(node.child, 0, side, forcedCursorContext);
        }
        return "\\left(" + this.latexFromNode(node.child, 0, "", forcedCursorContext) + "\\right)";
    }

    if (node.type === "sqrt") {
        return "\\sqrt{" + this.latexFromNode(node.child, 0, "rad", forcedCursorContext) + "}";
    }

    if (node.type === "unary") {
        s = node.op + this.latexFromNode(node.child, this.precedence(node), "right", forcedCursorContext);
        if (this.precedence(node) < parentPrec) s = "\\left(" + s + "\\right)";
        return s;
    }

    if (node.type === "binary") {
        myPrec = this.precedence(node);

        if (node.op === "/") {
            s = "\\frac{" + this.latexFromNode(node.left, 0, "num", forcedCursorContext) + "}{" + this.latexFromNode(node.right, 0, "den", forcedCursorContext) + "}";
            if (myPrec < parentPrec) s = "\\left(" + s + "\\right)";
            return s;
        }

        if (node.op === "^") {
            lp = this.latexFromNode(node.left, myPrec, "base", forcedCursorContext);
            rp = this.latexFromNode(node.right, 0, "exp", forcedCursorContext);
            s = lp + "^{" + rp + "}";
            if (myPrec < parentPrec) s = "\\left(" + s + "\\right)";
            return s;
        }

        if (node.op === "*" || node.op === "impmul") {
            lp = this.latexFromNode(node.left, myPrec, "left", forcedCursorContext);
            rp = this.latexFromNode(node.right, myPrec, "right", forcedCursorContext);
            if (node.op === "impmul") {
                s = lp + "\\," + rp;
            } else {
                s = lp + this.timesOp + rp;
            }
            if (myPrec < parentPrec) s = "\\left(" + s + "\\right)";
            return s;
        }

        if (node.op === "=") {
            lp = this.latexFromNode(node.left, myPrec, "left", forcedCursorContext);
            rp = this.latexFromNode(node.right, myPrec, "right", forcedCursorContext);
            s = lp + "=" + rp;
            if (myPrec < parentPrec) s = "\\left(" + s + "\\right)";
            return s;
        }

        if (node.op === "+" || node.op === "-") {
            lp = this.latexFromNode(node.left, myPrec, "left", forcedCursorContext);
            rp = this.latexFromNode(node.right, myPrec + (node.op === "-" ? 1 : 0), "right", forcedCursorContext);
            s = lp + node.op + rp;
            if (myPrec < parentPrec) s = "\\left(" + s + "\\right)";
            return s;
        }
    }

    return "\\square";
};

/* ===================== DEBUG TREE DUMP ===================== */

MoodleStemKeyboard.prototype.dumpTree = function (ast) {
    function isObject(x) {
        return x !== null && typeof x === "object";
    }

    function shortValue(x) {
        if (x === null) return "null";
        if (typeof x === "undefined") return "undefined";
        if (typeof x === "string") return '"' + x + '"';
        if (typeof x === "number" || typeof x === "boolean") return String(x);
        if (Array.isArray(x)) return "Array[" + x.length + "]";
        if (x.type) {
            if (x.type === "binary") return "{binary " + (x.op === "impmul" ? "implicit *" : x.op) + "}";
            if (x.type === "unary") return "{unary " + x.op + "}";
            return "{" + x.type + "}";
        }
        return "{object}";
    }

    function dumpAny(value, name, prefix, isLast) {
        var connector = isLast ? "└── " : "├── ";
        var keys, nextPrefix, i;

        if (!isObject(value)) {
            console.log(prefix + connector + name + ": " + shortValue(value));
            return;
        }

        console.log(prefix + connector + name + ": " + shortValue(value));
        keys = Object.keys(value);
        nextPrefix = prefix + (isLast ? "    " : "│   ");

        for (i = 0; i < keys.length; i++) {
            dumpAny(value[keys[i]], keys[i], nextPrefix, i === keys.length - 1);
        }
    }

    console.log("========== AST ==========");
    dumpAny(ast, "root", "", true);
    console.log("=========================");
};

})();

(function () {
"use strict";

let IMPLICIT_MUL = "\uE001";
let analyzerVariables = [];

function normalizeAnalyzerVariables(variables) {
    let result = [];
    let i, item;

    if (!variables || Object.prototype.toString.call(variables) !== "[object Array]") return result;

    for (i = 0; i < variables.length; i++) {
        item = variables[i];

        if (typeof item === "string" && item !== "") {
            result.push(item);
        } else if (item && typeof item === "object" && typeof item.value === "string" && item.value !== "") {
            result.push(item.value);
        }
    }

    return result;
}

function matchAnalyzerVariable(p) {
    let best = "";
    let i, value;

    for (i = 0; i < analyzerVariables.length; i++) {
        value = analyzerVariables[i];

        if (p.s.substring(p.pos, p.pos + value.length) === value && value.length > best.length) {
            best = value;
        }
    }

    if (best !== "") {
        p.pos += best.length;
        return best;
    }

    return "";
}

function makeParser(s) {
    return { s: s, pos: 0 };
}

function peek(p) {
    if (p.pos >= p.s.length) return "";
    return p.s.charAt(p.pos);
}

function take(p, ch) {
    if (peek(p) === ch) {
        p.pos++;
        return true;
    }
    return false;
}

function treeHasError(node) {
    let k;

    if (!node) return false;
    if (node.type === "missing" || node.type === "error") return true;
    if (node.missingClose === true) return true;

    for (k in node) {
        if (Object.prototype.hasOwnProperty.call(node, k) && node[k] && typeof node[k] === "object") {
            if (treeHasError(node[k])) return true;
        }
    }

    return false;
}

function attachDivideToRightmostFactor(node, denominator) {
    if (node && node.type === "binary" && (node.op === "*" || node.op === "impmul")) {
        return {
            type: "binary",
            op: node.op,
            left: node.left,
            right: attachDivideToRightmostFactor(node.right, denominator)
        };
    }

    return { type: "binary", op: "/", left: node, right: denominator };
}

function parseAddSub(p) {
    let node = parseMulDiv(p);
    let op, right;

    if (!node) return null;

    while (peek(p) === "+" || peek(p) === "-") {
        op = peek(p);
        p.pos++;
        right = parseMulDiv(p);
        if (!right) right = { type: "missing" };
        node = { type: "binary", op: op, left: node, right: right };
    }

    return node;
}

function parseMulDiv(p) {
    let node = parsePower(p);
    let op, right;

    if (!node) return null;

    while (peek(p) === "*" || peek(p) === "/" || peek(p) === IMPLICIT_MUL) {
        op = peek(p);
        p.pos++;
        right = parsePower(p);
        if (!right) right = { type: "missing" };

        if (op === "*" || op === IMPLICIT_MUL) {
            node = { type: "binary", op: (op === IMPLICIT_MUL ? "impmul" : "*"), left: node, right: right };
        } else {
            node = attachDivideToRightmostFactor(node, right);
        }
    }

    return node;
}

function parsePower(p) {
    let node = parseUnary(p);
    let right;
    let start, ch, indexNode;

    if (!node) return null;

    if (peek(p) === "_" && node.type === "variable") {
        p.pos++;
        start = p.pos;

        while (p.pos < p.s.length) {
            ch = p.s.charAt(p.pos);
            if (!(ch >= "0" && ch <= "9")) break;
            p.pos++;
        }

        if (p.pos === start) {
            indexNode = { type: "missing" };
        } else {
            indexNode = { type: "number", value: p.s.substring(start, p.pos) };
        }

        node = { type: "subscript", base: node, index: indexNode };
    }

    if (peek(p) === "^") {
        p.pos++;
        right = parsePower(p);
        if (!right) right = { type: "missing" };
        node = { type: "binary", op: "^", left: node, right: right };
    }

    return node;
}

function parseUnary(p) {
    let op;

    if (peek(p) === "-" || peek(p) === "+") {
        op = peek(p);
        p.pos++;
        return { type: "unary", op: op, child: parseUnary(p) || { type: "missing" } };
    }

    return parseAtom(p);
}

function parseAtom(p) {
    let ch = peek(p);
    let start, inside;

    if (ch === "") return null;

    if ((ch >= "0" && ch <= "9") || ch === ".") {
        start = p.pos;

        while (p.pos < p.s.length) {
            ch = p.s.charAt(p.pos);
            if (!((ch >= "0" && ch <= "9") || ch === ".")) break;
            p.pos++;
        }

        return { type: "number", value: p.s.substring(start, p.pos) };
    }

    if (p.s.substring(p.pos, p.pos + 2) === "PI") {
        p.pos += 2;
        return { type: "pi" };
    }

    if (p.s.substring(p.pos, p.pos + 4) === "SQRT") {
        p.pos += 4;

        if (take(p, "(")) {
            inside = parseAddSub(p);
            if (!inside) inside = { type: "missing" };

            if (!take(p, ")")) {
                return { type: "sqrt", child: inside, missingClose: true };
            }

            return { type: "sqrt", child: inside };
        }

        return { type: "sqrt", child: { type: "missing" } };
    }

    if (ch === "(") {
        p.pos++;
        inside = parseAddSub(p);
        if (!inside) inside = { type: "missing" };

        if (!take(p, ")")) {
            return { type: "group", child: inside, missingClose: true };
        }

        return { type: "group", child: inside };
    }

    let configuredVariable = matchAnalyzerVariable(p);
    if (configuredVariable !== "") {
        return { type: "variable", name: configuredVariable };
    }

    /* Fallback keeps the analyzer useful when no variable list was supplied. */
    if (analyzerVariables.length === 0 && ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z"))) {
        p.pos++;
        return { type: "variable", name: ch };
    }

    return null;
}

function parsePart(s) {
    let p = makeParser(s);
    let ast;

    if (s === "") {
        return { ok: false, ast: null, pos: 0, error: "empty expression part" };
    }

    ast = parseAddSub(p);

    if (!ast) {
        return { ok: false, ast: null, pos: p.pos, error: "empty or invalid expression" };
    }

    if (p.pos !== p.s.length) {
        return { ok: false, ast: ast, pos: p.pos, error: "unexpected character" };
    }

    if (treeHasError(ast)) {
        return { ok: false, ast: ast, pos: p.pos, error: "incomplete expression" };
    }

    return { ok: true, ast: ast, pos: p.pos, error: "" };
}

function numberKind(text) {
    let i, ch;
    let dotCount = 0;
    let digitCount = 0;

    if (!text) return "";

    for (i = 0; i < text.length; i++) {
        ch = text.charAt(i);

        if (ch >= "0" && ch <= "9") {
            digitCount++;
        } else if (ch === ".") {
            dotCount++;
        } else {
            return "";
        }
    }

    if (digitCount === 0) return "";
    if (dotCount === 0) return "integer";
    if (dotCount === 1) return "decimalNumber";
    return "";
}

function signedAtomicNode(node) {
    let sign = 1;
    let current = node;

    while (current && current.type === "unary") {
        if (current.op === "-") sign = -sign;
        current = current.child;
    }

    return { node: current, sign: sign };
}

function integerNodeValue(node) {
    if (!node || node.type !== "number") return null;
    if (numberKind(node.value) !== "integer") return null;
    return node.value;
}

function getSimpleFractionParts(node) {
    let frac;

    if (!node || node.type !== "group") return null;

    frac = node.child;
    if (!frac || frac.type !== "binary" || frac.op !== "/") return null;

    if (integerNodeValue(frac.left) === null || integerNodeValue(frac.right) === null) return null;

    return {
        numerator: frac.left.value,
        denominator: frac.right.value
    };
}

function getMixedFractionParts(node) {
    let add, frac;

    if (!node || node.type !== "group") return null;

    add = node.child;
    if (!add || add.type !== "binary" || add.op !== "+") return null;

    frac = add.right;
    if (!frac || frac.type !== "binary" || frac.op !== "/") return null;

    if (integerNodeValue(add.left) === null) return null;
    if (integerNodeValue(frac.left) === null || integerNodeValue(frac.right) === null) return null;

    return {
        whole: add.left.value,
        numerator: frac.left.value,
        denominator: frac.right.value
    };
}

function unwrapPlainGroups(node) {
    let current = node;

    while (current && current.type === "group") {
        if (getSimpleFractionParts(current) || getMixedFractionParts(current)) break;
        current = current.child;
    }

    return current;
}

function collectVariables(node, result) {
    let k, i;

    if (!node) return;

    if (node.type === "subscript" && node.base && node.base.type === "variable" &&
        node.index && node.index.type === "number") {
        let indexedName = node.base.name + "_" + node.index.value;

        for (i = 0; i < result.length; i++) {
            if (result[i] === indexedName) return;
        }

        result.push(indexedName);
        return;
    }

    if (node.type === "variable") {
        for (i = 0; i < result.length; i++) {
            if (result[i] === node.name) return;
        }
        result.push(node.name);
        return;
    }

    for (k in node) {
        if (Object.prototype.hasOwnProperty.call(node, k) && node[k] && typeof node[k] === "object") {
            collectVariables(node[k], result);
        }
    }
}

function classifyPart(value) {
    let parsed = parsePart(value);
    let signed, node, kind, fraction, mixed, variables;
    let result = { value: value };

    if (!parsed.ok) {
        result.type = "invalid";
        result.error = parsed.error;
        result.position = parsed.pos;
        return result;
    }

    signed = signedAtomicNode(parsed.ast);
    node = signed.node;

    /* Mixed fraction is checked before simple fraction and before generic groups. */
    mixed = getMixedFractionParts(node);
    if (mixed) {
        result.type = "mixedFraction";
        result.whole = mixed.whole;
        result.numerator = mixed.numerator;
        result.denominator = mixed.denominator;
        result.sign = signed.sign;
        return result;
    }

    fraction = getSimpleFractionParts(node);
    if (fraction) {
        result.type = "simpleFraction";
        result.numerator = fraction.numerator;
        result.denominator = fraction.denominator;
        result.sign = signed.sign;
        return result;
    }

    node = unwrapPlainGroups(node);

    if (node && node.type === "number") {
        kind = numberKind(node.value);

        if (!kind) {
            result.type = "invalid";
            result.error = "invalid number";
            result.position = 0;
            return result;
        }

        result.type = kind;
        return result;
    }

    if (node && node.type === "pi") {
        result.type = "constant";
        result.constant = "PI";
        if (signed.sign !== 1) result.sign = signed.sign;
        return result;
    }

    /* A bare ordinary or indexed variable is classified as variable. */
    if (parsed.ast && parsed.ast.type === "variable") {
        result.type = "variable";
        result.variable = parsed.ast.name;
        return result;
    }

    if (parsed.ast && parsed.ast.type === "subscript" &&
        parsed.ast.base && parsed.ast.base.type === "variable" &&
        parsed.ast.index && parsed.ast.index.type === "number") {
        result.type = "variable";
        result.variable = parsed.ast.base.name + "_" + parsed.ast.index.value;
        return result;
    }

    variables = [];
    collectVariables(parsed.ast, variables);

    if (variables.length > 0) {
        result.type = "algebraicExpression";
        result.variables = variables;
        return result;
    }

    result.type = "arithmeticExpression";
    return result;
}

function analyze(value, variables) {
    let text = (typeof value === "string") ? value : "";
    let rawParts = text.split("=");
    let result = [];
    let i;

    analyzerVariables = normalizeAnalyzerVariables(variables);

    for (i = 0; i < rawParts.length; i++) {
        result.push(classifyPart(rawParts[i]));
    }

    return result;
}

window.MoodleStemExpression = {
    analyze: analyze
};

})();
