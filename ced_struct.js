const SAMPLE_CED = {
    num: '40212341234',
    original: '4022341234',
    highlight: [[3, 4], [6, 7]], // all highlighted ranges
    validation_api: { // undefined == not tested, null == not found.
        name: 'LOREM IPSUM',
        age: 999
    },
    method: 'insertion',
    starred: false, // add star if true
    node: undefined, // should be a <li> element
}

function cedStructToHtml(ced) {
    return cedToHtml(ced.num, ced.highlight)
}

function removeDuplicateCedStructs(cedList) {
    const out = []
    const saved_ceds = new Set()
    for (const ced of cedList) {
        if (saved_ceds.has(ced.num))
            continue
        out.push(ced)
        saved_ceds.add(ced.num)
    }
    return out
}

function permuteCed11_sustitution(ced, i) {
    const slicedCed = ced.slice(0, i) + ced.slice(i + 1)
    const newCed = insertLuhnDigit(slicedCed, i)
    const starred = isSimilarDigit(ced[i], newCed[i])
    if (ced[i] === newCed[i])
        return {
            num: newCed,
            original: ced,
            highlight: undefined,
            method: 'none',
            starred: true,
        }
    else
        return {
            num: newCed,
            original: ced,
            highlight: [[i, i + 1]],
            method: 'single sustitution',
            starred,
        }
}

function permuteCed11_flip(ced, i) {
    if (i > ced.length - 2) return
    if (ced[i] == ced[i + 1]) return
    let flippedCed = ced.split('')
    const digit = ced[i + 1]
    flippedCed[i + 1] = flippedCed[i]
    flippedCed[i] = digit
    flippedCed = flippedCed.join('')

    if (checkLuhn(flippedCed)) //
        return {
            num: flippedCed,
            original: ced,
            highlight: [[i, i + 2]],
            method: 'flip',
            starred: true,
        }
}

function long_permuteCed11_double_sustitution(ced, i) {
    const out = []
    const slicedCed = (ced.slice(0, i) + ced.slice(i + 1))
    const starred = isSimilarDigit(ced[i], slicedCed[i])
    const extraHighlight = [i, i + 1]

    for (let digit = 0; digit < 10; digit++) {
        // Generate a new digit at position i
        let singleSusCed = slicedCed.split('')
        singleSusCed.splice(i, 0, digit.toString())

        // Get all cases for that new digit at i
        out.push(...permuteCed(singleSusCed.join('')))
    }

    const out_mapped = out.map(x => ({
        ...x,
        starred: starred || x.starred,
        method: 'double sustitution',
        highlight: [...(x.highlight || []), extraHighlight]
    }))
    return out_mapped
}

function long_permuteCed9_double_insertion(ced, i) {
    const out = []
    const slicedCed = ced
    const extraHighlight = [i, i + 1]

    for (let digit = 0; digit < 10; digit++) {
        // Generate a new digit at position i
        let singleSusCed = slicedCed.split('')
        singleSusCed.splice(i, 0, digit.toString())

        // Get all cases for that new digit at i
        out.push(...permuteCed(singleSusCed.join('')))
    }

    const out_mapped = out.map(x => ({
        ...x,
        method: 'double insertion',
        highlight: [...(x.highlight || []), extraHighlight]
    }))
    return out_mapped
}

function long_permuteCed13_double_removal(ced, i) {
    // Could be recursive... im too lazy to do this :\
    const out = []
    const slicedCed = (ced.slice(0, i) + ced.slice(i + 1))
    const extraHighlight = [i, i + 1]

    out.push(...permuteCed(slicedCed))

    const out_mapped = out.map(x => ({
        ...x,
        method: 'double removal',
        highlight: [...(x.highlight || []), extraHighlight]
    }))
    return out_mapped
}




const PERMUTE_CASES = {
    11: {
        fn: (ced, i) => {
            return [
                permuteCed11_sustitution(ced, i),
                permuteCed11_flip(ced, i),
            ].filter(x => x)
        },
        l: 11
    },
    10: {
        fn: (ced, i) => {
            const newCed = insertLuhnDigit(ced, i)
            return [{
                num: newCed,
                original: ced,
                highlight: [[i, i + 1]],
                method: 'insertion'
            }]
        },
        l: 11
    },
    12: {
        fn: (ced, i) => {
            const slicedCed = ced.slice(0, i) + ced.slice(i + 1)
            if (checkLuhn(slicedCed))
                return [{
                    num: slicedCed,
                    original: ced,
                    highlight: [[i, i + 1]],
                    method: 'removal'
                }]
            return []
        },
        l: 10
    },
}


function permuteCed(broken_ced) {
    let ced_case = PERMUTE_CASES[broken_ced.length]
    if (!ced_case) return []

    const { fn, l } = ced_case
    const out = []
    for (let i = 0; i < l; i++) {
        const newCed = fn(broken_ced, i)
        if (newCed.length)
            out.push(...newCed)
    }

    const out_no_dupes = removeDuplicateCedStructs(out)
    return out_no_dupes
}


function createCedStructNodeList(cedList) {
    const listNode = document.createElement('ol');
    // Create nodes and append to UL element
    for (let ced of cedList) {
        if (!ced.node)
            createCedStructNode(ced)
        listNode.append(ced.node)
    }
    // Number nodes manually
    for (let i = 0, l = cedList.length; i < l; i++)
        if (cedList[i].node)
            cedList[i].node.value = i + 1
    return listNode;
}

function createCedStructNode(ced) {
    const li = createElement('li', cedStructToHtml(ced));
    const txt = li.textContent;
    if (ced.starred)
        li.innerHTML += ' ⭐'
    const fn = (evt) => {
        navigator.clipboard.writeText(txt)
        createPopup(`Copiada la cedula ${txt} al portapapeles.`)

        while (document.getElementsByClassName('highlight').length)
            document.getElementsByClassName('highlight')[0].classList.remove('highlight')

        li.classList.add('highlight')
    }
    li.addEventListener('click', fn)

    ced.node = li
    return li
}

function validateCedStructList(cedList) {
    const promiseList = []
    for (const ced of cedList) {
        const promise = validateCedStruct(ced)
        promiseList.push(promise)
    }
    return promiseList
}

function validateCedStruct(ced) {
    // If already validated, return empty response
    if (ced.validation_api !== undefined)
        return new Promise((resolve) => resolve(ced.validation_api))

    // Fetch name data, and update permute stats stuff (fetched count)
    return fetchUserByCed(ced.num).then(data => {
        const li = ced.node
        if (!data || data.code != 200) {
            li.append(' ❌')
            ced.validation_api = null
            return null
        } else {
            const { result } = data
            const obj = {
                name: result.fullname,
                age: result.age,
                province: result?.county?.province?.description,
            }
            ced.validation_api = obj

            const txt = `${obj.name} (${obj.age}) [${obj.province || ' -Sin provincia- '}]`
            const userDataNode = createElement('p', txt)
            li.append(userDataNode)
            li.classList.add('card', 'found-data')
            return ced.validation_api
        }
    }, error => { })
}
//  todo:
//  [OK]- character switching check
//  [OK]- change ced struct to a proper object :v
//  - move loops to their own functions// optimize
//  [OK]- make a generateOptions function (inputCed -> ouputCed[])

// todo (pro):
//  [OK] - allow dual character change search!
//  [OK] - filter results by name/age (with offset)



