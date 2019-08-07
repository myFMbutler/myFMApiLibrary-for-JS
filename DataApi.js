"use strict";

class Exception {
    /**
     * Exception constructor
     *
     * @param message
     * @param code
     */
    constructor(message, code) {
        if (code !== "") {
            return "[ "+ code + ", " + message + " ]";
        }
        return "[ " + message + " ]";
    }
}

const RESPONSE_TYPE_JSON = 'json',
    RESPONSE_TYPE_TEXT = 'text';

class Response {
    /**
     * Response constructor
     *
     * @param headers
     * @param body
     */
    constructor(headers, body) {
        this.setHeaders(headers);
        this.body    = body;

        if (Array.isArray(body)) {
            this.responseType = RESPONSE_TYPE_JSON;
        } else {
            this.responseType = RESPONSE_TYPE_TEXT;
        }
    }

    static get RESPONSE_TYPE_JSON() {
        return RESPONSE_TYPE_JSON;
    }

    static get RESPONSE_TYPE_TEXT() {
        return RESPONSE_TYPE_TEXT;
    }

    setHeaders(headers) {
        if (Array.isArray(headers)){
            this.headers = headers;
            return this;
        }

        throw new Exception("Bad headers", "");
    }

    /**
     * @param header
     * @returns {*}
     * @throws Exception
     */
    getHeader(header) {
        if (this.headers.hasOwnProperty(header) && this.headers[header].length > 0) {
            return this.headers[header];
        }

        throw new Exception("Header not found", "");
    }

    /**
     * @param hearders
     * @param body
     * @returns {Response}
     * @throws Exception
     */
    static parse(hearders, body) {
        return new Response(Response.parseHeaders(hearders), Response.parseBody(body));
    }

    /**
     * @returns {number}
     * @throws Exception
     */
    getHttpCode() {
        let httpHeader = this.getHeader('Status');
        httpHeader = httpHeader.split(" ");

        return parseInt(httpHeader[1], 10);
    }

    /**
     * @param raw
     * @returns {*}
     */
    getBody(raw = false) {
        if (raw === false) {
            return this.body;
        }

        if (this.responseType === RESPONSE_TYPE_JSON) {
            return JSON.stringify(this.body);
        }

        return this.body;
    }

    /**
     * @param headers
     * @returns {Array}
     */
    static parseHeaders(headers) {
        // We convert the raw header string into an array
        headers = headers.split("\n");
        headers = headers.map(function (header) {
            let exploded = header.split(":");

            return exploded.map(function (value) {
                return value.trim().replace('"', '');
            });
        });
        // We remove empty lines in array
        headers = headers.filter( function (value) {
            return (Array.isArray(value) ? value[0] : value) !== '';
        });
        // Lastly, we clean the array format to be a key => value array
        // The response code is special as there is no key. We handle it differently
        let statusHeader =[];
        let index;

        for (index = 0; index < headers.length; ++index) {
            let header = (headers.hasOwnProperty(index)?headers[index]:[]);
            if (!header.hasOwnProperty(1) || header[1].length > 0) {
                break;
            }
            if (header.hasOwnProperty(0) && header[0].length > 0) {
                statusHeader.push({'Status': header[0]});

                headers.splice(index, 1);
            }
        }
        let processedHeaders = statusHeader;

        for (index = 0; index < headers.length; ++index) {
            let header = (headers.hasOwnProperty(index)?headers[index]:[]);
            if (!header.hasOwnProperty(1) || header[1].length <= 0) {
                continue;
            }

            processedHeaders[header[0]] = header[1];
        }

        return processedHeaders;
    }

    /**
     * @param body
     * @returns {*}
     */
    static parseBody(body) {
        if (Response.isJson(body)) {
            return JSON.parse(body);
        }

        return body;
    }

    /**
     * @param string
     * @returns {boolean}
     */
    static isJson(string) {
        try {
            JSON.parse(string);
        } catch (e) {
            return false;
        }
        return true;
    }
}

class CurlClient {

