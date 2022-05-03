$(document).ready(() => {
    menu();
});

async function menu() {
    //Это таймаут для проверки наличия элемента
    //У авито используются разные классы на разных страницах, поэтому будем заниматься гаданием на кофейной гуще
    console.log('Проверяем загрузку меню');
    let element = await elementCreated('.index-add-button-wrapper-s0SLe, .header-button-wrapper-2UC-r');

    if (elementCreatedStatus !== true) {
        console.error('Не удалось найти элементы меню');
        return;
    }

    console.log('Проверка наличия меню');

    let started = localStorage.getItem('started');
    if (!started || started == 'false') {
        started = false;

        console.log('Автоматический парсинг не запущен');
    } else {
        console.log('Автоматический парсинг запущен');
        started = true;
        //Если автоматический парсинг был запущен, то запускаем сбор данных
        if (getUrl(1)) {
            automaticParse();
        } else {
            getItem();
        }
    }

    let divClasses = element.attr('class');
    let aClasses = element.find('a').attr('class');

    //Добавляем кнопки управления.
    element.after(`
        <div class="${divClasses}"><a href="#" id="debug" class="${aClasses}">Дебаг</a></div>
        ${!started
            ?
            `<div class="${divClasses}"><a href="#" id="automatic-start" class="${aClasses}">Автоматический парсинг</a></div>`
            :
            `<div class="${divClasses}"><a href="#" id="automatic-stop" class="${aClasses}">Остановить парсинг</a></div>`
        }
    `);

    //Действия кнопок
    $('body').on('click', 'a#automatic-start', start);
    $('body').on('click', 'a#automatic-stop', stop);
    $('body').on('click', 'a#debug', debug);
}

function start() {
    console.log('Нажата кнопка запуска автоматического парсинга');
    localStorage.setItem('started', true);

    getItem();
}

function stop() {
    console.log('Нажата кнопка остановки автоматического парсинга');
    localStorage.setItem('started', false);
    window.location.reload();
}

function debug() {
    console.log('Нажата кнопка дебаг режима');
    localStorage.setItem('started', false);
    parse(true);
}

async function getItem(args = {}) {
    let item = {};
    if (Object.keys(args) == 0) {
        // item = await getItem();
        let response = await fetch(backendApi);
        item = await response.json();
        console.log('Данные для парсинга получены после GET запроса');
    } else {
        item = args;
        console.log('Данные для парсинга получены после POST запроса');
    }

    console.table(item);

    if (!item) {
        console.error('API сервер не отдал ссылку #1');
        return;
    }
    if (!item.results) {
        console.error('API сервер не отдал ссылку #2');
        return;
    }
    if (!item.results.avitoLink) {
        console.error('API сервер не отдал ссылку #3');
        return;
    }
    if (!item.results.avitoLink.result.length) {
        console.error('Список ссылок пуст');
        return;
    }

    setItem(item.results.avitoLink.result[0]);
    console.log('Заявка добавлена в локальное хранилище');

    openLink(item.results.avitoLink.result[0].avitoUrl);
    console.log('Открывается страница товара');
}

function automaticParse() {
    console.log('Парсинг запущен из локального хранилища');
    let item = localStorage.getItem('avitoParse');
    if (!item) {
        console.error('Не найдена информация в локальном хранилище #1');
        return;
    }
    item = JSON.parse(item);
    if (!item) {
        console.error('Не найдена информация в локальном хранилище #2');
        return;
    }

    console.table(item);
    parse();
    console.log('Сбор данных запущен');
}

async function parse(debug = false) {
    let item = JSON.parse(localStorage.getItem('avitoParse'));

    //На всякий случай ждём 2 секунду
    await timeout(2000);

    //Блок с объявлением
    await elementCreated('.item-view__new-style');
    if (elementCreatedStatus !== true) {
        console.error('Объявление не было загружено');
        return;
    }

    if(item.avitoID){
        let announcementId = await elementCreated('[data-marker="item-view/item-id"]');
        if(elementCreatedStatus !== true){
            console.error('Не удалось найти ID объявления');
            return;
        }
        announcementId = announcementId.text().replace('№', '').trim();

        if(item.avitoID != announcementId){
            console.error('ID не совпадает с полученым по API');
            if (!debug) {
                error('noProductCard');
            }
            return;
        }
    }

    if ($('.title-info-title-text').hasClass('item-closed')) {
        console.error('Объявление снято с публикации');
        if (!debug) {
            error('arhived');
        }
        return;
    }

    //TODO другие проверки. Дописать по мере появления таких объявлений

    //Всё ок. Собираем данные

    //Галерея
    await elementCreated('.item-view-gallery, .gallery-img-wrapper');
    let media = [];
    if (elementCreatedStatus !== true) {
        console.error('В объявлении нет изображений');
    } else {
        $('.gallery-img-wrapper').each((index, item) => {
            let src;
            if ($(item).find('.gallery-video-frame').length) {
                src = $(item).find('iframe').attr('src');
                src = convertVideoIframeLink(src);
            } else {
                src = $(item).find('.gallery-img-frame').attr('data-url');
            }

            media.push(src);
        });
    }

    //Телефон
    let isPhone = 0;
    if ($('[data-marker="item-phone-button/card"]').length) {
        isPhone = 1;
    }
    //Сообщения
    let isMsg = 0;
    if ($('[data-marker="messenger-button/button"]:eq(1)').length) {
        isMsg = 1;
    }
    //?компания
    let isCompany = 0;
    if ($('[data-marker="seller-info/label"]').text().toLowerCase() == 'компания') {
        isCompany = 1;
    }
    //Название профиля
    let profileName = $('[data-marker="seller-info/name"]').find('a').text().trim().replace('\n', '');
    let profileUrl = $('[data-marker="seller-info/name"]').find('a').attr('href');

    let profileID = getProfileId(profileUrl, isCompany);

    let numAdv = 0;
    if($('.seller-info-value:eq(1) div:eq(1)').length){
        numAdv = $('.seller-info-value:eq(1) div:eq(1)')
                .text()
                .toLowerCase()
                .replace('завершено', '')
                .replace('объявлений', '')
                .replace('объявления', '')
                .trim();
    }

    let res = {
        advName: $('.title-info-title-text').text(), 
        mediaUrl: media.join(';'),
        isPhone: isPhone,
        isMsg: isMsg,
        isCompany: isCompany,
        profileName: profileName,
        profileUrl: profileUrl,
        profileID: profileID,
        numAdv: Number(numAdv)
    };

    console.log('Сбор данных завершён');
    console.table(res);

    //отправляем данные на сервере, если мы не в дебаге
    if(!debug){
        res['avitoId'] = item.avitoID;
        res['statusCode'] = 'productCard';
        // getItem();
        let result = ajax(backendApi, res);
    }


}

function setItem(object = {}) {
    localStorage.setItem('avitoParse', JSON.stringify(object));
}
function openLink(url) {
    window.location.href = url;
}