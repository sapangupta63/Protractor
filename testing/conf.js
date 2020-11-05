// exports.config = {
//     framework: 'jasmine',
//     seleniumAddress: 'http://localhost:4444/wd/hub',
//     specs: ['spec.js']
//   }

//Protracto beautiful report
var HtmlReporter = require('protractor-beautiful-reporter');

//Prpotractor HTML Report2
//var HTMLReport = require('protractor-html-reporter-2');
//var jasmineReporters = require('jasmine-reporters');

//Report Portal 
const ReportportalAgent = require('@reportportal/agent-js-jasmine');

const agent = new ReportportalAgent({
    // client settings
    token: "26fc584d-7439-4397-acf9-7cb1205e9b7a",
    endpoint: "http://10.5.68.120:8080/api/v1",
    launch: "protractor",
    project: "mercerprojects",
    
    // token: "3c4562b1-d312-44d1-bef1-31ec6af8beb6",
    // endpoint: "http://localhost:8080/api/v1",
    // launch: "protractor",
    // project: "mercerprojectsapi",

    // token: "084382ff-87fd-4479-8852-d7d2aa69d19a",
    // endpoint: "http://10.5.68.120:8080/api/v1",
    // launch: "protractor",
    // project: "gtiprojects",

  

 //agent settings
    attachPicturesToLogs: true,
    attributes: [
      {   "key": "Env",
            "value": "QA"
        },
        {    "key": "Framework",
             "value":"Protractor jasmine"  
        },
        {
           "key": "browser",
           "value": "chrome"
        },
    ]
});





exports.config=
{
 seleniumAddress: 'http://localhost:4444/wd/hub',
//directConnect:'true',
multiCapabilities:[
{
  'browserName':'chrome'
},
{
  'browserName':'MicrosoftEdge'
}

],

// capabilities:{
//       // 'browserName':'MicrosoftEdge',

//     'browserName':'chrome',
//     //'shardTestFiles': true,
//     //'maxInstances': 2

//     // 'browserName':'firefox'

//     // 'chromeOptions':{
//     // //  args:['--headless','--window-size=1920x1280']
//     // }
// },
framework:'jasmine',
//specs:['./regression/Repeater.js'],
//specs:['./regression/repeater1.js'],
//specs:['./rough/BankManagerLogin.js','./rough/CustomerLogin.js'],
//specs:['./smoke/table.js'],

specs:['./sanity/checkbox.js'],

//specs:['./smoke/otherwaydropdown.js'],
suites:
{
smoke:['./smoke/*.js'],
sanity:['./sanity/*.js'],
all:['./*/*.js']


},


onPrepare: ()=> {
    //Report Portal Report
    jasmine.getEnv().addReporter(agent.getJasmineReporter());


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



},
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


afterLaunch: () => {
   // return agent.getExitPromise();

    agent.getExitPromise().then(() => {
        console.log('finish work');
    })
},





JasmineNodeOpts:
{
    defaultTimeOutInterval:800000
}

//Agent initialization to the onPrepare function.


};

