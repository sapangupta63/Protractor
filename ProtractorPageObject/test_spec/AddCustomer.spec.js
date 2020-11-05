
var addcustomerpage=require('../pages/AddCustomerPage.js');    
const { ExpectedConditions, browser } = require('protractor');

describe("CustomerInformation Test",function(){
browser.ignoreSynchronization=true;

it("Adding Customer",function(){
    addcustomerpage.addCustomer();
    addcustomerpage.addCustomerInfo("Kamal","Hasan","110098");
})

it("opening account",function(){
    addcustomerpage.openAccount();
    addcustomerpage.openAccountInfo("Kamal Hasan","Dollar");
})

it("Validating customers",function(){
    addcustomerpage.validateCustomers();
})


})