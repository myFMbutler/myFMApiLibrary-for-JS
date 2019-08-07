Lesterius FileMaker 18 Data API wrapper - myFMApiLibrary for Javascript
=======================

# Presentation

## Team
[Lesterius](https://www.lesterius.com "Lesterius") is a European FileMaker Business Alliance Platinum member that operates in Belgium, France, the Netherlands, Portugal and Spain. We are creative business consultants who co-create FileMaker Platform based solutions with our customers.\
Sharing knowledge takes part of our DNA, that's why we developed this library to make the FileMaker Data API easy-to-use with Javascript.\
Break the limits of your application!\
![Lesterius logo](http://i1.createsend1.com/ei/r/29/D33/DFF/183501/csfinal/Mailing_Lesterius-logo.png "Lesterius")

## Description
This library is a Javascript wrapper of the FileMaker Data API 18.<br/>

You can find the PHP wrapper of the FileMaker Data API 18 [here](https://github.com/myFMbutler/myFMApiLibrary-for-PHP)<br/>

You will be able to use every functions like it's documented in your FileMaker server Data Api documentation (accessible via https://[your server domain]/fmi/data/apidoc).
General FileMaker document on the Data API is available [here](https://fmhelp.filemaker.com/docs/18/en/dataapi/)


## Installation

The recommended way to install it is through [Composer](http://getcomposer.org).

```bash
composer require myfmbutler/myfmapilibrary-for-js
```

After installing, you can call this javascript library by adding:

```html
<script src="DataApi.js"></script>
```

In your html file.

# Usage

## Prepare your FileMaker solution

1. Enable the FileMaker Data API option on your FileMaker server admin console.
2. Create a specific user in your FileMaker database with the 'fmrest' privilege
3. Define records & layouts access for this user

## Use the library

### Login

Login with credentials:
```javascript
let options = {
        'apiUrl': 'https://test.fmconnection.com/fmi/data',
        'databaseName' : 'MyDatabase',
        'login' : 'filemaker api user',
        'password' : 'filemaker api password'
    };

let api = new DataApi(options);
```

Login with oauth:
```javascript
let options = {
        'apiUrl': 'https://test.fmconnection.com/fmi/data',
        'databaseName' : 'MyDatabase',
        'oAuthRequestId' : 'oAuthIdentifier',
        'oAuthIdentifier' : 'oAuthIdentifier'
    };

let api = new DataApi(options);
```

Use only generated token:
```javascript
let options = {
        'apiUrl': 'https://test.fmconnection.com/fmi/data',
        'databaseName' : 'MyDatabase',
        'token' : 'generated token'
    };

let api = new DataApi(options);
```

To re generate a token, use 'login' function.

*/!\\* **Not available with 'Login with token' method, use 'setApiToken' function.**

### Logout

```javascript
dataApi.logout();
```

### Create record

```javascript
let data = {
    'FirstName'         : 'John',
    'LastName'          : 'Doe',
    'email'             : 'johndoe@acme.inc'
};

let scripts = [
    {
        'name'  : 'ValidateUser',
        'param' : 'johndoe@acme.inc',
        'type'  : SCRIPT_PREREQUEST
    },
    {
        'name'  : 'SendEmail',
        'param' : 'johndoe@acme.inc',
        'type'  : SCRIPT_POSTREQUEST
    }
];

let portalData = {
  'portalName or OccurenceName' : [
      {
          "Occurence::PortalField 1" : "Value",
          "Occurence::PortalField 2" : "Value",
      }
  ]
 };

let recordId = dataApi.createRecord('layout name', data, scripts, portalData);
```

### Delete record

```javascript
dataApi.deleteRecord('layout name', recordId, script);
```

### Edit record

```javascript
  let recordId = dataApi.editRecord('layout name', recordId, data, lastModificationId, portalData, scripts);
```

### Duplicate record

```javascript
  let recordId = dataApi.duplicateRecord('layout name', recordId, scripts);
```

### Get record

```javascript
let portals = [
    {
        'name'  : 'Portal1',
        'limit' : 10
    },
    { 
        'name'   : 'Portal2',
        'offset' : 3
    }
];

let record = dataApi.getRecord('layout name', recordId, portals, scripts);
```

### Get records

```javascript

let sort = [
    {
        'fieldName' : 'FirstName',
        'sortOrder' : 'ascend'
    },
    {
        'fieldName' : 'City',
        'sortOrder' : 'descend'
    }
];

let record = dataApi.getRecords('layout name', sort, offset, limit, portals, scripts);
```

### Find records

```javascript

let query = [
    {
        'fields'  : [
            {'fieldname' : 'FirstName', 'fieldvalue' : '==Test'},
            {'fieldname' : 'LastName', 'fieldvalue' : '==Test'},
        ],
        'options' : {'omit': false}
    }
];

let results = dataApi.findRecords('layout name', query, sort, offset, limit,  portals, scripts, responseLayout);
```

### Set global fields

```javascript

let data = {
  'FieldName1'	: 'value',
  'FieldName2'	: 'value'
};

dataApi.setGlobalFields('layout name', data);
```

### Execute script

```javascript
dataApi.executeScript('script name', scriptsParams);
```

### Upload file to container

```javascript
dataApi.uploadToContainer('layout name', recordId, containerFieldName, containerFieldRepetition, file);

```

### Metadata Info

#### Product Info
```javascript
dataApi.getProductInfo();
```

#### Database Names

*/!\\* **Not available with 'Login with token' method**

```javascript
dataApi.getDatabaseNames();
```

#### Layout Names
```javascript
dataApi.getLayoutNames();
```

#### Script Names
```javascript
dataApi.getScriptNames();
```

#### Layout Metadata
```javascript
dataApi.getLayoutMetadata('layout name', recordId);
```
