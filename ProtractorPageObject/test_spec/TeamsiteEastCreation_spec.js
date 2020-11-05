var basepage=require('../pages/BasePage.js');
var TS=require('../json/Teamsite.json');
var teamsiteGlobalPage=require('../pages/TeamsiteGlobalPage.js');
var random=require('../util/randomnumber');
const PublicReportingAPI = require('@reportportal/agent-js-jasmine/lib/publicReportingAPI');

describe("Creating Teamsite East",function(){
   
    // PublicReportingAPI.addAttributes([{
    //     key: 'launch_month',
    //     value: 'Sep2020',
    // }], 'Sanity suite');
    // PublicReportingAPI.setDescription('This suite contains the execution results of sharepoint website', 'Sanity suite');
    


    var WelcomePage=require('../pages/WelcomePage.js')    
it("Teamsite East Creation", async  function(){
    browser.ignoreSynchronization=true;
    // PublicReportingAPI.addAttributes([{
    //     key: 'Author',
    //     value: 'sapan-gupta'
    // },
    // {
    //   key: "Reporting",
    //   value: "reportportal io"
    // },
    
    // ]);
    
    // PublicReportingAPI.setDescription('User Launch the teamsite url and create teamsite');
//basepage.navigateToURL(TS.testsiteurl);

teamsiteGlobalPage.navigationtoURL();

var title=basepage.getTitle();
expect(title).toBe("Home - Team Sites");

// var newtext1;
// var firstName;
// var secondName;
// var pm;
// var test=teamsiteGlobalPage.userName().getText().then(function(text){
//    newtext1 = text.toLowerCase();
//   firstName=newtext1.split(",")[1];
//   secondName=newtext1.split(",")[0];
//   console.log(firstName+"-"+secondName);
//   pm=firstName+"-"+secondName;
//   return pm;
// })
var primaryowner=teamsiteGlobalPage.userName();
var TSName="Automation";
var ranno=random.randomno();
var TSName=TSName+ranno;
// PublicReportingAPI.log('INFO', 'Picking Random teamsite name and use in teamsite creation');
await WelcomePage.nextButton().language(TS.locators.languagepage.testdata.lang,TS.locators.languagepage.testdata.grp,primaryowner,TS.locators.languagepage.testdata.bkowner).regiondropdown(TS.locators.languagepage.testdata.eastrgn).tscreation(TSName.toString());
// PublicReportingAPI.log('INFO', 'Teamsite Creation is successfull');

//await TeamsiteGlobalPage.createTeamsiteBtn().nextButton().language(TS.locators.languagepage.testdata.lang,TS.locators.languagepage.testdata.grp,"pmowner",TS.locators.languagepage.testdata.bkowner);

 //homepage.loginAsBankManager().addCustomer().addCustomerInfo("Kamal","Hasan","110098");
})

})