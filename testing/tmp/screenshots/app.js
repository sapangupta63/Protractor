var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var convertTimestamp = function (timestamp) {
    var d = new Date(timestamp),
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2),
        dd = ('0' + d.getDate()).slice(-2),
        hh = d.getHours(),
        h = hh,
        min = ('0' + d.getMinutes()).slice(-2),
        ampm = 'AM',
        time;

    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    } else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    } else if (hh === 0) {
        h = 12;
    }

    // ie: 2013-02-18, 8:35 AM
    time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

    return time;
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    } else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    } else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};

//</editor-fold>

app.controller('ScreenshotReportController', ['$scope', '$http', 'TitleService', function ($scope, $http, titleService) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    this.warningTime = 1400;
    this.dangerTime = 1900;
    this.totalDurationFormat = clientDefaults.totalDurationFormat;
    this.showTotalDurationIn = clientDefaults.showTotalDurationIn;

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
        if (initialColumnSettings.warningTime) {
            this.warningTime = initialColumnSettings.warningTime;
        }
        if (initialColumnSettings.dangerTime) {
            this.dangerTime = initialColumnSettings.dangerTime;
        }
    }


    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };
    this.hasNextScreenshot = function (index) {
        var old = index;
        return old !== this.getNextScreenshotIdx(index);
    };

    this.hasPreviousScreenshot = function (index) {
        var old = index;
        return old !== this.getPreviousScreenshotIdx(index);
    };
    this.getNextScreenshotIdx = function (index) {
        var next = index;
        var hit = false;
        while (next + 2 < this.results.length) {
            next++;
            if (this.results[next].screenShotFile && !this.results[next].pending) {
                hit = true;
                break;
            }
        }
        return hit ? next : index;
    };

    this.getPreviousScreenshotIdx = function (index) {
        var prev = index;
        var hit = false;
        while (prev > 0) {
            prev--;
            if (this.results[prev].screenShotFile && !this.results[prev].pending) {
                hit = true;
                break;
            }
        }
        return hit ? prev : index;
    };

    this.convertTimestamp = convertTimestamp;


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };

    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.totalDuration = function () {
        var sum = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.duration) {
                sum += result.duration;
            }
        }
        return sum;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };


    var results = [
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 12380,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.83"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, html/body/div[5]/div/a[7])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, html/body/div[5]/div/a[7])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:30:48)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Frame Handling\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:5:5)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 121:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1599731699021,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=465739098.1599731699&jid=1149869320&gjid=12884459&_gid=1464059783.1599731699&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=267685527' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1599731700106,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=465739098.1599731699&jid=1149869320&gjid=12884459&_gid=1464059783.1599731699&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=267685527 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1599731700106,
                "type": ""
            }
        ],
        "screenShotFile": "004b005b-00e3-000a-00e9-0084004f00d5.png",
        "timestamp": 1599731694733,
        "duration": 6685
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 5860,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.83"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, html/body/div[5]/div/a[7])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, html/body/div[5]/div/a[7])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:30:48)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Frame Handling\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:5:5)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 121:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1599732947202,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=1801837989.1599732947&jid=959069243&gjid=680822484&_gid=517800332.1599732947&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=2134614236' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1599732947946,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=1801837989.1599732947&jid=959069243&gjid=680822484&_gid=517800332.1599732947&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=2134614236 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1599732947946,
                "type": ""
            }
        ],
        "screenShotFile": "00860022-0073-0084-00a5-000100d70095.png",
        "timestamp": 1599732944700,
        "duration": 4489
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 24456,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.83"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 121:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1599734290496,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=385479561.1599734291&jid=472198832&gjid=971666112&_gid=1694097010.1599734291&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1523812862' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1599734291722,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=385479561.1599734291&jid=472198832&gjid=971666112&_gid=1694097010.1599734291&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1523812862 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1599734291722,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/prebid/latest/prebid.js 2:145359 \"fun-hooks: referenced 'registerAdserver' but it was never created\"",
                "timestamp": 1599734293246,
                "type": ""
            }
        ],
        "screenShotFile": "007c00ee-0088-00c3-00f0-005400ee0042.png",
        "timestamp": 1599734287482,
        "duration": 5645
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 2492,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 121:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1599895183865,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=1408486557.1599895184&jid=1761860920&gjid=2049580405&_gid=799552102.1599895184&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1195136936' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1599895184631,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=1408486557.1599895184&jid=1761860920&gjid=2049580405&_gid=799552102.1599895184&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1195136936 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1599895184631,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/pub/w3schools.com/20200508/T4/snhb-w3schools.com.min.js?202008131600 41:488 \"[snhb](204ms):\" \"Automatic auction starting disabled. Use snhb.snhb.getAllAvailableAdUnitNames() and snhb.startAuction([adUnitNames]) to manually start auctions.\"",
                "timestamp": 1599895184702,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.snigelweb.com/pub/w3schools.com/20200508/T4/snhb-w3schools.com.min.js?202008131600 41:488 \"[snhb](205ms):\" \"snhb.addAdditionalAdSlotsToRefresh() passed parameter should be a non-empty array. Ignoring call.\"",
                "timestamp": 1599895184702,
                "type": ""
            }
        ],
        "screenShotFile": "007900d4-0054-0032-002c-004500b5004c.png",
        "timestamp": 1599895182286,
        "duration": 3163
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 16768,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": [
            "Failed: or is not defined"
        ],
        "trace": [
            "ReferenceError: or is not defined\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:9:14)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Frame Handling\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:6:5)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00300068-0074-0016-00c3-007200d80079.png",
        "timestamp": 1599895424957,
        "duration": 295
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 1240,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 121:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1599895451371,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=954002503.1599895452&jid=1745941861&gjid=771390926&_gid=623333827.1599895452&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1098238217' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1599895451780,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=954002503.1599895452&jid=1745941861&gjid=771390926&_gid=623333827.1599895452&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1098238217 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1599895451780,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/pub/w3schools.com/20200508/T4/snhb-w3schools.com.min.js?202008131600 41:488 \"[snhb](210ms):\" \"Automatic auction starting disabled. Use snhb.snhb.getAllAvailableAdUnitNames() and snhb.startAuction([adUnitNames]) to manually start auctions.\"",
                "timestamp": 1599895452129,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.snigelweb.com/pub/w3schools.com/20200508/T4/snhb-w3schools.com.min.js?202008131600 41:488 \"[snhb](212ms):\" \"snhb.addAdditionalAdSlotsToRefresh() passed parameter should be a non-empty array. Ignoring call.\"",
                "timestamp": 1599895452129,
                "type": ""
            }
        ],
        "screenShotFile": "00f20099-00a6-0008-0037-00b9005f001b.png",
        "timestamp": 1599895449739,
        "duration": 3099
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 19052,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 121:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1599895571463,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=1409967050.1599895572&jid=710350724&gjid=1928668657&_gid=1014461958.1599895572&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=881276632' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1599895571898,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=1409967050.1599895572&jid=710350724&gjid=1928668657&_gid=1014461958.1599895572&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=881276632 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1599895571899,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/pub/w3schools.com/20200508/T4/snhb-w3schools.com.min.js?202008131600 41:488 \"[snhb](210ms):\" \"Automatic auction starting disabled. Use snhb.snhb.getAllAvailableAdUnitNames() and snhb.startAuction([adUnitNames]) to manually start auctions.\"",
                "timestamp": 1599895572256,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.snigelweb.com/pub/w3schools.com/20200508/T4/snhb-w3schools.com.min.js?202008131600 41:488 \"[snhb](211ms):\" \"snhb.addAdditionalAdSlotsToRefresh() passed parameter should be a non-empty array. Ignoring call.\"",
                "timestamp": 1599895572256,
                "type": ""
            }
        ],
        "screenShotFile": "009400d3-009d-0078-0032-003200880081.png",
        "timestamp": 1599895570249,
        "duration": 2598
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 1240,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 121:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1599899104085,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=943953828.1599899104&jid=303810319&gjid=1661404187&_gid=2104865973.1599899104&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=692444592' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1599899104516,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=943953828.1599899104&jid=303810319&gjid=1661404187&_gid=2104865973.1599899104&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=692444592 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1599899104516,
                "type": ""
            }
        ],
        "screenShotFile": "000900a5-0035-00e9-0047-00cf00500000.png",
        "timestamp": 1599899101866,
        "duration": 3759
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 3492,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 121:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1599899562026,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=1956603262.1599899562&jid=1774524361&gjid=899676257&_gid=1390840097.1599899562&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=2053463884' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1599899562586,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j85&tid=UA-3855518-1&cid=1956603262.1599899562&jid=1774524361&gjid=899676257&_gid=1390840097.1599899562&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=2053463884 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1599899562586,
                "type": ""
            }
        ],
        "screenShotFile": "006c00a0-0013-0043-00d4-00c200fd0032.png",
        "timestamp": 1599899560237,
        "duration": 3041
    },
    {
        "description": "Printing first row data|Suite",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 21316,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f000a5-009a-003b-0089-0034003b0013.png",
        "timestamp": 1599901384226,
        "duration": 7850
    },
    {
        "description": "printing multiple data|Suite",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 21316,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006300d2-00c9-00d1-0093-005800e7007c.png",
        "timestamp": 1599901392442,
        "duration": 6044
    },
    {
        "description": "printing entire table|Suite",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 21316,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001600c0-0047-001d-003d-002d00c300b0.png",
        "timestamp": 1599901398757,
        "duration": 6174
    },
    {
        "description": "printing new table|Suite",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 21316,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00e600b0-00da-004d-00df-0066006100d2.png",
        "timestamp": 1599901405226,
        "duration": 5118
    },
    {
        "description": "Printing first row data|Suite",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 11292,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006400fc-00da-00b6-00f2-00a200ff00df.png",
        "timestamp": 1599901703800,
        "duration": 8246
    },
    {
        "description": "printing multiple data|Suite",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 11292,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001c00c8-0001-00b4-003b-00c1007700ad.png",
        "timestamp": 1599901712400,
        "duration": 5923
    },
    {
        "description": "printing entire table|Suite",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 11292,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d800af-00e0-005f-00b4-006200b80008.png",
        "timestamp": 1599901718601,
        "duration": 6339
    },
    {
        "description": "printing new table|Suite",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 11292,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "002700c2-00b1-002e-001f-003b00ad0046.png",
        "timestamp": 1599901725209,
        "duration": 5292
    },
    {
        "description": "Printing table|Data Provider",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 21072,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2157:16)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.sendKeys (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2174:19)\n    at actionFn (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\regression\\repeater1.js:10:47)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Printing table\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\PROTRACTOR\\testing\\regression\\repeater1.js:7:9\n    at C:\\PROTRACTOR\\testing\\node_modules\\jasmine-data-provider\\src\\index.js:25:22\n    at Array.forEach (<anonymous>)\n    at C:\\PROTRACTOR\\testing\\node_modules\\jasmine-data-provider\\src\\index.js:20:20\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\regression\\repeater1.js:6:5)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\regression\\repeater1.js:3:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "004f0080-00d9-0089-009f-002a0057003e.png",
        "timestamp": 1599902557186,
        "duration": 2470
    },
    {
        "description": "Printing table|Data Provider",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 21072,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2157:16)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.sendKeys (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2174:19)\n    at actionFn (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\regression\\repeater1.js:10:47)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Printing table\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\PROTRACTOR\\testing\\regression\\repeater1.js:7:9\n    at C:\\PROTRACTOR\\testing\\node_modules\\jasmine-data-provider\\src\\index.js:25:22\n    at Array.forEach (<anonymous>)\n    at C:\\PROTRACTOR\\testing\\node_modules\\jasmine-data-provider\\src\\index.js:20:20\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\regression\\repeater1.js:6:5)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\regression\\repeater1.js:3:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "0083003e-001e-005b-008d-006b009b0099.png",
        "timestamp": 1599902560024,
        "duration": 1125
    },
    {
        "description": "Printing table|Data Provider",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 16268,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0098009b-0019-00c1-00e0-00b400390015.png",
        "timestamp": 1599902654788,
        "duration": 5056
    },
    {
        "description": "Printing table|Data Provider",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 16268,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007d0020-0019-00c5-0067-005700a800c7.png",
        "timestamp": 1599902660445,
        "duration": 4246
    },
    {
        "description": "encountered a declaration exception|Data Provider",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 19352,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": [
            "TypeError: Cannot convert undefined or null to object"
        ],
        "trace": [
            "TypeError: Cannot convert undefined or null to object\n    at Function.keys (<anonymous>)\n    at C:\\PROTRACTOR\\testing\\node_modules\\jasmine-data-provider\\src\\index.js:28:37\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\regression\\repeater1.js:19:9)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\regression\\repeater1.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)"
        ],
        "browserLogs": [],
        "screenShotFile": "00040022-0088-00f5-0052-00aa00230005.png",
        "timestamp": 1599903097717,
        "duration": 302
    },
    {
        "description": "encountered a declaration exception|Data Provider",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 21156,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": [
            "TypeError: Cannot convert undefined or null to object"
        ],
        "trace": [
            "TypeError: Cannot convert undefined or null to object\n    at Function.keys (<anonymous>)\n    at C:\\PROTRACTOR\\testing\\node_modules\\jasmine-data-provider\\src\\index.js:28:37\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\regression\\repeater1.js:19:9)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\regression\\repeater1.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)"
        ],
        "browserLogs": [],
        "screenShotFile": "00210095-0091-008a-0054-001100440010.png",
        "timestamp": 1599903270169,
        "duration": 294
    },
    {
        "description": "Login to Customer Account|Automating Customer Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 20656,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000e0029-00ba-005b-0012-0039008a00b4.png",
        "timestamp": 1599905976414,
        "duration": 3197
    },
    {
        "description": "Login to Customer Account|Automating Customer Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12688,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00fc00ea-00c8-0015-007c-007000f50052.png",
        "timestamp": 1599906448349,
        "duration": 3561
    },
    {
        "description": "Deposit to Customer Account|Automating Customer Login Functionality",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 12688,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": [
            "Failed: No element found using locator: by.buttonText(\"Deposit\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.buttonText(\"Deposit\")\n    at elementArrayFinder.getWebElements.then (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\CustomerLogin.js:19:39)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Deposit to Customer Account\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\CustomerLogin.js:16:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\CustomerLogin.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00520057-00d2-0094-006e-00c0008b009a.png",
        "timestamp": 1599906452338,
        "duration": 943
    },
    {
        "description": "Login to Customer Account|Automating Customer Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 22364,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001f006e-0054-005c-000b-00a600c100ac.png",
        "timestamp": 1599906507071,
        "duration": 2982
    },
    {
        "description": "Deposit to Customer Account|Automating Customer Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 22364,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0043003d-0023-002c-0062-00da00d6000d.png",
        "timestamp": 1599906510421,
        "duration": 1134
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 21736,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b70070-005b-00dc-0046-00e800f3006f.png",
        "timestamp": 1599906928604,
        "duration": 2543
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 21736,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": [
            "UnexpectedAlertOpenError: unexpected alert open: {Alert text : Customer added successfully with customer id :6}\n  (Session info: chrome=85.0.4183.102)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "UnexpectedAlertOpenError: unexpected alert open: {Alert text : Customer added successfully with customer id :6}\n  (Session info: chrome=85.0.4183.102)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:553:13)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.takeScreenshot (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1085:17)\n    at run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as takeScreenshot] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:67:16)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\conf.js:95:13)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1599906931483,
        "duration": 722
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 20812,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00720061-000a-006a-0011-00a5004f002e.png",
        "timestamp": 1599907091890,
        "duration": 2600
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 20812,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c800a8-0028-0025-005a-003200df0047.png",
        "timestamp": 1599907094826,
        "duration": 1879
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 2060,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b00081-007e-0082-0048-002500990070.png",
        "timestamp": 1599907536021,
        "duration": 2801
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 2060,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d50039-005c-002d-006d-005a001c002a.png",
        "timestamp": 1599907539183,
        "duration": 2895
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 2060,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00db0052-002a-0021-00e3-00ef00fc00a3.png",
        "timestamp": 1599907542343,
        "duration": 2885
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17076,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00420097-0004-003f-0002-00bd0015000e.png",
        "timestamp": 1599908070586,
        "duration": 2764
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17076,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d80088-0019-0048-0064-00fa00b40098.png",
        "timestamp": 1599908073739,
        "duration": 2856
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17076,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00760045-0087-004a-001d-0023008f0037.png",
        "timestamp": 1599908076877,
        "duration": 2600
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17076,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "007f00ae-0077-00cf-00b5-0062009e00f8.png",
        "timestamp": 1599908079754,
        "duration": 2657
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 19620,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00860029-00cf-0029-0038-0097006d006b.png",
        "timestamp": 1599923293802,
        "duration": 2639
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 19620,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007b001e-00e1-0048-0093-00c500ec005b.png",
        "timestamp": 1599923296800,
        "duration": 2913
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 19620,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003000e6-0018-00b0-0027-003b00ed0033.png",
        "timestamp": 1599923299983,
        "duration": 2664
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 19620,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00680073-00d2-0011-00b8-006d00e60061.png",
        "timestamp": 1599923302948,
        "duration": 2810
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12728,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007500e4-0049-005f-00f8-008d003b00d1.png",
        "timestamp": 1600674841118,
        "duration": 6205
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12728,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00970030-00b4-0059-0020-005600ab0030.png",
        "timestamp": 1600674849204,
        "duration": 3170
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12728,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00570036-00e6-0075-005e-005e00b300bc.png",
        "timestamp": 1600674852988,
        "duration": 3315
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12728,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00a20002-00dc-0011-00ac-00ef00980088.png",
        "timestamp": 1600674856883,
        "duration": 3055
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17888,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006f00a8-00a5-00f4-00b9-005e00490066.png",
        "timestamp": 1600675477291,
        "duration": 4192
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17888,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "002100ce-0059-00c7-00b5-001200fe004f.png",
        "timestamp": 1600675482326,
        "duration": 3702
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17888,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00e10001-0088-0067-006a-00b000cd0063.png",
        "timestamp": 1600675486607,
        "duration": 2910
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17888,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00aa00b0-007b-005e-004f-0072009c00f9.png",
        "timestamp": 1600675490081,
        "duration": 2970
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 22872,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0043006d-0074-00e8-005b-005700310025.png",
        "timestamp": 1600675717823,
        "duration": 3451
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 22872,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00aa00c7-0067-0014-0037-004f00170064.png",
        "timestamp": 1600675722190,
        "duration": 4134
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 22872,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009e000b-007a-002d-0002-001a00ee0021.png",
        "timestamp": 1600675726912,
        "duration": 2887
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 22872,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00390096-000c-0061-00d1-000a00b200ac.png",
        "timestamp": 1600675730478,
        "duration": 3134
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 3372,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003100a8-00c5-00b1-00d9-00c8004700b0.png",
        "timestamp": 1600685440825,
        "duration": 6053
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 3372,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c6009a-0035-007e-00a1-00f900a80084.png",
        "timestamp": 1600685448569,
        "duration": 3000
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 3372,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0043000d-00e8-00df-00e6-00f300720099.png",
        "timestamp": 1600685452443,
        "duration": 2985
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 3372,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00da0097-00fd-0066-00de-003700fc0091.png",
        "timestamp": 1600685456198,
        "duration": 2831
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 4464,
        "browser": {
            "name": "firefox",
            "version": "68.7.0"
        },
        "message": [
            "Failed: waiting for page to load for 10000ms\nWait timed out after 10004ms"
        ],
        "trace": [
            "TimeoutError: waiting for page to load for 10000ms\nWait timed out after 10004ms\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: waiting for page to load for 10000ms\n    at scheduleWait (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2188:20)\n    at ControlFlow.wait (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2517:12)\n    at Driver.wait (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:934:29)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:685:32\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run it(\"Login to Bank Account\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:7:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "005900c3-00c9-00b0-00a3-008d0085001e.png",
        "timestamp": 1600783226790,
        "duration": 10192
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 4464,
        "browser": {
            "name": "firefox",
            "version": "68.7.0"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:18:44)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Validate Add Customer\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:17:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "00d90047-00a0-0060-0075-000d0028003e.png",
        "timestamp": 1600783237257,
        "duration": 65
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 4464,
        "browser": {
            "name": "firefox",
            "version": "68.7.0"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:33:44)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"open account\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:31:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "009d0091-007d-009e-00aa-00f9005c00ae.png",
        "timestamp": 1600783237405,
        "duration": 60
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 4464,
        "browser": {
            "name": "firefox",
            "version": "68.7.0"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:48:41)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"validate customers\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:46:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "003200bb-002c-007f-009d-005a00eb00a5.png",
        "timestamp": 1600783237558,
        "duration": 81
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 12952,
        "browser": {
            "name": "firefox",
            "version": "68.7.0"
        },
        "message": [
            "Failed: waiting for page to load for 10000ms\nWait timed out after 10024ms"
        ],
        "trace": [
            "TimeoutError: waiting for page to load for 10000ms\nWait timed out after 10024ms\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: waiting for page to load for 10000ms\n    at scheduleWait (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2188:20)\n    at ControlFlow.wait (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2517:12)\n    at Driver.wait (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:934:29)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:685:32\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run it(\"Login to Bank Account\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:7:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "000e0068-00e4-0014-00a7-009700e3006f.png",
        "timestamp": 1600783310794,
        "duration": 10169
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 12952,
        "browser": {
            "name": "firefox",
            "version": "68.7.0"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:18:44)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Validate Add Customer\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:17:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "00940027-0009-002b-001c-00620090002f.png",
        "timestamp": 1600783321369,
        "duration": 86
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 12952,
        "browser": {
            "name": "firefox",
            "version": "68.7.0"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:33:44)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"open account\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:31:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "007500d5-008d-005b-009d-00fc000b00c1.png",
        "timestamp": 1600783321587,
        "duration": 74
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 12952,
        "browser": {
            "name": "firefox",
            "version": "68.7.0"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:48:41)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"validate customers\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:46:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ae0006-00b4-007d-0034-00a20000007c.png",
        "timestamp": 1600783321746,
        "duration": 51
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 5564,
        "browser": {
            "name": "firefox",
            "version": "68.7.0"
        },
        "message": [
            "Failed: waiting for page to load for 10000ms\nWait timed out after 10017ms"
        ],
        "trace": [
            "TimeoutError: waiting for page to load for 10000ms\nWait timed out after 10017ms\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: waiting for page to load for 10000ms\n    at scheduleWait (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2188:20)\n    at ControlFlow.wait (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2517:12)\n    at Driver.wait (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:934:29)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:685:32\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run it(\"Login to Bank Account\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:7:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "006d00ab-00bf-0064-0049-00b400ef00bb.png",
        "timestamp": 1600783472368,
        "duration": 10198
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 5564,
        "browser": {
            "name": "firefox",
            "version": "68.7.0"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:18:44)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Validate Add Customer\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:17:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "00b70003-00de-0044-0019-003a00220018.png",
        "timestamp": 1600783482990,
        "duration": 68
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 5564,
        "browser": {
            "name": "firefox",
            "version": "68.7.0"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:33:44)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"open account\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:31:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f800f1-00c1-002b-00d8-00eb00ce000f.png",
        "timestamp": 1600783483216,
        "duration": 88
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 5564,
        "browser": {
            "name": "firefox",
            "version": "68.7.0"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:48:41)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"validate customers\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:46:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\rough\\BankManagerLogin.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "004e00ec-0028-00ac-00fb-00e4004200e9.png",
        "timestamp": 1600783483484,
        "duration": 62
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 15264,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007d00a5-000c-0011-0024-00b800a60091.png",
        "timestamp": 1600783525507,
        "duration": 6297
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 15264,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00290063-00b2-0099-0097-00a3007c00bd.png",
        "timestamp": 1600783532619,
        "duration": 3645
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 15264,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003b00ad-0018-0006-001b-005800370008.png",
        "timestamp": 1600783536842,
        "duration": 2789
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 15264,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "003600d5-00b8-0027-0091-00f10062001c.png",
        "timestamp": 1600783540240,
        "duration": 2989
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 6312,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009c00e3-00c9-006f-009f-00ef0025000b.png",
        "timestamp": 1600866666615,
        "duration": 5210
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 6312,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008d000c-0075-00b7-008b-0070006c0074.png",
        "timestamp": 1600866672789,
        "duration": 2967
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 6312,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00be0049-0008-0073-00ae-0092000100dc.png",
        "timestamp": 1600866676400,
        "duration": 2664
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 6312,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ac007d-0095-00a4-00ca-001c000e00be.png",
        "timestamp": 1600866679644,
        "duration": 2984
    },
    {
        "description": "table functionality|table",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 14824,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=85.0.4183.102)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=85.0.4183.102)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.findElements(By(css selector, table/tbody))\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run it(\"table functionality\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\smoke\\table.js:10:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\smoke\\table.js:1:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e000d5-0091-0051-0098-009e00f700ee.png",
        "timestamp": 1600869177619,
        "duration": 415
    },
    {
        "description": "table functionality|table",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 24340,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=85.0.4183.102)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=85.0.4183.102)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.findElements(By(css selector, table/tbody))\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run it(\"table functionality\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\smoke\\table.js:10:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\smoke\\table.js:1:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "00260028-0027-00b9-009e-009500090003.png",
        "timestamp": 1600869271755,
        "duration": 336
    },
    {
        "description": "table functionality|table",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 10172,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": [
            "Failed: rows.count is not a function"
        ],
        "trace": [
            "TypeError: rows.count is not a function\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\smoke\\table.js:14:22)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run it(\"table functionality\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\smoke\\table.js:10:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\smoke\\table.js:1:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "004000d1-0038-0096-00f3-005c00b10016.png",
        "timestamp": 1600869373730,
        "duration": 418
    },
    {
        "description": "table functionality|table",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12448,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003800ef-000c-00dd-0054-00530030008d.png",
        "timestamp": 1600869464685,
        "duration": 309
    },
    {
        "description": "table functionality|table",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 19512,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "004500d3-00c4-0005-0073-000100a90065.png",
        "timestamp": 1600870110088,
        "duration": 3578
    },
    {
        "description": "table functionality|table",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 27828,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000e00db-0070-008f-001c-000000f30092.png",
        "timestamp": 1600940611807,
        "duration": 3861
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 29184,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ef00fc-00a5-00c9-00cd-004f008200ea.png",
        "timestamp": 1600940708365,
        "duration": 4845
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 29184,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00bd0051-00eb-0010-00cc-003f00ae00aa.png",
        "timestamp": 1600940713934,
        "duration": 3082
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 29184,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a40054-0082-0057-00e2-005d00860041.png",
        "timestamp": 1600940717570,
        "duration": 2778
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 29184,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "009200b4-00a0-0031-0098-00dc00550054.png",
        "timestamp": 1600940720910,
        "duration": 2768
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 26812,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006400c8-00fe-0019-000c-00c80013009f.png",
        "timestamp": 1600940806382,
        "duration": 3011
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 26812,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "005f00ff-00a0-0045-0033-008a001200a0.png",
        "timestamp": 1600940810083,
        "duration": 3088
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 26812,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f000ba-00e2-00df-0025-00bd0092008b.png",
        "timestamp": 1600940813733,
        "duration": 2750
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 26812,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00730037-0094-003e-006a-00ac00e00011.png",
        "timestamp": 1600940817057,
        "duration": 2728
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 23408,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00830005-000c-0030-00bd-0045002f00f1.png",
        "timestamp": 1600941023422,
        "duration": 3740
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 23408,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006a002e-00d8-0063-009f-000a00a70065.png",
        "timestamp": 1600941027827,
        "duration": 2926
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 23408,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006f0081-00c8-003f-0026-002c00f200ff.png",
        "timestamp": 1600941031300,
        "duration": 2650
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 23408,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "003500c5-0063-00ac-00be-00c100d30059.png",
        "timestamp": 1600941034502,
        "duration": 2933
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 9796,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00760016-0077-00b7-0015-009000310091.png",
        "timestamp": 1600941161627,
        "duration": 3692
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 9796,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007e006d-008e-00c2-0031-00a3001d003f.png",
        "timestamp": 1600941166077,
        "duration": 4457
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 9796,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b700c4-0001-00d4-00bd-0057009000e0.png",
        "timestamp": 1600941171076,
        "duration": 2772
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 9796,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "005d00ca-00a3-00bd-00e6-00eb00ba00d3.png",
        "timestamp": 1600941174411,
        "duration": 2854
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 28316,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "005a001c-0070-0081-0074-00bc00cb00c5.png",
        "timestamp": 1600941670629,
        "duration": 3895
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 28316,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000900a3-0039-0096-00f9-0075003f0022.png",
        "timestamp": 1600941675271,
        "duration": 3541
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 28316,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ca0022-009a-00f6-000d-00a100630075.png",
        "timestamp": 1600941679512,
        "duration": 2930
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 28316,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00d8001a-00b9-0001-00e4-00ec004a00b7.png",
        "timestamp": 1600941683057,
        "duration": 2848
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 27636,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d8009e-007d-004e-0047-00d9005d0006.png",
        "timestamp": 1600942933646,
        "duration": 4344
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 27636,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0033001f-00e4-0029-00b3-009500660016.png",
        "timestamp": 1600942938690,
        "duration": 4076
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 27636,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007f00f5-0091-000d-00a1-00010022004b.png",
        "timestamp": 1600942943357,
        "duration": 2858
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 27636,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00fe0029-00f0-0067-00b2-0008003500ee.png",
        "timestamp": 1600942946759,
        "duration": 2843
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 28228,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ef00db-00b2-001f-002d-00e900000029.png",
        "timestamp": 1600943002531,
        "duration": 4245
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 28228,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00520079-001e-0060-0008-003100a90036.png",
        "timestamp": 1600943008732,
        "duration": 2968
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 28228,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0076001c-0099-005a-006d-008900600004.png",
        "timestamp": 1600943012275,
        "duration": 2730
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 28228,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006100cc-00bd-004e-0025-001d008f00a0.png",
        "timestamp": 1600943015576,
        "duration": 2682
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 26056,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0004001f-003b-009e-0041-004100f400d9.png",
        "timestamp": 1600943149781,
        "duration": 2809
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 26056,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0099001d-00c0-000d-0090-004800230020.png",
        "timestamp": 1600943153254,
        "duration": 2859
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 26056,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "002800c2-0094-004a-0081-00cf00610075.png",
        "timestamp": 1600943156664,
        "duration": 2616
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 26056,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ac00a7-0054-00a1-00d5-00ad00e40028.png",
        "timestamp": 1600943159831,
        "duration": 8786
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 14612,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009f00c3-001c-00a8-00bc-00d900d1002d.png",
        "timestamp": 1600943611427,
        "duration": 3826
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 14612,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ec009a-008a-009c-0033-007600050091.png",
        "timestamp": 1600943615947,
        "duration": 3868
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 14612,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003b00b3-002f-0038-00b1-0096008000c0.png",
        "timestamp": 1600943620441,
        "duration": 2725
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 14612,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.102"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00eb0027-0011-00a4-00ce-0025009c0085.png",
        "timestamp": 1600943623824,
        "duration": 8720
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 9008,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00430078-0016-0002-004f-0075006600dd.png",
        "timestamp": 1600947279609,
        "duration": 4654
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 9008,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0012004d-0035-00a6-0056-00cf00870050.png",
        "timestamp": 1600947285105,
        "duration": 3030
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 9008,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00250021-00b9-005e-00f9-00fd008b0066.png",
        "timestamp": 1600947288740,
        "duration": 2669
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 9008,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "000a00f0-00a0-008f-0023-005e002000a0.png",
        "timestamp": 1600947291955,
        "duration": 8851
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 7100,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00400027-006a-0024-00ff-008a00de00ad.png",
        "timestamp": 1600947381092,
        "duration": 3303
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 7100,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a600ae-0068-008d-005c-002200ba0088.png",
        "timestamp": 1600947385224,
        "duration": 3609
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 7100,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "002c004d-009b-000b-0065-00760072009c.png",
        "timestamp": 1600947389451,
        "duration": 2687
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 7100,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00870071-0057-00be-0032-00c500ae00d3.png",
        "timestamp": 1600947392756,
        "duration": 8764
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00600021-0019-0048-0096-001400b100b0.png",
        "timestamp": 1600947554964,
        "duration": 3260
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "002600c2-0067-00c8-006c-002f00240092.png",
        "timestamp": 1600947558899,
        "duration": 2945
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a200b2-00f6-00be-0057-008f00010009.png",
        "timestamp": 1600947562410,
        "duration": 2671
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0085008a-00a1-004c-00f9-005d003e00e5.png",
        "timestamp": 1600947565641,
        "duration": 8674
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17756,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003f00f8-00fe-00cb-002f-0026007600f5.png",
        "timestamp": 1600947613279,
        "duration": 3357
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17756,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ae0073-0030-0014-00f2-002300ea00a7.png",
        "timestamp": 1600947617296,
        "duration": 3043
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17756,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0093003f-00cc-00a2-0019-007d002c006a.png",
        "timestamp": 1600947620884,
        "duration": 2654
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17756,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0029002b-0057-0067-00a2-00f900460034.png",
        "timestamp": 1600947624082,
        "duration": 8687
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 4784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "005d002e-0024-0018-006d-00fd00680071.png",
        "timestamp": 1600969135379,
        "duration": 5505
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 4784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a6007c-006b-00b9-0085-00d900de00fc.png",
        "timestamp": 1600969141617,
        "duration": 3177
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 4784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00aa00f7-0051-00e5-0003-0068002100a0.png",
        "timestamp": 1600969145382,
        "duration": 2950
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 4784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001500bc-0073-00d9-00df-004f0088005c.png",
        "timestamp": 1600969148882,
        "duration": 8881
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17156,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b70069-00a7-009b-0089-00c0003200b3.png",
        "timestamp": 1601013845487,
        "duration": 8293
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17156,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 94:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1601013856948,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=566298648.1601013857&jid=598770414&gjid=1679251328&_gid=797802535.1601013857&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1898996332' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601013857695,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=566298648.1601013857&jid=598770414&gjid=1679251328&_gid=797802535.1601013857&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1898996332 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601013857695,
                "type": ""
            }
        ],
        "screenShotFile": "00ba0041-00ec-0095-0028-0039000f005e.png",
        "timestamp": 1601013854592,
        "duration": 4029
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 21468,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div[4]/input[1]))\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\checkbox.js:33:48)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"checkobx\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\checkbox.js:2:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\checkbox.js:1:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.takeScreenshot (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1085:17)\n    at run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:59:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:67:16)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\conf.js:108:13)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1601013996966,
        "duration": 3832
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 21468,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.navigate().to(https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get)\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Navigation.to (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1133:25)\n    at Driver.get (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:988:28)\n    at ProtractorBrowser.get (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:655:32)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:11:21)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Frame Handling\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:7:9)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.takeScreenshot (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1085:17)\n    at run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:59:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:67:16)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\conf.js:108:13)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1601014001152,
        "duration": 18
    },
    {
        "description": "Handling windows|Hnadling Tab",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 21468,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.navigate().to(http://demo.automationtesting.in/Windows.html)\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Navigation.to (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1133:25)\n    at Driver.get (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:988:28)\n    at ProtractorBrowser.get (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:655:32)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\tab.js:5:15)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\tab.js:3:5)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\tab.js:1:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.findElements(By(xpath, //*[@id='Tabbed']/a/button))\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\tab.js:11:51)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Handling windows\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at Function.next.fail (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4274:9)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\tab.js:8:2)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\tab.js:1:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.takeScreenshot (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1085:17)\n    at run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:59:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:67:16)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\conf.js:108:13)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1601014001210,
        "duration": 25
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12308,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "004900b2-0048-001c-00a5-00b8003200e7.png",
        "timestamp": 1601014172659,
        "duration": 6660
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12308,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 94:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1601014181953,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=72725807.1601014182&jid=1309148694&gjid=2117314443&_gid=399197493.1601014182&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=338263880' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601014182348,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=72725807.1601014182&jid=1309148694&gjid=2117314443&_gid=399197493.1601014182&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=338263880 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601014182348,
                "type": ""
            }
        ],
        "screenShotFile": "00c80067-001c-0046-00bd-003000ba00be.png",
        "timestamp": 1601014180053,
        "duration": 3504
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 1232,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00140072-0090-00b1-00d7-0091004100d1.png",
        "timestamp": 1601014271654,
        "duration": 4355
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 1232,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00350058-0036-0079-003e-006400f700bd.png",
        "timestamp": 1601014276638,
        "duration": 2788
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 1232,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ac0096-00be-005d-0091-007500940092.png",
        "timestamp": 1601014279976,
        "duration": 2601
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 1232,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00af0005-00d3-0052-002f-00d500530021.png",
        "timestamp": 1601014283145,
        "duration": 8676
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 16784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006c0003-0013-008f-0047-0054009100d9.png",
        "timestamp": 1601014340181,
        "duration": 2264
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 16784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "005500a6-003c-0081-00cd-005d0008009b.png",
        "timestamp": 1601014343054,
        "duration": 2901
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 16784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000800de-00fd-0042-00f5-00d000fc00ef.png",
        "timestamp": 1601014346528,
        "duration": 2725
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 16784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ca004c-0093-0078-0006-00a400970002.png",
        "timestamp": 1601014349798,
        "duration": 8664
    },
    {
        "description": "Login to Customer Account|Automating Customer Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 16784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003400cf-00c3-00d6-0062-0059004c005b.png",
        "timestamp": 1601014358997,
        "duration": 1627
    },
    {
        "description": "Deposit to Customer Account|Automating Customer Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 16784,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "003c004b-0075-00cd-001d-009800c600af.png",
        "timestamp": 1601014361147,
        "duration": 695
    },
    {
        "description": "Login to Bank Account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 20600,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00080049-0019-0071-0062-005e00ee008a.png",
        "timestamp": 1601014538052,
        "duration": 3053
    },
    {
        "description": "Validate Add Customer|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 20600,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f80030-0010-00ec-0066-0018004d00ae.png",
        "timestamp": 1601014541805,
        "duration": 2880
    },
    {
        "description": "open account|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 20600,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a9000c-002b-00b7-004a-00f1005500b1.png",
        "timestamp": 1601014545239,
        "duration": 2611
    },
    {
        "description": "validate customers|Automating Bank Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 20600,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00280099-002d-0015-00d5-006600c7008b.png",
        "timestamp": 1601014548408,
        "duration": 8605
    },
    {
        "description": "Login to Customer Account|Automating Customer Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 4500,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00df0042-00af-00a1-00d4-002100580012.png",
        "timestamp": 1601014566794,
        "duration": 2781
    },
    {
        "description": "Deposit to Customer Account|Automating Customer Login Functionality",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 4500,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00550044-003c-00c4-0003-00c100c90010.png",
        "timestamp": 1601014570200,
        "duration": 917
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 1212,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.findElements(By(xpath, //div[4]/input[1]))\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\checkbox.js:33:48)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"checkobx\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\checkbox.js:2:1)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\checkbox.js:1:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.takeScreenshot (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1085:17)\n    at run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:59:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:67:16)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\conf.js:108:13)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1601015451663,
        "duration": 3465
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 1212,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.navigate().to(https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get)\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Navigation.to (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1133:25)\n    at Driver.get (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:988:28)\n    at ProtractorBrowser.get (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:655:32)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:11:21)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Frame Handling\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:7:9)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.takeScreenshot (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1085:17)\n    at run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:59:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:67:16)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\conf.js:108:13)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1601015455577,
        "duration": 29
    },
    {
        "description": "Handling windows|Hnadling Tab",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 1212,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)",
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.navigate().to(http://demo.automationtesting.in/Windows.html)\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Navigation.to (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1133:25)\n    at Driver.get (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:988:28)\n    at ProtractorBrowser.get (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:655:32)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\tab.js:5:15)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\tab.js:3:5)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\tab.js:1:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.findElements(By(xpath, //*[@id='Tabbed']/a/button))\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\tab.js:11:51)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Handling windows\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at Function.next.fail (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4274:9)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\tab.js:8:2)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\tab.js:1:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)",
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=85.0.4183.121)\n  (Driver info: chromedriver=85.0.4183.38 (9047dbc2c693f044042bbec5c91401c708c7c26a-refs/branch-heads/4183@{#779}),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.takeScreenshot()\n    at Driver.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.takeScreenshot (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1085:17)\n    at run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:59:33)\n    at ProtractorBrowser.to.<computed> [as takeScreenshot] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:67:16)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\conf.js:108:13)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9"
        ],
        "browserLogs": [],
        "timestamp": 1601015455649,
        "duration": 36
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 21828,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 94:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1601016106717,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.rMJI4WR09CY.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQE/rs=AGLTcCPRb_B1g8z3qIwl7l27GWLe47nxIA/cb=gapi.loaded_0 867 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1601016107188,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.rMJI4WR09CY.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQE/rs=AGLTcCPRb_B1g8z3qIwl7l27GWLe47nxIA/cb=gapi.loaded_0 867 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1601016107189,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.rMJI4WR09CY.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQE/rs=AGLTcCPRb_B1g8z3qIwl7l27GWLe47nxIA/cb=gapi.loaded_0 867 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1601016107189,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=876998364.1601016107&jid=1345850518&gjid=485294249&_gid=1037831960.1601016107&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1157698835' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601016107648,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=876998364.1601016107&jid=1345850518&gjid=485294249&_gid=1037831960.1601016107&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1157698835 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601016107648,
                "type": ""
            }
        ],
        "screenShotFile": "007f0051-00cc-0024-0060-008600cd00c2.png",
        "timestamp": 1601016104408,
        "duration": 4371
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 21668,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00560038-00fa-007b-0006-002f00e90094.png",
        "timestamp": 1601016118359,
        "duration": 5776
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 21144,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 94:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1601016416128,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=473067404.1601016417&jid=105291124&gjid=331722489&_gid=483860290.1601016417&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1761792504' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601016417083,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=473067404.1601016417&jid=105291124&gjid=331722489&_gid=483860290.1601016417&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1761792504 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601016417083,
                "type": ""
            }
        ],
        "screenShotFile": "00d800ce-00c0-004a-0034-002f00c40028.png",
        "timestamp": 1601016414196,
        "duration": 3843
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 22040,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00280093-0046-0087-0093-0055001c0032.png",
        "timestamp": 1601016427645,
        "duration": 7102
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 14688,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 94:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1601016579505,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=1051762839.1601016580&jid=497479618&gjid=545046364&_gid=2000964445.1601016580&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=756703521' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601016580045,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=1051762839.1601016580&jid=497479618&gjid=545046364&_gid=2000964445.1601016580&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=756703521 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601016580045,
                "type": ""
            }
        ],
        "screenShotFile": "00d6002c-001b-00d9-007a-0072008d00bb.png",
        "timestamp": 1601016577226,
        "duration": 3771
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 21792,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a200cd-001a-000b-0000-008100850052.png",
        "timestamp": 1601016577186,
        "duration": 5316
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 1732,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 94:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1601021920819,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=130503848.1601021921&jid=1605468452&gjid=836826612&_gid=1437081998.1601021921&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=56733658' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601021921521,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=130503848.1601021921&jid=1605468452&gjid=836826612&_gid=1437081998.1601021921&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=56733658 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601021921522,
                "type": ""
            }
        ],
        "screenShotFile": "003800c2-00e6-0002-0031-001b0049000c.png",
        "timestamp": 1601021917728,
        "duration": 5162
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 6764,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00470001-0039-000f-008b-006a00950077.png",
        "timestamp": 1601021917729,
        "duration": 7492
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 20476,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 94:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1601022155349,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=1386486391.1601022156&jid=880926979&gjid=1940293921&_gid=693212477.1601022156&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1174672386' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601022156344,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=1386486391.1601022156&jid=880926979&gjid=1940293921&_gid=693212477.1601022156&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1174672386 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601022156378,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/pub/w3schools.com/20200508/snhb-w3schools.com.min.js?202009221145 81:488 \"[snhb](1.393s):\" \"Automatic auction starting disabled. Use snhb.snhb.getAllAvailableAdUnitNames() and snhb.startAuction([adUnitNames]) to manually start auctions.\"",
                "timestamp": 1601022157801,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/prebid/latest/prebid.js 2:145359 \"fun-hooks: referenced 'registerAdserver' but it was never created\"",
                "timestamp": 1601022157870,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://ib.adnxs.com/ut/v3/prebid' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601022158285,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://ib.adnxs.com/ut/v3/prebid - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601022158285,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://htlb.casalemedia.com/cygnus?s=277113&v=7.2&r=%7B%22id%22%3A%22137b275e2d70bc6%22%2C%22imp%22%3A%5B%7B%22id%22%3A%22148ace0dd9f866f%22%2C%22ext%22%3A%7B%22siteID%22%3A%22277113%22%2C%22sid%22%3A%221%22%7D%2C%22banner%22%3A%7B%22w%22%3A728%2C%22h%22%3A90%2C%22topframe%22%3A1%7D%7D%5D%2C%22site%22%3A%7B%22page%22%3A%22https%3A%2F%2Fwww.w3schools.com%2Fjsref%2Ftryit.asp%3Ffilename%3Dtryjsref_submit_get%22%7D%2C%22ext%22%3A%7B%22source%22%3A%22prebid%22%7D%2C%22source%22%3A%7B%22ext%22%3A%7B%22schain%22%3A%7B%22ver%22%3A%221.0%22%2C%22complete%22%3A1%2C%22nodes%22%3A%5B%7B%22asi%22%3A%22snigelweb.com%22%2C%22sid%22%3A%227088%22%2C%22domain%22%3A%22w3schools.com%22%2C%22hp%22%3A1%7D%5D%7D%7D%7D%2C%22regs%22%3A%7B%22ext%22%3A%7B%22gdpr%22%3A0%2C%22us_privacy%22%3A%221---%22%7D%7D%2C%22user%22%3A%7B%22ext%22%3A%7B%22consent%22%3A%22%22%7D%7D%7D&ac=j&sd=1' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601022158727,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://htlb.casalemedia.com/cygnus?s=277113&v=7.2&r=%7B%22id%22%3A%22137b275e2d70bc6%22%2C%22imp%22%3A%5B%7B%22id%22%3A%22148ace0dd9f866f%22%2C%22ext%22%3A%7B%22siteID%22%3A%22277113%22%2C%22sid%22%3A%221%22%7D%2C%22banner%22%3A%7B%22w%22%3A728%2C%22h%22%3A90%2C%22topframe%22%3A1%7D%7D%5D%2C%22site%22%3A%7B%22page%22%3A%22https%3A%2F%2Fwww.w3schools.com%2Fjsref%2Ftryit.asp%3Ffilename%3Dtryjsref_submit_get%22%7D%2C%22ext%22%3A%7B%22source%22%3A%22prebid%22%7D%2C%22source%22%3A%7B%22ext%22%3A%7B%22schain%22%3A%7B%22ver%22%3A%221.0%22%2C%22complete%22%3A1%2C%22nodes%22%3A%5B%7B%22asi%22%3A%22snigelweb.com%22%2C%22sid%22%3A%227088%22%2C%22domain%22%3A%22w3schools.com%22%2C%22hp%22%3A1%7D%5D%7D%7D%7D%2C%22regs%22%3A%7B%22ext%22%3A%7B%22gdpr%22%3A0%2C%22us_privacy%22%3A%221---%22%7D%7D%2C%22user%22%3A%7B%22ext%22%3A%7B%22consent%22%3A%22%22%7D%7D%7D&ac=j&sd=1 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601022158727,
                "type": ""
            }
        ],
        "screenShotFile": "001700b7-0019-001c-0053-006a00ab009c.png",
        "timestamp": 1601022153367,
        "duration": 4998
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12160,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00710042-00a3-00e0-00fb-0088004a002a.png",
        "timestamp": 1601022153368,
        "duration": 8111
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "7bd45d1f9411631ded47be1eb434d5f1",
        "instanceId": 10532,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": [
            "Failed: invalid argument: 'id' can not be string\n  (Session info: chrome=85.0.4183.121)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'INGGNED890P882', ip: '10.3.55.132', os.name: 'Windows 10', os.arch: 'x86', os.version: '10.0', java.version: '1.8.0_241'\nDriver info: driver.version: unknown"
        ],
        "trace": [
            "WebDriverError: invalid argument: 'id' can not be string\n  (Session info: chrome=85.0.4183.121)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'INGGNED890P882', ip: '10.3.55.132', os.name: 'Windows 10', os.arch: 'x86', os.version: '10.0', java.version: '1.8.0_241'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.switchTo().frame(iframeResult)\n    at thenableWebDriverProxy.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.frame (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1824:25)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:26:31)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\nFrom: Task: Run it(\"Frame Handling\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:7:9)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 94:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1601024096941,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=522675522.1601024097&jid=990807499&gjid=884309686&_gid=935416786.1601024097&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=578161243' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024097867,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=522675522.1601024097&jid=990807499&gjid=884309686&_gid=935416786.1601024097&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=578161243 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024097867,
                "type": ""
            }
        ],
        "screenShotFile": "00b5000c-000e-00e5-00c2-006c00b400c1.png",
        "timestamp": 1601024094223,
        "duration": 4445
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "7bd45d1f9411631ded47be1eb434d5f1",
        "instanceId": 10532,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": [
            "WebDriverError: element not interactable: element has zero size\n  (Session info: chrome=85.0.4183.121)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'INGGNED890P882', ip: '10.3.55.132', os.name: 'Windows 10', os.arch: 'x86', os.version: '10.0', java.version: '1.8.0_241'\nDriver info: driver.version: unknown"
        ],
        "trace": [
            "WebDriverError: element not interactable: element has zero size\n  (Session info: chrome=85.0.4183.121)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'INGGNED890P882', ip: '10.3.55.132', os.name: 'Windows 10', os.arch: 'x86', os.version: '10.0', java.version: '1.8.0_241'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65\n    at ManagedPromise.invokeCallback_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\checkbox.js:33:48)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/prebid/latest/prebid.js 2:145359 \"fun-hooks: referenced 'registerAdserver' but it was never created\"",
                "timestamp": 1601024099738,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/pub/w3schools.com/20200508/snhb-w3schools.com.min.js?202009221145 81:488 \"[snhb](1.874s):\" \"Automatic auction starting disabled. Use snhb.snhb.getAllAvailableAdUnitNames() and snhb.startAuction([adUnitNames]) to manually start auctions.\"",
                "timestamp": 1601024099851,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://htlb.casalemedia.com/cygnus?s=277113&v=7.2&r=%7B%22id%22%3A%22159d45221b5a50a%22%2C%22imp%22%3A%5B%7B%22id%22%3A%221632fd05604a2bb%22%2C%22ext%22%3A%7B%22siteID%22%3A%22277113%22%2C%22sid%22%3A%221%22%7D%2C%22banner%22%3A%7B%22w%22%3A728%2C%22h%22%3A90%2C%22topframe%22%3A1%7D%7D%5D%2C%22site%22%3A%7B%22page%22%3A%22https%3A%2F%2Fwww.w3schools.com%2Fjsref%2Ftryit.asp%3Ffilename%3Dtryjsref_submit_get%22%7D%2C%22ext%22%3A%7B%22source%22%3A%22prebid%22%7D%2C%22source%22%3A%7B%22ext%22%3A%7B%22schain%22%3A%7B%22ver%22%3A%221.0%22%2C%22complete%22%3A1%2C%22nodes%22%3A%5B%7B%22asi%22%3A%22snigelweb.com%22%2C%22sid%22%3A%227088%22%2C%22domain%22%3A%22w3schools.com%22%2C%22hp%22%3A1%7D%5D%7D%7D%7D%2C%22regs%22%3A%7B%22ext%22%3A%7B%22gdpr%22%3A0%2C%22us_privacy%22%3A%221---%22%7D%7D%2C%22user%22%3A%7B%22ext%22%3A%7B%22consent%22%3A%22%22%7D%7D%7D&ac=j&sd=1' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024100582,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://htlb.casalemedia.com/cygnus?s=277113&v=7.2&r=%7B%22id%22%3A%22159d45221b5a50a%22%2C%22imp%22%3A%5B%7B%22id%22%3A%221632fd05604a2bb%22%2C%22ext%22%3A%7B%22siteID%22%3A%22277113%22%2C%22sid%22%3A%221%22%7D%2C%22banner%22%3A%7B%22w%22%3A728%2C%22h%22%3A90%2C%22topframe%22%3A1%7D%7D%5D%2C%22site%22%3A%7B%22page%22%3A%22https%3A%2F%2Fwww.w3schools.com%2Fjsref%2Ftryit.asp%3Ffilename%3Dtryjsref_submit_get%22%7D%2C%22ext%22%3A%7B%22source%22%3A%22prebid%22%7D%2C%22source%22%3A%7B%22ext%22%3A%7B%22schain%22%3A%7B%22ver%22%3A%221.0%22%2C%22complete%22%3A1%2C%22nodes%22%3A%5B%7B%22asi%22%3A%22snigelweb.com%22%2C%22sid%22%3A%227088%22%2C%22domain%22%3A%22w3schools.com%22%2C%22hp%22%3A1%7D%5D%7D%7D%7D%2C%22regs%22%3A%7B%22ext%22%3A%7B%22gdpr%22%3A0%2C%22us_privacy%22%3A%221---%22%7D%7D%2C%22user%22%3A%7B%22ext%22%3A%7B%22consent%22%3A%22%22%7D%7D%7D&ac=j&sd=1 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024100583,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://ib.adnxs.com/ut/v3/prebid' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024100607,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://ib.adnxs.com/ut/v3/prebid - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024100608,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://ap.lijit.com/rtb/bid?src=prebid_prebid_3.27.1' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024100616,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://ap.lijit.com/rtb/bid?src=prebid_prebid_3.27.1 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024100616,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://prg.smartadserver.com/prebid/v1' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024100946,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://prg.smartadserver.com/prebid/v1 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024100946,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://ssc.33across.com/api/v1/hb' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024101083,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://ssc.33across.com/api/v1/hb - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024101083,
                "type": ""
            }
        ],
        "screenShotFile": "00ad001a-00da-0019-0029-003d00510027.png",
        "timestamp": 1601024099373,
        "duration": 6540
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17568,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 94:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1601024236306,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=204686893.1601024237&jid=1599613984&gjid=881996768&_gid=1821055122.1601024237&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1403355760' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024237382,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=204686893.1601024237&jid=1599613984&gjid=881996768&_gid=1821055122.1601024237&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\\\\\x7e&z=1403355760 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024237394,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/prebid/latest/prebid.js 2:145359 \"fun-hooks: referenced 'registerAdserver' but it was never created\"",
                "timestamp": 1601024238297,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/pub/w3schools.com/20200508/snhb-w3schools.com.min.js?202009221145 81:488 \"[snhb](1.754s):\" \"Automatic auction starting disabled. Use snhb.snhb.getAllAvailableAdUnitNames() and snhb.startAuction([adUnitNames]) to manually start auctions.\"",
                "timestamp": 1601024238776,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://ib.adnxs.com/ut/v3/prebid' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024238893,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://ib.adnxs.com/ut/v3/prebid - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024238893,
                "type": ""
            }
        ],
        "screenShotFile": "00390063-00e2-003b-00da-00ef003900cb.png",
        "timestamp": 1601024233813,
        "duration": 4778
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17568,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://ap.lijit.com/rtb/bid?src=prebid_prebid_3.27.1' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024239393,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://ap.lijit.com/rtb/bid?src=prebid_prebid_3.27.1 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024239393,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://htlb.casalemedia.com/cygnus?s=277113&v=7.2&r=%7B%22id%22%3A%225f428321352857%22%2C%22imp%22%3A%5B%7B%22id%22%3A%226d46e0ad8ba625%22%2C%22ext%22%3A%7B%22siteID%22%3A%22277113%22%2C%22sid%22%3A%221%22%7D%2C%22banner%22%3A%7B%22w%22%3A728%2C%22h%22%3A90%2C%22topframe%22%3A1%7D%7D%5D%2C%22site%22%3A%7B%22page%22%3A%22https%3A%2F%2Fwww.w3schools.com%2Fjsref%2Ftryit.asp%3Ffilename%3Dtryjsref_submit_get%22%7D%2C%22ext%22%3A%7B%22source%22%3A%22prebid%22%7D%2C%22source%22%3A%7B%22ext%22%3A%7B%22schain%22%3A%7B%22ver%22%3A%221.0%22%2C%22complete%22%3A1%2C%22nodes%22%3A%5B%7B%22asi%22%3A%22snigelweb.com%22%2C%22sid%22%3A%227088%22%2C%22domain%22%3A%22w3schools.com%22%2C%22hp%22%3A1%7D%5D%7D%7D%7D%2C%22regs%22%3A%7B%22ext%22%3A%7B%22gdpr%22%3A0%2C%22us_privacy%22%3A%221---%22%7D%7D%2C%22user%22%3A%7B%22ext%22%3A%7B%22consent%22%3A%22%22%7D%7D%7D&ac=j&sd=1' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024239393,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://htlb.casalemedia.com/cygnus?s=277113&v=7.2&r=%7B%22id%22%3A%225f428321352857%22%2C%22imp%22%3A%5B%7B%22id%22%3A%226d46e0ad8ba625%22%2C%22ext%22%3A%7B%22siteID%22%3A%22277113%22%2C%22sid%22%3A%221%22%7D%2C%22banner%22%3A%7B%22w%22%3A728%2C%22h%22%3A90%2C%22topframe%22%3A1%7D%7D%5D%2C%22site%22%3A%7B%22page%22%3A%22https%3A%2F%2Fwww.w3schools.com%2Fjsref%2Ftryit.asp%3Ffilename%3Dtryjsref_submit_get%22%7D%2C%22ext%22%3A%7B%22source%22%3A%22prebid%22%7D%2C%22source%22%3A%7B%22ext%22%3A%7B%22schain%22%3A%7B%22ver%22%3A%221.0%22%2C%22complete%22%3A1%2C%22nodes%22%3A%5B%7B%22asi%22%3A%22snigelweb.com%22%2C%22sid%22%3A%227088%22%2C%22domain%22%3A%22w3schools.com%22%2C%22hp%22%3A1%7D%5D%7D%7D%7D%2C%22regs%22%3A%7B%22ext%22%3A%7B%22gdpr%22%3A0%2C%22us_privacy%22%3A%221---%22%7D%7D%2C%22user%22%3A%7B%22ext%22%3A%7B%22consent%22%3A%22%22%7D%7D%7D&ac=j&sd=1 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024239393,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://prg.smartadserver.com/prebid/v1' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024239957,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://prg.smartadserver.com/prebid/v1 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024239957,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://ssc.33across.com/api/v1/hb' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024240027,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://ssc.33across.com/api/v1/hb - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024240027,
                "type": ""
            }
        ],
        "screenShotFile": "00a100ad-00f3-0007-0057-00ec001e00e8.png",
        "timestamp": 1601024239382,
        "duration": 4751
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "1e6e2981d558635ef5dcf962e42fc6ce",
        "instanceId": 26348,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": [
            "Failed: invalid argument: 'id' can not be string\n  (Session info: chrome=85.0.4183.121)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'INGGNED890P882', ip: '10.3.55.132', os.name: 'Windows 10', os.arch: 'x86', os.version: '10.0', java.version: '1.8.0_241'\nDriver info: driver.version: unknown"
        ],
        "trace": [
            "WebDriverError: invalid argument: 'id' can not be string\n  (Session info: chrome=85.0.4183.121)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'INGGNED890P882', ip: '10.3.55.132', os.name: 'Windows 10', os.arch: 'x86', os.version: '10.0', java.version: '1.8.0_241'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.switchTo().frame(iframeResult)\n    at thenableWebDriverProxy.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.frame (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1824:25)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:26:31)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\nFrom: Task: Run it(\"Frame Handling\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:7:9)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 94:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1601024416463,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=1342436114.1601024417&jid=1803628446&gjid=394860944&_gid=1667389314.1601024417&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\x7e&z=1948353039' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024417118,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=1342436114.1601024417&jid=1803628446&gjid=394860944&_gid=1667389314.1601024417&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\\\\\x7e&z=1948353039 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024417121,
                "type": ""
            }
        ],
        "screenShotFile": "0087001c-0015-0059-0004-0053003e0088.png",
        "timestamp": 1601024414458,
        "duration": 3317
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "1e6e2981d558635ef5dcf962e42fc6ce",
        "instanceId": 26348,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/pub/w3schools.com/20200508/snhb-w3schools.com.min.js?202009221145 81:488 \"[snhb](1.616s):\" \"Automatic auction starting disabled. Use snhb.snhb.getAllAvailableAdUnitNames() and snhb.startAuction([adUnitNames]) to manually start auctions.\"",
                "timestamp": 1601024418841,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/prebid/latest/prebid.js 2:145359 \"fun-hooks: referenced 'registerAdserver' but it was never created\"",
                "timestamp": 1601024418971,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://htlb.casalemedia.com/cygnus?s=277113&v=7.2&r=%7B%22id%22%3A%221166858aa6d4bcf%22%2C%22imp%22%3A%5B%7B%22id%22%3A%2212699de6b8909ec%22%2C%22ext%22%3A%7B%22siteID%22%3A%22277113%22%2C%22sid%22%3A%221%22%7D%2C%22banner%22%3A%7B%22w%22%3A728%2C%22h%22%3A90%2C%22topframe%22%3A1%7D%7D%5D%2C%22site%22%3A%7B%22page%22%3A%22https%3A%2F%2Fwww.w3schools.com%2Fjsref%2Ftryit.asp%3Ffilename%3Dtryjsref_submit_get%22%7D%2C%22ext%22%3A%7B%22source%22%3A%22prebid%22%7D%2C%22source%22%3A%7B%22ext%22%3A%7B%22schain%22%3A%7B%22ver%22%3A%221.0%22%2C%22complete%22%3A1%2C%22nodes%22%3A%5B%7B%22asi%22%3A%22snigelweb.com%22%2C%22sid%22%3A%227088%22%2C%22domain%22%3A%22w3schools.com%22%2C%22hp%22%3A1%7D%5D%7D%7D%7D%2C%22regs%22%3A%7B%22ext%22%3A%7B%22gdpr%22%3A0%2C%22us_privacy%22%3A%221---%22%7D%7D%2C%22user%22%3A%7B%22ext%22%3A%7B%22consent%22%3A%22%22%7D%7D%7D&ac=j&sd=1' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024419393,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://htlb.casalemedia.com/cygnus?s=277113&v=7.2&r=%7B%22id%22%3A%221166858aa6d4bcf%22%2C%22imp%22%3A%5B%7B%22id%22%3A%2212699de6b8909ec%22%2C%22ext%22%3A%7B%22siteID%22%3A%22277113%22%2C%22sid%22%3A%221%22%7D%2C%22banner%22%3A%7B%22w%22%3A728%2C%22h%22%3A90%2C%22topframe%22%3A1%7D%7D%5D%2C%22site%22%3A%7B%22page%22%3A%22https%3A%2F%2Fwww.w3schools.com%2Fjsref%2Ftryit.asp%3Ffilename%3Dtryjsref_submit_get%22%7D%2C%22ext%22%3A%7B%22source%22%3A%22prebid%22%7D%2C%22source%22%3A%7B%22ext%22%3A%7B%22schain%22%3A%7B%22ver%22%3A%221.0%22%2C%22complete%22%3A1%2C%22nodes%22%3A%5B%7B%22asi%22%3A%22snigelweb.com%22%2C%22sid%22%3A%227088%22%2C%22domain%22%3A%22w3schools.com%22%2C%22hp%22%3A1%7D%5D%7D%7D%7D%2C%22regs%22%3A%7B%22ext%22%3A%7B%22gdpr%22%3A0%2C%22us_privacy%22%3A%221---%22%7D%7D%2C%22user%22%3A%7B%22ext%22%3A%7B%22consent%22%3A%22%22%7D%7D%7D&ac=j&sd=1 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024419393,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://ib.adnxs.com/ut/v3/prebid' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024419506,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://ib.adnxs.com/ut/v3/prebid - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024419506,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://ap.lijit.com/rtb/bid?src=prebid_prebid_3.27.1' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024419709,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://ap.lijit.com/rtb/bid?src=prebid_prebid_3.27.1 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024419709,
                "type": ""
            }
        ],
        "screenShotFile": "004300ca-0083-00bf-0049-001100a0006e.png",
        "timestamp": 1601024418503,
        "duration": 6307
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "2ec01f03efbd3cf2d8800de92ccc8f47",
        "instanceId": 24928,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": [
            "Failed: invalid argument: 'id' can not be string\n  (Session info: chrome=85.0.4183.121)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'INGGNED890P882', ip: '10.3.55.132', os.name: 'Windows 10', os.arch: 'x86', os.version: '10.0', java.version: '1.8.0_241'\nDriver info: driver.version: unknown"
        ],
        "trace": [
            "WebDriverError: invalid argument: 'id' can not be string\n  (Session info: chrome=85.0.4183.121)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'INGGNED890P882', ip: '10.3.55.132', os.name: 'Windows 10', os.arch: 'x86', os.version: '10.0', java.version: '1.8.0_241'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.switchTo().frame(iframeResult)\n    at thenableWebDriverProxy.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.frame (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1824:25)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:26:31)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\nFrom: Task: Run it(\"Frame Handling\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:7:9)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 94:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1601024615873,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=1309759499.1601024616&jid=1712944449&gjid=789537621&_gid=384613195.1601024616&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\x7e&z=1039553513' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024616871,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=1309759499.1601024616&jid=1712944449&gjid=789537621&_gid=384613195.1601024616&_u=KGBAgEADQAAAAE\\\\\\\\\\\\\\\\x7e&z=1039553513 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024616872,
                "type": ""
            }
        ],
        "screenShotFile": "007a000b-00fa-001c-0043-009100480051.png",
        "timestamp": 1601024613888,
        "duration": 3670
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "2ec01f03efbd3cf2d8800de92ccc8f47",
        "instanceId": 24928,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/prebid/latest/prebid.js 2:145359 \"fun-hooks: referenced 'registerAdserver' but it was never created\"",
                "timestamp": 1601024618038,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/pub/w3schools.com/20200508/snhb-w3schools.com.min.js?202009221145 81:488 \"[snhb](1.788s):\" \"Automatic auction starting disabled. Use snhb.snhb.getAllAvailableAdUnitNames() and snhb.startAuction([adUnitNames]) to manually start auctions.\"",
                "timestamp": 1601024618440,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://ib.adnxs.com/ut/v3/prebid' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024618535,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://ib.adnxs.com/ut/v3/prebid - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024618536,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://ap.lijit.com/rtb/bid?src=prebid_prebid_3.27.1' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024618861,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://ap.lijit.com/rtb/bid?src=prebid_prebid_3.27.1 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024618861,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://htlb.casalemedia.com/cygnus?s=277113&v=7.2&r=%7B%22id%22%3A%22232e98792111bab%22%2C%22imp%22%3A%5B%7B%22id%22%3A%222416dbca8d43e78%22%2C%22ext%22%3A%7B%22siteID%22%3A%22277113%22%2C%22sid%22%3A%221%22%7D%2C%22banner%22%3A%7B%22w%22%3A728%2C%22h%22%3A90%2C%22topframe%22%3A1%7D%7D%5D%2C%22site%22%3A%7B%22page%22%3A%22https%3A%2F%2Fwww.w3schools.com%2Fjsref%2Ftryit.asp%3Ffilename%3Dtryjsref_submit_get%22%7D%2C%22ext%22%3A%7B%22source%22%3A%22prebid%22%7D%2C%22source%22%3A%7B%22ext%22%3A%7B%22schain%22%3A%7B%22ver%22%3A%221.0%22%2C%22complete%22%3A1%2C%22nodes%22%3A%5B%7B%22asi%22%3A%22snigelweb.com%22%2C%22sid%22%3A%227088%22%2C%22domain%22%3A%22w3schools.com%22%2C%22hp%22%3A1%7D%5D%7D%7D%7D%2C%22regs%22%3A%7B%22ext%22%3A%7B%22gdpr%22%3A0%2C%22us_privacy%22%3A%221---%22%7D%7D%2C%22user%22%3A%7B%22ext%22%3A%7B%22consent%22%3A%22%22%7D%7D%7D&ac=j&sd=1' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024618875,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://htlb.casalemedia.com/cygnus?s=277113&v=7.2&r=%7B%22id%22%3A%22232e98792111bab%22%2C%22imp%22%3A%5B%7B%22id%22%3A%222416dbca8d43e78%22%2C%22ext%22%3A%7B%22siteID%22%3A%22277113%22%2C%22sid%22%3A%221%22%7D%2C%22banner%22%3A%7B%22w%22%3A728%2C%22h%22%3A90%2C%22topframe%22%3A1%7D%7D%5D%2C%22site%22%3A%7B%22page%22%3A%22https%3A%2F%2Fwww.w3schools.com%2Fjsref%2Ftryit.asp%3Ffilename%3Dtryjsref_submit_get%22%7D%2C%22ext%22%3A%7B%22source%22%3A%22prebid%22%7D%2C%22source%22%3A%7B%22ext%22%3A%7B%22schain%22%3A%7B%22ver%22%3A%221.0%22%2C%22complete%22%3A1%2C%22nodes%22%3A%5B%7B%22asi%22%3A%22snigelweb.com%22%2C%22sid%22%3A%227088%22%2C%22domain%22%3A%22w3schools.com%22%2C%22hp%22%3A1%7D%5D%7D%7D%7D%2C%22regs%22%3A%7B%22ext%22%3A%7B%22gdpr%22%3A0%2C%22us_privacy%22%3A%221---%22%7D%7D%2C%22user%22%3A%7B%22ext%22%3A%7B%22consent%22%3A%22%22%7D%7D%7D&ac=j&sd=1 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024618875,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://prg.smartadserver.com/prebid/v1' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024619221,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://prg.smartadserver.com/prebid/v1 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024619221,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://ssc.33across.com/api/v1/hb' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024619651,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://ssc.33across.com/api/v1/hb - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024619652,
                "type": ""
            }
        ],
        "screenShotFile": "00ff004e-003a-0024-006d-005d00da0020.png",
        "timestamp": 1601024618293,
        "duration": 5566
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "46c5a57463d2f9f704017f0f3e562755",
        "instanceId": 15860,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": [
            "Failed: invalid argument: 'id' can not be string\n  (Session info: chrome=85.0.4183.121)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'INGGNED890P882', ip: '10.3.55.132', os.name: 'Windows 10', os.arch: 'x86', os.version: '10.0', java.version: '1.8.0_241'\nDriver info: driver.version: unknown"
        ],
        "trace": [
            "WebDriverError: invalid argument: 'id' can not be string\n  (Session info: chrome=85.0.4183.121)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'INGGNED890P882', ip: '10.3.55.132', os.name: 'Windows 10', os.arch: 'x86', os.version: '10.0', java.version: '1.8.0_241'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebDriver.switchTo().frame(iframeResult)\n    at thenableWebDriverProxy.schedule (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.frame (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1824:25)\n    at UserContext.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:26:31)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\nFrom: Task: Run it(\"Frame Handling\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:7:9)\n    at addSpecsToSuite (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\sapan-gupta\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\PROTRACTOR\\testing\\sanity\\frame.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:1137:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1157:10)\n    at Module.load (internal/modules/cjs/loader.js:985:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:878:14)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get 94:4 Uncaught ReferenceError: fixDragBtn is not defined",
                "timestamp": 1601024748131,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get - Access to XMLHttpRequest at 'https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=1529401428.1601024748&jid=1113384976&gjid=955046311&_gid=1034422188.1601024748&_u=KGBAgEADQAAAAE\\\\\\\\\\\\x7e&z=339511773' from origin 'https://www.w3schools.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
                "timestamp": 1601024748492,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://stats.g.doubleclick.net/j/collect?t=dc&aip=1&_r=3&v=1&_v=j86&tid=UA-3855518-1&cid=1529401428.1601024748&jid=1113384976&gjid=955046311&_gid=1034422188.1601024748&_u=KGBAgEADQAAAAE\\\\\\\\\\\\x7e&z=339511773 - Failed to load resource: net::ERR_FAILED",
                "timestamp": 1601024748492,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.snigelweb.com/pub/w3schools.com/20200508/T4/snhb-w3schools.com.min.js?202009221145 38:488 \"[snhb](234ms):\" \"Automatic auction starting disabled. Use snhb.snhb.getAllAvailableAdUnitNames() and snhb.startAuction([adUnitNames]) to manually start auctions.\"",
                "timestamp": 1601024749027,
                "type": ""
            }
        ],
        "screenShotFile": "00030067-006a-0022-00cf-003a002800e9.png",
        "timestamp": 1601024746797,
        "duration": 2662
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "46c5a57463d2f9f704017f0f3e562755",
        "instanceId": 15860,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000500ea-00c2-00f8-001a-0056009d005e.png",
        "timestamp": 1601024750358,
        "duration": 5460
    },
    {
        "description": "Frame Handling|Iframe Handling",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "FEBD4C15-25EA-4BFB-B37E-9739F6172375",
        "instanceId": 15052,
        "browser": {
            "name": "MicrosoftEdge",
            "version": "41.16299.1480.0"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00640031-003b-00ec-0068-001000cc008e.png",
        "timestamp": 1601024732564,
        "duration": 25166
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "FEBD4C15-25EA-4BFB-B37E-9739F6172375",
        "instanceId": 15052,
        "browser": {
            "name": "MicrosoftEdge",
            "version": "41.16299.1480.0"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000e0088-0010-0018-0059-001900e70027.png",
        "timestamp": 1601024757962,
        "duration": 6588
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17004,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00cf008e-00e4-00f3-0034-002200660017.png",
        "timestamp": 1601064376684,
        "duration": 8870
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "CAAB5F9E-1558-4C4D-A8AF-198E5F8920F4",
        "instanceId": 11976,
        "browser": {
            "name": "MicrosoftEdge",
            "version": "41.16299.1480.0"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f100f2-00ad-002f-0028-00f0000200d8.png",
        "timestamp": 1601064942265,
        "duration": 10050
    },
    {
        "description": "checkobx|handling checkbox",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "14cddae0cf438aff5264f820e58b2b39",
        "instanceId": 26276,
        "browser": {
            "name": "chrome",
            "version": "85.0.4183.121"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00cc00cb-00ee-0040-002c-00e9000c007d.png",
        "timestamp": 1601064964397,
        "duration": 7215
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});

    };

    this.setTitle = function () {
        var title = $('.report-title').text();
        titleService.setTitle(title);
    };

    // is run after all test data has been prepared/loaded
    this.afterLoadingJobs = function () {
        this.sortSpecs();
        this.setTitle();
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    } else {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.afterLoadingJobs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.afterLoadingJobs();
    }

}]);

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

