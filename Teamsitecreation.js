var selectwrapper=require("./select-wrapper.js");
var language=new selectwrapper(by.css("#TeamsiteWizard_Wizard1_ddlLNGLanguage"));
var group=new selectwrapper(by.css("#TeamsiteWizard_Wizard1_ddlLNGLoB"));
var region=new selectwrapper(by.css("#TeamsiteWizard_Wizard1_ddlTSLRegion"));
describe("teamsitecreation",function(){
it("create a teamsite",function(){
browser.ignoreSynchronization=true;
browser.get("http://teamsites-qa.mercer.com/default.aspx");
browser.sleep(3000);
element(by.css("img[title='Create new team site']")).click();
let windowHandles=browser.getAllWindowHandles();
let firstWindowHandle,secondWindowHandle;
windowHandles.then(function(handles){
firstWindowHandle=handles[0];
secondWindowHandle=handles[1];
console.log("First Window id is :"+firstWindowHandle);
console.log("Second Window id is :"+secondWindowHandle);
browser.switchTo().window(secondWindowHandle).then(function(){
element(by.css("input.btnNextCls")).click();
browser.sleep(3000);
language.selectByText("English");
group.selectByText("Finance");
element(by.css("div#TeamsiteWizard_Wizard1_PEPrimarySiteCoordinator_upLevelDiv")).sendKeys("sapan-gupta@mercer.com");
element(by.css("div#TeamsiteWizard_Wizard1_PEBackupSiteCoordinator_upLevelDiv")).sendKeys("soumya-kamath@mercer.com");
element(by.css("input#TeamsiteWizard_Wizard1_chkcontainssensitive")).click();
element(by.css("input#TeamsiteWizard_Wizard1_StepNavigationTemplateContainerID_StepNextButton")).click();
browser.sleep(3000);
region.selectByText("Europe/Middle East/Africa");
element(by.css("input#TeamsiteWizard_Wizard1_chkTSLTerms")).click();
element(by.css("#TeamsiteWizard_Wizard1_StepNavigationTemplateContainerID_StepNextButton")).click();
element(by.css("#TeamsiteWizard_Wizard1_txtSNSitename")).sendKeys("TSProtract985");
element(by.css("#TeamsiteWizard_Wizard1_StepNavigationTemplateContainerID_StepNextButton")).click();
browser.sleep(3000);
element(by.css("#TeamsiteWizard_Wizard1_FinishNavigationTemplateContainerID_FinishButton")).click();
browser.sleep(8000);
var title=element(by.css("div#divSlideContent > span.lblCaptionBold")).getText();
title.then(function(text){
console.log(text);
    expect(title).toEqual("Confirmation – Your team site has been created.");
});

var link=element(by.css("div#divSlideContent > a")).getText();
link.then(function(text){
console.log(text);
});
browser.sleep(4000);
element(by.css("#btnCloseWindow")).click();
browser.sleep(4000);


/*
element.all(by.css("#TeamsiteWizard_Wizard1_ddlLNGLanguage option")).then(function(language){
console.log(language.length);

for(var i=0;i<language.length;i++)
{
    language[i].getAttribute('value').then(function(text){
    console.log(text);

    });
}

element(by.css("#TeamsiteWizard_Wizard1_ddlLNGLanguage")).element(by.css("[value='1033:en-US:1']")).click();
browser.sleep(3000);

});
*/




});
});








});
});