    /**
     * CurlClient constructor
     *
     * @param apiUrl
     */
    constructor(apiUrl) {
        this.baseUrl     = apiUrl;
    }

    /**
     * Execute a cURL request
     *
     * @param method
     * @param url
     * @param options
     * @throws Exception
     */
    request(method, url, options) {
        let headers     = [];
        let completeUrl =  encodeURI(this.baseUrl + url);
        let body        = '';
        let xhr         = new XMLHttpRequest();

        if (options.hasOwnProperty('query_params')) {
            let query_params = this.http_build_query(options.query_params);
            completeUrl += (query_params.length > 0 ? '?' + query_params : '');
        }

        xhr.open(method, completeUrl, false);

        let contentLength = 0;

        if (options.hasOwnProperty('json') && method !== 'GET') {
            body = "{";

            for (let jsonOptionKey in options.json) {
                // check if the property/key is defined in the object itself, not in parent
                if (options.json.hasOwnProperty(jsonOptionKey)) {
                    let jsonOptionData = options.json[jsonOptionKey];
                    body+= '"'+jsonOptionKey + '":' + ( Response.isJson(jsonOptionData) ? jsonOptionData : JSON.stringify(jsonOptionData)) + ',';
                }
            }

            body = (body.length > 1 ? body.substring(0,(body.length-1)): body);
            body+= "}";

            body = JSON.parse(body);

            if (body === false) {
                throw new Exception("Failed to json encode parameters", "");
            }

            contentLength = body.length;
        }

        //-- Set headers
        if (!options.hasOwnProperty('headers') || !options.headers.hasOwnProperty('Content-Type') || options.headers['Content-Type'].length <= 0) {
            if (!options.hasOwnProperty('headers')){
                options.headers = [];
            }
            options.headers['Content-Type'] = 'application/json';
        }

        for (let headerKey in options.headers) {
            // check if the property/key is defined in the object itself, not in parent
            if (options.headers.hasOwnProperty(headerKey)) {
                let headerValue = options.headers[headerKey];
                let key = headerKey.replace('"','').trim();

                let obj = {
                    key: key,
                    value: headerValue
                };

                headers.push(obj);
            }
        }
        //--

        let index;

        for (index = 0; index < headers.length; ++index) {
            xhr.setRequestHeader(headers[index].key, headers[index].value);
        }

        // Send
        if (options.hasOwnProperty('fileObject') && method === 'POST') {
            let cURLFile     = new FormData();
            cURLFile.append("upload", options.fileObject);
            xhr.send(cURLFile);
        } else if(typeof body !== 'undefined' && method !== 'GET') {
            xhr.send(JSON.stringify(body));
        } else {
            xhr.send(null);
        }

        let responseHeaders = xhr.getAllResponseHeaders();
        responseHeaders+="\nStatus: "+xhr.status+"\n";
        let bodyResponse = xhr.responseText;
        let response = Response.parse(responseHeaders, bodyResponse);

        CurlClient.validateResponse(response);

        return response;
    }

    /**
     * @param response
     * @throws Exception
     */
    static validateResponse(response) {
        let code = parseInt(response.getHttpCode());

        if (code >= 400 && code < 600 || code === 100) {
            let message = "";
            if (response.getBody()['messages'][0]['message'].length > 0) {
                if (Array.isArray(response.getBody()['messages'][0]['message'])) {
                    message = response.getBody()['messages'][0]['message'].join(' - ');
                } else  {
                    message = response.getBody()['messages'][0]['message'];
                }
                if (response.getBody()['messages'][0]['code'].length > 0) {
                    code = response.getBody()['messages'][0]['code'];
                }

                throw new Exception(message, code);
            }

            // A status code 100 with no message is OK
            if (code !== 100) {
                if (Array.isArray(response.getBody()) || typeof response.getBody() === 'object') {
                    message = JSON.stringify(response.getBody());
                } else {
                    message = response.getBody();
                }


                if (message.length === 0) {
                    message = response.getHeader('Status');
                }

                throw new Exception(message, code);
            }
        }
    }