//formats millseconds to h m s
app.filter('timeFormat', function () {
    return function (tr, fmt) {
        if(tr == null){
            return "NaN";
        }

        switch (fmt) {
            case 'h':
                var h = tr / 1000 / 60 / 60;
                return "".concat(h.toFixed(2)).concat("h");
            case 'm':
                var m = tr / 1000 / 60;
                return "".concat(m.toFixed(2)).concat("min");
            case 's' :
                var s = tr / 1000;
                return "".concat(s.toFixed(2)).concat("s");
            case 'hm':
            case 'h:m':
                var hmMt = tr / 1000 / 60;
                var hmHr = Math.trunc(hmMt / 60);
                var hmMr = hmMt - (hmHr * 60);
                if (fmt === 'h:m') {
                    return "".concat(hmHr).concat(":").concat(hmMr < 10 ? "0" : "").concat(Math.round(hmMr));
                }
                return "".concat(hmHr).concat("h ").concat(hmMr.toFixed(2)).concat("min");
            case 'hms':
            case 'h:m:s':
                var hmsS = tr / 1000;
                var hmsHr = Math.trunc(hmsS / 60 / 60);
                var hmsM = hmsS / 60;
                var hmsMr = Math.trunc(hmsM - hmsHr * 60);
                var hmsSo = hmsS - (hmsHr * 60 * 60) - (hmsMr*60);
                if (fmt === 'h:m:s') {
                    return "".concat(hmsHr).concat(":").concat(hmsMr < 10 ? "0" : "").concat(hmsMr).concat(":").concat(hmsSo < 10 ? "0" : "").concat(Math.round(hmsSo));
                }
                return "".concat(hmsHr).concat("h ").concat(hmsMr).concat("min ").concat(hmsSo.toFixed(2)).concat("s");
            case 'ms':
                var msS = tr / 1000;
                var msMr = Math.trunc(msS / 60);
                var msMs = msS - (msMr * 60);
                return "".concat(msMr).concat("min ").concat(msMs.toFixed(2)).concat("s");
        }

        return tr;
    };
});


function PbrStackModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;
    ctrl.convertTimestamp = convertTimestamp;
    ctrl.isValueAnArray = isValueAnArray;
    ctrl.toggleSmartStackTraceHighlight = function () {
        var inv = !ctrl.rootScope.showSmartStackTraceHighlight;
        ctrl.rootScope.showSmartStackTraceHighlight = inv;
    };
    ctrl.applySmartHighlight = function (line) {
        if ($rootScope.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return '';
    };
}


app.component('pbrStackModal', {
    templateUrl: "pbr-stack-modal.html",
    bindings: {
        index: '=',
        data: '='
    },
    controller: PbrStackModalController
});

function PbrScreenshotModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;

    /**
     * Updates which modal is selected.
     */
    this.updateSelectedModal = function (event, index) {
        var key = event.key; //try to use non-deprecated key first https://developer.mozilla.org/de/docs/Web/API/KeyboardEvent/keyCode
        if (key == null) {
            var keyMap = {
                37: 'ArrowLeft',
                39: 'ArrowRight'
            };
            key = keyMap[event.keyCode]; //fallback to keycode
        }
        if (key === "ArrowLeft" && this.hasPrevious) {
            this.showHideModal(index, this.previous);
        } else if (key === "ArrowRight" && this.hasNext) {
            this.showHideModal(index, this.next);
        }
    };

    /**
     * Hides the modal with the #oldIndex and shows the modal with the #newIndex.
     */
    this.showHideModal = function (oldIndex, newIndex) {
        const modalName = '#imageModal';
        $(modalName + oldIndex).modal("hide");
        $(modalName + newIndex).modal("show");
    };

}

