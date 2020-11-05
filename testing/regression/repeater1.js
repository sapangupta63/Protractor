var or=require('../OR.json');
var dataprovider=require('jasmine-data-provider');
describe('Data Provider',function(){



   dataprovider([{Value1:or.values.value1,Value2:or.values.value2},{Value1:or.values.value3,Value2:or.values.value4}],function(data){
            it("Printing table",function(){
            browser.get(or.testsiteurl);
            element(by.model(or.model.model1)).sendKeys(data.Value1)
           element(by.model(or.model.model2)).sendKeys(data.Value2);
           element(by.buttonText(or.buttontext.btnText)).click();
          
           element.all(by.repeater('result in memory')).getText().then(function(text){
              console.log(text)
              
              })
              browser.sleep(1000)
          
          
          
          
           })

    })




})