var doButtonClick = function() {

//API base, without language subdomain or query string
var API_BASE = "wikipedia.org/w/api.php?";

//base url for looking up page by title, minus the language subdomain
var WIKIPEDIA_BASE = "wikipedia.org/w/index.php?title=";

//dictionary of language codes
var LANGUAGES = {
    English: 'en',
    Spanish: 'es',
    French: 'fr',
    German: 'de',
    Italian: 'it'
};

//number of characters to show in an article by default
var CHARS_TO_SHOW = 200;

/* request n random articles from Wikipedia's API
 * 
 * @param n number of articles to request. Between 1 and 10 inclusive.
 * @param language string code for wikipedia subdomain. 'en' for English.
 */
function requestArticles(n, language) {
    console.log("requestArticles");
    if (n !== parseInt(n) || n < 1 || n > 10) {
	console.error("index.js requestArticles: bad article number");
    }
    var queryString = ["action=query&prop=extracts&format=json&exintro=&generator=random&grnnamespace=0&callback=?&", "exlimit=", n, "&grnlimit=", n].join("");
    var url = ["http://", language, ".", API_BASE, queryString].join("");
    //var url = "http://"+language+"."+API_BASE;
    console.info("index.js ajax request "+url);
    //console.info("index.js ajax request origin "+location.origin);
    /*$.ajax({
	url: url,
	data: {
            action: "query",
	    prop: "extracts",
	    format: "json",
	    exlimit: n,
	    exintro: "",
	    generator: "random",
	    grnnamespace: 0,
	    grnlimit: n,
	    origin: location.origin
	},
	success: curryHttpSuccess(language),
	error: httpError
    });*/
    var timeoutId = setTimeout(httpTimeout, 2000);
    $.getJSON(url, curryJSONPSuccess(language, timeoutId));
}

/*function httpError(xhr, status) {
    console.error("index.js "+moment().format("HH:mm:ss")+" requestArticles error "+status);
}

function curryHttpSuccess(language) {
    return function(data) {
	console.log("index.js "+moment().format("HH:mm:ss")+" requestArticles success "+data);
	try {
	    data = JSON.parse(data);
	    var extracts = data.query.pages;
	    addExtracts(extracts, language);
	} catch (e) {
	    console.error("JSON parse error");
	}
    }
}*/

function httpTimeout() {
    console.error("index.js ajax timeout");
}

function curryJSONPSuccess(language, timeoutId) {
    return function(data) {
	clearTimeout(timeoutId);
	console.info("index.js "+moment().format("HH:mm:ss")+" JSONP success");
	console.log(JSON.stringify(data));
	var extracts = data.query.pages;
	addExtracts(extracts, language);
	console.log("check1");
    };
}

function clearExtracts() {
    $("#extracts-div").html("");
}

//do Handlebars stuff
Handlebars.registerHelper("show", function(params, options) {
    var extracts = params.extracts;
    var language = params.language;
    var out = [];
    for (var key in extracts) {
	if (extracts.hasOwnProperty(key)) {
	    var extract = extracts[key];
	    var title = extract.title;
	    var url = ["http://", language, ".", WIKIPEDIA_BASE, encodeURIComponent(title)].join("");
	    var compiledExtract = options.fn({
		url: url,
		title: title,
		extract: extract.extract
	    });
	    out.push(compiledExtract);
	}
    }
    return out.join("");
});

var extractsTemplateSource = $("#extracts-template").html();
var extractsTemplate = Handlebars.compile(extractsTemplateSource);

function addExtracts(extracts, language) {
    var context = {
	params: {
	    language: language,
	    extracts: extracts
	}
    };
    var compiledExtracts = extractsTemplate(context);
    console.log(compiledExtracts);
    $("#extracts-div").html(compiledExtracts);
    console.log("check2");
}

return function() {
    console.log("buttonClick");
    requestArticles(5, LANGUAGES.English);
}

}();
