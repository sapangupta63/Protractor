// function allure_report_jetty_deploy() {
//   console.log('Generating allure reports from xml using maven plugin and deploying them on port:1234[localhost or jenkins node ip] via jetty server.It should not take more than 1 minute......');
//   console.log('If at times there is some issue in report deployment or reports are not available on mentioned port, please restart jenkins master and re run the test build');

//   var exec = require('child_process').exec;

//   function puts(error, stdout, stderr) {
//       sys.puts(stdout)
//   }
//   exec("mvn site -Dallure.results_pattern=allure-results && mvn jetty:run -Djetty.port=1234", puts);
//   var startTimes = Date.now();
//   while (Date.now() - startTimes < 60000) {
//   }
// }

require("babel-register")({
  presets: ["es2015"]
  });


//Protracto beautiful report
var HtmlReporter = require('protractor-beautiful-reporter');

//Report Portal 
//  const ReportportalAgent = require('@reportportal/agent-js-jasmine');

//  const agent = new ReportportalAgent({
//   //  client settings
//     token: "26fc584d-7439-4397-acf9-7cb1205e9b7a",
//     endpoint: "http://10.5.68.120:8080/api/v1",
//     launch: "Sharepoint_Protractor",
//     project: "mercerprojects",

//     //agent settings
//     attachPicturesToLogs: true,
//     attributes: [
//       {   "key": "Env",
//             "value": "QA"
//         },
//         {    "key": "Framework",
//              "value":"Protractor jasmine"  
//         },
//         {
//            "key": "browser",
//            "value": "chrome"
//         },
//     ]
// });



exports.config=
{
  //newtest
  //seleniumAddress: 'http://localhost:4444/wd/hub',
directConnect:'true', 
capabilities:{
  'browserName':'chrome',
  // shardTestFiles: true,
  // maxInstance: 3
    // 'browserName':'MicrosoftEdge',
    // 'chromeOptions':{
    //   args:['--headless','--window-size=1920x1280']
    // }
},

framework:'jasmine2',
//specs:['./regression/Repeater.js'],
//specs:['./regression/repeater1.js'],
specs:['./test_spec/LOBCreationDeletion_spec.js'],
// specs:['./test_spec/LOBCreationDeletion_spec.js','./test_spec/TeamsiteWestCreation_spec.js','./test_spec/TeamsiteEastCreation_spec.js','./test_spec/TeamsiteApacCreation_spec.js'],
//specs:['./sanity/frame.js'],

//specs:['./smoke/otherwaydropdown.js'],
suites:
{
smoke:['./smoke/*.js'],
sanity:['./sanity/*.js'],
all:['./*/*.js']


},

params:
{
  url:
  {
    qa:"qa",
    ua:"ua"
  }
},

// Options to be passed to Jasmine.
jasmineNodeOpts: {
   defaultTimeoutInterval: 2000000000
   },


onPrepare: ()=> {
    //browser.ignoreSynchronization=true
    //browser.driver.manage().timeouts().implicitlyWait(60000);

    //Report Portal Report
    //  jasmine.getEnv().addReporter(agent.getJasmineReporter());



    // console.log('Deleting old allure reports and files.');
    // var sys = require('util')
    // var exec = require('child_process').exec;

    // function puts(error, stdout, stderr) {
    //     sys.puts(stdout)
    // }

    // exec("RD /S /Q allure-results", puts);
    // exec("RD /S /Q target", puts);


    //Report Portal Report
    // jasmine.getEnv().addReporter(agent.getJasmineReporter());



    //Allure Report

var AllureReporter=require('jasmine-allure-reporter');
jasmine.getEnv().addReporter(new AllureReporter({
allureReport:
{
resultDir:'allure-results'

}

}));

jasmine.getEnv().afterEach(function(done){
    browser.takeScreenshot().then(function (png) {
      allure.createAttachment('Screenshot', function () {
        return new Buffer(png, 'base64')
      }, 'image/png')();
      done();
    })
  });

  //Protractor Beautiful Report
  jasmine.getEnv().addReporter(new HtmlReporter({
    baseDirectory: 'tmp/screenshots'
 }).getJasmine2Reporter());

 var reporter = new HtmlReporter({
    baseDirectory: 'tmp/screenshots'
 });

//Protractor HTML Reporter2

// jasmine.getEnv().addReporter(new jasmineReporters.JUnitXmlReporter({
//     consolidateAll: true,
//     savePath: './',
//     filePrefix: 'xmlresults'
// }))
// console.log('Stopping jetty server if any previous instance is running on port 1234.')

// exec("mvn jetty:stop -Djetty.port=1234", puts);
// var startTimer = Date.now();
// while (Date.now() - startTimer < 10000) {
// }


},
// afterLaunch: () => {
//    // return agent.getExitPromise();

//     agent.getExitPromise().then(() => {
//         console.log('finish work');
//     })
// }

// plugins: [{
//     package: 'jasmine2-protractor-utils',
//     disableHTMLReport: true,
//     disableScreenshot: false,
//     screenshotPath:'./screenshots',
//     screenshotOnExpectFailure:false,
//     screenshotOnSpecFailure:true,
//     clearFoldersBeforeTest: true
//   }],


// onComplete: function() {
//     var browserName, browserVersion;
//     var capsPromise = browser.getCapabilities();

//     capsPromise.then(function (caps) {
//        browserName = caps.get('browserName');
//        browserVersion = caps.get('version');
//        platform = caps.get('platform');

//        var HTMLReport = require('protractor-html-reporter-2');

//        testConfig = {
//            reportTitle: 'Protractor Test Execution Report',
//            outputPath: './',
//            outputFilename: 'ProtractorTestReport',
//            screenshotPath: './screenshots',
//            testBrowser: browserName,
//            browserVersion: browserVersion,
//            modifiedSuiteName: false,
//            screenshotsOnlyOnFailure: true,
//            testPlatform: platform
//        };
//        new HTMLReport().from('xmlresults.xml', testConfig);
//    });
// },


// afterLaunch: () => {
//    // return agent.getExitPromise();

//     agent.getExitPromise().then(() => {
//         console.log('finish work');
//     })
// },





// JasmineNodeOpts:
// {
//    // onComplete will be called just before the driver quits.
//    onComplete: null,
//    // If true, display spec names.
//    isVerbose: true,
//    // If true, print colors to the terminal.
//    showColors: true,
//    // If true, include stack traces in failures.
//    includeStackTrace: true,
//    // Default time to wait in ms before a test fails.
//    defaultTimeoutInterval: 20000000
// }

//Agent initialization to the onPrepare function.


};

  