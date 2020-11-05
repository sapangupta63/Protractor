//Add public Reporting API for Additional Features
var or=require('../OR.json')
const PublicReportingAPI = require('@reportportal/agent-js-jasmine/lib/publicReportingAPI');

describe('Suite',function(){
  
  PublicReportingAPI.addAttributes([{
    key: 'launch_month',
    value: 'August2020',
}], 'Sanity suite');
PublicReportingAPI.setDescription('This suite contains the execution results of angualr website', 'Sanity suite');

  
 
//   const suiteAttachment = {
//     name: 'attachment.png',
//     type: 'image/png',
//    // content: data.toString('base64'),
//   }
  
//   PublicReportingAPI.addAttributes([{
//     key: 'suiteKey',
//     value: 'suiteValue',
// }], 'A suite');
// PublicReportingAPI.setDescription('Suite description', 'A suite');
// PublicReportingAPI.debug('Debug log message for suite "suite"', null, 'A suite');
// PublicReportingAPI.info('Info log message for suite "suite"', suiteAttachment, 'A suite');
// PublicReportingAPI.warn('Warning for suite "suite"', null, 'A suite');
// PublicReportingAPI.error('Error log message for suite "suite"', null, 'A suite');
// PublicReportingAPI.fatal('Fatal log message for suite "suite"', suiteAttachment, 'A suite');
// PublicReportingAPI.setLaunchStatusPassed();
// PublicReportingAPI.setStatusPassed('A suite');
// PublicReportingAPI.setTestCaseId('TestCaseIdForSuite', 'A suite');

beforeEach(function(){

//browser.get("http://www.way2automation.com/angularjs-protractor/calc/");
browser.get(or.testsiteurl);
//element(by.model('first')).sendKeys("2");
element(by.model(or.model.model1)).sendKeys(or.values.value1);
element(by.model(or.model.model2)).sendKeys(or.values.value2);
//element(by.buttonText('Go!')).click();
element(by.buttonText(or.buttontext.btnText)).click();
element(by.model(or.model.model1)).sendKeys(or.values.value3);
element(by.model(or.model.model2)).sendKeys(or.values.value4);
element(by.buttonText(or.buttontext.btnText)).click();
browser.sleep(1000)
})

//First Row Data
it("Printing first row data",function(){
  
  
  // const specAttachment  = {
  //   name: 'attachment.png',
  //   type: 'image/png',
  //   content: data.toString('base64'),
  // }

  PublicReportingAPI.addAttributes([{
    key: 'Author',
    value: 'sapan-gupta'
},
{
  key: "Reporting",
  value: "reportportal io"
},

]);



PublicReportingAPI.setDescription('User Launch the url and prints first row data');
//PublicReportingAPI.setTestCaseId('TestCaseIdForSpec');


 element(by.repeater('result in memory').row(0)).getText().then(function(text){
  PublicReportingAPI.log('INFO', 'Getting Text and printing it');
    console.log(text);
    
PublicReportingAPI.setStatusPassed();
 }).catch(function(error){

 
  PublicReportingAPI.trace('Trace log message for spec "spec"', error);
  PublicReportingAPI.debug('Debug log message for spec "spec"');
  PublicReportingAPI.info('Info log message for spec "spec" with attachment');
  PublicReportingAPI.warn('Warning for spec "spec"');
  PublicReportingAPI.error('Error log message for spec "spec"');
  PublicReportingAPI.fatal('Fatal log message for spec "spec"');
  PublicReportingAPI.setStatusFailed();
  throw error;
 })
 browser.sleep(1000)

})

//USE ELEMENT ALL for multiple data
it("printing multiple data",function(){

  PublicReportingAPI.addAttributes([{
    key: 'Author',
    value: 'sapan-gupta'
},
{
  key: "Reporting",
  value: "reportportal io"
},

]);
PublicReportingAPI.setDescription('User Launch the url and prints multiple data');

  element.all(by.repeater('result in memory').column('result.timestamp')).getText().then(function(text){
    console.log(text);
})
browser.sleep(1000)
})

//Printing entire table
it("printing entire table",function(){


  PublicReportingAPI.addAttributes([{
    key: 'Author',
    value: 'sapan-gupta'
},
{
  key: "Reporting",
  value: "reportportal io"
},

]);
PublicReportingAPI.setDescription('User Launch the url and prints entire table data');


element.all(by.repeater('result in memory')).getText().then(function(text){
console.log(text)

})
browser.sleep(1000)
})

//Printing table in new line
it("printing new table",function(){

  PublicReportingAPI.addAttributes([{
    key: 'Author',
    value: 'sapan-gupta'
},
{
  key: "Reporting",
  value: "reportportal io"
},

]);
PublicReportingAPI.setDescription('User Launch the url and prints entire table data in new line');


element.all(by.repeater('result in memory')).getText().then(function(text){
var rows=text.length;
for(var i=0;i<rows;i++)
{
    element(by.repeater('result in memory').row(i)).getText().then(function(text){

  console.log(text);
    })
}

})



})


})