    http_build_query(paramsData) {
        let searchParameters = new URLSearchParams();

        Object.keys(paramsData).forEach(function(parameterName) {
            searchParameters.append(parameterName, paramsData[parameterName]);
        });

        return searchParameters.toString();
    }
}

const FILEMAKER_NO_RECORDS  = 401,
    SCRIPT_PREREQUEST     = 'prerequest',
    SCRIPT_PRESORT        = 'presort',
    SCRIPT_POSTREQUEST    = 'postrequest';

class DataApi {

    /**
     * DataApi constructor
     *
     * @param options
     */
    constructor(options = {}) {
        // Init properties
        this.initProperties();

        // Set properties if in options variable
        if (options.hasOwnProperty('login')) {
            this.apiUsername = options.login;
        }

        if (options.hasOwnProperty('password')) {
            this.apiPassword = options.password;
        }

        if (options.hasOwnProperty('oAuthRequestId')) {
            this.oAuthRequestId = options.oAuthRequestId;
        }

        if (options.hasOwnProperty('oAuthIdentifier')) {
            this.oAuthIdentifier = options.oAuthIdentifier;
        }

        if (options.hasOwnProperty('token')) {
            this.apiToken = options.token;
        }

        if (options.hasOwnProperty('databaseName')) {
            this.apiDatabase = options.databaseName;
        }

        if (options.hasOwnProperty('apiUrl')) {
            this.ClientRequest = new CurlClient(options.apiUrl);
        }

        // Constructor problem
        if (!this.thereIsCredentials() || this.apiToken.length === 0) {
            new Exception("Data Api needs valid credentials [username;password] or [authRequestId;authIdentifier] or [token]", "");
        }

        // Basic default Authentication
        this.login();
    }

    // -- Start auth Part --

    /**
     * Login to FileMaker API
     *
     * @returns {DataApi}
     * @throws Exception
     */
    login() {
        // Available only if there is credentials
        if (this.thereIsCredentials()) {
            let headers = this.getHeaderAuth();

            // Send curl request
            let response = this.ClientRequest.request(
                'POST',
                "/v1/databases/" + this.apiDatabase + "/sessions",
                {
                    headers: headers,
                    'json': []
                }
            );

            this.apiToken = response.getBody().response.token;

            return this;
        }

        return new Exception('Not available without credentials','');
    }

    /**
     * Close the connection with FileMaker Server API
     *
     * @returns {DataApi}
     * @throws Exception
     */
    logout() {
        // Send curl request
        this.ClientRequest.request(
            'DELETE',
            "/v1/databases/" + this.apiDatabase + "/sessions/" + this.apiToken,
            []
        );

        this.apiToken = '';

        return this;
    }

    // -- End auth Part --

    // -- Start records Part --

    /**
     * Create a new record
     *
     * @param layout
     * @param data
     * @param scripts
     * @param portalData
     * @returns {*}
     * @throws Exception
     */
    createRecord(layout, data, scripts = [], portalData = {}) {
        // Prepare options
        let jsonOptions = this.encodeFieldData(data);

        if (Object.keys(portalData).length > 0 ) {
            jsonOptions['portalData'] = this.encodePortalData(portalData);
        }

        // Add scripts
        this.prepareScriptOptions(scripts, jsonOptions);

        // Send curl request
        let response = this.ClientRequest.request(
            'POST',
            "/v1/databases/" + this.apiDatabase + "/layouts/" + layout + "/records",
            {
                'headers':this.getDefaultHeaders(),
                'json':jsonOptions
            }
        );

        return response.getBody().response['recordId'];
    }

    /**
     * Duplicate an existing record
     *
     * @param layout
     * @param recordId
     * @param scripts
     * @returns {*}
     * @throws Exception
     */
    duplicateRecord(layout, recordId, scripts = []) {
        // Send curl request
        let response = this.ClientRequest.request(
            'POST',
            "/v1/databases/" + this.apiDatabase + "/layouts/" + layout + "/records/" + recordId,
            {
                'headers': this.getDefaultHeaders(),
                'json': this.prepareScriptOptions(scripts)
            }
        );

        return response.getBody().response['recordId'];
    }

