var OR=require('../json/OR.json');

var HomePage= function()
{

this.loginAsCustomer = function()
{
   element(by.partialButtonText("Customer")).click();

},
this.loginAsBankManager = function()
{
   // element(by.buttonText('Bank Manager Login')).click();
   element(by.buttonText(OR.locators.homepage.buttonText)).click();
    return require('./AddCustomerPage.js');

}
};

module.exports=new HomePage();
