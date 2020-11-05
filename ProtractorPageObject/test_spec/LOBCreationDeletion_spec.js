var basepage=require('../pages/BasePage.js');
var LOB=require('../json/LOB.json');
var random=require('../util/randomnumber');
const PublicReportingAPI = require('@reportportal/agent-js-jasmine/lib/publicReportingAPI');

describe("Creating LOB",function(){
var LOBPage1=require('../pages/LOBDeletionPage.js')    
var LOBPage=require('../pages/LOBCreationPage.js')    
it("LOB Creation", async  function(){
browser.ignoreSynchronization=true;
LOBPage.loblisthvc();
await LOBPage.lobhover();
await LOBPage.lobdelete();
await basepage.getAlert();
await LOBPage.navigationtoLOB();
var LOBTitle="Automation";
var ranno=random.randomno();
var LOBTitle=LOBTitle+ranno;
await LOBPage.lobcreation();
await LOBPage.lobTitle(LOBTitle);
await LOBPage.lobURL(LOBTitle);
await LOBPage.lobtemplate();
await LOBPage.lobv2();
await LOBPage.lobcreate();
await LOBPage.lobgroup(LOB.locators.LOBCreationpage.testdata.Owner);
await LOBPage.lobsubmit();
await LOBPage.lobselect(LOB.locators.LOBCreationpage.testdata.LOB);
await LOBPage.lobupdate();
await (await LOBPage.NEWLOB()).lobsetting();
//await LOBPage1.lobsetting();
await basepage.getAlert();
await LOBPage1.lobmessage();
})

})