    /**
     * Edit an existing record by ID
     *
     * @param layout
     * @param recordId
     * @param data
     * @param lastModificationId
     * @param portalData
     * @param scripts
     * @returns {*}
     * @throws Exception
     */
    editRecord(layout, recordId, data, lastModificationId = '', portalData = {}, scripts = []) {
        // Prepare options
        let jsonOptions = this.encodeFieldData(data);

        if (lastModificationId.length > 0) {
            jsonOptions['modId'] = lastModificationId;
        }

        if (Object.keys(portalData).length > 0) {
            jsonOptions['portalData'] = this.encodePortalData(portalData);
        }

        // Add scripts
        this.prepareScriptOptions(scripts, jsonOptions);

        // Send curl request
        let response = this.ClientRequest.request(
            'PATCH',
            "/v1/databases/" + this.apiDatabase + "/layouts/" + layout + "/records/" + recordId,
            {
                'headers': this.getDefaultHeaders(),
                'json': jsonOptions
            }
        );

        return response.getBody().response['modId'];
    }

    /**
     * Delete record by ID
     *
     * @param layout
     * @param recordId
     * @param scripts
     * @throws Exception
     */
    deleteRecord(layout, recordId, scripts = []) {
        // Send curl request
        this.ClientRequest.request(
            'DELETE',
            "/v1/databases/" + this.apiDatabase + "/layouts/" + layout + "/records/" + recordId,
            {
                'headers': this.getDefaultHeaders(),
                'json': this.prepareScriptOptions(scripts)
            }
        );
    }

    /**
     * Get record detail by ID
     *
     * @param layout
     * @param recordId
     * @param portals
     * @param scripts
     * @param responseLayout
     * @returns {*}
     * @throws Exception
     */
    getRecord(layout, recordId, portals = [], scripts = [], responseLayout = '') {
        // Prepare options
        let jsonOptions = {};

        // optional parameters
        if (responseLayout.length > 0) {
            jsonOptions['layout.response'] = responseLayout;
        }

        // Add scripts
        this.prepareScriptOptions(scripts, jsonOptions);

        // Add portals
        this.preparePortalsOptions(portals, jsonOptions);

        // Send curl request
        let response = this.ClientRequest.request(
            'GET',
            "/v1/databases/" + this.apiDatabase + "/layouts/" + layout + "/records/" + recordId,
            {
                'headers': this.getDefaultHeaders(),
                'query_params': jsonOptions
            }
        );

        return response.getBody().response.data[0];
    }

    /**
     * Get list of records
     *
     * @param layout
     * @param sort
     * @param offset
     * @param limit
     * @param portals
     * @param scripts
     * @param responseLayout
     * @returns {*}
     * @throws Exception
     */
    getRecords(layout, sort = '', offset = '', limit = '', portals = [], scripts = [], responseLayout = '') {
        // Search options
        let jsonOptions = this.prepareJsonOption({}, offset, limit, sort, responseLayout, true);

        // Add scripts
        this.prepareScriptOptions(scripts, jsonOptions);

        // Add portals
        this.preparePortalsOptions(portals, jsonOptions);

        // Send curl request
        let response = this.ClientRequest.request(
            'GET',
            "/v1/databases/" + this.apiDatabase + "/layouts/" + layout + "/records",
            {
                'headers': this.getDefaultHeaders(),
                'query_params': jsonOptions
            }
        );

        return response.getBody().response.data;
    }

