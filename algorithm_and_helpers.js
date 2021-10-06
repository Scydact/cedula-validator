function removeInvalidCedChars(ced) {
    return ced.replace(/[^\d]/g, '');
}

function checkLuhn(cardNo) {
    var s = 0;
    var doubleDigit = false;
    for (var i = cardNo.length - 1; i >= 0; i--) {
        var digit = +cardNo[i];
        if (doubleDigit) {
            digit *= 2;
            if (digit > 9)
                digit -= 9;
        }
        s += digit;
        doubleDigit = !doubleDigit;
    }
    return s % 10 == 0;
}

function calcLuhn(cardNo, doubleDigit = false) {
    // to check if valid, do (sum % 10 == 0)
    var s = 0;
    for (var i = cardNo.length - 1; i >= 0; i--) {
        var digit = +cardNo[i];
        if (doubleDigit) {
            digit *= 2;
            if (digit > 9)
                digit -= 9;
        }
        s += digit;
        doubleDigit = !doubleDigit;
    }
    return [s, doubleDigit];
}

function getLuhnCheckDigit(payload) {
    var s = calcLuhn(payload, true)[0];
    return (10 - (s % 10)) % 10;
}

function cedToHtml(cardNo, specialCharRanges) {
    if (!cardNo) return '';
    var ranges = [
        ['initial', [0, 3]],
        ['data', [3, 10]],
        ['end', [10, 11]],
    ];

    if (Array.isArray(specialCharRanges)) // array from x to y
        ranges.push(...specialCharRanges.map(x => ['special', x]));

    var index = 0;
    var digits = cardNo.split('').map((c) => {
        // Not a digit
        if (!('0' <= c && c <= '9'))
            return c;

        // Its a digit!
        var classes = [];
        ranges.forEach(([className, range]) => {
            if (range[0] <= index && index < range[1])
                classes.push(className);
        })
        index++;
        return `<span class="${classes.join(' ')}">${c}</span>`;
    })

    return digits.join('');
}

function getLuhnDigit(cardNo, atIndex = -1) {
    if (atIndex < 0 || atIndex >= cardNo.length)
        atIndex = cardNo.length;

    var before = cardNo.slice(0, atIndex);
    var after = cardNo.slice(atIndex);

    var s = 0;
    var [n, doubleDigit] = calcLuhn(after, false);
    s += n;

    var [n,] = calcLuhn(before, !doubleDigit);
    s += n;

    var digit = 10 - (s % 10);
    if (digit > 9)
        digit -= 10;

    // if (digit === 0) return 0;

    if (doubleDigit) {
        if ((digit & 1) == 0)
            digit >>= 1; // Simple divide by 2 if already even.
        else
            digit = ((digit + 1) >> 1) + 4; // Minus 9, I guess?
    }
    // return [digit, s, doubleDigit];
    return digit;
}

function insertLuhnDigit(cardNo, atIndex = -1) {
    if (!cardNo) return '';
    if (atIndex < 0 || atIndex >= cardNo.length)
        atIndex = cardNo.length;

    var digit = getLuhnDigit(cardNo, atIndex);
    var out = cardNo.split('');
    out.splice(atIndex, 0, digit.toString())
    return out.join('');
}

function createElement(tag, inner, classes, props) {
    const obj = document.createElement(tag);

    // append content, if any
    if (inner) {
        if (typeof inner == "string")
            obj.innerHTML = inner;
        else
            obj.append(inner); // Can be text, number, or another HTMLElement
    }

    // append classes
    if (classes) {
        if (typeof classes == "string") {
            obj.classList.add(classes);
        } else if (typeof classes == "object" && Array.isArray(classes)) {
            obj.classList.add(...classes);
        }
    }

    // append props, if any
    if (typeof props == "object") {
        for (let [key, val] of Object.entries(props)) {
            obj[key] = val;
        }
    }

    return obj;
}

/** Create <p> element */
function cp(t) {
    const x = document.createElement('p');
    x.innerHTML = t;
    return x;
}

// unused
function createCopyBtn(text) {
    const x = createElement('input', null, ['btn', 'copy-to-clip'],
        { 'value': '📋', 'title': 'Copiar a portapapeles.', 'type': 'button' });
    const fn = () => navigator.clipboard.writeText(text)
    x.addEventListener('click', fn);
    return x;
}

function clearNode(node) {
    while (node.firstChild)
        node.firstChild.remove();
}

/** Generates a number between 0(inclusive) and <max>(exclusive) */
function randInt(n) {
    return Math.floor(Math.random() * n)
}

function createPopup(text, duration = 1000) {
    const x = createElement('div', text, ['popup']);
    const y = document.getElementById('popup-container');
    if (!y) return;

    y.append(x);

    setTimeout(() => {
        x.remove()
    }, duration)
}

function isSimilarDigit(a, b) {
    const SIMILAR_CASES = [
        ['6', '0'],
        ['3', '8'],
        ['1', '7'],
        ['1', '2'],
        ['5', '3'],
        ['4', '9'],
    ]

    if (a == b) return false;

    for (let [x, y] of SIMILAR_CASES) {
        if ((x == a && y == b) || (x == b && y == a))
            return true;
    }

    return false;
}

// Unused
function getHtmlListNumber(node) {
    if (!node) return

    const li = node.closest('li')
    if (!li) return

    const parent = li.parentNode
    if (!parent) return

    return [...parent.children].indexOf(li)
}