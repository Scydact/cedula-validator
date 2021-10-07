const CED_LEN = 11
var previous_ced = ''
var current_permutes = []
const JS_VERSION = 1.1

nodes = {
    input: document.getElementById('in'),
    formatted_in: document.getElementById('colored_in'),
    output: document.getElementById('out'),
    search_control: document.getElementById('search_controls'),
    info: document.getElementById('info'),
}



/* ------ Permutation stats stuff ------*/
var current_permutes_stats = {
    total: 0,
    lost: 0,
    found: 0,
    promises: [],
    provinces: new Set(),
    animFrameId: undefined,
}

function resetPermuteStats() {
    current_permutes_stats.total = 0
    current_permutes_stats.found = 0
    current_permutes_stats.lost = 0
    current_permutes_stats.promises = []
    current_permutes_stats.provinces.clear()

    const displayNode = document.getElementById('permute_stats')
    if (!displayNode && CED_API)
        info.append(createElement('p', null, null, { id: 'permute_stats' }))
}

function updatePermuteStats(isFound) {
    if (isFound != undefined) {
        if (isFound)
            current_permutes_stats.found++
        else
            current_permutes_stats.lost++
    }
}

function displayPermuteStats() {
    const { found, lost, total } = current_permutes_stats
    const sum = found + lost
    function displayPercent(symbol, n) {
        return `[${symbol} ${n} (${(100 * n / sum).toFixed(2)}%)]`
    }
    const displayNode = document.getElementById('permute_stats')
    if (displayNode)
        displayNode.textContent = `Permutaciones: ${sum}/${total} ${displayPercent('✔', found)} ${displayPercent('❌', lost)}`
}



/* ------ Actual onChange function ------*/
function onCedChange(e, forceUpdate) {
    let input = nodes.input.value
    let ced = removeInvalidCedChars(input)
    const frag = document.createDocumentFragment()
    const info = nodes.info

    console.log(forceUpdate)
    // If nothing changed, do nothing.
    if (previous_ced === ced && !forceUpdate) return
    previous_ced = ced

    // Update input formatting
    nodes.formatted_in.innerHTML = cedToHtml(input)
    setSearchControlVisibility(false)
    resetSearchControls()
    clearNode(info)
    info.classList.remove('ok')

    // Info pane
    var t = []
    let isValid = checkLuhn(ced)
    if (isValid && ced.length == 11)
        info.classList.add('ok')
    info.append(cp(`Len: ${ced.length}/11`))
    info.append(cp(isValid ? '✔ Cedula OK' : '❌ Cedula INVALIDA!'))
    let prechk = getLuhnCheckDigit(ced.slice(0, -1))
    info.append(cp(`Checksum digit: ${prechk}`))

    // Get permutations
    const permutes = permuteCed(ced)
    const permute_ul_node = createCedStructNodeList(permutes)
    current_permutes = permutes
    validateCedStructList(permutes) // Start validation



    // Permutations text
    const permute_nodes = createElement('div', null, 'card', { id: 'permute_nodes' })
    frag.append(permute_nodes)
    if (ced.length == 11)
        permute_nodes.append(cp((isValid) ? 'Cedula correcta!' : 'Intente cambiando...'))
    else if (ced.length == 10)
        permute_nodes.append(cp('Intente agregar un digito: '))
    else if (ced.length == 12) {
        if (permutes.length) {
            permute_nodes.append(cp('Intente remover un digito:'))
        } else {
            permute_nodes.append(cp('Demasiados digitos!'))
            permute_nodes.append(cp('Remover alguno no valida ninguno.'))
        }
    }
    else if (ced.length < 10) {
        permute_nodes.append('Muy pocos digitos!')
        permute_nodes.classList.add('card', 'error')
    }
    else if (ced.length > 12) {
        permute_nodes.append('Demasiados digitos!')
        permute_nodes.classList.add('card', 'error')
    }

    // Add the actual list
    permute_nodes.append(permute_ul_node)

    // Add the double permute button hehe
    if (ced.length > 8) {
        const double_permute_button = createElement(
            'button',
            '⚠ Permutación doble ⚠️',
            null,
            {
                title: 'Intenta cambiar un segundo digito, generando hasta un maximo de 1200 permutaciones.'
            })
        double_permute_button.addEventListener('click', () => {
            // Remove old button
            double_permute_button.remove()

            // Reset search controls & info
            resetSearchControls()
            setSearchControlVisibility(CED_API) // Only show if the API is available
            resetPermuteStats()

            // Create the actual permute list
            const double_card = doDoublePermute(ced)
            nodes.output.append(double_card)

            // Update stats
            current_permutes_stats.total = current_permutes.length
            current_permutes_stats.promises = validateCedStructList(current_permutes)
                .map(x => x.then(val => updatePermuteStats(!!val)))

            const updateDisplay = () => {
                displayPermuteStats()
                current_permutes_stats.animFrameId = requestAnimationFrame(updateDisplay)
            }
            requestAnimationFrame(updateDisplay)

            // Hide old list (now empty, since all nodes migrated to the new one)
            const permute_nodes = document.getElementById('permute_nodes')
            if (permute_nodes)
                permute_nodes.remove()

            // Final stat update
            Promise.all(current_permutes_stats.promises).then(() => {
                cancelAnimationFrame(current_permutes_stats.animFrameId)
                current_permutes_stats.found = 0
                current_permutes_stats.lost = 0
                for (const permute of current_permutes) {
                    if (permute.validation_api === null)
                        current_permutes_stats.lost++
                    else if (permute.validation_api) {
                        current_permutes_stats.found++
                        current_permutes_stats.provinces.add(permute.validation_api.province)
                    }
                }
                displayPermuteStats()

                for (const province of [...current_permutes_stats.provinces].sort()) {
                    if (province)
                        FORM_NODES.province.add(
                            createElement('option', province, null, { value: province })
                        )
                }
            })
        })
        permute_nodes.append(double_permute_button)
    }

    // Append the final node
    clearNode(nodes.output)
    nodes.output.append(frag)
}

