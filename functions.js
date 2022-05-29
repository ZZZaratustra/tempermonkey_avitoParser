let seconds = 0;
setInterval(async () => {
    seconds++;
    if(seconds == 40){
        console.error('Не было совершенно действий в течение 40 секунд. Обновление страницы');
        await timeout(2000);
        openLink(window.location.href);
    }
}, 1000);

const backendApi = 'https://a.unirenter.ru/b24/api/avito.php?do=avitoParser';
const version = 5;

let updates = {
    '05.05.2022': [
        '- Добавил version ко всем запросам',
        '- Добавил вывод обновлений в консоль',
    ],
    '23.05.2022': [
        '- Опциональные параметры',
        '- Сбор города и цены',
        '- Опциональный тайм-аут после завершения парсинга',
        '- Таймер 40 секунд на совершение действий'
    ]
};

console.log(`VERSION: ${version}`);
for(let i in updates){
    console.info(`Обновление от ${i}\n`, updates[i].join("\n"));
    // console.log(updates[i].join("\n"));
}

let elementCreatedInerations = 0;
let elementCreatedStatus = true;

//пусть тайм-аут работает на промисе, чтобы не плодить километровую вложенность
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function elementCreated(element) {
    elementCreatedStatus = false;
    if(!$(element).length){
        let ret = addElementCreatedInerations(element);
        if(ret == 'error'){
            return;
        }
        await timeout(1000);
        elementCreated(element);
    }
    elementCreatedStatus = true;
    return $(element);
}

async function ajax(url, data = {}){
	const settings = {
		method: 'POST',
		body: JSON.stringify(data)
	};

	try {
		const fetchResponse = await fetch(url, settings);
		const data = await fetchResponse.json();
	    return data;
	} catch (e) {
		return e;
	}
}

async function error(error, avitoId = false){
    if(!avitoId){
        let r = JSON.parse(localStorage.getItem('avitoParse'));
        avitoId = r.avitoID;
    }

    let res = await ajax(backendApi + queryArgsString, {avitoId: avitoId, statusCode: error});
    getItem(res);
}

//Для получения частей урл /
function getUrl(part, url = false) {
    let path;
    if(url){
        path = url;
    }else{
        path = window.location.pathname;
    }
     
    let parts = path.split('/');

    if (!parts[part]) {
        return false;
    }

    return parts[part];
}

//для получения get параметров
function getQuery(name, url = window.location.href) {
    if(url.indexOf('?') == -1 && url.indexOf('&') != -1){
        url = url.replace('&', '?');
        window.location.href = url;
    }
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function addElementCreatedInerations(element){
    elementCreatedInerations++;
    if(elementCreatedInerations == 10){
        elementCreatedStatus = false;
        console.error(`Элемент ${element} не был загружен за 10 секунд`);
        return 'error';
    }
}

function convertVideoIframeLink(link){
    if(link.indexOf('youtube') != -1){
        if(link.startsWith('/')){
            link = link.replace('//', 'https://');
        }

        link = link.replace('embed/', 'watch?v=');
    }

    return link;
}

function getProfileId(url, isCompany = false){
    let profileId = '';
    url = url.replace('https://avito.ru', '').replace('https://www.avito.ru', '');
    if(isCompany){
        profileId = url.split('?')[0].replace('/', '');
    }else{
        profileId = getUrl(2, url);
    }

    return profileId;
}