    /**
     * Find records
     *
     * @param layout
     * @param query
     * @param sort
     * @param offset
     * @param limit
     * @param portals
     * @param scripts
     * @param responseLayout
     * @returns {*}
     * @throws Exception
     */
    findRecords(layout, query, sort = '', offset = '', limit = '', portals = [], scripts = [], responseLayout = '') {
        // Prepare query
        let preparedQuery;

        if (!Array.isArray(query)) {
            preparedQuery = [query];
        } else {
            preparedQuery = this.prepareQueryOptions(query);
        }

        // Prepare options
        let jsonOptions = {'query': JSON.stringify(preparedQuery)};

        // Search options
        this.prepareJsonOption(jsonOptions, offset, limit, sort, responseLayout);

        // Add scripts
        this.prepareScriptOptions(scripts, jsonOptions);

        // Add portals
        this.preparePortalsOptions(portals, jsonOptions);

        // Send curl request
        let response = this.ClientRequest.request(
            'POST',
            "/v1/databases/" + this.apiDatabase + "/layouts/" + layout + "/_find",
            {
                'headers': this.getDefaultHeaders(),
                'json': jsonOptions
            }
        );

        return response.getBody().response.data;
    }

    // -- End records Part --

    // -- Start scripts Part --

    /**
     * Execute script alone
     *
     * @param layout
     * @param scriptName
     * @param scriptParam
     * @returns {*}
     * @throws Exception
     */
    executeScript(layout, scriptName, scriptParam = '') {
        // Prepare options
        let jsonOptions = {};

        // optional parameters
        if (scriptParam.length > 0) {
            jsonOptions['script.param'] = scriptParam;
        }

        // Send curl request
        let response = this.ClientRequest.request(
            'GET',
            "/v1/databases/" + this.apiDatabase + "/layouts/" + layout + "/script/" + scriptName,
            {
                'headers' : this.getDefaultHeaders(),
                'query_params': jsonOptions,
            }
        );

        return response.getBody().response.scriptResult;
    }

    // -- End scripts Part --

    // -- Start container Part --

    /**
     * Upload files into container field with or without specific repetition
     *
     * @param layout
     * @param recordId
     * @param containerFieldName
     * @param containerFieldRepetition
     * @param file
     * @returns {boolean}
     * @throws Exception
     */
    uploadToContainer(layout, recordId, containerFieldName, containerFieldRepetition = '', file) {
        // Prepare options
        let containerFieldRepetitionFormat = "";

        if (containerFieldRepetition.length > 0 ) {
            containerFieldRepetitionFormat = '/' + parseInt(containerFieldRepetition);
        }

        let headers = this.getDefaultHeaders();
        headers['Content-Type'] = 'multipart/form-data;boundary=----WebKitFormBoundaryyrV7KO0BoCBuDbTL';

        // Send curl request
        let response = this.ClientRequest.request(
            'POST',
            "/v1/databases/" + this.apiDatabase + "/layouts/" + layout + "/records/" + recordId + "/containers/"+ containerFieldName + containerFieldRepetitionFormat,
            {
                'headers': headers,
                'fileObject': file
            }
        );

        return response.getBody();
    }

    // -- End container Part --

    // -- Start globals Part --

    /**
     * Define one or multiple global fields
     *
     * @param layout
     * @param globalFields
     * @returns {*}
     * @throws Exception
     */
    setGlobalFields(layout, globalFields) {
        // Send curl request
        let response = this.ClientRequest.request(
            'PATCH',
            "/v1/databases/" + this.apiDatabase + "/globals",
            {
                'headers' : this.getDefaultHeaders(),
                'json'   : {'globalFields' :JSON.stringify(globalFields)},
            }
        );

        return response.getBody().response;
    }

    // -- End globals Part --

    // -- Start metadata Part --

    /**
     * @returns {*}
     * @throws Exception
     */
    getProductInfo() {
        // Send curl request
        let response = this.ClientRequest.request(
            'GET',
            "/v1/productInfo",
            {
                'headers': this.getDefaultHeaders(),
                'json': []
            }
        );

        return response.getBody().response;
    }

    /**
     * @returns {*}
     * @throws Exception
     */
    getDatabaseNames() {
        // Available only if there is credentials
        if (this.thereIsCredentials()) {
            // Send curl request
            let response = this.ClientRequest.request(
                'GET',
                "/v1/databases",
                {
                    'headers': this.getHeaderAuth(),
                    'json': []
                }
            );

            return response.getBody().response;
        }

        return new Exception('Not available without credentials','');
    }

