(function() {

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

var GENERATORS = {
    random: "random",
    search: "search",
    category: "category"
};

//place to store jQuery objects
var DOM = {
    loading: null,
    searchInput: null,
    searchForm: null,
    extractsDiv: null,
    alert: null
};

var searchParams = {
    articles: null,
    language: null,
    generator: null,
    searchOffset: 0,
    searchTerm: ""
};

//mapping to jQuery objects
var selectedItems = {
    articles: null,
    language: null,
    searchby: null
};

//number of characters to show in an article by default
var CHARS_TO_SHOW = 200;

/* request n random articles from Wikipedia's API
 * 
 * @param n number of articles to request. Between 1 and 10 inclusive.
 * @param language string code for wikipedia subdomain. 'en' for English.
 */
function requestArticles(n, language, generator) {
    if (!DOM.searchInput || !DOM.searchInput.val())
	//if don't have a search term, just do random search
	generator = GENERATORS.random;
    else if (DOM.searchInput.val() !== searchParams.searchTerm) {
	//if search term has changed, clear search offset
	searchParams.searchOffset = 0;
	searchParams.searchTerm = DOM.searchInput.val();
    }
    var urlBase = "http://"+language+"."+API_BASE;
    var data = {
	action: "query",
	prop: "extracts",
	format: "json",
	exintro: "",
	exlimit: n,
	generator: generator,
	callback: "?"
    };
    if (generator === GENERATORS.random) {
	data.grnnamespace = 0;
	data.grnlimit = n;
    } else if (generator === GENERATORS.search) {
	data.gsrsearch = DOM.searchInput.val();
	data.gsrnamespace = 0;
	data.gsrlimit = n;
	data.gsroffset = searchParams.searchOffset;
    }
    console.log(DOM.searchInput.val());
    console.log(JSON.stringify(data));
    var queries = [];
    for (var key in data) {
	if (data.hasOwnProperty(key)) {
	    queries.push(key+"="+data[key]);
	}
    }
    var queryString = queries.join("&");
    var url = [urlBase, queryString].join("");
    console.log("url: "+url);
    var timeoutId = setTimeout(httpTimeout, 2000);
    showLoading();
    $.getJSON(url, curryJSONPSuccess(language, timeoutId)
    );
}

function httpTimeout() {
    hideLoading();
    showAlert();
    console.error("index.js ajax timeout");
}

function curryJSONPSuccess(language, timeoutId) {
    return function(data) {
	clearTimeout(timeoutId);
	try {
	    console.info("index.js "+moment().format("HH:mm:ss")
			 +" JSONP success");
	    var queryContinue = data["query-continue"];
	    //if doing generator search, update searchOffset for 
	    //next search
	    if (queryContinue && queryContinue.search) {
		searchParams.searchOffset =
		    queryContinue.search.gsroffset;
	    }
	    var searchInfo;
	    if (data.query) searchInfo = data.query.searchinfo;
	    if (searchInfo) {
		var totalHits = searchInfo.totalhits;
		if (totalHits === 0) {
		    var noResults =
			"<p><i>Sorry, didn't find any matching articles.</i></p>";
		    if (DOM.extractsDiv) {
			DOM.extractsDiv.html(noResults);
		    }
		    hideLoading();
		    return;
		}
	    }
	    var extracts = data.query.pages;
	    hideAlert();
	    addExtracts(extracts, language);
	    hideLoading();
	} catch (e) {
	    //if error, processing request, we'll just throw same error alert
	    httpTimeout();
	}
    };
}

function clearExtracts() {
   if (DOM.extractsDiv) DOM.extractsDiv.html("");
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
	    var url =
		["http://", language, ".", WIKIPEDIA_BASE,
		       encodeURIComponent(title)].join("");
	    var content = extract.extract;
	    console.log("pageid: "+extract.pageid);
	    console.log(content);
	    //get first paragraph only
	    var match = content.match(/^[^]*?<p>[^]*?<\/p>/);
	    var firstPara;
	    if (match) {
		firstPara = match[0];
	    }

	    var compiledExtract = options.fn({
		url: url,
		title: title,
		extract: firstPara
	    });
	    out.push(compiledExtract);
	}
    }
    return out.join("");
});

//will store Handlebars template for extracts here
var extractsTemplate;

