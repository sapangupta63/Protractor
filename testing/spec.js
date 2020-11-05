// describe('Protractor Demo App', function() {
//     it('should have a title', function() {
//       browser.get('http://juliemr.github.io/protractor-demo/');
  
//       expect(browser.getTitle()).toEqual('Super Calculator');
//     });
//   });

//   describe('Demo App',()=>{
//   it('Title validation',()=>{
//       browser.ignoreSynchronization=true;
//   browser.get('http://google.com');
//   expect(browser.getTitle()).toEqual("Google");
//   })
// })

// describe("Test entering into an input box",function(){
//     it("Executing input box test",function(){
     
//          browser.get("https://angularjs.org/");
//          element(by.model("yourName")).sendKeys("Sapan");
//          element(by.binding("yourName")).getText().then(function(text){
//              console.log(text);
//      }).catch(function(error){
//         console.log("Error while getting text")
//        throw error

//      })
 
//      })
//     })

describe("Handling Dropdown",function(){
it("dropdown",function(){

    browser.get("http://www.way2automation.com/angularjs-protractor/banking/#/login");
    element(by.buttonText('Customer Login')).click();
    expect(browser.getTitle()).toContain('Protractor')
    browser.sleep(3000);

    // element.all(by.css('#userSelect option')).then(function(items){
    //     let size=items.length
    //     console.log("Total items in dropdown are :"+size)

    //  Array.from(items).forEach((element)=>{
    //       element.getText().then(function(text){
    //           console.log(text)
    //       })
    //  })
    // })
    

     element.all(by.css('#userSelect option')).getText().then(function(menus) {
        console.log(menus.length);

        console.log(menus);
    });

        // for(var i=0;i<size;i++)
        // {
        //     items[i].getText().then(function(text){
        //         console.log(text)
        //     })
        // }
    
        
   


})
})