    /**
     * @returns {*}
     * @throws Exception
     */
    getLayoutNames() {
        // Send curl request
        let response = this.ClientRequest.request(
            'GET',
            "/v1/databases/" + this.apiDatabase + "/layouts",
            {
                'headers': this.getDefaultHeaders(),
                'json': []
            }
        );

        return response.getBody().response;
    }

    /**
     * @returns {*}
     * @throws Exception
     */
    getScriptNames() {
        // Send curl request
        let response = this.ClientRequest.request(
            'GET',
            "/v1/databases/" + this.apiDatabase + "/scripts",
            {
                'headers': this.getDefaultHeaders(),
                'json': []
            }
        );

        return response.getBody().response;
    }

    /**
     * @param layout
     * @param recordId
     * @returns {*}
     * @throws Exception
     */
    getLayoutMetadata(layout, recordId = '') {
        // Prepare options
        let jsonOptions = [];

        let metadataFormat = '/metadata';

        if (recordId.length > 0) {
            jsonOptions['recordId'] = recordId;
            metadataFormat = '';
        }

        // Send curl request
        let response = this.ClientRequest.request(
            'GET',
            "/v1/databases/" + this.apiDatabase + "/layouts/" + layout + metadataFormat,
            {
                'headers': this.getDefaultHeaders(),
                'json': jsonOptions
            }
        );

        return response.getBody().response;
    }

    // -- End metadata Part --

    // -- Class accessors --

    /**
     * Get API token returned after a successful login
     *
     * @returns {*|null}
     */
    getApiToken() {
        return this.apiToken;
    }

    /**
     * Set API token returned after a successful login
     *
     * @param apiToken
     * @returns {*|null}
     */
    setApiToken(apiToken) {
        this.apiToken = apiToken;
    }

    /**
     * Set API token in request headers
     *
     * @returns {{Authorization: (*|null)}}
     */
    getDefaultHeaders() {
        return {'Authorization' : 'Bearer ' + this.apiToken}
    }

    /**
     * Get header authorization for basic Auth
     *
     * @returns {{Authorization: *}}
     */
    getHeaderBasicAuth() {
        return {'Authorization'  : 'Basic ' + btoa(this.apiUsername+':'+this.apiPassword)};
    }

    /**
     * Get header authorization for OAuth
     *
     * @returns {{"X-FM-Data-Login-Type": string, "X-FM-Data-OAuth-Request-Id": *, "X-FM-Data-OAuth-Identifier": *}}
     */
    getHeaderOAuth() {
        return {
            'X-FM-Data-Login-Type'       : 'oauth',
            'X-FM-Data-OAuth-Request-Id' : this.oAuthRequestId,
            'X-FM-Data-OAuth-Identifier' : this.oAuthIdentifier,
        };
    }

    /**
     * Get Header switch to parameters
     *
     * @returns {Array}
     */
    getHeaderAuth() {
        let headers = [];
        if (this.apiUsername.length > 0) {
            headers = this.getHeaderBasicAuth();
        }

        if (this.oAuthRequestId.length > 0) {
            headers = this.getHeaderOAuth();
        }

        return headers;
    }

    // -- Options worker functions --

    /**
     * Prepare options fields for query
     *
     * @param query
     * @returns {Array}
     */
    prepareQueryOptions(query) {
        let item = [];

        if (Array.isArray(query)) {
            let index;

            for (index = 0; index < query.length; ++index) {
                let queryItem = query[index];

                if (!queryItem.hasOwnProperty('fields')) {
                    break;
                }

                if (!Array.isArray(queryItem.fields)) {
                    if (queryItem.fields.hasOwnProperty('fieldname') && queryItem.fields.hasOwnProperty('fieldvalue')) {
                        let obj = {};
                        obj[queryItem.fields.fieldname.replace('"', '').trim()] = queryItem.fields.fieldvalue;

                        item.push(obj);
                    }
                } else {
                    for (let index in queryItem.fields) {
                        let fieldData = queryItem.fields[index];

                        if (fieldData.hasOwnProperty('fieldname') && fieldData.hasOwnProperty('fieldvalue')) {
                            let obj = {};
                            obj[fieldData.fieldname.replace('"', '').trim()] = fieldData.fieldvalue;

                            item.push(obj);
                        }
                    }
                }

                if (queryItem.hasOwnProperty('options') && queryItem.options.hasOwnProperty('omit') && queryItem.options.omit === true) {
                    item.push({'omit': true});
                }
            }
        }

        return item;
    }