function doDoublePermute(ced) {
    let out = [...current_permutes]
    let l = ced.length

    let long_permute_fn;
    if (l > 11)
        long_permute_fn = long_permuteCed13_double_removal
    else if (l > 9)
        long_permute_fn = long_permuteCed11_double_sustitution
    else
        long_permute_fn = long_permuteCed9_double_insertion

    for (let i = 0; i < l; i++) {
        out.push(...long_permute_fn(ced, i))
    }
    out = removeDuplicateCedStructs(out)
    current_permutes = out

    // Generate html
    const double_ul = createCedStructNodeList(out)
    const double_card = createElement('div', 'Doble permutaciones:', ['card'])
    double_card.append(double_ul)
    return double_card
}


const FORM_NODES = {
    container: document.getElementById('search_controls'),
    name: document.getElementById('search-name'),
    age: document.getElementById('search-age'),
    valid: document.getElementById('search-valid'),
    province: document.getElementById('search-province')
    // TODO: "variaciones de nombre", para probar diferentes letras (f -> ph, i -> y, n -> nn, z -> s, c -> k)
}

// Set helper title
FORM_NODES.age.title = 'Puede ser numero (30) o:\n'
    + '  * valor minimo = 10..\n'
    + '  * valor maximo = ..20\n'
    + '  * rango = 10..20\n'
    + '  * todo = ..\n'

function resetSearchControls() {
    FORM_NODES.name.value = ''
    FORM_NODES.age.value = ''
    FORM_NODES.valid.checked = false
    while (FORM_NODES.province.options.length)
        FORM_NODES.province.remove(0)
    FORM_NODES.province.add(createElement('option', ' - ', null, { value: null }))
}

function setSearchControlVisibility(visible) {
    if (visible)
        FORM_NODES.container.classList.remove('hidden')
    else
        FORM_NODES.container.classList.add('hidden')
}

PARSER_GENERATORS = {
    NameParser: name => {
        const words = name.trim().toLowerCase().split(' ')
        return (x) => {
            return words.every(word => x.toLowerCase().includes(word))
        }
    },
    AgeParser: age => {
        const ageRegexMatch = age.trim().match(/^(?:(\d*)(\.\.|-)(\d*))|(\d+)/)
        if (ageRegexMatch) {
            const [, min, , max, singleValue] = ageRegexMatch

            let fn = () => { }
            if (singleValue !== undefined) {
                let val = parseInt(singleValue)
                return (n) => (n === val)
            } else {
                let minVal = parseInt(min)
                if (isNaN(minVal)) minVal = -Infinity

                let maxVal = parseInt(max)
                if (isNaN(maxVal)) maxVal = +Infinity

                return (n) => (minVal <= n && n <= maxVal)
            }
        }
    }
}

function onSearchControlChange() {
    let name = FORM_NODES.name.value
    let age = FORM_NODES.age.value
    let valid = FORM_NODES.valid.checked
    let province = FORM_NODES.province.value

    const filters = []

    if (name !== '') {
        const containsName = PARSER_GENERATORS.NameParser(name)
        filters.push((permute) => {
            const { validation_api } = permute
            if (!validation_api) return false

            // Check for any ocurrence of any word in the name field.
            return containsName(validation_api.name)
        })
    }

    if (age !== '') {
        const isAgedProperly = PARSER_GENERATORS.AgeParser(age)
        filters.push((permute) => {
            const { validation_api } = permute
            if (!validation_api) return false
            return isAgedProperly(validation_api.age)
        })
    }

    if (province && province !== 'null') {
        filters.push((permute) => {
            const { validation_api } = permute
            return validation_api?.province === province
        })
    }

    if (valid) {
        filters.push((permute) => {
            const { validation_api } = permute
            return !!validation_api
        })
    }


    for (const permute of current_permutes) {
        let visible = true
        for (const filter of filters) {
            visible = filter(permute)
            if (!visible) break
        }
        if (visible)
            permute.node.classList.remove('hidden')
        else
            permute.node.classList.add('hidden')
    }
}

FORM_NODES.container.onchange = onSearchControlChange
FORM_NODES.container.oninput = onSearchControlChange

/** INITIAL STUFF */
{
    // Add JS Version
    document.getElementById('js-version').textContent = `V${JS_VERSION}`

    // Generate random initial value
    const INITIAL_CODES = ['402', '001', '004', '073', '074', '054']
    let initialValue = INITIAL_CODES[Math.floor(Math.random() * INITIAL_CODES.length)]
    initialValue += '000'

    const amountOfDigits = 4 + randInt(3)
    for (let i = amountOfDigits; i; i--)
        initialValue += randInt(10).toString()
    nodes.input.value = initialValue

    // Attach event handlers
    let elems = ['change', 'input']
    elems.forEach((x) => {
        nodes.input.addEventListener(x, onCedChange)
    })

    // Initial verify
    onCedChange()

}