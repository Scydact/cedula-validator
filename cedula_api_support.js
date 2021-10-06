var CED_API = null
const CED_API_LOCALSTORAGE = 'cedula-api-validator-url'

function fetchUserByCed(cedNo) {
    if (CED_API)
        return new Promise((resolve, reject) => {
            fetch(CED_API + cedNo)
                .then(response => response.json())
                .then(json => resolve(json))
                .catch(error => {
                    console.error('Error! ', error)
                    reject(error)
                })
        })

    // No API available
    return new Promise((p, f) => { f(null) })
}


// HTML stuff
function registerAPI(url) {
    CED_API = url
    document.body.classList.add('dark-mode')
    localStorage.setItem(CED_API_LOCALSTORAGE, CED_API)
}
function unregisterAPI() {
    CED_API = null
    document.body.classList.remove('dark-mode')
    localStorage.removeItem(CED_API_LOCALSTORAGE)
}

const VALIDATION_API_BTN = 'validation-api-manage'
function createAddAPIBtn() {
    const a = document.createElement('a')
    a.id = VALIDATION_API_BTN

    if (CED_API) {
        a.textContent = 'Remover API de validación'
        a.onclick = () => {
            unregisterAPI()
            updateAPIBtn()
        }
    }
    else {
        a.textContent = 'Registrar API de validación'
        a.onclick = () => {
            const newUrl = prompt('Inserte el URL de la API de validacion: ')
            registerAPI(newUrl)
            updateAPIBtn()
        }
    }
    return a
}


function updateAPIBtn() {
    const footer = document.getElementById('footer')
    let api_btn = document.getElementById(VALIDATION_API_BTN)
    if (api_btn) api_btn.remove()

    footer.append(createAddAPIBtn())
}

// On init
{
    let api_str = localStorage.getItem(CED_API_LOCALSTORAGE)
    if (api_str) {
        registerAPI(api_str)
    }
    updateAPIBtn()
}

