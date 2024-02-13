const http = require("http");
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const host = 'localhost';
const port = 8000;

activeRoute = {};
activeRoute.routes = {
    '/ua': 'uaEmpty',
    '/ua/{{inn}}': 'uaInn',
    '/ua/sign_in': 'uaSign_in',
    '/ua/archive/order': 'uaArchiveOrder',
    '/ua/archive/message': 'uaArchiveMessage',
    '/ua/settings': 'uaSettings',
    '/ua/catalog/company/{{city}}': 'uaCatalogCompanyCityEmpty',
    '/ua/catalog/company/{{city}}/page_number': 'uaCatalogCompanyCityPage_number',
    '/ua/catalog/company/{{letter}}': 'uaCatalogCompanyLetterPage_number',
    '/ua/catalog/company/{{letter}}/page_number': 'uaCatalogCompanyLetterPage_number',
    '/ua/catalog/fop/{{city}}': 'uaCatalogFopCityEmpty',
    '/ua/catalog/fop/{{city}}/page_number': 'uaCatalogFopCityPage_number',
    '/ua/catalog/fop/{{letter}}': 'uaCatalogFopLetterPage_number',
    '/ua/catalog/fop/{{letter}}/page_number': 'uaCatalogFopLetterPage_number',
    '/ua/tariffs': 'uaTariffs',
    '/ua/sources': 'uaSources',
    '/ua/about-company': 'uaAbout-company',
    '/en': 'enEmpty',
    '/en/{{inn}}': 'https://secure.ubki.ua/b2/ubkireport/opendata/',
    '/en/sign_in': 'enSign_in',
    '/en/archive/order': 'enArchiveOrder',
    '/en/archive/message': 'enArchiveMessage',
    '/en/settings': 'enSettings',
    '/en/catalog/company/{{city}}': 'enCatalogCompanyCityEmpty',
    '/en/catalog/company/{{city}}/page_number': 'enCatalogCompanyCityPage_number',
    '/en/catalog/company/{{letter}}': 'enCatalogCompanyLetter',
    '/en/catalog/company/{{letter}}/page_number': 'enCatalogCompanyLetterPage_number',
    '/en/catalog/fop/{{city}}': 'enCatalogFopCityEmpty',
    '/en/catalog/fop/{{city}}/page_number': 'enCatalogFopCityPage_number',
    '/en/catalog/fop/{{letter}}': 'enCatalogFopLetter',
    '/en/catalog/fop/{{letter}}/page_number': 'enCatalogFopLetterPage_number',
    '/en/tariffs': 'enTariffs',
    '/en/sources': 'enSources',
    '/en/about-company': 'enAbout-company'
};
activeRoute.route = null;
activeRoute.action = null;
activeRoute.data = [];
activeRoute.dom = null;
activeRoute.lng = null;
activeRoute.response = null;
activeRoute.uaInn = function (){
    
}
activeRoute.changeHtml = function (node, attribute) {
    // console.log("node:" + node + " attribute:" + attribute);
    let links = this.dom.window.document.querySelectorAll(node);
    links.forEach(link => {
        let attr = link.getAttribute(attribute);
        if(attr && attr.substring(0,1) === '/'){
            attr = 'https://secure.ubki.ua' + attr;
            link.setAttribute(attribute, attr);
        }
    });
}
activeRoute.parseRouteData = function (urlParts, routeParts) {
    for (i = 0; i < routeParts.length; i++) {
        routePart = routeParts[i];
        if ((routePart.substring(0, 3) === '{{i') || (routePart.substring(0, 3) === '{{l') || (routePart.substring(0, 3) === '{{c')) {
            parName = routePart.substring(2, routePart.length - 2);
            console.log("parName:" + parName);
            activeRoute.data.push({ [parName]: urlParts[i] });
        }
    }
};
activeRoute.parseRouteWithParams = function () {
    parts = this.route.substring(1).split('/');
    routeMask = parts.map(part => {
        if ((typeof +part === "number") && (Number.isInteger(+part)) && (+part >= 0) && (+part <= 9999999999)) return "[inn]";
        else if ((part.length === 1) && (/^[а-яіїєa-z]$/iu.test(part.trim()))) return "[letter]";
        else if (/^[А-ЯІЇЄA-Z]{1}[а-яіїєa-z]{1,}$/u.test(part.trim())) return "[city]";
        else return part;
    }).join('/');

    for (var key in this.routes) {
        itemParts = key.substring(1).split('/');
        itemPartsMask = itemParts.map(part => {
            if (part.substring(0, 3) === '{{i') return "[inn]";
            else if (part.substring(0, 3) === '{{l') return "[letter]";
            else if (part.substring(0, 3) === '{{c') return "[city]";
            else return part;
        }).join('/');
        if (itemPartsMask === routeMask) {
            action = this.routes[key];
            this.parseRouteData(parts, itemParts);
            return action;
        }
    }
    return -1;
};
activeRoute.parseRoute = function () {
    this.data = [];
    if (this.routes.hasOwnProperty(this.route)) {
        console.log('route without params');
        this.action = this.routes[this.route];
    } else {
        console.log('route with params');
        this.action = this.parseRouteWithParams();
    }
};
activeRoute.requestListener = async function (req, res) {
    this.route = decodeURI(req.url);
    lang = this.route.substring(0, 3);

    if ((lang != '/ua') && (lang != '/en')) {
        this.route = '/ua' + this.route;
        // console.log('this.route:' + encodeURI(this.route));
        // console.log('typeof this.route:' + typeof this.route);
        res.writeHead(301, { 'Location': encodeURI(this.route) });
        res.end();
    } else {
        this.lng = this.route.substring(1, 3);
        this.parseRoute();
        console.log(this);
        if (this.action !== -1) {
            // let url = 'https://secure.ubki.ua/b2/ubkireport/opendata/00906858?lng=UA';
            // this.queryToOrigin();

            this.response = await fetch(this.action + this.data[0].inn + '?lng=' + this.lng, {
                method: 'GET',
                headers: {
                    'Content-Type': 'text/html; charset=utf-8'
                }
            });

            if( this.response.ok){
                let htmlStr = await this.response.text();                
                
                this.dom = new JSDOM(htmlStr);

                const nodeAttr = {
                    'link': 'href',
                    'script': 'src',
                    'img': 'src'
                };

                // nodeAttr.forEach(this.changeHtml);
                for (let index in nodeAttr) {
                    this.changeHtml(index, nodeAttr[index]);
                }

                let changedHtmlStr = this.dom.serialize();
                changedHtmlStr = changedHtmlStr.replaceAll('jQuery.ajax({ url: "/', 'jQuery.ajax({ url: "https://secure.ubki.ua/');
                // console.log('changedHtmlStr:' + changedHtmlStr);
                res.setHeader("Content-Type", "application/json");
                res.writeHead(200);
                res.end(JSON.stringify({ action: this.action, data: this.data, lng: this.lng }));
                // res.setHeader('Content-Type', 'text/html; charset=utf-8');
                // res.writeHead(200);
                // res.end(changedHtmlStr);
            } else {
                console.log('Failed to fetch page: ', response.status);
            }
        } else {
            res.setHeader("Content-Type", "application/json");
            res.writeHead(404);
            res.end(JSON.stringify({ error: "Resource not found" }));
        }
    }
};

const server = http.createServer(activeRoute.requestListener.bind(activeRoute));
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});