const unreachableURL =
[
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
const unnecessaryURL =
[

];
const redirectURL = "http://133.130.125.133";
// const redirectUrl = "http://127.0.0.1:8080";
var currentBaseURL = "";

function getBaseURL (url) {
    var a =  document.createElement('a');
    a.href = url;
    return a.protocol + "//" + a.hostname;
}

function getRelativeURL (url) {
    var fromIndex = getBaseURL(url).length;
    var toIndex = url.length;
    return url.substring(fromIndex, toIndex);
}

function isUnreachableURL (url) {
    var baseURL = getBaseURL(url);
    for (i=0;i<unreachableURL.length;i++) {
        if( baseURL.indexOf(unreachableURL[i]) != -1 ) {
            return true;
        }
    }
    return false;
}

function isUnnecessaryURL (url) {
    for (i=0;i<unnecessaryURL.length;i++) {
        if( url.indexOf(unnecessaryURL[i]) != -1 ) {
            return true;
        }
    }
    return false;
}

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

chrome.webRequest.onBeforeRequest.addListener(
    function (request) {// details
        var url = request.url;
        if ( isUnreachableURL(url) ) {
            if (request.type == "main_frame") {
                currentBaseURL = getBaseURL(url);
            }
            return {
                redirectUrl: redirectURL + "?url=" + url
            };// BolockingResponse
        }
        if (getBaseURL(url) == redirectURL) {
            if ( url.indexOf("?url=") == -1 ) {
                // handle relativeURL
                return {
                    redirectUrl: redirectURL + "?url=" + currentBaseURL + getRelativeURL(url)
                };
            }
        }
        if ( isUnnecessaryURL(url) ) {
            return {
                cancel: true
            };
        }
    },// callback
    {
        urls: ["<all_urls>"]
    },// RequestFilter
    ["blocking"]// extraInfoSpec
);
