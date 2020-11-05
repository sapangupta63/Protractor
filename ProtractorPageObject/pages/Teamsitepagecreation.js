var TS=require('../json/Teamsite.json');
const { element, browser } = require('protractor');
const { ProtractorExpectedConditions, ExpectedConditions } = require('protractor');
const { protractor } = require('protractor/built/ptor');
var teamsitecreation = function()
{




this.tscreation=function(ts)

{
    element(by.css(TS.locators.languagepage.tsname)).sendKeys(ts);
    element(by.css(TS.locators.languagepage.tsnextbtn)).click();
    element(by.css(TS.locators.languagepage.tsfinishbtn)).click();

    
    // var button=$("div#divSlideContent > span.lblCaptionBold");
    // browser.wait(ExpectedConditions.visibilityOf(button),100000);
    // var title=button.getText();
    // title.then(function(text){
    // console.log(text);
    // expect(title).toEqual("Confirmation – Your team site has been created.");
    // });


    // var EC1 = protractor.ExpectedConditions;
    // var button1=$("div#divSlideContent > a");
    // var isVisible1 = EC1.visibilityOf(button1);
    // browser.wait(isVisible1, 100000);
    
    // var link=button1.getText();
    // link.then(function(text){
    // console.log(text);
    // });
    
    // var EC2 = protractor.ExpectedConditions;
    // var button2=$("#btnCloseWindow");
    // var isClickable = EC2.elementToBeClickable(button2);
    // browser.wait(isClickable, 100000);
    // button2.click();

    
  
}


}

module.exports=new teamsitecreation();