    /**
     * Prepare options for script
     *
     * @param scripts
     * @param jsonOptions
     * @returns {Array}
     */
    prepareScriptOptions(scripts, jsonOptions = {}) {
        if (Array.isArray(scripts)) {
            let index;

            let listType = [SCRIPT_POSTREQUEST, SCRIPT_PREREQUEST, SCRIPT_PRESORT];

            for (index = 0; index < scripts.length; ++index) {
                let script = scripts[index];

                if (listType.indexOf(script.type) < 0) {
                    continue;
                }

                let scriptSuffix = !(script.type === SCRIPT_POSTREQUEST) ? '.' + script.type : '';

                jsonOptions['script' + scriptSuffix]           = script.name;
                jsonOptions['script' + scriptSuffix +'.param'] = script.param;
            }
        }

        return jsonOptions;
    }

    /**
     * Prepare options for portals
     *
     * @param portals
     * @param jsonOptions
     * @returns {Array}
     */
    preparePortalsOptions(portals, jsonOptions = {}) {
        if (portals.length <= 0) {
            return [];
        }

        let portalList = [];
        let options = [];
        let index;

        for (index = 0; index < portals.length; ++index) {
            let portal = portals[index];

            portalList.push(portal.name);

            if (portal.hasOwnProperty('offset')) {
                let optionName = 'offset.' + portal.name;

                let obj = {};
                obj[optionName.replace('"','').trim()] = parseInt(portal.offset);

                options.push(obj);
            }

            if (portal.hasOwnProperty('limit')) {
                let optionName = 'offset.' + portal.name;

                let obj = {};
                obj[optionName.replace('"','').trim()] = parseInt(portal.limit);

                options.push(obj);
            }
        }

        jsonOptions['portal'] = JSON.stringify(portalList);

        return jsonOptions;
    }

    /**
     * @param data
     * @returns {{fieldData: string}}
     */
    encodeFieldData(data) {
        return {'fieldData' : JSON.stringify(data)};
    }

    /**
     * @param portal
     * @returns {string}
     */
    encodePortalData(portal) {
        return JSON.stringify(portal);
    }

    /**
     * Prepare recurrent options for requests
     *
     * @param jsonOptions
     * @param offset
     * @param limit
     * @param sort
     * @param responseLayout
     * @param withUnderscore
     * @returns {Array}
     */
    prepareJsonOption(jsonOptions = {}, offset = '', limit = '', sort = '', responseLayout = '', withUnderscore = false) {
        let additionalCharacter = (withUnderscore ? '_' : '');

        if (offset.length > 0) {
            jsonOptions[additionalCharacter+'offset'] = parseInt(offset);
        }

        if (limit.length > 0) {
            jsonOptions[additionalCharacter+'limit'] = parseInt(limit);
        }

        if (sort.length > 0) {
            jsonOptions[additionalCharacter+'sort'] = (Array.isArray(sort) ? JSON.stringify(sort) : sort);
        }

        if (responseLayout.length > 0) {
            jsonOptions['layout.response'] = responseLayout;
        }

        return jsonOptions;
    }

    /**
     * Check if there is credentials set
     *
     * @returns {boolean}
     */
    thereIsCredentials() {
        return ((this.apiUsername.length > 0 && this.apiPassword.length > 0) || (this.oAuthRequestId.length > 0 && this.oAuthIdentifier.length > 0));
    }

    /**
     * Just init class properties
     */
    initProperties() {
        this.apiUsername        = '';
        this.apiPassword        = '';
        this.oAuthRequestId     = '';
        this.oAuthIdentifier    = '';
        this.apiToken           = '';
        this.apiDatabase        = '';
        this.ClientRequest      = '';
    }
}