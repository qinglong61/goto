const unreachableURL =
[
    "bdstatic.com",
    "baidu.com",
    "chrome.",
    "google.",
    "googleapis.",
    "gstatic.",
    "postimg.org",
    "picuphost.com",
    "qpic.ws",
    "tietuku.com",
    "niupic.com",
    "imgbus.com",
    "pixs.ru"
];

// const redirectBaseURL = "http://133.130.125.133";
const redirectBaseURL = "http://127.0.0.1:8080";
var currentBaseURL = "";

Array.prototype.removeObject = function (obj) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] == obj) {
            this.splice(i, 1);
            break;
        }
    }
}

var Request = {
    createNew: function () {
        var request = {
            id:"",
            url:"",
            status:"",
            headers:[],//HttpHeaders
            redirectURL: function () {
                return redirectBaseURL + "?url=" + this.url;
            }
        };
        return request;
    }
};

var requestQueue = [];

function parseURL(url) {
    var a = document.createElement('a');
    a.href = url;
    return {
        source: url,
        protocol: a.protocol.replace(':', ''),
        host: a.hostname,
        port: a.port,
        query: a.search,
        params: (function () {
            var ret = {};
            var seg = a.search.replace(/^\?/, '').split('&');
            for (var i = 0; i < seg.length; i++) {
                if (!seg[i]) {
                    continue;
                }
                var s = seg[i].split('=');
                ret[s[0]] = s[1];
            }
            return ret;
        })(),
        file: (a.pathname.match(/\/([^\/?#]+)$/i) || [,''])[1],
        hash: a.hash.replace('#', ''),
        path: a.pathname.replace(/^([^\/])/, '/$1'),
        relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [,''])[1],
        segments: a.pathname.replace(/^\//, '').split('/')
    };
}

function getBaseURL (url) {
    var a = document.createElement('a');
    a.href = url;
    return a.protocol + "//" + a.hostname + ":" + a.port;
}

function isUnreachableURL (url) {
    var baseURL = getBaseURL(url);
    for (i = 0; i < unreachableURL.length; i++) {
        if ( baseURL.indexOf(unreachableURL[i]) != -1 ) {
            return true;
        }
    }
    return false;
}

function getRequest (details) {
    for (i = 0; i < requestQueue.length; i++) {
        var request = requestQueue[i];
        if (request.id == details.requestId) {
            return request;
        } else if (request.id == parseURL(details.url).params.originRequestId) {
            return request;
        }
    }
}

function sendRequest (tabId, url) {
    chrome.tabs.executeScript(
        tabId,
        {
            code: 'window.location.assign(' + url+ ');',
            allFrames:true
        }
    );
}

function sendXMLHttpRequest (url) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    // xhr.setRequestHeader(name, value);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            console.log(xhr.responseText);
        }
    }
    xhr.send();
}

chrome.webRequest.onBeforeRequest.addListener(
    function (details) {// details
        if (!isUnreachableURL(details.url) && getBaseURL(details.url) != redirectBaseURL) {
            return;
        }
        // console.log("id:____" + details.requestId);
        // console.log("url:____" + details.url);
        // console.log("type:____" + details.type);
        var request = getRequest(details);
        if (request == undefined) {
            console.log("new");
            request = Request.createNew();
            request.id = details.requestId;
            request.status = "beforeRequest";

            if (details.type == "main_frame") {
                currentBaseURL = getBaseURL(details.url);
            }
            if (isUnreachableURL(details.url)) {
                request.url = details.url;
            } else if (getBaseURL(details.url) == redirectBaseURL) {
                request.url = details.url.replace(redirectBaseURL, currentBaseURL);
            }
            request.url = request.url + "&originRequestId=" + request.id;

            requestQueue.push(request);
        }

        if (request.headers.length != 0 && request.status != "redirected") {
            console.log("<2>---" + request.redirectURL());
            request.status = "redirected";
            return {
                redirectUrl: request.redirectURL()
            };// BolockingResponse
        }
    },// callback
    {
        urls: ["<all_urls>"]
    },// RequestFilter
    ["blocking", "requestBody"]// extraInfoSpec
    //POST请求能获取到requestBody
);

chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {// details
        var request = getRequest(details);
        if (request != undefined) {
            // console.log(request);
            if (request.headers.length != 0) {
                console.log("<3>---" + request.url);
                return {
                    requestHeaders: request.headers
                };// BolockingResponse
            } else {
                console.log("<1>---" + request.url);
                request.headers = details.requestHeaders;
                return {
                    cancel: true
                };
            }
        }
    },// callback
    {
        urls: ["<all_urls>"]
    },// RequestFilter
    ["blocking", "requestHeaders"]// extraInfoSpec
);

chrome.webRequest.onErrorOccurred.addListener(
    function (details) {// details
        var request = getRequest(details);
        if (request != undefined) {
            console.log("《sendRequest》" + request.url + "\nerror:-->>" + details.error);
            sendRequest(details.tabId, request.url);
        }
    },// callback
    {
        urls: ["<all_urls>"]
    }// RequestFilter
);

chrome.webRequest.onCompleted.addListener(
    function (details) {// details
        var request = getRequest(details);
        if (request != undefined) {
            console.log("《completed》" + request.url + "\nstatusCode:-->>" + details.statusCode);
            requestQueue.removeObject(request);
        }
    },// callback
    {
        urls: ["<all_urls>"]
    }// RequestFilter
);

// 第一次onBeforeRequest时不做操作，在onBeforeSendHeaders时拿到headers然后cancel这个request，然后重新发起这次请求，
// 第二次onBeforeRequest时重定向，不会到onBeforeSendHeaders，
// 第三次onBeforeRequest时不做操作，在onBeforeSendHeaders时替换headers为第一次请求拿到的headers。


// const RequestFilter = {
//     tabId: interger, //optional
//     windowId: integer //optional
//     urls: array_of_string, //URL的数组，或者是匹配URL的pattern
//     types: array_of_enumerated_string, //optional
//     //可选的值有:"main_frame", "sub_frame", "stylesheet", "script", "image", "object", "xmlhttprequest", "other"
// };

// 设置了blocking关键字的就用这个object来作为block的规则了
// const BolockingResponse = {
//     //为true的话request被cancel，在onBeforeRequest里面用哦
//     cancel: boolean, //optional
//     //只在onBeforeRequest事件中使用，用来掉包的关键属性！！！
//     redirectUrl: string, //option
//     //只用在onHeadersReceived事件里，在浏览器返给server时把header给掉包
//     responseHeaders: HttpHeaders //optional
//     //只在onBeforeSendHeaders事件中使用。是另一个用来掉包的关键属性！！！
//     requestHeaders: HttpHeaders //optional
//     //只在onAuthRequred事件中使用，当然也是用来掉包的
//     authCredentials: object //optional
// };

// const details = {
//     tabId: integer, //如果没有和tab关联则返回-1
//     parentFrameId: integer,
//     url: string,
//     timeStamp: double,
//     frameId: integer, //0表示request是在main frame里发生的
//     requestId: string,
//     requestHeaders: HttpHeaders， // optional
//     type: enumerated_string, //value in:  ["main_frame", "sub_frame", "stylesheet", "script", "image", "object", "xmlhttprequest", "other"]
//     method: string //标准HTTP方法
// };
