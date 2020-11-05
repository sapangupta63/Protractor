var TS=require('../json/Teamsite.json');
const { browser, element, ProtractorExpectedConditions, ExpectedConditions } = require('protractor');
const { protractor } = require('protractor/built/ptor');
var welcomepage=function()
{

this.nextButton= function()
{  
    console.log("Launching Browser");
    // var EC = ExpectedConditions;
    // if(browser.wait(EC.urlContains('qa'), 5000))
    // {
    //   element(by.xpath(TS.locators.GlobalTeamsiteHomepage.createTSBtnQA)).click();
    // }
    // else
    // {
    //   element(by.xpath(TS.locators.GlobalTeamsiteHomepage.createTSBtnUA)).click();
    // }
    browser.getCurrentUrl().then(function(url){
    if(url.includes("qa"))
    {
    element(by.xpath(TS.locators.GlobalTeamsiteHomepage.createTSBtnQA)).click();
     }
      else
      {
        element(by.xpath(TS.locators.GlobalTeamsiteHomepage.createTSBtnUA)).click();

      }
    })
   // element(by.xpath(TS.locators.GlobalTeamsiteHomepage.createTSBtnQA)).click();
    let firstwindowHandle,secondwindowHandle;
    let windowHandles=browser.getAllWindowHandles();
    windowHandles.then(function(handles){
        firstwindowHandle=handles[0];
        secondwindowHandle=handles[1];
        console.log("First Window is :"+firstwindowHandle);
        console.log("Second Window is :"+secondwindowHandle);

      browser.switchTo().window(secondwindowHandle).then(function(){
        browser.sleep(2000);
      //  let EC = protractor.ExpectedConditions;
      let button=element(by.css(TS.locators.welcomepage.welcomenextbtn));
        browser.wait(ExpectedConditions.elementToBeClickable($(TS.locators.welcomepage.welcomenextbtn)), 10000);
        button.click();
   //  element(by.css(TS.locators.welcomepage.welcomenextbtn)).click();

      });

    });
    return require('./LanguagePage.js');


};

};

module.exports=new welcomepage();