function addExtracts(extracts, language) {
    var context = {
	params: {
	    language: language,
	    extracts: extracts
	}
    };
    var compiledExtracts = extractsTemplate(context);
    if (DOM.extractsDiv) DOM.extractsDiv.html(compiledExtracts);
}

function showLoading() {
    if (DOM.loading) DOM.loading.css("display", "block");
}

function hideLoading() {
    if (DOM.loading) DOM.loading.css("display", "none");
}

function showAlert() {
    console.log("showAlert");
    if (DOM.alert) DOM.alert.css("display", "block");
    //if (DOM.alert) DOM.alert.alert();
}

function hideAlert() {
    if (DOM.alert) DOM.alert.css("display", "none");
    //if (DOM.alert) DOM.alert.alert("close");
}

function showSearchInput() {
    if (DOM.searchInput) {
	DOM.searchInput.val("");
	DOM.searchForm.css("display", "block");
    }
}

function hideSearchInput() {
    if (DOM.searchInput) {
	DOM.searchForm.css("display", "none");
    }
}
	

function doSearch() {
    requestArticles(searchParams.articles, searchParams.language,
		    searchParams.generator);
}

$(".submit-btn").on("click", doSearch);

$(document).on("click", ".menu-language li a", function(e) {
    e.preventDefault();
    var target = $(e.target);
    var value = selectLanguage(target);
    $("#language-btn-text").html(value);
});

/* perform select for language
 *
 * @param language jQuery object <a> element selected
 * @return value of element selected
 */
function selectLanguage(target) {
    changeSelection("language", target);
    var key = target.data("key");
    var value = target.html();
    searchParams.language = LANGUAGES[key];
    return value;
}

$(document).on("click", ".menu-articles li a", function(e) {
    e.preventDefault();
    var target = $(e.target);
    var value = selectArticles(target);
    $("#articles-btn-text").html(value);
});

/* perform selection for number of articles
 *
 * @param target jQuery object <a> element selected
 * @return text of element selected
 */
function selectArticles(target) {
    changeSelection("articles", target);
    var value = target.html();
    searchParams.articles = value;
    return value;
}

$(document).on("click", ".menu-searchby li a", function(e) {
    e.preventDefault();
    var target = $(e.target);
    var value = selectSearchBy(target);
    $("#searchby-btn-text").html(value);
});


/* perform select for search by
 *
 * @param language jQuery object <a> element selected
 * @return value of element selected
 */
function selectSearchBy(target) {
    changeSelection("searchby", target);
    var key = target.data("key");
    var value = target.html();
    var generator = GENERATORS[key];
    if (generator === GENERATORS.search || generator === GENERATORS.category) {
	showSearchInput();
    } else {
	hideSearchInput();
    }
    searchParams.generator = generator;
    console.log("set generator to "+searchParams.generator);
    return value;
}

/* Change bg for menu items
 * 
 * @param menuType string type of menu, e.g. "articles", "language"
 * @param target jQuery object target of button click
 */
function changeSelection(menuType, target) {
    if (selectedItems[menuType])
	selectedItems[menuType].removeClass("bg-primary");
    selectedItems[menuType] = target;
    target.addClass("bg-primary");
}

$(document).keydown(function(e) {
    var keyCode = e.keyCode || e.which;
    if (keyCode === 13) {
	e.preventDefault();
	doSearch();
    }
});
    
$(document).ready(function() {
    DOM.loading = $("#loading");
    DOM.searchInput = $("#search-input");
    DOM.searchForm = $("#search-form");
    DOM.extractsDiv = $("#extracts-div");
    DOM.alert = $("#alert");
    $("#alert .close").on("click", hideAlert);
    $("#language-btn").on("click", function() {
	$("#language-btn-text").html("Language");
    });
    $("#articles-btn").on("click", function() {
	$("#articles-btn-text").html("Articles");
    });
    $("#searchby-btn").on("click", function() {
	$("#searchby-btn-text").html("Search by");
    });
    var extractsTemplateSource = $("#extracts-template").html();
    extractsTemplate = Handlebars.compile(extractsTemplateSource);
    //get defaults from html
    var defaultLanguageSelection = $(".menu-language a.default-selection");
    var defaultArticlesSelection = $(".menu-articles a.default-selection");
    var defaultSearchbySelection = $(".menu-searchby a.default-selection");
    selectLanguage(defaultLanguageSelection);
    selectArticles(defaultArticlesSelection);
    selectSearchBy(defaultSearchbySelection);
    doSearch();
});

})();