app.component('pbrScreenshotModal', {
    templateUrl: "pbr-screenshot-modal.html",
    bindings: {
        index: '=',
        data: '=',
        next: '=',
        previous: '=',
        hasNext: '=',
        hasPrevious: '='
    },
    controller: PbrScreenshotModalController
});

app.factory('TitleService', ['$document', function ($document) {
    return {
        setTitle: function (title) {
            $document[0].title = title;
        }
    };
}]);


app.run(
    function ($rootScope, $templateCache) {
        //make sure this option is on by default
        $rootScope.showSmartStackTraceHighlight = true;
        
  $templateCache.put('pbr-screenshot-modal.html',
    '<div class="modal" id="imageModal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="imageModalLabel{{$ctrl.index}}" ng-keydown="$ctrl.updateSelectedModal($event,$ctrl.index)">\n' +
    '    <div class="modal-dialog modal-lg m-screenhot-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="imageModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="imageModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <img class="screenshotImage" ng-src="{{$ctrl.data.screenShotFile}}">\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <div class="pull-left">\n' +
    '                    <button ng-disabled="!$ctrl.hasPrevious" class="btn btn-default btn-previous" data-dismiss="modal"\n' +
    '                            data-toggle="modal" data-target="#imageModal{{$ctrl.previous}}">\n' +
    '                        Prev\n' +
    '                    </button>\n' +
    '                    <button ng-disabled="!$ctrl.hasNext" class="btn btn-default btn-next"\n' +
    '                            data-dismiss="modal" data-toggle="modal"\n' +
    '                            data-target="#imageModal{{$ctrl.next}}">\n' +
    '                        Next\n' +
    '                    </button>\n' +
    '                </div>\n' +
    '                <a class="btn btn-primary" href="{{$ctrl.data.screenShotFile}}" target="_blank">\n' +
    '                    Open Image in New Tab\n' +
    '                    <span class="glyphicon glyphicon-new-window" aria-hidden="true"></span>\n' +
    '                </a>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

  $templateCache.put('pbr-stack-modal.html',
    '<div class="modal" id="modal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="stackModalLabel{{$ctrl.index}}">\n' +
    '    <div class="modal-dialog modal-lg m-stack-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="stackModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="stackModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <div ng-if="$ctrl.data.trace.length > 0">\n' +
    '                    <div ng-if="$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer" ng-repeat="trace in $ctrl.data.trace track by $index"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                    <div ng-if="!$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in $ctrl.data.trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                </div>\n' +
    '                <div ng-if="$ctrl.data.browserLogs.length > 0">\n' +
    '                    <h5 class="modal-title">\n' +
    '                        Browser logs:\n' +
    '                    </h5>\n' +
    '                    <pre class="logContainer"><div class="browserLogItem"\n' +
    '                                                   ng-repeat="logError in $ctrl.data.browserLogs track by $index"><div><span class="label browserLogLabel label-default"\n' +
    '                                                                                                                             ng-class="{\'label-danger\': logError.level===\'SEVERE\', \'label-warning\': logError.level===\'WARNING\'}">{{logError.level}}</span><span class="label label-default">{{$ctrl.convertTimestamp(logError.timestamp)}}</span><div ng-repeat="messageLine in logError.message.split(\'\\\\n\') track by $index">{{ messageLine }}</div></div></div></pre>\n' +
    '                </div>\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <button class="btn btn-default"\n' +
    '                        ng-class="{active: $ctrl.rootScope.showSmartStackTraceHighlight}"\n' +
    '                        ng-click="$ctrl.toggleSmartStackTraceHighlight()">\n' +
    '                    <span class="glyphicon glyphicon-education black"></span> Smart Stack Trace\n' +
    '                </button>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

    });
