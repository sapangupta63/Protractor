const { browser } = require("protractor");


var BasePage =  function()
{

    this.navigateToURL =   function(url)
    {
         browser.get(url);
    },

    this.getTitle =  function()
    {
        return browser.getTitle();
    },

    this.getAlert=async function()
    {
        var alertDialogue=browser.switchTo().alert();
        await alertDialogue.then(function(){
            alertDialogue.accept();
            browser.sleep(4000);

        });

    };

}

module.exports=new BasePage();