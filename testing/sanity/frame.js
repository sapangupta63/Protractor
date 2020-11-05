//var logger=require('../log.js');

//var or=require('../OR.json');
describe("Iframe Handling",function(){

    
        it("Frame Handling",function(){

            browser.ignoreSynchronization=true;
            //browser.get(or.testsiteurl);
            browser.get("https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_submit_get");
            //logger.log('info','Navigating to w3school website');
            element.all(by.tagName("iframe")).getAttribute('id').then(function(frame){
           
           console.log("Total frames :"+frame.length);
           //logger.log('info','Total frames is : '+frame.length);
           
           console.log(frame);
           
            })
           
            element.all(by.tagName("iframe")).count().then(function(items){
           
               console.log("Total count :"+items)
            })
           browser.switchTo().frame("iframeResult").then(function(items){
           
               element(by.xpath('/html/body/button')).click();
           //  element(by.xpath(or.locators.locator1)).click();
              // logger.log('info','Switching to frame and clicking on element:');
           
           })
           browser.switchTo().defaultContent();
           element(by.xpath("html/body/div[5]/div/a[5]")).click();
        //   element(by.xpath(or.locators["locator 2"])).click();
           
           //logger.log('info','Switching back to parent and clicking on element:');
           
           
           
           
               })


    })

